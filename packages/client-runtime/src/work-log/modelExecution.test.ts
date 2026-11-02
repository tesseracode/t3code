import type { OrchestrationV2ModelExecution } from "@t3tools/contracts";
import { describe, expect, it } from "vite-plus/test";
import { modelExecutionDetail, modelExecutionSummary } from "./modelExecution.ts";

const phase: OrchestrationV2ModelExecution = {
  version: 1,
  kind: "phase",
  nativeSessionId: "session-1",
  eventId: "event-1",
  sourceTimestamp: "2026-11-02T10:00:05.000Z",
  receivedAt: "2026-11-02T10:00:08.000Z",
  status: "completed",
  model: "actual-model",
  startSource: "observed",
  startedAt: "2026-11-02T10:00:00.000Z",
  endedAt: "2026-11-02T10:00:05.000Z",
  durationMs: 4800,
  gaps: [],
};

describe("model execution presentation", () => {
  it("uses provider duration rather than receipt latency and distinguishes timing evidence", () => {
    expect(modelExecutionSummary(phase)).toContain("actual-model · completed · 4.8s");
    const detail = modelExecutionDetail(phase);
    expect(detail).toContain("Provider elapsed: 4.8s");
    expect(detail).toContain(`Started (observed): ${phase.startedAt}`);
    expect(detail).toContain(`Provider event time: ${phase.sourceTimestamp}`);
    expect(detail).toContain(`Received: ${phase.receivedAt}`);
    expect(modelExecutionDetail({ ...phase, startSource: "estimated" })).toContain(
      `Started (estimated): ${phase.startedAt}`,
    );
    const { durationMs: _duration, ...withoutDuration } = phase;
    expect(modelExecutionSummary(withoutDuration)).not.toContain("5.0s");
    expect(modelExecutionDetail(withoutDuration)).toContain("Provider elapsed: not reported");
    expect(
      modelExecutionDetail({ ...phase, startSource: "unknown", startedAt: undefined }),
    ).toContain("Start: unknown");
  });

  it("keeps requested routing separate from effective, pending, and actual execution", () => {
    const route = {
      ...phase,
      kind: "route" as const,
      requestedModel: "Fusion",
      requestedPreference: "premium",
      effectivePreference: "standard",
      pendingPreference: "premium",
      activatingPreference: null,
    };
    expect(modelExecutionSummary(route)).not.toContain("actual-model");
    const detail = modelExecutionDetail(route);
    expect(detail).toContain("Routing state (not proof of model execution)");
    expect(detail).toContain("Requested model: Fusion");
    expect(detail).toContain("Requested routing: premium");
    expect(detail).toContain("Effective routing: standard");
    expect(detail).toContain("Pending routing: premium");
    expect(detail).toContain("Activating routing: none");
    expect(modelExecutionDetail({ ...route, pendingPreference: undefined })).not.toContain(
      "Pending routing:",
    );
  });

  it("surfaces fallback, failure, final provenance and incomplete telemetry without inventing success", () => {
    const failed = {
      ...phase,
      status: "failed",
      fallbackModel: "fallback-model",
      finalSourceModel: "final-model",
      finalSourcePhaseId: "final-phase",
      reason: "Provider unavailable",
      awaitingBackgroundWork: true,
      gaps: ["missing phase start", "duration incomplete"],
    };
    expect(modelExecutionSummary(failed)).toContain("failed");
    expect(modelExecutionSummary(failed)).toContain("final final-model");
    expect(modelExecutionSummary(failed)).toContain("telemetry gaps");
    const detail = modelExecutionDetail(failed);
    expect(detail).toContain("Fallback model: fallback-model");
    expect(detail).toContain("Final source model: final-model");
    expect(detail).toContain("Final source phase: final-phase");
    expect(detail).toContain("Reason: Provider unavailable");
    expect(detail).toContain("Background work: awaiting completion");
    expect(detail).toContain("Telemetry gaps:\n- missing phase start\n- duration incomplete");
  });
});
