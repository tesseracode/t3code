import { assert, describe, it } from "@effect/vitest";
import type { CopilotClient } from "@github/copilot-sdk";
import { DEFAULT_SERVER_SETTINGS, ProviderInstanceId } from "@t3tools/contracts";
import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";
import * as Stream from "effect/Stream";
import { vi } from "vite-plus/test";
import * as ProviderHost from "@t3tools/provider-core/server/ProviderHost";
import * as McpProviderSessions from "@t3tools/provider-core/server/McpProviderSessions";
import { CopilotSettings } from "../settings.ts";
import * as NativeClient from "./client.ts";
import { CopilotDriver } from "./driver.ts";

const settings = Schema.decodeSync(CopilotSettings)({});
const host = ProviderHost.ProviderHost.of({
  paths: {
    cwd: "/workspace",
    baseDir: "/test",
    stateDir: "/test/state",
    providerStatusCacheDir: "/test/cache",
    attachmentsDir: "/test/attachments",
  },
  settings: {
    get: Effect.succeed(DEFAULT_SERVER_SETTINGS),
    withSnapshot: (use) => use(DEFAULT_SERVER_SETTINGS),
    changes: Stream.empty,
    subscribe: Effect.succeed(Stream.empty),
  },
  shouldRunBackgroundWork: () => Effect.succeed(false),
  resolveAttachmentPath: () => null,
  credentials: () =>
    Effect.succeed({
      binding: { owner: "t3", key: "test" },
      get: Effect.succeedNone,
      set: () => Effect.void,
      remove: Effect.void,
    }),
});

describe("Copilot workspace snapshots", () => {
  it.effect(
    "exposes project skills only for their requested cwd, never in the instance-wide snapshot",
    () =>
      Effect.gen(function* () {
        const requested: string[] = [];
        const fake = {
          start: async () => {},
          stop: async () => [],
          forceStop: async () => {},
          getStatus: async () => ({ version: "1.0.75", protocolVersion: 1 }),
          getAuthStatus: async () => ({ isAuthenticated: true }),
          listModels: async () => [],
          createSession: async () => {
            throw new Error("Discovery must not create native sessions.");
          },
          rpc: {
            skills: {
              discover: async ({ projectPaths }: { projectPaths: string[] }) => {
                const cwd = projectPaths[0]!;
                requested.push(cwd);
                return {
                  skills: [
                    {
                      name: cwd === "/project-a" ? "skill-a" : "skill-b",
                      description: "Project skill",
                      source: "project",
                      enabled: true,
                      userInvocable: true,
                      path: `${cwd}/.github/skills/SKILL.md`,
                    },
                  ],
                };
              },
            },
          },
        };
        const mock = vi
          .spyOn(NativeClient, "createClient")
          .mockReturnValue(fake as unknown as CopilotClient);
        yield* Effect.addFinalizer(() => Effect.sync(() => mock.mockRestore()));
        const instance = yield* CopilotDriver.create({
          instanceId: ProviderInstanceId.make("githubCopilot"),
          displayName: undefined,
          environment: [],
          enabled: true,
          config: settings,
        });
        const first = yield* instance.snapshotForCwd!("/project-a");
        const second = yield* instance.snapshotForCwd!("/project-b");
        assert.deepEqual(
          first.skills.map((skill) => skill.name),
          ["skill-a"],
        );
        assert.deepEqual(
          second.skills.map((skill) => skill.name),
          ["skill-b"],
        );
        assert.deepEqual((yield* instance.snapshot.getSnapshot).skills, []);
        assert.deepEqual(requested, ["/project-a", "/project-b"]);
      }).pipe(
        Effect.provideService(ProviderHost.ProviderHost, host),
        Effect.provide(McpProviderSessions.layer),
        Effect.scoped,
      ),
  );
});
