import type {
  AttentionChange,
  EnvironmentId,
  ScopedProjectRef,
  ScopedThreadRef,
  ThreadAttentionItem,
  ThreadAwarenessSummary,
} from "@t3tools/contracts";
import { RelayAgentActivityAggregateRow } from "@t3tools/contracts/relay";
import * as HashMap from "effect/HashMap";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";
import { scopedProjectKey, scopedThreadKey, scopeThreadRef } from "../environment/scoped.ts";

export interface EnvironmentAttentionState {
  readonly status:
    | "loading"
    | "syncing"
    | "live"
    | "stale"
    | "unauthorized"
    | "unsupported"
    | "error";
  readonly hasSnapshot: boolean;
  readonly entries: HashMap.HashMap<string, AttentionChange>;
  readonly reason: string | null;
}

export const emptyEnvironmentAttention = (): EnvironmentAttentionState => ({
  status: "loading",
  hasSnapshot: false,
  entries: HashMap.empty(),
  reason: null,
});

export interface AttentionWorkspaceState {
  readonly isReady: boolean;
  readonly environments: ReadonlyMap<EnvironmentId, EnvironmentAttentionState>;
}

export interface AttentionSelection {
  readonly environmentIds?: ReadonlyArray<EnvironmentId>;
  readonly projects?: ReadonlyArray<ScopedProjectRef>;
  readonly threads?: ReadonlyArray<ScopedThreadRef>;
  readonly kinds?: ReadonlyArray<ThreadAttentionItem["kind"]>;
  readonly priorities?: ReadonlyArray<ScopedAttentionItem["priority"]>;
}

export interface ScopedAttentionItem {
  readonly key: string;
  readonly ref: ScopedThreadRef;
  readonly item: ThreadAttentionItem;
  readonly stale: boolean;
  readonly priority: "blocking-error" | "warning";
}

export interface ScopedAttentionSummary {
  readonly ref: ScopedThreadRef;
  readonly summary: ThreadAwarenessSummary;
  readonly stale: boolean;
}

const compareText = (left: string, right: string) => (left < right ? -1 : left > right ? 1 : 0);

/** Counts come from open items, not the server's saturated summary counts. */
export function aggregateAttention(
  state: AttentionWorkspaceState,
  selection: AttentionSelection = {},
) {
  const environments = new Map<EnvironmentId, EnvironmentAttentionState>();
  const projects = selection.projects && new Set(selection.projects.map(scopedProjectKey));
  const threads = selection.threads && new Set(selection.threads.map(scopedThreadKey));
  const items: ScopedAttentionItem[] = [];
  const summaries = new Map<string, ScopedAttentionSummary>();
  const liveThreads = new Set<string>();
  const staleThreads = new Set<string>();
  let liveItemCount = 0;
  let staleItemCount = 0;
  let complete = state.isReady;

  for (const [environmentId, environment] of state.environments) {
    if (selection.environmentIds && !selection.environmentIds.includes(environmentId)) continue;
    if (
      selection.projects &&
      !selection.projects.some((ref) => ref.environmentId === environmentId)
    )
      continue;
    if (selection.threads && !selection.threads.some((ref) => ref.environmentId === environmentId))
      continue;
    environments.set(environmentId, environment);
    complete &&= environment.status === "live";
    const stale = environment.status !== "live";
    for (const [, change] of environment.entries) {
      const entity = change.entity;
      if (entity === null) continue;
      const ref = scopeThreadRef(environmentId, entity.value.threadId);
      const threadKey = scopedThreadKey(ref);
      if (threads && !threads.has(threadKey)) continue;
      if (
        projects &&
        !projects.has(scopedProjectKey({ environmentId, projectId: entity.value.projectId }))
      )
        continue;
      if (entity.type === "summary") {
        summaries.set(threadKey, { ref, summary: entity.value, stale });
        continue;
      }
      const item = entity.value;
      if (item.status !== "open" || (selection.kinds && !selection.kinds.includes(item.kind)))
        continue;
      const priority = item.kind === "disconnect" ? "warning" : "blocking-error";
      if (selection.priorities && !selection.priorities.includes(priority)) continue;
      items.push({
        key: `${environmentId}:${item.attentionId}`,
        ref,
        item,
        stale,
        priority,
      });
      if (stale) {
        staleItemCount += 1;
        staleThreads.add(threadKey);
      } else {
        liveItemCount += 1;
        liveThreads.add(threadKey);
      }
    }
  }
  items.sort(
    (left, right) =>
      Number(left.priority === "warning") - Number(right.priority === "warning") ||
      Date.parse(left.item.openedAt) - Date.parse(right.item.openedAt) ||
      compareText(left.ref.environmentId, right.ref.environmentId) ||
      compareText(left.ref.threadId, right.ref.threadId) ||
      compareText(left.item.attentionId, right.item.attentionId),
  );
  return {
    complete,
    environments,
    items,
    summaries,
    itemCount: items.length,
    threadCount: liveThreads.size + staleThreads.size,
    liveItemCount,
    liveThreadCount: liveThreads.size,
    staleItemCount,
    staleThreadCount: staleThreads.size,
  };
}

const decodeHint = Schema.decodeUnknownOption(RelayAgentActivityAggregateRow);

/** Relay timestamps cannot compete with direct revisions, even after disconnection or deletion. */
export function selectAttentionRelayHints(
  state: AttentionWorkspaceState,
  input: ReadonlyArray<unknown>,
) {
  const hints = new Map<string, RelayAgentActivityAggregateRow>();
  let rejectedCount = 0;
  for (const value of input) {
    const decoded = decodeHint(value);
    if (Option.isNone(decoded) || !Number.isFinite(Date.parse(decoded.value.updatedAt))) {
      rejectedCount += 1;
      continue;
    }
    const hint = decoded.value;
    const environment = state.environments.get(hint.environmentId);
    if (
      !environment ||
      environment.hasSnapshot ||
      (environment.status !== "loading" && environment.status !== "unsupported")
    ) {
      rejectedCount += 1;
      continue;
    }
    const key = scopedThreadKey(scopeThreadRef(hint.environmentId, hint.threadId));
    const previous = hints.get(key);
    if (previous && Date.parse(previous.updatedAt) >= Date.parse(hint.updatedAt)) continue;
    hints.set(key, hint);
  }
  return { hints, rejectedCount };
}
