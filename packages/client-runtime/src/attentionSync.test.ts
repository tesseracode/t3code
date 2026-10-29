import { describe, expect, it } from "vite-plus/test";
import {
  AttentionDeliveryCursor,
  AttentionPageToken,
  AttentionId,
  EnvironmentId,
  ProjectId,
  ThreadId,
  ApprovalRequestId,
  EventId,
  type AttentionChange,
} from "@t3tools/contracts";
import * as HashMap from "effect/HashMap";
import * as Option from "effect/Option";
import { emptyAttentionSync, reduceAttentionStream, attentionSyncFailed } from "./attentionSync.ts";
const c = (n: number) => AttentionDeliveryCursor.make(`cursor-${n}`);
const checkpoint = (position: number) => ({
  environmentId: EnvironmentId.make("env"),
  generation: "generation",
  position,
  cursor: c(position),
});
const entry = (version: number): AttentionChange => ({
  key: `item:${"a".repeat(64)}`,
  version,
  entity: {
    type: "item",
    value: {
      attentionId: AttentionId.make("a".repeat(64)),
      threadId: ThreadId.make("thread"),
      projectId: ProjectId.make("project"),
      turnId: null,
      requestId: ApprovalRequestId.make("request"),
      kind: "approval",
      status: "open",
      reasonCode: "approval_requested",
      revision: 1,
      sourceEventId: EventId.make("event"),
      sourceSequence: 1,
      openedAt: "2026-09-28T00:00:00Z",
      updatedAt: "2026-09-28T00:00:00Z",
      resolvedAt: null,
    },
  },
});
describe("attention protocol reducer", () => {
  it("stages mutable pages and overlapping tombstones by delivery revision until the fence", () => {
    let state = reduceAttentionStream(emptyAttentionSync(), {
      ...checkpoint(0),
      type: "begin",
      mode: "snapshot",
    });
    state = reduceAttentionStream(state, {
      ...checkpoint(0),
      type: "page",
      pageToken: AttentionPageToken.make("page-1"),
      previousPageToken: null,
      entries: [entry(3)],
    });
    expect(HashMap.size(state.entries)).toBe(0);
    state = reduceAttentionStream(state, {
      ...checkpoint(2),
      type: "delta",
      after: c(0),
      notificationEligible: false,
      changes: [{ ...entry(2), entity: null }],
    });
    expect(Option.getOrThrow(HashMap.get(state.staging, entry(3).key)).entity).not.toBeNull();
    state = reduceAttentionStream(state, {
      ...checkpoint(3),
      type: "delta",
      after: c(2),
      notificationEligible: false,
      changes: [entry(3)],
    });
    state = reduceAttentionStream(state, { ...checkpoint(3), type: "sync-complete" });
    expect(state.status).toBe("live");
    expect(HashMap.size(state.entries)).toBe(1);
    expect(state.notificationCandidates).toEqual([]);
    const removed = {
      ...checkpoint(4),
      type: "delta" as const,
      after: c(3),
      notificationEligible: true,
      changes: [{ ...entry(4), entity: null }],
    };
    state = reduceAttentionStream(state, removed);
    expect(HashMap.size(state.entries)).toBe(0);
    expect(reduceAttentionStream(state, removed).entries).toBe(state.entries);
    expect(reduceAttentionStream(state, removed).notificationCandidates).toEqual([]);
    state = reduceAttentionStream(state, {
      ...checkpoint(5),
      type: "delta",
      after: c(4),
      notificationEligible: true,
      changes: [entry(5)],
    });
    expect(HashMap.size(state.entries)).toBe(1);
    expect(state.notificationCandidates).toHaveLength(1);
  });
  it("clears inaccessible state and rejects page-chain and delta gaps", () => {
    const begin = reduceAttentionStream(emptyAttentionSync(), {
      ...checkpoint(0),
      type: "begin",
      mode: "snapshot",
    });
    expect(
      reduceAttentionStream(begin, {
        ...checkpoint(0),
        type: "page",
        pageToken: AttentionPageToken.make("page-2"),
        previousPageToken: AttentionPageToken.make("missing"),
        entries: [],
      }).reason,
    ).toBe("invalid-page-chain");
    expect(
      reduceAttentionStream(begin, {
        ...checkpoint(2),
        type: "delta",
        after: c(1),
        notificationEligible: false,
        changes: [],
      }).reason,
    ).toBe("noncontiguous-delta");
    expect(attentionSyncFailed(begin, "unauthorized").cursor).toBeNull();
    expect(attentionSyncFailed(begin, "disconnected").cursor).toBeNull();
    expect(attentionSyncFailed(begin, "disconnected").reason).toBe("interrupted-sync");
    expect(
      reduceAttentionStream(begin, {
        ...checkpoint(0),
        environmentId: EnvironmentId.make("other"),
        type: "sync-complete",
      }).status,
    ).toBe("reset-required");
    expect(
      reduceAttentionStream(emptyAttentionSync(), {
        ...checkpoint(0),
        type: "begin",
        mode: "resume",
      }).status,
    ).toBe("reset-required");
  });
});
