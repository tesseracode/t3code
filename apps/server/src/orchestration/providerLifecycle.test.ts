import { describe, expect, it } from "vite-plus/test";
import {
  ClientOrchestrationCommand,
  EventId,
  ProviderDriverKind,
  ProviderInstanceId,
  ProviderLifecycleEvidence,
  ThreadId,
  TurnId,
  type ProviderRuntimeEvent,
} from "@t3tools/contracts";
import * as Schema from "effect/Schema";
import { providerLifecycleEvidence } from "./providerLifecycle.ts";

const isClientCommand = Schema.is(ClientOrchestrationCommand);
const decodeEvidence = Schema.decodeUnknownSync(ProviderLifecycleEvidence);
describe("provider lifecycle evidence", () => {
  for (const provider of [
    "codex",
    "claude",
    "cursor",
    "grok",
    "opencode",
    "antigravity",
    "githubCopilot",
  ]) {
    it(`maps ${provider}'s normalized lifecycle without exposing provider text`, () => {
      const base = {
        eventId: EventId.make("provider-event"),
        threadId: ThreadId.make("thread"),
        provider: ProviderDriverKind.make(provider),
        providerInstanceId: ProviderInstanceId.make(`${provider}-account`),
        createdAt: "2026-09-27T00:00:00Z",
      };
      const active = TurnId.make("active");
      const events: ReadonlyArray<readonly [ProviderRuntimeEvent, string | undefined]> = [
        [{ ...base, type: "turn.started", payload: {} }, "running"],
        [
          { ...base, type: "turn.completed", turnId: active, payload: { state: "completed" } },
          "completed",
        ],
        [
          {
            ...base,
            type: "turn.completed",
            turnId: active,
            payload: { state: "failed", errorMessage: "private" },
          },
          "failed",
        ],
        [
          { ...base, type: "turn.completed", turnId: active, payload: { state: "cancelled" } },
          "interrupted",
        ],
        [
          { ...base, type: "turn.aborted", turnId: active, payload: { reason: "private" } },
          "interrupted",
        ],
        [
          { ...base, type: "session.exited", payload: { reason: "private", exitKind: "error" } },
          "disconnected",
        ],
        [{ ...base, type: "session.state.changed", payload: { state: "running" } }, "running"],
        [{ ...base, type: "session.state.changed", payload: { state: "ready" } }, "ready"],
        [{ ...base, type: "session.state.changed", payload: { state: "waiting" } }, undefined],
        [
          {
            ...base,
            type: "runtime.error",
            payload: { message: "private", class: "transport_error" },
          },
          "disconnected",
        ],
        [
          {
            ...base,
            type: "runtime.error",
            payload: { message: "private", class: "provider_error" },
          },
          "failed",
        ],
      ];
      for (const [event, transition] of events) {
        const evidence = providerLifecycleEvidence(event, active);
        expect(evidence?.transition).toBe(transition);
        if (evidence) {
          expect(decodeEvidence(evidence)).toEqual(evidence);
          expect(evidence.turnId).toBe(active);
          expect(evidence.providerKey).toBe(`${provider}-account`);
          expect(Object.values(evidence).join(" ")).not.toContain("private");
        }
      }
      const unknown = providerLifecycleEvidence(
        { ...base, type: "runtime.error", payload: { message: "private" } },
        null,
      );
      expect(unknown?.turnId).toBeNull();
    });
  }
  it("does not accept lifecycle authority through the client command union", () => {
    expect(
      isClientCommand({
        type: "thread.session.set",
        commandId: "client-forged",
        threadId: "thread",
        createdAt: "2026-09-27T00:00:00Z",
        session: {
          threadId: "thread",
          status: "stopped",
          providerName: "codex",
          runtimeMode: "approval-required",
          activeTurnId: null,
          lastError: null,
          updatedAt: "2026-09-27T00:00:00Z",
        },
        lifecycle: {
          providerEventId: "fake",
          providerKey: "codex",
          turnId: "turn",
          transition: "disconnected",
        },
      }),
    ).toBe(false);
  });
});
