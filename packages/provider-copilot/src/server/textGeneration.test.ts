import { assert, describe, it } from "@effect/vitest";
import type { SessionConfig } from "@github/copilot-sdk";
import { ProviderInstanceId } from "@t3tools/contracts";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import * as Fiber from "effect/Fiber";
import * as Schema from "effect/Schema";
import { CopilotSettings } from "../settings.ts";
import { makeTextGeneration } from "./textGeneration.ts";

const settings = Schema.decodeSync(CopilotSettings)({});

function gate() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

describe("Copilot background text generation", () => {
  it.effect(
    "uses a tool-free native session, validates JSON and deletes only its owned ephemeral session",
    () =>
      Effect.gen(function* () {
        let config: SessionConfig | undefined;
        const cleanup: string[] = [];
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
                deleteSession: async (id) => {
                  cleanup.push(`delete:${id}`);
                },
                createSession: async (created) => {
                  config = created;
                  return {
                    sessionId: "ephemeral",
                    disconnect: async () => {
                      cleanup.push("disconnect");
                    },
                    sendAndWait: async () =>
                      ({
                        type: "assistant.message",
                        data: { content: '{"title":"Native title"}' },
                      }) as Awaited<
                        ReturnType<import("@github/copilot-sdk").CopilotSession["sendAndWait"]>
                      >,
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
            model: "gpt-4.1",
            options: [],
          },
        });
        assert.equal(result.title, "Native title");
        assert.deepEqual(config?.availableTools, []);
        assert.deepEqual(config?.mcpServers, {});
        assert.isFalse(config!.enableConfigDiscovery);
        assert.isFalse(config!.enableSkills);
        assert.deepEqual(cleanup, ["disconnect", "delete:ephemeral", "stop"]);
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
            deleteSession: async () => {
              deleted++;
            },
            createSession: async () => ({
              sessionId: "ephemeral",
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
            deleteSession: async () => {
              deleted++;
              cleaned.resolve();
            },
            createSession: async () => {
              creating.resolve();
              await release.promise;
              return {
                sessionId: "late-session",
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
