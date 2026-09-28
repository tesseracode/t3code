import { describe, expect, it } from "vite-plus/test";
import * as Schema from "effect/Schema";
import {
  AttentionId,
  RequestAttentionItem,
  ThreadAttentionItem,
  ThreadAwarenessSummary,
} from "./attention.ts";
const decodeItem = Schema.decodeUnknownSync(RequestAttentionItem);
const decodeId = Schema.decodeUnknownSync(AttentionId);
const decodeAttention = Schema.decodeUnknownSync(ThreadAttentionItem);
const decodeSummary = Schema.decodeUnknownSync(ThreadAwarenessSummary);

const row = {
  attentionId: "a".repeat(64),
  projectId: "project",
  threadId: "thread",
  turnId: null,
  requestId: "request",
  kind: "approval",
  revision: 1,
  sourceEventId: "event",
  sourceSequence: 1,
  openedAt: "2026-09-27T00:00:00Z",
  updatedAt: "2026-09-27T00:00:00Z",
  status: "open",
  reasonCode: "approval_requested",
  resolvedAt: null,
};
describe("current request attention contracts", () => {
  it("requires bounded lifecycle summaries and redacted static lifecycle item titles", () => {
    const summary = {
      projectId: row.projectId,
      threadId: row.threadId,
      turnId: null,
      phase: "failed",
      approvalCount: 999,
      inputCount: 0,
      failureCount: 1,
      disconnectCount: 0,
      countsOverflowed: true,
      revision: 1,
      sourceEventId: row.sourceEventId,
      sourceSequence: row.sourceSequence,
      updatedAt: row.updatedAt,
    };
    expect(decodeSummary(summary)).toEqual(summary);
    expect(() => decodeSummary({ ...summary, approvalCount: 1000 })).toThrow();
    expect(() => decodeSummary({ ...summary, failureCount: -1 })).toThrow();
    const lifecycle = {
      ...row,
      turnId: "turn",
      requestId: null,
      kind: "failure",
      title: "Agent failed",
      reasonCode: "provider_failed",
    };
    expect(decodeAttention({ ...lifecycle, detail: "private tool output" })).toEqual(lifecycle);
    expect(() => decodeAttention({ ...lifecycle, title: "private tool output" })).toThrow();
  });
  it("accepts bounded request state without storing prompts, commands or raw failure details", () => {
    const decoded = decodeItem({
      ...row,
      detail: "private command",
    });
    expect(decoded).toEqual(row);
    expect(
      decodeItem({
        ...row,
        status: "resolved",
        reasonCode: "request_resolved",
        resolvedAt: row.updatedAt,
      }).status,
    ).toBe("resolved");
  });
  it("rejects invalid identity, revision and lifecycle combinations", () => {
    expect(() => decodeId("thread/request")).toThrow();
    for (const change of [
      { revision: 0 },
      { revision: 1.5 },
      { sourceSequence: -1 },
      { requestId: "" },
      { kind: "failure" },
      { reasonCode: "raw-provider-error" },
      { status: "resolved" },
      { resolvedAt: row.updatedAt },
    ])
      expect(() => decodeItem({ ...row, ...change })).toThrow();
  });
});
