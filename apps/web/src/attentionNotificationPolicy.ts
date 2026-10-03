import type { EnvironmentId, ScopedThreadRef } from "@t3tools/contracts";
import type { ClientSettings } from "@t3tools/contracts/settings";
import type { EnvironmentAttentionState } from "@t3tools/client-runtime/state/attention";
import { scopeThreadRef } from "@t3tools/client-runtime/environment";

export type NotificationCategory = ClientSettings["notificationCategories"][number];
export interface AttentionNotification {
  readonly key: string;
  readonly revision: number | string;
  readonly category: NotificationCategory;
  readonly ref: ScopedThreadRef;
}
export const NOTIFICATION_CATEGORIES = {
  approval: "Approval needed",
  user_input: "Input needed",
  failure: "Thread failed",
  disconnect: "Provider disconnected",
  completion: "Thread completed",
} satisfies Record<NotificationCategory, string>;

export function isNotificationQuietTime(
  quiet: ClientSettings["notificationQuietHours"],
  now: Date,
) {
  if (!quiet.enabled) return false;
  const minutes = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3));
  const start = minutes(quiet.start);
  const end = minutes(quiet.end);
  const current = now.getHours() * 60 + now.getMinutes();
  return (
    start === end ||
    (start < end ? current >= start && current < end : current >= start || current < end)
  );
}

export function notificationAllowed(
  settings: ClientSettings,
  alert: AttentionNotification,
  now: Date,
) {
  return (
    settings.notificationCategories.includes(alert.category) &&
    !settings.notificationMutedEnvironments.includes(alert.ref.environmentId) &&
    !isNotificationQuietTime(settings.notificationQuietHours, now)
  );
}

export function canonicalNotificationCandidates(
  environmentId: EnvironmentId,
  state: EnvironmentAttentionState,
): AttentionNotification[] {
  if (state.status !== "live" || !state.notificationCandidates) return [];
  const alerts: AttentionNotification[] = [];
  for (const [, { entity }] of state.notificationCandidates) {
    if (!entity) continue;
    const ref = scopeThreadRef(environmentId, entity.value.threadId);
    if (entity.type === "item" && entity.value.status === "open") {
      alerts.push({
        key: `${environmentId}:${entity.value.attentionId}:${entity.value.kind}`,
        revision: entity.value.revision,
        category: entity.value.kind,
        ref,
      });
    } else if (
      entity.type === "summary" &&
      entity.value.phase === "completed" &&
      entity.value.turnId !== null
    ) {
      alerts.push({
        key: `${environmentId}:${entity.value.threadId}:completion`,
        revision: entity.value.turnId,
        category: "completion",
        ref,
      });
    }
  }
  return alerts;
}

/** Observations advance even while muted, quiet or disabled: opting in never replays them. */
export function takeNewNotifications(
  observed: Map<string, string | number>,
  candidates: ReadonlyArray<AttentionNotification>,
) {
  const next = new Map<string, string | number>();
  const alerts: AttentionNotification[] = [];
  for (const candidate of candidates) {
    const old = observed.get(candidate.key);
    const newer =
      typeof old === "number" && typeof candidate.revision === "number"
        ? candidate.revision > old
        : old !== candidate.revision;
    next.set(
      candidate.key,
      typeof old === "number" && typeof candidate.revision === "number"
        ? Math.max(old, candidate.revision)
        : candidate.revision,
    );
    if (newer) alerts.push(candidate);
  }
  return { observed: next, alerts };
}
