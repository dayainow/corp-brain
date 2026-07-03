import type { DownQueryStat } from "../audit/feedback-stats";
import type { EvalQuery } from "./metrics";

export interface EvalCandidate {
  query: string;
  suggestedExpectedFiles: string[];
  role: string;
  downCount: number;
  lastAt: string;
  inEval: boolean;
}

/** 비교용 질문 정규화 */
export function normalizeQuery(query: string): string {
  return query
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[?!.…]+$/g, "");
}

export function isQueryInEval(query: string, evalQueries: EvalQuery[]): boolean {
  const n = normalizeQuery(query);
  return evalQueries.some((q) => {
    const eq = normalizeQuery(q.query);
    return eq === n || eq.includes(n) || n.includes(eq);
  });
}

/** 출처 표시명 → eval expectedFiles 형식 (.md 등) */
export function normalizeSourceToFileName(source: string): string {
  const s = source.trim();
  if (/\.(md|pdf|docx)$/i.test(s)) return s;
  return `${s}.md`;
}

export function suggestEvalCandidates(
  downQueries: DownQueryStat[],
  evalQueries: EvalQuery[]
): EvalCandidate[] {
  return downQueries.map((d) => ({
    query: d.query,
    suggestedExpectedFiles: d.sources.map(normalizeSourceToFileName),
    role: d.role,
    downCount: d.count,
    lastAt: d.lastAt,
    inEval: isQueryInEval(d.query, evalQueries),
  }));
}

export function filterNewEvalCandidates(candidates: EvalCandidate[]): EvalCandidate[] {
  return candidates.filter((c) => !c.inEval && c.query !== "(질문 없음)");
}
