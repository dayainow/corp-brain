import { describe, it, expect } from "vitest";
import { hitAtK, reciprocalRank, aggregateMetrics, evaluateQuery } from "@/lib/search/metrics";
import { rerankCandidates } from "@/lib/search/reranker";
import type { VectorDocument } from "@/lib/vector-store/types";

describe("Search metrics", () => {
  it("Hit@3 계산", () => {
    expect(hitAtK(["a.md", "b.md", "vacation.md"], ["vacation.md"], 3)).toBe(true);
    expect(hitAtK(["a.md", "b.md", "c.md"], ["vacation.md"], 3)).toBe(false);
  });

  it("MRR 계산", () => {
    expect(reciprocalRank(["wrong.md", "vacation.md"], ["vacation.md"])).toBe(0.5);
    expect(reciprocalRank(["vacation.md"], ["vacation.md"])).toBe(1);
    expect(reciprocalRank(["wrong.md"], ["vacation.md"])).toBe(0);
  });

  it("집계 메트릭", () => {
    const results = [
      evaluateQuery({ query: "q1", expectedFiles: ["a.md"] }, ["a.md"]),
      evaluateQuery({ query: "q2", expectedFiles: ["b.md"] }, ["x.md"]),
    ];
    const agg = aggregateMetrics(results);
    expect(agg.hitAt1).toBe(0.5);
    expect(agg.count).toBe(2);
  });
});

describe("Re-ranker", () => {
  const makeDoc = (fileName: string, text: string): VectorDocument => ({
    id: `${fileName}-0`,
    text,
    metadata: { source: "/", fileName, role: "general" },
    embedding: [],
  });

  it("제목·키워드 매칭 문서를 상위로", () => {
    const candidates = [
      { document: makeDoc("unrelated.md", "회의 일정 안내"), rrfScore: 0.03 },
      { document: makeDoc("vacation.md", "휴가 규정 연차 15일"), rrfScore: 0.02 },
    ];
    const ranked = rerankCandidates("휴가 규정", candidates, 2);
    expect(ranked[0].document.metadata.fileName).toBe("vacation.md");
  });
});
