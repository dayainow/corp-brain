export interface DocumentPreviewTarget {
  fileName: string;
  highlightText?: string;
}

/** fileName 키로 청크 하이라이트 텍스트를 조회 (경로·베이스명 호환) */
export function resolveChunkHighlight(
  fileName: string,
  highlights: Record<string, string> | undefined
): string | undefined {
  if (!highlights || !fileName) return undefined;
  if (highlights[fileName]) return highlights[fileName];

  const base = fileName.split("/").pop() ?? fileName;
  if (highlights[base]) return highlights[base];

  for (const [key, text] of Object.entries(highlights)) {
    const keyBase = key.split("/").pop() ?? key;
    if (keyBase === base) return text;
  }

  return undefined;
}
