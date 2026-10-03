import { describe, expect, it } from "vite-plus/test";
import {
  ApprovalRequestId,
  AttentionDeliveryCursor,
  AttentionId,
  AttentionPageToken,
  EnvironmentId,
  EventId,
  ProjectId,
  ThreadId,
  TurnId,
  type AttentionChange,
  type AttentionStreamMessage,
} from "@t3tools/contracts";
import * as HashMap from "effect/HashMap";
import { emptyAttentionSync, reduceAttentionStream } from "../attentionSync.ts";
import { projectAttentionNotifications } from "./attentionNotifications.ts";

const checkpoint = (position: number) => ({
  environmentId: EnvironmentId.make("env"),
  generation: "generation",
  position,
  cursor: AttentionDeliveryCursor.make(`cursor-${position}`),
});
const item = (id = "a", revision = 1, version = revision): AttentionChange => ({
  key: `item:${id.repeat(64)}`,
  version,
  entity: {
    type: "item",
    value: {
      attentionId: AttentionId.make(id.repeat(64)),
      projectId: ProjectId.make("project"),
      threadId: ThreadId.make("thread"),
      turnId: null,
      requestId: ApprovalRequestId.make(id),
      kind: "approval",
      status: "open",
      reasonCode: "approval_requested",
      revision,
      sourceEventId: EventId.make(`event-${version}`),
      sourceSequence: version,
      openedAt: "2026-09-28T00:00:00Z",
      updatedAt: "2026-09-28T00:00:00Z",
      resolvedAt: null,
    },
  },
});
const summary = (
  version: number,
  phase: "running" | "completed",
  turn = "turn",
): AttentionChange => ({
  key: "summary:thread",
  version,
  entity: {
    type: "summary",
    value: {
      threadId: ThreadId.make("thread"),
      projectId: ProjectId.make("project"),
      turnId: TurnId.make(turn),
      phase,
      revision: version,
      approvalCount: 0,
      inputCount: 0,
      failureCount: 0,
      disconnectCount: 0,
      countsOverflowed: false,
      sourceEventId: EventId.make(`event-${version}`),
      sourceSequence: version,
      updatedAt: "2026-09-28T00:00:00Z",
    },
  },
});
function harness() {
  let state = emptyAttentionSync();
  let notifications = HashMap.empty<string, AttentionChange>();
  const send = (message: AttentionStreamMessage) => {
    const before = state;
    state = reduceAttentionStream(state, message);
    notifications = projectAttentionNotifications(notifications, before, state, message);
  };
  const delta = (position: number, changes: AttentionChange[], notificationEligible = true) =>
    send({
      ...checkpoint(position),
      type: "delta",
      after: state.cursor ?? checkpoint(0).cursor,
      notificationEligible,
      changes,
    });
  const bootstrap = (entries: AttentionChange[] = [], position = 0) => {
    send({ ...checkpoint(position), type: "begin", mode: "snapshot" });
    send({
      ...checkpoint(position),
      type: "page",
      pageToken: AttentionPageToken.make("page"),
      previousPageToken: null,
      entries,
    });
    send({ ...checkpoint(position), type: "sync-complete" });
  };
  return { send, delta, bootstrap, candidates: () => [...HashMap.values(notifications)] };
}
describe("attention notification eligibility", () => {
  it("does not notify snapshots, replay or rebuild but retains independent post-live candidates across batching", () => {
    const h = harness();
    h.bootstrap([item("a"), summary(1, "completed")], 1);
    expect(h.candidates()).toEqual([]);
    h.delta(2, [item("b", 1, 2)]);
    h.delta(3, [item("c", 1, 3)]);
    h.delta(4, []);
    expect(
      h
        .candidates()
        .map((row) => row.key)
        .sort(),
    ).toEqual([item("b").key, item("c").key]);
    h.send({ ...checkpoint(4), type: "begin", mode: "resume" });
    h.delta(5, [item("d", 1, 5)], false);
    h.send({ ...checkpoint(5), type: "sync-complete" });
    expect(h.candidates()).toEqual([]);
    h.send({ type: "reset-required", reason: "rebuilding" });
    h.bootstrap([item("f", 1, 6)], 6);
    expect(h.candidates()).toEqual([]);
  });
  it("removes resolved/deleted candidates and consumes only accepted material revisions", () => {
    const h = harness();
    h.bootstrap();
    h.delta(1, [item()]);
    h.delta(2, [item("a", 2, 2)]);
    expect(h.candidates()).toEqual([item("a", 2, 2)]);
    h.send({
      ...checkpoint(2),
      type: "delta",
      after: checkpoint(1).cursor,
      notificationEligible: true,
      changes: [item()],
    });
    expect(h.candidates()).toEqual([item("a", 2, 2)]);
    h.delta(3, [{ key: item().key, version: 3, entity: null }]);
    expect(h.candidates()).toEqual([]);
    h.delta(4, [item("b", 1, 4)], false);
    expect(h.candidates()).toEqual([]);
  });
  it("notifies a completion transition once, never subsequent same-turn revisions or a replayed completion", () => {
    const h = harness();
    h.bootstrap([summary(1, "completed")], 1);
    h.delta(2, [summary(2, "completed")]);
    expect(h.candidates()).toEqual([]);
    h.delta(3, [summary(3, "running", "next")]);
    h.delta(4, [summary(4, "completed", "next")]);
    h.delta(5, [summary(5, "completed", "next")]);
    expect(h.candidates()).toEqual([summary(4, "completed", "next")]);
    h.delta(6, [summary(6, "running", "third")]);
    expect(h.candidates()).toEqual([]);
  });
});
