import type { AttentionChange, AttentionStreamMessage } from "@t3tools/contracts";
import * as HashMap from "effect/HashMap";
import * as Option from "effect/Option";
import type { AttentionSyncState } from "../attentionSync.ts";

/** Retains eligible current entities across consumer batching, not an event backlog. */
export function projectAttentionNotifications(
  candidates: HashMap.HashMap<string, AttentionChange>,
  before: AttentionSyncState,
  after: AttentionSyncState,
  message: AttentionStreamMessage,
) {
  if (after.status !== "live" || message.type === "sync-complete")
    return HashMap.empty<string, AttentionChange>();
  if (message.type !== "delta" || message.position <= before.position) return candidates;
  let next = candidates;
  for (const change of message.changes) {
    const old = HashMap.get(before.entries, change.key);
    if (Option.isSome(old) && old.value.version >= change.version) continue;
    const entity = change.entity;
    if (
      !message.notificationEligible ||
      entity === null ||
      (entity.type === "item" ? entity.value.status !== "open" : entity.value.phase !== "completed")
    ) {
      next = HashMap.remove(next, change.key);
      continue;
    }
    if (entity.type === "summary") {
      const previous = Option.getOrNull(old)?.entity;
      if (entity.value.turnId === null) continue;
      if (
        previous?.type === "summary" &&
        previous.value.phase === "completed" &&
        previous.value.turnId === entity.value.turnId
      )
        continue;
    }
    next = HashMap.set(next, change.key, change);
  }
  return next;
}
