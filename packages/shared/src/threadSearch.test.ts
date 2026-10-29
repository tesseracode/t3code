import { expect, it } from "vite-plus/test";
import {
  countThreadSearchOccurrences,
  findThreadSearchOccurrences,
  findThreadSearchRanges,
} from "./threadSearch.ts";

it("finds non-overlapping occurrences without invalidating Unicode offsets", () => {
  expect(findThreadSearchOccurrences("Deploy the Deployment", "deploy")).toEqual([0, 11]);
  expect(findThreadSearchOccurrences("aaaa", "aa")).toEqual([0, 2]);
  expect(findThreadSearchOccurrences("İİİ needle", "needle")).toEqual([4]);
});

it("matches both Greek sigma forms without changing source offsets", () => {
  expect(findThreadSearchOccurrences("ΟΣ ος οσ", "Σ")).toEqual([1, 4, 7]);
  expect(findThreadSearchOccurrences("ΟΣ ος οσ", "ς")).toEqual([1, 4, 7]);
  expect(findThreadSearchOccurrences("İ ΟΣ", "Σ")).toEqual([3]);
});

it("normalizes compatibility text while preserving the original highlight bounds", () => {
  const text = "ＦＯＯ ﬃ cafe\u0301 가";
  for (const [query, original] of [
    ["foo", "ＦＯＯ"],
    ["ffi", "ﬃ"],
    ["café", "cafe\u0301"],
    ["가", "가"],
  ]) {
    const ranges = findThreadSearchRanges(text, query!);
    expect(countThreadSearchOccurrences(text, query!)).toBe(1);
    expect(ranges.map(({ start, end }) => text.slice(start, end))).toEqual([original]);
  }
  expect(findThreadSearchRanges("ffi", "ﬃ")).toEqual([{ start: 0, end: 3 }]);
  expect(findThreadSearchRanges("İİ", "i")).toEqual([
    { start: 0, end: 1 },
    { start: 1, end: 2 },
  ]);
});
