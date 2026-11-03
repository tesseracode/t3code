import { assert, describe, it } from "@effect/vitest";
import type { SessionEvent } from "@github/copilot-sdk";
import { normalizeFusionExecution, fusionExecutionKey, ROOT_PHASE_GAP } from "./fusion.ts";

const start = "2026-10-30T00:00:00.000Z";
const end = "2026-10-30T00:00:02.000Z";
const receipt = "2026-10-30T00:00:04.000Z";
function event(type: SessionEvent["type"], data: object, timestamp = end, id = type): SessionEvent {
  return { type, data, timestamp, id, parentId: "chronological-not-semantic" } as SessionEvent;
}
const phase = { fusionId: "fusion-a", phaseId: "primary-1", model: "same-model", role: "primary" };

describe("bounded Copilot execution metadata", () => {
  it("keeps ordinary Auto resolution as bounded selection evidence without invented turn or pattern", () => {
    const resolved = event("session.auto_mode_resolved", {
      chosenModel: "actual-model",
      routingMethod: "auto_v2",
      candidateModels: ["private-candidate"],
      categoryScores: { private: 0.9 },
    });
    const metadata = normalizeFusionExecution(resolved, "session", receipt)!;
    assert.equal(metadata.model, "actual-model");
    assert.equal(metadata.status, "resolved");
    assert.equal(metadata.reason, "auto_v2");
    assert.isUndefined(metadata.fusionId);
    assert.isUndefined(metadata.nativeTurnId);
    assert.isUndefined(metadata.pattern);
    assert.isUndefined(metadata.finalSourceModel);
    assert.notInclude(JSON.stringify(metadata), "private");
  });

  it("enriches completion received before the plan without losing final source or terminal timestamps", () => {
    const completed = normalizeFusionExecution(
      event("session.fusion_completed", {
        fusionId: "fusion-a",
        turnId: "0",
        pattern: "critique",
        syntheticModel: "opaque-fusion",
        outcome: "completed",
        durationMs: 2000,
        finalSourceModel: "actual-final",
        finalSourcePhaseId: "revision",
      }),
      "session",
      receipt,
    )!;
    const latePlan = normalizeFusionExecution(
      event(
        "session.fusion_resolved",
        {
          fusionId: "fusion-a",
          turnId: "0",
          pattern: "critique",
          syntheticModel: "opaque-fusion",
          contractVersion: 1,
          primaryModel: "draft",
          fallbackModel: "unused-fallback",
        },
        start,
      ),
      "session",
      receipt,
      completed,
    )!;
    assert.equal(latePlan.status, "completed");
    assert.equal(latePlan.sourceTimestamp, completed.sourceTimestamp);
    assert.equal(latePlan.finalSourceModel, "actual-final");
    assert.equal(latePlan.endedAt, end);
    assert.equal(latePlan.fallbackModel, "unused-fallback");
    assert.equal(latePlan.plannedModels?.[0]?.model, "draft");
    assert.deepEqual(latePlan.gaps, []);
  });

  it("keeps overlapping repeated models separate, ignores activity, and never copies drafts or usage", () => {
    const first = event("assistant.fusion_phase_completed", {
      ...phase,
      durationMs: 2000,
      status: "completed",
      content: "PRIVATE DRAFT",
      usage: { inputTokens: 100 },
      verdict: "PRIVATE CRITIC",
    });
    const second = event("assistant.fusion_phase_completed", {
      ...phase,
      phaseId: "critic-2",
      role: "critic",
      durationMs: 2000,
      status: "completed",
    });
    assert.notEqual(fusionExecutionKey(first), fusionExecutionKey(second));
    const metadata = normalizeFusionExecution(first, "session", receipt)!;
    assert.equal(metadata.startedAt, start);
    assert.equal(metadata.startSource, "estimated");
    assert.equal(metadata.durationMs, 2000);
    assert.equal(metadata.sourceTimestamp, end);
    assert.equal(metadata.receivedAt, receipt);
    assert.notInclude(JSON.stringify(metadata), "PRIVATE");
    assert.notInclude(JSON.stringify(metadata), "inputTokens");
    assert.isUndefined(
      normalizeFusionExecution(event("assistant.fusion_phase_activity", phase), "session", receipt),
    );
  });

  it("retains terminal status when a delayed start arrives and upgrades estimated timing", () => {
    const done = normalizeFusionExecution(
      event("assistant.fusion_phase_completed", {
        ...phase,
        durationMs: 2000,
        status: "completed",
      }),
      "session",
      receipt,
    )!;
    const delayed = normalizeFusionExecution(
      event(
        "assistant.fusion_phase_started",
        {
          ...phase,
          pattern: "cascade",
          phaseKind: "primary",
          conversationScope: "root",
        },
        start,
      ),
      "session",
      receipt,
      done,
    )!;
    assert.equal(delayed.status, "completed");
    assert.equal(delayed.startSource, "observed");
    assert.equal(delayed.endedAt, end);
    assert.deepEqual(delayed.gaps, []);
    assert.equal(delayed.pattern, "cascade");
    assert.equal(delayed.phaseKind, "primary");
    assert.equal(delayed.conversationScope, "root");
    const replay = normalizeFusionExecution(
      event("assistant.fusion_phase_completed", {
        ...phase,
        durationMs: 2000,
        status: "completed",
      }),
      "session",
      receipt,
      delayed,
    )!;
    assert.equal(replay.startSource, "observed");
    assert.equal(replay.startedAt, start);
    assert.equal(replay.phaseKind, "primary");
    assert.equal(replay.conversationScope, "root");
  });

  it("records failures without provider error text and preserves unknown durations", () => {
    const failed = normalizeFusionExecution(
      event("assistant.fusion_phase_failed", {
        ...phase,
        durationMs: Number.NaN,
        status: "failed",
        reason: "provider-unavailable",
        errorMessage: "PRIVATE PROVIDER RESPONSE",
      }),
      "session",
      receipt,
    )!;
    assert.equal(failed.reason, "provider-unavailable");
    assert.equal(failed.startSource, "unknown");
    assert.isUndefined(failed.durationMs);
    assert.notInclude(JSON.stringify(failed), "PRIVATE");
    const lateStart = normalizeFusionExecution(
      event("assistant.fusion_phase_started", { ...phase, pattern: "cascade" }, start),
      "session",
      receipt,
      failed,
    )!;
    assert.equal(lateStart.status, "failed");
    assert.equal(lateStart.startSource, "observed");
    assert.isUndefined(lateStart.durationMs);
    assert.deepEqual(lateStart.gaps, ["Usable elapsed time was not reported."]);
  });

  it("does not resurrect a phase from a late start after the root ended without terminal telemetry", () => {
    const execution = normalizeFusionExecution(
      event("assistant.fusion_phase_started", phase, start),
      "session",
      receipt,
    )!;
    const missing = { ...execution, status: "unknown", gaps: [ROOT_PHASE_GAP] };
    const late = normalizeFusionExecution(
      event("assistant.fusion_phase_started", phase, end),
      "session",
      receipt,
      missing,
    )!;
    assert.equal(late.status, "unknown");
    assert.equal(late.startedAt, start);
    assert.isUndefined(late.endedAt);
    assert.deepEqual(late.gaps, [ROOT_PHASE_GAP]);
  });

  it("separates planned models from execution and retains aggregate final source without token duplication", () => {
    const resolved = event("session.fusion_resolved", {
      fusionId: "fusion-a",
      turnId: "0",
      pattern: "critique",
      contractVersion: 999,
      primaryModel: "draft",
      secondaryModel: "review",
      fallbackModel: "fallback",
      syntheticModel: "auto",
      critics: [{ model: "critic", phaseId: "c1" }],
    });
    const plan = normalizeFusionExecution(resolved, "session", receipt)!;
    assert.equal(plan.status, "planned");
    assert.isUndefined(plan.model);
    assert.equal(plan.plannedModels?.length, 3);
    assert.include(plan.gaps[0], "Unrecognized");
    const done = normalizeFusionExecution(
      event("session.fusion_completed", {
        fusionId: "fusion-a",
        turnId: "0",
        pattern: "critique",
        outcome: "completed",
        durationMs: 2000,
        syntheticModel: "auto",
        finalSourceModel: "draft",
        finalSourcePhaseId: "primary-1",
        awaitingBackgroundWork: true,
        inputTokens: 1000,
        totalNanoAiu: 1000,
      }),
      "session",
      receipt,
      plan,
    )!;
    assert.equal(done.finalSourceModel, "draft");
    assert.isTrue(done.awaitingBackgroundWork);
    assert.notInclude(JSON.stringify(done), "inputTokens");
    assert.notInclude(JSON.stringify(done), "totalNanoAiu");
    assert.equal(normalizeFusionExecution(resolved, "session", receipt, done)?.status, "completed");
  });

  it("does not derive identity or run ownership from chronological parent links", () => {
    const failed = event("session.fusion_route_failed", {
      attemptId: "attempt",
      fallbackModel: "explicit",
      policy: "opaque",
      reason: "route-failed",
      syntheticModel: "auto",
      errorMessage: "PRIVATE",
    });
    const metadata = normalizeFusionExecution(failed, "session", receipt)!;
    assert.isUndefined(metadata.nativeTurnId);
    assert.isUndefined(metadata.fusionId);
    assert.equal(metadata.fallbackModel, "explicit");
    assert.notInclude(JSON.stringify(metadata), "chronological");
    assert.throws(
      () =>
        fusionExecutionKey(
          event("assistant.fusion_phase_started", {
            ...phase,
            phaseId: "x".repeat(513),
          }),
        ),
      /metadata bound/,
    );
  });
});
