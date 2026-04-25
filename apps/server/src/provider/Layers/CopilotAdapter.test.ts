import * as NodeServices from "@effect/platform-node/NodeServices";
import { ApprovalRequestId, type ProviderRuntimeEvent, ThreadId } from "@t3tools/contracts";
import type { PermissionRequest, SessionEvent } from "@github/copilot-sdk";
import { Duration, Effect, Layer, Ref, Stream } from "effect";
import { describe, expect, it } from "vitest";

import { ServerConfig } from "../../config.ts";
import { ServerSettingsService } from "../../serverSettings.ts";
import { CopilotAdapter } from "../Services/CopilotAdapter.ts";
import { makeCopilotAdapterLive } from "./CopilotAdapter.ts";

class FakeCopilotSession {
  readonly sessionId = "copilot-session-1";
  readonly rpc = {
    mode: {
      set: async (input: { mode: "interactive" | "plan" | "autopilot" }) => input,
    },
    plan: {
      read: async () => ({
        exists: false,
        content: null,
        path: null,
      }),
    },
  };

  private readonly handlers = new Set<(event: SessionEvent) => void>();

  on(handler: (event: SessionEvent) => void): () => void {
    this.handlers.add(handler);
    return () => {
      this.handlers.delete(handler);
    };
  }

  emit(event: SessionEvent): void {
    for (const handler of this.handlers) {
      handler(event);
    }
  }

  destroy(): Promise<void> {
    return Promise.resolve();
  }

  send(): Promise<string> {
    return Promise.resolve("sent");
  }

  abort(): Promise<void> {
    return Promise.resolve();
  }

  getMessages(): Promise<SessionEvent[]> {
    return Promise.resolve([]);
  }
}

interface PermissionHandlerCapture {
  onPermissionRequest?: (request: PermissionRequest) => Promise<unknown> | unknown;
}

function makeTestLayer(capture?: PermissionHandlerCapture) {
  const permissionCapture = capture ?? {};
  const fakeSession = new FakeCopilotSession();
  const fakeClient: any = {
    start: async () => undefined,
    listModels: async () => [],
    createSession: async (config: any) => {
      permissionCapture.onPermissionRequest = config.onPermissionRequest;
      return fakeSession;
    },
    resumeSession: async (_sessionId: string, config: any) => {
      permissionCapture.onPermissionRequest = config.onPermissionRequest;
      return fakeSession;
    },
    stop: async () => [],
  };

  const layer = makeCopilotAdapterLive({
    clientFactory: () => fakeClient,
  }).pipe(
    Layer.provideMerge(
      ServerConfig.layerTest(process.cwd(), { prefix: "t3-copilot-adapter-" }).pipe(
        Layer.provideMerge(NodeServices.layer),
      ),
    ),
    Layer.provideMerge(ServerSettingsService.layerTest()),
    Layer.provideMerge(NodeServices.layer),
  );

  return { fakeSession, layer };
}

async function expectPermissionDecisionResult(input: {
  readonly threadId: string;
  readonly request: PermissionRequest;
  readonly decision: "accept" | "acceptForSession" | "decline" | "cancel";
  readonly expected: unknown;
}) {
  const capture: PermissionHandlerCapture = {};
  const { layer } = makeTestLayer(capture);
  const threadId = ThreadId.make(input.threadId);

  await Effect.runPromise(
    Effect.scoped(
      Effect.gen(function* () {
        const adapter = yield* CopilotAdapter;
        const eventsRef = yield* Ref.make<ReadonlyArray<ProviderRuntimeEvent>>([]);

        yield* Stream.runForEach(adapter.streamEvents, (event) =>
          Ref.update(eventsRef, (events) => [...events, event]),
        ).pipe(Effect.forkScoped);

        yield* adapter.startSession({
          threadId,
          provider: "copilot",
          runtimeMode: "approval-required",
        });
        yield* Effect.sleep(Duration.millis(10));

        expect(capture.onPermissionRequest).toBeTypeOf("function");
        const permissionResultPromise = Promise.resolve(
          capture.onPermissionRequest!(input.request),
        );

        yield* Effect.sleep(Duration.millis(10));

        const requestOpened = (yield* Ref.get(eventsRef)).find(
          (event) => event.type === "request.opened",
        );
        expect(requestOpened?.type).toBe("request.opened");
        if (!requestOpened?.requestId) {
          throw new Error("Expected a pending Copilot approval request");
        }

        yield* adapter.respondToRequest(
          threadId,
          ApprovalRequestId.make(String(requestOpened.requestId)),
          input.decision,
        );

        const permissionResult = yield* Effect.promise(() => permissionResultPromise);
        expect(permissionResult).toEqual(input.expected);

        yield* adapter.stopAll();
      }),
    ).pipe(Effect.provide(layer)),
  );
}

