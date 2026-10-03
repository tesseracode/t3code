import {
  type AttentionWorkspaceState,
  type EnvironmentAttentionState,
  type ScopedAttentionItem,
  aggregateAttention,
} from "@t3tools/client-runtime/state/attention";
import { scopedProjectKey, scopeProjectRef } from "@t3tools/client-runtime/environment";
import { EnvironmentId, PositiveInt } from "@t3tools/contracts";
import * as Schema from "effect/Schema";
import * as HashMap from "effect/HashMap";
import * as Option from "effect/Option";
import { scopedThreadKey } from "@t3tools/client-runtime/environment";
import { buildThreadRouteParams } from "../../threadRoutes";

export const ATTENTION_INBOX_COMMAND = "attention.open" as const;
export const ATTENTION_INBOX_ROUTE = { to: "/attention" } as const;
export const ATTENTION_SEEN_LIMIT = 2_000;
export const AttentionSeen = Schema.Array(
  Schema.Struct({
    key: Schema.String,
    environmentId: EnvironmentId,
    revision: PositiveInt,
  }),
).check(Schema.isMaxLength(ATTENTION_SEEN_LIMIT));
export type AttentionSeen = typeof AttentionSeen.Type;
export const EMPTY_ATTENTION_SEEN: AttentionSeen = [];

export const ATTENTION_KINDS = {
  approval: "Approval requested",
  user_input: "Input requested",
  failure: "Agent failed",
  disconnect: "Provider disconnected",
} as const;
export const ATTENTION_PRIORITIES = {
  "blocking-error": "Blocking / error",
  warning: "Warning",
} as const;
export const ATTENTION_STATUSES: Record<EnvironmentAttentionState["status"], string> = {
  loading: "Waiting for attention",
  syncing: "Synchronizing; previous snapshot is stale",
  live: "Up to date",
  stale: "Disconnected or retrying; retained snapshot is stale",
  unauthorized: "Access denied; cached attention removed",
  unsupported: "Attention is not supported by this server",
  error: "Attention sync stopped; reconnect to retry",
};
export interface AttentionInboxFilters {
  environment: string;
  project: string;
  kind: string;
  priority: string;
}
export const EMPTY_ATTENTION_FILTERS: AttentionInboxFilters = {
  environment: "",
  project: "",
  kind: "",
  priority: "",
};

export function filterAttentionInbox(
  aggregate: ReturnType<typeof aggregateAttention>,
  filters: AttentionInboxFilters,
) {
  const items = aggregate.items.filter(
    (row) =>
      (filters.environment === "" || row.ref.environmentId === filters.environment) &&
      (filters.project === "" ||
        scopedProjectKey(scopeProjectRef(row.ref.environmentId, row.item.projectId)) ===
          filters.project) &&
      (filters.kind === "" || row.item.kind === filters.kind) &&
      (filters.priority === "" || row.priority === filters.priority),
  );
  return { items, threadCount: new Set(items.map((row) => scopedThreadKey(row.ref))).size };
}

export function attentionBadge(aggregate: ReturnType<typeof aggregateAttention>) {
  return {
    text: aggregate.complete ? String(aggregate.threadCount) : `${aggregate.threadCount}?`,
    label: `${aggregate.threadCount} actionable ${aggregate.threadCount === 1 ? "thread" : "threads"}${aggregate.complete ? "" : " known; total incomplete"}. ${aggregate.staleThreadCount} stale.`,
  };
}

export function attentionThreadTarget(row: ScopedAttentionItem) {
  return { to: "/$environmentId/$threadId" as const, params: buildThreadRouteParams(row.ref) };
}

export function markAttentionSeen(
  current: AttentionSeen,
  row: ScopedAttentionItem,
  seen: boolean,
): AttentionSeen {
  const rest = current.filter((entry) => entry.key !== row.key);
  return seen
    ? [
        ...rest,
        { key: row.key, environmentId: row.ref.environmentId, revision: row.item.revision },
      ].slice(-ATTENTION_SEEN_LIMIT)
    : rest;
}

/** Only a complete live snapshot proves that a previously seen item is gone. */
export function pruneAttentionSeen(
  current: AttentionSeen,
  state: AttentionWorkspaceState,
  observedEnvironments: ReadonlySet<EnvironmentId>,
): AttentionSeen {
  if (!state.isReady) return current;
  const next = current.filter((entry) => {
    const environment = state.environments.get(entry.environmentId);
    if (!environment) return !observedEnvironments.has(entry.environmentId);
    if (environment.status === "unauthorized") return false;
    if (environment.status !== "live") return true;
    const change = HashMap.get(
      environment.entries,
      `item:${entry.key.slice(entry.environmentId.length + 1)}`,
    );
    return (
      Option.isSome(change) &&
      change.value.entity?.type === "item" &&
      change.value.entity.value.status === "open" &&
      change.value.entity.value.revision === entry.revision
    );
  });
  return next.length === current.length ? current : next;
}

export function attentionKeyboardIndex(key: string, index: number, count: number): number | null {
  if (count === 0) return null;
  switch (key) {
    case "ArrowDown":
      return Math.min(count - 1, index + 1);
    case "ArrowUp":
      return Math.max(0, index - 1);
    case "Home":
      return 0;
    case "End":
      return count - 1;
    default:
      return null;
  }
}
