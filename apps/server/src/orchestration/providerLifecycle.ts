import type { ProviderLifecycleEvidence, ProviderRuntimeEvent, TurnId } from "@t3tools/contracts";

const lifecycleTypes = new Set<ProviderRuntimeEvent["type"]>([
  "turn.started",
  "turn.completed",
  "turn.aborted",
  "session.exited",
  "session.started",
  "thread.started",
  "session.state.changed",
  "runtime.error",
]);
/** Keep the accepted provider signal's scope when the ordinary session snapshot clears it. */
export function providerLifecycleEvidence(
  event: ProviderRuntimeEvent,
  activeTurnId: TurnId | null,
): ProviderLifecycleEvidence | undefined {
  if (!lifecycleTypes.has(event.type)) return undefined;
  const base = {
    providerEventId: event.eventId,
    providerKey: event.providerInstanceId ?? event.provider,
    turnId: event.turnId ?? activeTurnId,
  };
  switch (event.type) {
    case "turn.started":
      return { ...base, transition: "running" };
    case "turn.completed":
      return {
        ...base,
        transition:
          event.payload.state === "failed"
            ? "failed"
            : event.payload.state === "interrupted" || event.payload.state === "cancelled"
              ? "interrupted"
              : "completed",
        ...(event.payload.state === "failed" ? { failureReason: "provider_failed" as const } : {}),
      };
    case "turn.aborted":
      return { ...base, transition: "interrupted" };
    case "session.exited":
      return { ...base, transition: "disconnected" };
    case "session.started":
    case "thread.started":
      return { ...base, transition: "ready" };
    case "session.state.changed":
      switch (event.payload.state) {
        case "starting":
        case "ready":
        case "running":
          return { ...base, transition: event.payload.state };
        case "error":
          return { ...base, transition: "failed", failureReason: "provider_failed" };
        case "stopped":
          return { ...base, transition: "disconnected" };
        case "waiting":
          return undefined;
      }
      break;
    case "runtime.error":
      return {
        ...base,
        transition: event.payload.class === "transport_error" ? "disconnected" : "failed",
        ...(event.payload.class === "transport_error"
          ? {}
          : { failureReason: "runtime_failed" as const }),
      };
    default:
      return undefined;
  }
}
