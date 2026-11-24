import type { SessionEvent } from "@github/copilot-sdk";
import type { OrchestrationV2ModelExecution } from "@t3tools/contracts";
import * as DateTime from "effect/DateTime";

export const MAX_EXECUTION_ITEMS = 128;
export const MAX_REPLAY_EXECUTION_EVENTS = 512;
export const ROOT_PHASE_GAP = "The root turn ended without terminal phase telemetry.";

const label = (value: string) => value.slice(0, 512);
const duration = (value: number) =>
  Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : undefined;

export function fusionExecutionKey(event: SessionEvent): string | undefined {
  const identity = "fusionId" in event.data ? event.data.fusionId : undefined;
  const phase = "phaseId" in event.data ? event.data.phaseId : undefined;
  if (
    (typeof identity === "string" && identity.length > 512) ||
    (typeof phase === "string" && phase.length > 512)
  )
    throw new Error("Copilot execution identity exceeds the supported metadata bound.");
  switch (event.type) {
    case "session.fusion_resolved":
    case "session.fusion_completed":
      return `fusion:${event.data.fusionId}:route`;
    case "session.fusion_route_failed":
      return `fusion:${event.data.fusionId ?? event.data.attemptId}:route`;
    case "assistant.fusion_phase_started":
    case "assistant.fusion_phase_completed":
    case "assistant.fusion_phase_failed":
      return `fusion:${event.data.fusionId}:phase:${event.data.phaseId}`;
    default:
      return undefined;
  }
}

