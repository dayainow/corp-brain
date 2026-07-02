import type { RankedDocument } from "./reranker";

/** 파일당 최고 점수 청크 1개 우선 → topK (검색 다양성·Hit@K 개선) */
export function diversifyByFile(
  ranked: RankedDocument[],
  topK: number
): RankedDocument[] {
  const seen = new Set<string>();
  const diverse: RankedDocument[] = [];

  for (const item of ranked) {
    const fileName = item.document.metadata.fileName as string;
    if (seen.has(fileName)) continue;
    seen.add(fileName);
    diverse.push(item);
    if (diverse.length >= topK) return diverse;
  }

  for (const item of ranked) {
    if (diverse.includes(item)) continue;
    diverse.push(item);
    if (diverse.length >= topK) break;
  }

  return diverse;
}
