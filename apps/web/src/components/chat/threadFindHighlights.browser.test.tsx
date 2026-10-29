import { describe, expect, it } from "vite-plus/test";

import { collectThreadFindRanges } from "./threadFindHighlights";

function row(html: string) {
  const container = document.createElement("div");
  container.innerHTML = `<div data-timeline-row-id="row"><div data-thread-find-text>${html}</div></div>`;
  return container;
}

describe("collectThreadFindRanges", () => {
  it("finds matches split across inline token spans, in order", () => {
    const container = row(
      "<pre><code><span>con</span><span>st</span> a = <span>c</span>onst; const</code></pre>",
    );
    const ranges = collectThreadFindRanges(container, "const");
    expect(ranges.map((match) => [match.occurrence, match.range.toString()])).toEqual([
      [0, "const"],
      [1, "const"],
      [2, "const"],
    ]);
  });

  it("keeps activity identity and Unicode source bounds inside a grouped row", () => {
    const container = row(
      '<span data-thread-find-entry-id="tool"><span data-thread-find-text>ＦＯＯ ﬃ cafe\u0301</span></span>',
    );
    // Activity scopes sit below the outer virtualized group's row.
    container
      .querySelector("[data-timeline-row-id]")!
      .firstElementChild!.removeAttribute("data-thread-find-text");
    for (const [query, original] of [
      ["foo", "ＦＯＯ"],
      ["ffi", "ﬃ"],
      ["café", "cafe\u0301"],
    ]) {
      const matches = collectThreadFindRanges(container, query!);
      expect(
        matches.map((match) => [match.rowId, match.occurrence, match.range.toString()]),
      ).toEqual([["tool", 0, original]]);
    }
  });
});