export function normalizeFusionExecution(
  event: SessionEvent,
  nativeSessionId: string,
  receivedAt: string,
  previous?: OrchestrationV2ModelExecution,
): OrchestrationV2ModelExecution | undefined {
  if (!fusionExecutionKey(event)) return undefined;
  const base: OrchestrationV2ModelExecution = {
    version: 1,
    kind: "route",
    nativeSessionId,
    eventId: event.id,
    sourceTimestamp: event.timestamp,
    receivedAt,
    status: "planned",
    startSource: "unknown",
    gaps: [],
  };
  switch (event.type) {
    case "session.fusion_resolved": {
      const data = event.data;
      const plannedModels = [
        { model: label(data.primaryModel), role: "primary" },
        ...(data.secondaryModel ? [{ model: label(data.secondaryModel), role: "secondary" }] : []),
        ...(data.judgeModel ? [{ model: label(data.judgeModel), role: "judge" }] : []),
        ...(data.repairModel ? [{ model: label(data.repairModel), role: "repair" }] : []),
        ...(data.critics ?? []).slice(0, 60).map((critic) => ({
          model: label(critic.model),
          role: "critic",
          phaseId: critic.phaseId,
        })),
      ];
      // Replaying the route must not erase a later authoritative completion.
      if (previous?.endedAt) return { ...previous, plannedModels };
      return {
        ...base,
        fusionId: data.fusionId,
        nativeTurnId: data.turnId,
        syntheticModel: label(data.syntheticModel),
        pattern: data.pattern,
        fallbackModel: label(data.fallbackModel),
        contractVersion: data.contractVersion,
        plannedModels,
        gaps: [
          ...(data.contractVersion !== 1
            ? ["Unrecognized routing contract version; execution facts may be incomplete."]
            : []),
          ...((data.critics?.length ?? 0) > 60
            ? ["The routing plan was truncated to 64 models."]
            : []),
        ],
      };
    }
    case "session.fusion_completed":
      return {
        ...(previous ?? base),
        kind: "route",
        fusionId: event.data.fusionId,
        nativeTurnId: event.data.turnId,
        eventId: event.id,
        sourceTimestamp: event.timestamp,
        receivedAt,
        status: event.data.outcome,
        pattern: event.data.pattern,
        syntheticModel: label(event.data.syntheticModel),
        endedAt: event.timestamp,
        durationMs: duration(event.data.durationMs),
        ...(event.data.finalSourceModel
          ? { finalSourceModel: label(event.data.finalSourceModel) }
          : {}),
        ...(event.data.finalSourcePhaseId
          ? { finalSourcePhaseId: event.data.finalSourcePhaseId }
          : {}),
        ...(event.data.degradedReason ? { reason: label(event.data.degradedReason) } : {}),
        awaitingBackgroundWork: event.data.awaitingBackgroundWork ?? false,
        gaps: previous?.gaps ?? ["The resolved routing plan was not observed."],
      };
    case "session.fusion_route_failed":
      return {
        ...(previous ?? base),
        kind: "route",
        ...(event.data.fusionId ? { fusionId: event.data.fusionId } : {}),
        eventId: event.id,
        sourceTimestamp: event.timestamp,
        receivedAt,
        status: "routing-failed",
        reason: label(event.data.reason),
        syntheticModel: label(event.data.syntheticModel),
        fallbackModel: label(event.data.fallbackModel),
        gaps: previous?.gaps ?? [
          "Native turn association is unavailable for this routing failure.",
        ],
      };
    case "assistant.fusion_phase_started": {
      if (previous?.status === "unknown" && previous.gaps.includes(ROOT_PHASE_GAP))
        return {
          ...previous,
          receivedAt,
          startedAt: previous.startSource === "observed" ? previous.startedAt : event.timestamp,
          startSource: "observed",
        };
      if (previous?.endedAt) {
        if (Date.parse(event.timestamp) > Date.parse(previous.endedAt)) return previous;
        return {
          ...previous,
          startedAt: event.timestamp,
          startSource: "observed",
          gaps: previous.gaps.filter(
            (gap) => gap !== "Phase start was not observed; its start time is only an estimate.",
          ),
        };
      }
      return {
        ...base,
        kind: "phase",
        fusionId: event.data.fusionId,
        phaseId: event.data.phaseId,
        phaseKind: event.data.phaseKind,
        conversationScope: event.data.conversationScope,
        model: label(event.data.model),
        role: label(event.data.role),
        pattern: event.data.pattern,
        status: "running",
        startedAt: event.timestamp,
        startSource: "observed",
      };
    }
    case "assistant.fusion_phase_completed":
    case "assistant.fusion_phase_failed": {
      const elapsed = duration(event.data.durationMs);
      const observed = previous?.startSource === "observed";
      const end = Date.parse(event.timestamp);
      return {
        ...(previous ?? base),
        kind: "phase",
        fusionId: event.data.fusionId,
        phaseId: event.data.phaseId,
        phaseKind: event.data.phaseKind,
        conversationScope: event.data.conversationScope,
        model: label(event.data.model),
        role: label(event.data.role),
        status: event.data.status,
        eventId: event.id,
        sourceTimestamp: event.timestamp,
        receivedAt,
        endedAt: event.timestamp,
        durationMs: elapsed,
        ...(event.type === "assistant.fusion_phase_completed" &&
        event.data.endedWithBackgroundWork !== undefined
          ? { endedWithBackgroundWork: event.data.endedWithBackgroundWork }
          : {}),
        ...(observed
          ? { startedAt: previous.startedAt, startSource: "observed" as const }
          : elapsed !== undefined && Number.isFinite(end) && end >= elapsed
            ? {
                startedAt: DateTime.formatIso(DateTime.makeUnsafe(end - elapsed)),
                startSource: "estimated" as const,
              }
            : { startSource: "unknown" as const }),
        ...(event.type === "assistant.fusion_phase_failed"
          ? {
              reason: label(event.data.reason),
              ...(event.data.degradedToPhaseId
                ? { degradedToPhaseId: event.data.degradedToPhaseId }
                : {}),
            }
          : {}),
        gaps: observed
          ? []
          : [
              elapsed !== undefined
                ? "Phase start was not observed; its start time is only an estimate."
                : "Phase start and usable elapsed time were not observed.",
            ],
      };
    }
    default:
      return undefined;
  }
}
