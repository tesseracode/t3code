function foldThreadSearchCase(text: string): string {
  return text.toLowerCase().replace(/ς/g, "σ");
}

function scanThreadSearchOccurrences(text: string, query: string, offsets?: number[]): number {
  if (text.length === 0 || query.length === 0) return 0;

  const foldedText = foldThreadSearchCase(text.normalize("NFKC"));
  const foldedQuery = foldThreadSearchCase(query.normalize("NFKC"));
  let count = 0;
  let cursor = 0;

  while (cursor <= foldedText.length - foldedQuery.length) {
    const offset = foldedText.indexOf(foldedQuery, cursor);
    if (offset === -1) break;
    offsets?.push(offset);
    count += 1;
    cursor = offset + foldedQuery.length;
  }
  return count;
}

export function countThreadSearchOccurrences(text: string, query: string): number {
  return scanThreadSearchOccurrences(text, query);
}

export function findThreadSearchOccurrences(text: string, query: string): number[] {
  return findThreadSearchRanges(text, query).map((range) => range.start);
}

/** Map compatibility expansions and combining sequences back to the original DOM text. */
export function findThreadSearchRanges(
  text: string,
  query: string,
): { start: number; end: number }[] {
  const offsets: number[] = [];
  scanThreadSearchOccurrences(text, query, offsets);
  const queryLength = foldThreadSearchCase(query.normalize("NFKC")).length;
  if (text.normalize("NFKC") === text && foldThreadSearchCase(text).length === text.length)
    return offsets.map((start) => ({ start, end: start + queryLength }));
  const starts: number[] = [];
  const ends: number[] = [];
  const segments: { normalized: string; start: number; end: number }[] = [];
  for (const match of text.matchAll(/\P{M}\p{M}*|\p{M}+/gu)) {
    const segment = match[0];
    const normalized = segment.normalize("NFKC");
    const previous = segments.at(-1);
    // Hangul starters compose across combining-class-zero boundaries, including
    // compatibility Jamo. Other combining sequences are already grouped above.
    const boundary = (previous?.normalized.at(-1) ?? "") + (normalized[0] ?? "");
    if (previous && boundary.normalize("NFKC") !== boundary) {
      previous.normalized = (previous.normalized + normalized).normalize("NFKC");
      previous.end = match.index + segment.length;
    } else {
      segments.push({ normalized, start: match.index, end: match.index + segment.length });
    }
  }
  for (const { normalized, start, end } of segments) {
    const length = foldThreadSearchCase(normalized).length;
    for (let i = 0; i < length; i++) {
      starts.push(start);
      ends.push(end);
    }
  }
  return offsets.map((offset) => ({
    start: starts[offset]!,
    end: ends[offset + queryLength - 1]!,
  }));
}
