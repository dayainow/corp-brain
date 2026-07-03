import { describe, it, expect } from "vitest";
import { suggestFollowUpQuestions } from "./follow-up-suggestions";

describe("suggestFollowUpQuestions", () => {
  it("출처가 2개 이상이면 비교 질문을 제안한다", () => {
    const questions = suggestFollowUpQuestions(
      "휴가 규정",
      "연차는 15일입니다.",
      ["연차휴가규정.md", "휴가신청서양식.md"]
    );
    expect(questions.some((q) => q.includes("비교"))).toBe(true);
    expect(questions.length).toBeLessThanOrEqual(3);
  });

  it("출처 1개면 절차 관련 질문을 제안한다", () => {
    const questions = suggestFollowUpQuestions(
      undefined,
      "재택은 주 2회입니다.",
      ["재택근무정책.md"]
    );
    expect(questions.some((q) => q.includes("신청") || q.includes("절차"))).toBe(true);
  });

  it("최대 3개까지만 반환한다", () => {
    const questions = suggestFollowUpQuestions(
      "질문",
      "답변",
      ["a.md", "b.md", "c.md"]
    );
    expect(questions.length).toBeLessThanOrEqual(3);
  });
});
