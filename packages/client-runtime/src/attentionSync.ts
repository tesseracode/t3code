import type {
  AttentionChange,
  AttentionDeliveryCursor,
  AttentionPageToken,
  AttentionStreamMessage,
  EnvironmentId,
} from "@t3tools/contracts";
import * as HashMap from "effect/HashMap";
import * as Option from "effect/Option";

export interface AttentionSyncState {
  readonly status: "empty" | "syncing" | "live" | "stale" | "reset-required";
  readonly environmentId: EnvironmentId | null;
  readonly generation: string | null;
  readonly cursor: AttentionDeliveryCursor | null;
  readonly position: number;
  readonly pageToken: AttentionPageToken | null;
  readonly stagedMaxVersion: number;
  readonly entries: HashMap.HashMap<string, AttentionChange>;
  readonly staging: HashMap.HashMap<string, AttentionChange>;
  readonly reason: string | null;
  readonly notificationCandidates: ReadonlyArray<AttentionChange>;
}
export const emptyAttentionSync = (): AttentionSyncState => ({
  status: "empty",
  environmentId: null,
  generation: null,
  cursor: null,
  position: 0,
  pageToken: null,
  entries: HashMap.empty(),
  staging: HashMap.empty(),
  reason: null,
  notificationCandidates: [],
  stagedMaxVersion: 0,
});
export function attentionSyncFailed(
  state: AttentionSyncState,
  reason: "unauthorized" | "disconnected",
): AttentionSyncState {
  if (reason === "disconnected" && state.status === "syncing") {
    return { ...emptyAttentionSync(), status: "reset-required", reason: "interrupted-sync" };
  }
  return reason === "unauthorized"
    ? { ...emptyAttentionSync(), status: "reset-required", reason }
    : { ...state, status: "stale", staging: HashMap.empty(), notificationCandidates: [], reason };
}
const invalid = (reason: string): AttentionSyncState => ({
  ...emptyAttentionSync(),
  status: "reset-required",
  reason,
});
function applyChanges(
  rows: HashMap.HashMap<string, AttentionChange>,
  changes: ReadonlyArray<AttentionChange>,
) {
  let next = rows;
  const accepted: AttentionChange[] = [];
  for (const change of changes) {
    if (change.entity !== null) {
      const expected =
        change.entity.type === "item"
          ? `item:${change.entity.value.attentionId}`
          : `summary:${change.entity.value.threadId}`;
      if (change.key !== expected) return null;
    }
    const previous = HashMap.get(next, change.key);
    if (Option.isSome(previous) && previous.value.version >= change.version) continue;
    next = HashMap.set(next, change.key, change);
    accepted.push(change);
  }
  return { rows: next, accepted };
}
/** Pages/replayed changes remain invisible until their complete fence is delivered. */
export function reduceAttentionStream(
  state: AttentionSyncState,
  message: AttentionStreamMessage,
): AttentionSyncState {
  if (message.type === "reset-required") return invalid(message.reason);
  if (message.type === "begin") {
    if (
      message.mode === "resume" &&
      ((state.status !== "stale" && state.status !== "live") ||
        state.cursor !== message.cursor ||
        state.environmentId !== message.environmentId ||
        state.generation !== message.generation ||
        state.position !== message.position)
    )
      return invalid("resume-without-matching-cache");
    return {
      ...emptyAttentionSync(),
      status: "syncing",
      environmentId: message.environmentId,
      generation: message.generation,
      cursor: message.cursor,
      position: message.position,
      stagedMaxVersion: message.position,
      staging: message.mode === "resume" ? state.entries : HashMap.empty(),
      entries: message.mode === "resume" ? state.entries : HashMap.empty(),
    };
  }
  if (state.status !== "syncing" && state.status !== "live") return invalid("message-before-begin");
  if (message.environmentId !== state.environmentId || message.generation !== state.generation)
    return invalid("scope-changed");
  if (message.type === "page") {
    if (
      state.status !== "syncing" ||
      message.cursor !== state.cursor ||
      message.position !== state.position ||
      message.previousPageToken !== state.pageToken ||
      message.pageToken === state.pageToken
    )
      return invalid("invalid-page-chain");
    const result = applyChanges(state.staging, message.entries);
    if (!result) return invalid("invalid-entity-key");
    return {
      ...state,
      staging: result.rows,
      pageToken: message.pageToken,
      notificationCandidates: [],
      stagedMaxVersion: Math.max(
        state.stagedMaxVersion,
        ...message.entries.map((entry) => entry.version),
      ),
    };
  }
  if (message.type === "delta") {
    if (message.cursor === state.cursor && message.position === state.position)
      return { ...state, notificationCandidates: [] };
    if (
      message.after !== state.cursor ||
      message.position <= state.position ||
      message.changes.some((row) => row.version > message.position || row.version <= state.position)
    )
      return invalid("noncontiguous-delta");
    const result = applyChanges(
      state.status === "syncing" ? state.staging : state.entries,
      message.changes,
    );
    if (!result) return invalid("invalid-entity-key");
    const common = {
      ...state,
      cursor: message.cursor,
      position: message.position,
      notificationCandidates: [],
    };
    if (state.status === "syncing")
      return {
        ...common,
        staging: result.rows,
        stagedMaxVersion: Math.max(state.stagedMaxVersion, message.position),
      };
    return {
      ...common,
      entries: HashMap.filter(result.rows, (row) => row.entity !== null),
      notificationCandidates: message.notificationEligible ? result.accepted : [],
    };
  }
  if (
    state.status !== "syncing" ||
    message.position !== state.position ||
    message.position < state.stagedMaxVersion
  )
    return invalid("invalid-fence");
  return {
    ...state,
    status: "live",
    entries: HashMap.filter(state.staging, (row) => row.entity !== null),
    staging: HashMap.empty(),
    cursor: message.cursor,
    position: message.position,
    notificationCandidates: [],
    reason: null,
  };
}
