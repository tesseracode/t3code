import { describe, expect, it } from "vite-plus/test";
import * as Schema from "effect/Schema";
import { AttentionId, RequestAttentionItem } from "./attention.ts";
const decodeItem = Schema.decodeUnknownSync(RequestAttentionItem);
const decodeId = Schema.decodeUnknownSync(AttentionId);

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
