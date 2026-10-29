import type { ThreadFindStart } from "./threadFind";
import { collectThreadFindRanges } from "./threadFindHighlights";

export function readThreadFindPosition(
  container: HTMLElement,
  query: string,
  resolveEntry: (rowId: string) => string | undefined,
  contentInsetEndAdjustment: number,
): ThreadFindStart | undefined {
  const viewport = container.getBoundingClientRect();
  for (const row of container.querySelectorAll<HTMLElement>(
    "[data-timeline-row-id], [data-thread-find-entry-id]",
  )) {
    if (row.querySelector("[data-thread-find-entry-id]")) continue;
    const rect = row.getBoundingClientRect();
    if (rect.bottom <= viewport.top || rect.top >= viewport.bottom - contentInsetEndAdjustment)
      continue;
    const group = row.closest("[data-tool-group-scroll]")?.getBoundingClientRect();
    if (group && (rect.bottom <= group.top || rect.top >= group.bottom)) continue;
    const rowId = row.dataset.threadFindEntryId ?? row.dataset.timelineRowId;
    const entryId = rowId ? resolveEntry(rowId) : undefined;
    if (!entryId) continue;
    const matches = collectThreadFindRanges(row, query);
    const next = matches.find((match) => match.range.getBoundingClientRect().bottom > viewport.top);
    return { entryId, occurrence: next?.occurrence ?? matches.length };
  }
  return undefined;
}
