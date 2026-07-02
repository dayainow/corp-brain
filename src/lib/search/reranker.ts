import type { VectorDocument } from "@/lib/vector-store/types";
import { expandKoreanTokens, normalizeKoreanQuery } from "./korean-query";

export interface RankedDocument {
  document: VectorDocument;
  rrfScore: number;
  rerankScore: number;
}

/**
 * 2차 Re-ranking: RRF 후보에 대해 키워드·제목·파일명 매칭으로 재정렬
 * Cross-encoder 대신 경량 휴리스틱 (로컬 환경 최적화)
 */
export function rerankCandidates(
  query: string,
  candidates: Array<{ document: VectorDocument; rrfScore: number }>,
  topK: number = 5
): RankedDocument[] {
  const q = normalizeKoreanQuery(query);
  const qTokens = expandKoreanTokens(query);

  const scored = candidates.map(({ document, rrfScore }) => {
    const text = document.text.toLowerCase();
    const fileName = (document.metadata.fileName as string).toLowerCase();
    const fileStem = fileName.replace(/\.(md|pdf|docx)$/i, "");
    const title = ((document.metadata.title as string) ?? "").toLowerCase();

    let boost = 0;

    // 정확한 구문 매칭
    if (q.length > 2 && text.includes(q)) boost += 3;

    // 파일명·제목 매칭
    for (const token of qTokens) {
      if (fileName.includes(token) || fileStem.includes(token)) boost += 1.5;
      if (title.includes(token)) boost += 1.2;
    }

    // 토큰 커버리지
    const matched = qTokens.filter((t) => text.includes(t)).length;
    if (qTokens.length > 0) boost += (matched / qTokens.length) * 2;

    // 한국어 핵심어 부분 매칭 (2글자 이상)
    const bigrams = qTokens.flatMap((t) =>
      t.length >= 2 ? [t] : []
    );
    for (const bg of bigrams) {
      if (text.includes(bg)) boost += 0.3;
    }

    const rerankScore = rrfScore * 10 + boost;

    return { document, rrfScore, rerankScore };
  });

  scored.sort((a, b) => b.rerankScore - a.rerankScore);
  return scored.slice(0, topK);
}
