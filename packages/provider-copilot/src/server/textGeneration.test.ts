import { assert, describe, it } from "@effect/vitest";
import type { CopilotSession, SessionConfig } from "@github/copilot-sdk";
import { ProviderInstanceId } from "@t3tools/contracts";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import * as Fiber from "effect/Fiber";
import * as Logger from "effect/Logger";
import * as Schema from "effect/Schema";
import { CopilotSettings } from "../settings.ts";
import { makeTextGeneration } from "./textGeneration.ts";
import type { ModelCatalog } from "./routing.ts";

const settings = Schema.decodeSync(CopilotSettings)({});
const catalog: ModelCatalog = {
  models: [],
  auto: {
    defaultTier: "standard",
    tiers: ["standard", "opaque-high", "opaque-max", "disabled", "hidden"].map((id) => ({
      id,
      displayName: id,
      description: "",
      type: "fusion",
      status: { enabled: id !== "disabled", pickerVisible: id !== "hidden" },
    })),
  },
};

function gate() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

describe("Copilot background text generation", () => {
  it.effect(
    "honors routing in tool-free sessions and deletes only its owned ephemeral session",
    () =>
      Effect.gen(function* () {
        for (const tier of [undefined, false, "standard", "opaque-high", "opaque-max"]) {
          let config: SessionConfig | undefined;
          const cleanup: string[] = [];
          const changes: Array<Parameters<CopilotSession["setModel"]>> = [];
          const generation = makeTextGeneration(
            settings,
            { HOME: "/account" },
            {
              clientFactory: (options) => {
                assert.equal(options.mode, "copilot-cli");
                return {
                  start: async () => {},
                  stop: async () => {
                    cleanup.push("stop");
                    return [];
                  },
                  forceStop: async () => {},
                  rpc: {
                    models: {
                      list: async () => {
                        assert.isString(tier);
                        return catalog;
                      },
                    },
                  },
                  deleteSession: async (id) => {
                    cleanup.push(`delete:${id}`);
                  },
                  createSession: async (created) => {
                    config = created;
                    return {
                      sessionId: "ephemeral",
                      setModel: async (...change) => {
                        changes.push(change);
                      },
                      disconnect: async () => {
                        cleanup.push("disconnect");
                      },
                      sendAndWait: async () => {
                        assert.deepEqual(
                          changes,
                          tier === false ? [["auto", { autoTier: null }]] : [],
                        );
                        return {
                          type: "assistant.message",
                          data: { content: '{"title":"Native title"}' },
                        } as Awaited<
                          ReturnType<import("@github/copilot-sdk").CopilotSession["sendAndWait"]>
                        >;
                      },
                    };
                  },
                };
              },
            },
          );
          const result = yield* generation.generateThreadTitle({
            cwd: "/workspace",
            message: "Title this work",
            modelSelection: {
              instanceId: ProviderInstanceId.make("githubCopilot"),
              model: "auto",
              ...(tier === undefined ? {} : { options: [{ id: "autoTier", value: tier }] }),
            },
          });
          assert.equal(result.title, "Native title");
          assert.deepEqual(config?.availableTools, []);
          assert.deepEqual(config?.mcpServers, {});
          assert.isFalse(config!.enableConfigDiscovery);
          assert.isFalse(config!.enableSkills);
          assert.deepEqual(config?.capi, typeof tier === "string" ? { autoTier: tier } : undefined);
          assert.deepEqual(cleanup, ["disconnect", "delete:ephemeral", "stop"]);
        }
      }),
  );

  it.effect("rejects unavailable routing before creating a session or sending", () =>
    Effect.gen(function* () {
      const cases: Array<{
        tier: string | boolean;
        model?: string;
        missingCatalog?: boolean;
        discoveryFailure?: boolean;
      }> = [
        { tier: "unknown" },
        { tier: "disabled" },
        { tier: "hidden" },
        { tier: true },
        { tier: "opaque-high", missingCatalog: true },
        { tier: "opaque-high", discoveryFailure: true },
        { tier: "opaque-high", model: "gpt-4.1" },
      ];
      for (const scenario of cases) {
        let created = false;
        let stopped = false;
        const logs: unknown[] = [];
        const logger = Logger.make(({ message }) => logs.push(message));
        const generation = makeTextGeneration(
          settings,
          {},
          {
            clientFactory: () => ({
              start: async () => {},
              stop: async () => {
                stopped = true;
                return [];
              },
              forceStop: async () => {},
              deleteSession: async () => {},
              rpc: {
                models: {
                  list: async () => {
                    if (scenario.discoveryFailure) throw new Error("Discovery failed.");
                    return scenario.missingCatalog ? { models: [] } : catalog;
                  },
                },
              },
              createSession: async () => {
                created = true;
                throw new Error("Must not create a session.");
              },
            }),
          },
        );
        const failure = yield* generation
          .generateThreadTitle({
            cwd: "/workspace",
            message: "private-prompt-sentinel",
            modelSelection: {
              instanceId: ProviderInstanceId.make("githubCopilot"),
              model: scenario.model ?? "auto",
              options: [{ id: "autoTier", value: scenario.tier }],
            },
          })
          .pipe(Effect.flip, Effect.provide(Logger.layer([logger], { mergeWithExisting: false })));
        assert.include(
          failure.detail,
          scenario.discoveryFailure ? "routing discovery failed." : "routing selection failed.",
        );
        assert.deepEqual(logs, [
          [
            "Copilot background generation failed",
            {
              operation: "generateThreadTitle",
              providerInstanceId: "githubCopilot",
              model: scenario.model ?? "auto",
              autoTier: scenario.tier,
              reasoningEffort: undefined,
            },
          ],
        ]);
        assert.isFalse(created);
        assert.isTrue(stopped);
      }
    }),
  );

  it.effect("rejects malformed generation output while still cleaning up native resources", () =>
    Effect.gen(function* () {
      let deleted = 0;
      let stopped = 0;
      const generation = makeTextGeneration(
        settings,
        {},
        {
          clientFactory: () => ({
            start: async () => {},
            stop: async () => {
              stopped++;
              return [];
            },
            forceStop: async () => {},
            rpc: {
              models: {
                list: async () => {
                  throw new Error("Concrete models need no routing discovery.");
                },
              },
            },
            deleteSession: async () => {
              deleted++;
            },
            createSession: async () => ({
              sessionId: "ephemeral",
              setModel: async () => {},
              disconnect: async () => {},
              sendAndWait: async () =>
                ({ type: "assistant.message", data: { content: "not JSON" } }) as Awaited<
                  ReturnType<import("@github/copilot-sdk").CopilotSession["sendAndWait"]>
                >,
            }),
          }),
        },
      );

      const result = yield* generation
        .generateBranchName({
          cwd: "/workspace",
          message: "Fix native session lifecycle",
          modelSelection: {
            instanceId: ProviderInstanceId.make("githubCopilot"),
            model: "gpt-4.1",
            options: [],
          },
        })
        .pipe(Effect.exit);
      assert.isTrue(Exit.isFailure(result));
      assert.equal(deleted, 1);
      assert.equal(stopped, 1);
    }),
  );

  it.effect("cleans up a failed routing reset without sending under the wrong preference", () =>
    Effect.gen(function* () {
      let sent = false;
      let deleted = false;
      const nativeFailure = new Error("Reset failed.");
      const generation = makeTextGeneration(
        settings,
        {},
        {
          clientFactory: () => ({
            start: async () => {},
            stop: async () => [],
            forceStop: async () => {},
            deleteSession: async () => {
              deleted = true;
            },
            rpc: { models: { list: async () => catalog } },
            createSession: async () => ({
              sessionId: "ephemeral",
              disconnect: async () => {},
              setModel: async () => {
                throw nativeFailure;
              },
              sendAndWait: async () => {
                sent = true;
                return undefined;
              },
            }),
          }),
        },
      );
      const failure = yield* generation
        .generateThreadTitle({
          cwd: "/workspace",
          message: "Title",
          modelSelection: {
            instanceId: ProviderInstanceId.make("githubCopilot"),
            model: "auto",
            options: [{ id: "autoTier", value: false }],
          },
        })
        .pipe(Effect.flip);
      assert.include(failure.detail, "routing reset failed.");
      assert.strictEqual(failure.cause, nativeFailure);
      assert.isTrue(deleted);
      assert.isFalse(sent);
    }),
  );

  it.effect("never sends after cancellation while a native session is being created", () =>
    Effect.gen(function* () {
      const creating = gate();
      const release = gate();
      const cleaned = gate();
      let sent = 0;
      let deleted = 0;
      let stopped = 0;
      const generation = makeTextGeneration(
        settings,
        {},
        {
          clientFactory: () => ({
            start: async () => {},
            stop: async () => {
              stopped++;
              return [];
            },
            forceStop: async () => {},
            rpc: { models: { list: async () => catalog } },
            deleteSession: async () => {
              deleted++;
              cleaned.resolve();
            },
            createSession: async () => {
              creating.resolve();
              await release.promise;
              return {
                sessionId: "late-session",
                setModel: async () => {},
                disconnect: async () => {},
                sendAndWait: async () => {
                  sent++;
                  return undefined;
                },
              };
            },
          }),
        },
      );
      const pending = yield* Effect.forkChild(
        generation.generateThreadTitle({
          cwd: "/workspace",
          message: "Title",
          modelSelection: {
            instanceId: ProviderInstanceId.make("githubCopilot"),
            model: "gpt-4.1",
            options: [],
          },
        }),
      );
      yield* Effect.promise(() => creating.promise);
      yield* Fiber.interrupt(pending);
      assert.equal(stopped, 1);
      release.resolve();
      yield* Effect.promise(() => cleaned.promise);
      assert.equal(deleted, 1);
      assert.equal(sent, 0);
    }),
  );
});