describe("CopilotAdapter", () => {
  it("ignores Copilot system.message events", async () => {
    const { fakeSession, layer } = makeTestLayer();

    await Effect.runPromise(
      Effect.scoped(
        Effect.gen(function* () {
          const adapter = yield* CopilotAdapter;
          const eventsRef = yield* Ref.make<ReadonlyArray<ProviderRuntimeEvent>>([]);

          yield* Stream.runForEach(adapter.streamEvents, (event) =>
            Ref.update(eventsRef, (events) => [...events, event]),
          ).pipe(Effect.forkScoped);

          yield* adapter.startSession({
            threadId: ThreadId.make("copilot-thread-1"),
            provider: "copilot",
            runtimeMode: "full-access",
          });
          yield* Effect.sleep(Duration.millis(10));

          const initialEvents = yield* Ref.get(eventsRef);

          const systemMessageEvent: Extract<SessionEvent, { type: "system.message" }> = {
            type: "system.message",
            data: {
              role: "system",
              content: "Internal prompt payload",
            },
            id: "system-message-1",
            timestamp: new Date().toISOString(),
            parentId: "parent-1",
          };
          fakeSession.emit(systemMessageEvent);
          yield* Effect.sleep(Duration.millis(10));

          const nextEvents = yield* Ref.get(eventsRef);
          expect(nextEvents).toHaveLength(initialEvents.length);
          expect(nextEvents.some((event) => event.raw?.method === "system.message")).toBe(false);

          yield* adapter.stopAll();
        }),
      ).pipe(Effect.provide(layer)),
    );
  });

  it("maps command session approvals to the new Copilot permission contract", async () => {
    await expectPermissionDecisionResult({
      threadId: "copilot-thread-command-approval",
      request: {
        kind: "shell",
        canOfferSessionApproval: true,
        commands: [
          { identifier: "cat", readOnly: true },
          { identifier: "rg", readOnly: true },
        ],
        fullCommandText: "cat package.json && rg TODO src",
        hasWriteFileRedirection: false,
        intention: "Inspect the workspace",
        possiblePaths: ["package.json", "src"],
        possibleUrls: [],
      } as PermissionRequest,
      decision: "acceptForSession",
      expected: {
        kind: "approve-for-session",
        approval: {
          kind: "commands",
          commandIdentifiers: ["cat", "rg"],
        },
      },
    });
  });

  it("maps write session approvals to the new Copilot permission contract", async () => {
    await expectPermissionDecisionResult({
      threadId: "copilot-thread-write-approval",
      request: {
        kind: "write",
        canOfferSessionApproval: true,
        diff: "@@ -1 +1 @@\n-old\n+new\n",
        fileName: "apps/server/src/example.ts",
        intention: "Update a server file",
      } as PermissionRequest,
      decision: "acceptForSession",
      expected: {
        kind: "approve-for-session",
        approval: {
          kind: "write",
        },
      },
    });
  });

  it("falls back to one-time approval when session approval is unavailable", async () => {
    await expectPermissionDecisionResult({
      threadId: "copilot-thread-fallback-approval",
      request: {
        kind: "shell",
        canOfferSessionApproval: false,
        commands: [{ identifier: "python", readOnly: false }],
        fullCommandText: "python scripts/dev-runner.ts",
        hasWriteFileRedirection: false,
        intention: "Run a local helper",
        possiblePaths: ["scripts/dev-runner.ts"],
        possibleUrls: [],
      } as PermissionRequest,
      decision: "acceptForSession",
      expected: {
        kind: "approve-once",
      },
    });
  });
});
