import type { OrchestrationV2ModelExecution } from "@t3tools/contracts";
import { formatDuration } from "@t3tools/shared/orchestrationTiming";

export function modelExecutionSummary(execution: OrchestrationV2ModelExecution): string {
  const subject =
    execution.kind === "phase"
      ? ["Model phase", execution.model ?? "model unknown", execution.role]
      : execution.kind === "gap"
        ? ["Model telemetry gap", execution.model]
        : [
            execution.kind === "selection" ? "Model selection (requested)" : "Model routing",
            execution.syntheticModel ?? execution.requestedModel,
            execution.pattern,
            execution.status === "resolved" && execution.model
              ? `selected ${execution.model}`
              : execution.requestedProviderDefault
                ? `${execution.status === "effective" ? "effective" : "requested"} provider default`
                : undefined,
            execution.effectivePreference
              ? `effective ${execution.effectivePreference}`
              : execution.requestedPreference
                ? `requested ${execution.requestedPreference}`
                : undefined,
          ];
  return [
    ...subject,
    execution.status,
    execution.kind === "phase" && execution.durationMs !== undefined
      ? formatDuration(execution.durationMs)
      : undefined,
    execution.finalSourceModel ? `final ${execution.finalSourceModel}` : undefined,
    execution.fallbackModel ? `planned fallback ${execution.fallbackModel}` : undefined,
    execution.gaps.length > 0 ? "telemetry gaps" : undefined,
  ]
    .filter(Boolean)
    .join(" · ");
}

export function modelExecutionDetail(
  execution: OrchestrationV2ModelExecution,
  message?: string,
): string {
  const lines: string[] = message?.trim() ? [message.trim(), ""] : [];
  const add = (label: string, value: string | number | null | undefined) => {
    if (value !== undefined) lines.push(`${label}: ${value === null ? "none" : value}`);
  };
  lines.push(
    execution.kind === "selection" || execution.kind === "route"
      ? "Routing state (not proof of model execution)"
      : execution.kind === "gap"
        ? "Incomplete model execution telemetry"
        : "Provider-reported model phase",
  );
  add("Status", execution.status);
  add(
    execution.kind === "route" ? "Selected model (not execution evidence)" : "Model",
    execution.model,
  );
  add("Role", execution.role);
  add("Phase kind", execution.phaseKind);
  add("Conversation scope", execution.conversationScope);
  add("Pattern", execution.pattern);
  if (execution.plannedModels?.length)
    lines.push(
      `Planned models (not execution evidence):\n${execution.plannedModels
        .map(
          (phase) => `- ${phase.role}: ${phase.model}${phase.phaseId ? ` (${phase.phaseId})` : ""}`,
        )
        .join("\n")}`,
    );
  add("Requested model", execution.requestedModel);
  add("Resolved virtual model", execution.syntheticModel);
  add(
    "Requested routing",
    execution.requestedProviderDefault ? "provider default" : execution.requestedPreference,
  );
  add(
    "Effective routing",
    execution.effectivePreference ??
      (execution.requestedProviderDefault && execution.status === "effective"
        ? "provider default"
        : undefined),
  );
  add("Pending routing", execution.pendingPreference);
  add("Activating routing", execution.activatingPreference);
  add(
    execution.startedAt ? `Started (${execution.startSource})` : "Start",
    execution.startedAt ?? execution.startSource,
  );
  add("Ended", execution.endedAt);
  add(
    "Provider elapsed",
    execution.durationMs === undefined ? "not reported" : formatDuration(execution.durationMs),
  );
  add(
    execution.kind === "selection"
      ? "Snapshot time"
      : execution.kind === "gap"
        ? "Gap detected"
        : "Provider event time",
    execution.sourceTimestamp,
  );
  add("Received", execution.receivedAt);
  add("Planned fallback model (not execution evidence)", execution.fallbackModel);
  add("Degraded to phase", execution.degradedToPhaseId);
  add("Final source model", execution.finalSourceModel);
  add("Final source phase", execution.finalSourcePhaseId);
  add("Reason", execution.reason);
  if (execution.awaitingBackgroundWork !== undefined) {
    add(
      "Background work",
      execution.awaitingBackgroundWork ? "awaiting completion" : "not pending",
    );
  }
  if (execution.endedWithBackgroundWork !== undefined)
    add("Phase ended with background work", execution.endedWithBackgroundWork ? "yes" : "no");
  add("Session", execution.nativeSessionId);
  add("Turn", execution.nativeTurnId);
  add("Fusion", execution.fusionId);
  add("Phase", execution.phaseId);
  add("Event", execution.eventId);
  add("Contract version", execution.contractVersion);
  if (execution.gaps.length > 0)
    lines.push(`Telemetry gaps:\n${execution.gaps.map((gap) => `- ${gap}`).join("\n")}`);
  return lines.join("\n");
}
