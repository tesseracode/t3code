import { describe, expect, it } from "vite-plus/test";
import * as Schema from "effect/Schema";
import { AttentionSubscribeInput, AttentionStreamMessage } from "./attentionSync.ts";
const decodeInput = Schema.decodeUnknownSync(AttentionSubscribeInput);
const decodeMessage = Schema.decodeUnknownSync(AttentionStreamMessage);
describe("attention synchronization contracts", () => {
  it("bounds pages and filter fan-out without imposing a dataset limit", () => {
    expect(decodeInput({ pageSize: 100, filter: { threadIds: ["thread"] } }).pageSize).toBe(100);
    for (const value of [0, 101, 1.5]) expect(() => decodeInput({ pageSize: value })).toThrow();
    expect(() => decodeInput({ filter: { projectIds: Array(33).fill("project") } })).toThrow();
    expect(() => decodeInput({ cursor: "" })).toThrow();
    expect(() => decodeInput({ cursor: "a".repeat(4097) })).toThrow();
  });
  it("requires an explicit fence and reset reason", () => {
    expect(decodeMessage({ type: "reset-required", reason: "rebuilding" }).type).toBe(
      "reset-required",
    );
    expect(() => decodeMessage({ type: "sync-complete", position: 1 })).toThrow();
    expect(() => decodeMessage({ type: "reset-required", reason: "unknown" })).toThrow();
  });
});
