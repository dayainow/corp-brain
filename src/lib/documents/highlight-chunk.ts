export interface ChunkHighlightRange {
  start: number;
  end: number;
  matchedText: string;
}

/** RAG 청크 텍스트가 원문에서 차지하는 구간을 찾는다 */
export function findChunkHighlightRange(
  document: string,
  chunk: string
): ChunkHighlightRange | null {
  const trimmed = chunk.trim();
  if (!trimmed || !document) return null;

  const attempts = uniqueStrings([
    trimmed,
    trimmed.replace(/…$/u, "").trim(),
    trimmed.replace(/\s+/g, " ").trim(),
  ]).filter((s) => s.length >= 8);

  for (const needle of attempts) {
    const idx = document.indexOf(needle);
    if (idx >= 0) {
      return { start: idx, end: idx + needle.length, matchedText: needle };
    }
  }

  const pattern = buildFlexibleWhitespacePattern(trimmed);
  if (pattern) {
    const match = pattern.exec(document);
    if (match?.[0] && match.index >= 0) {
      return {
        start: match.index,
        end: match.index + match[0].length,
        matchedText: match[0],
      };
    }
  }

  return null;
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

function buildFlexibleWhitespacePattern(chunk: string): RegExp | null {
  const words = chunk
    .replace(/…$/u, "")
    .split(/\s+/)
    .map((w) => w.replace(/[^\p{L}\p{N}_\-./%]+/gu, ""))
    .filter((w) => w.length >= 2)
    .slice(0, 16);

  if (words.length < 2) return null;

  const escaped = words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  return new RegExp(escaped.join("[\\s\\n\\r]+"), "u");
}
