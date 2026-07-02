/**
 * RAG 검색 품질 메트릭
 */

export interface EvalQuery {
  query: string;
  expectedFiles: string[];
  role?: string;
}

export interface EvalResult {
  query: string;
  expectedFiles: string[];
  retrievedFiles: string[];
  hitAt1: boolean;
  hitAt3: boolean;
  reciprocalRank: number;
}

/** Hit@K: 상위 K개에 정답 파일이 하나라도 있는지 */
export function hitAtK(
  retrievedFiles: string[],
  expectedFiles: string[],
  k: number
): boolean {
  const topK = retrievedFiles.slice(0, k);
  return expectedFiles.some((expected) =>
    topK.some((r) => r.includes(expected) || expected.includes(r))
  );
}

/** MRR: 첫 정답의 역순위 */
export function reciprocalRank(
  retrievedFiles: string[],
  expectedFiles: string[]
): number {
  for (let i = 0; i < retrievedFiles.length; i++) {
    const match = expectedFiles.some(
      (e) =>
        retrievedFiles[i].includes(e) ||
        e.includes(retrievedFiles[i])
    );
    if (match) return 1 / (i + 1);
  }
  return 0;
}

export function evaluateQuery(
  query: EvalQuery,
  retrievedFiles: string[]
): EvalResult {
  return {
    query: query.query,
    expectedFiles: query.expectedFiles,
    retrievedFiles,
    hitAt1: hitAtK(retrievedFiles, query.expectedFiles, 1),
    hitAt3: hitAtK(retrievedFiles, query.expectedFiles, 3),
    reciprocalRank: reciprocalRank(retrievedFiles, query.expectedFiles),
  };
}

export function aggregateMetrics(results: EvalResult[]) {
  if (results.length === 0) {
    return { hitAt1: 0, hitAt3: 0, mrr: 0, count: 0 };
  }
  return {
    hitAt1: results.filter((r) => r.hitAt1).length / results.length,
    hitAt3: results.filter((r) => r.hitAt3).length / results.length,
    mrr: results.reduce((sum, r) => sum + r.reciprocalRank, 0) / results.length,
    count: results.length,
  };
}
