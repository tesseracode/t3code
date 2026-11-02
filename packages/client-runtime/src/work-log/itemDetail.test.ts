import { describe, expect, it } from "vite-plus/test";
import { ThreadId, TurnItemId, type OrchestrationV2TurnItem } from "@t3tools/contracts";
import * as DateTime from "effect/DateTime";

import { turnItemHasDetail, turnItemOutputImages, turnItemOutputText } from "./itemDetail.ts";

function toolItem(output: unknown): Extract<OrchestrationV2TurnItem, { type: "dynamic_tool" }> {
  return {
    id: TurnItemId.make("images"),
    threadId: ThreadId.make("thread"),
    runId: null,
    nodeId: null,
    providerThreadId: null,
    providerTurnId: null,
    nativeItemRef: null,
    parentItemId: null,
    ordinal: 1,
    status: "completed",
    title: null,
    startedAt: null,
    completedAt: null,
    updatedAt: DateTime.makeUnsafe("2026-10-01T00:00:00Z"),
    type: "dynamic_tool",
    toolName: "screenshots",
    input: {},
    output,
  };
}

describe("tool image output parsing", () => {
  it.each(["array", "content"] as const)(
    "keeps markers for images beyond the served positions in %s output",
    (shape) => {
      // Detail responses retain image metadata after the server strips image bytes.
      const image = { type: "image", mimeType: "image/png" };
      const blocks = Array.from({ length: 8 }, () => ({ ...image }));
      const wrap = (content: unknown[]) => (shape === "array" ? content : { content });
      const withinLimit = toolItem(wrap(blocks));
      expect(turnItemOutputText(withinLimit)).toBeNull();
      expect(turnItemOutputImages(withinLimit)).toHaveLength(8);

      const overflow = toolItem(
        wrap([
          ...blocks,
          { type: "text", text: "Two additional screenshots:" },
          { ...image, sizeBytes: 100 },
          { type: "image", source: { type: "base64", media_type: "image/jpeg" } },
        ]),
      );
      expect(turnItemOutputImages(overflow)).toHaveLength(8);
      expect(turnItemOutputText(overflow)).toBe("Two additional screenshots:\n[image]\n[image]");
    },
  );
});

it("keeps typed model notices expandable without changing ordinary notice output", () => {
  const notice = {
    ...toolItem(null),
    type: "system_notice" as const,
    message: "",
  };
  expect(turnItemHasDetail(notice)).toBe(false);
  expect(turnItemOutputText({ ...notice, message: "Ordinary notice" })).toBeNull();
  const executionNotice = {
    ...notice,
    modelExecution: {
      version: 1 as const,
      kind: "gap" as const,
      nativeSessionId: "session",
      eventId: "gap",
      sourceTimestamp: "2026-11-02T10:00:00Z",
      receivedAt: "2026-11-02T10:00:01Z",
      status: "incomplete",
      startSource: "unknown" as const,
      gaps: ["missing start"],
    },
  };
  expect(turnItemHasDetail(executionNotice)).toBe(true);
  expect(turnItemOutputText(executionNotice)).toContain("Incomplete model execution telemetry");
});
