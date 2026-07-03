import { describe, expect, it } from "vitest";
import {
  isQueryInEval,
  normalizeQuery,
  normalizeSourceToFileName,
  suggestEvalCandidates,
  filterNewEvalCandidates,
} from "./eval-candidates";
import type { EvalQuery } from "./metrics";

const evalQueries: EvalQuery[] = [
  { query: "우리 회사 휴가 규정이 어떻게 돼?", expectedFiles: ["연차휴가규정.md"], role: "general" },
];

describe("eval-candidates", () => {
  it("질문을 정규화한다", () => {
    expect(normalizeQuery("  연차 규정?  ")).toBe("연차 규정");
  });

  it("eval에 있는 질문을 감지한다", () => {
    expect(isQueryInEval("휴가 규정이 어떻게 돼?", evalQueries)).toBe(true);
    expect(isQueryInEval("출장비 규정은?", evalQueries)).toBe(false);
  });

  it("출처명을 파일명으로 변환한다", () => {
    expect(normalizeSourceToFileName("연차휴가규정")).toBe("연차휴가규정.md");
    expect(normalizeSourceToFileName("nda.pdf")).toBe("nda.pdf");
  });

  it("down 질문에서 eval 후보를 제안한다", () => {
    const candidates = suggestEvalCandidates(
      [
        {
          query: "출장비 규정은?",
          count: 2,
          sources: ["출장경비정책"],
          lastAt: "2026-07-03T10:00:00.000Z",
          role: "manager",
        },
      ],
      evalQueries
    );
    expect(candidates[0].inEval).toBe(false);
    expect(candidates[0].suggestedExpectedFiles).toEqual(["출장경비정책.md"]);
    expect(filterNewEvalCandidates(candidates)).toHaveLength(1);
  });
});
