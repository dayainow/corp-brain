import { describe, it, expect } from "vitest";
import { buildSearchQuery } from "./query-context";

describe("buildSearchQuery", () => {
  it("단독 질문은 그대로 반환", () => {
    const messages = [
      { role: "user", parts: [{ type: "text", text: "연차 휴가 규정 알려줘" }] },
    ];
    expect(buildSearchQuery(messages)).toBe("연차 휴가 규정 알려줘");
  });

  it("짧은 후속 질문에 이전 맥락을 붙임", () => {
    const messages = [
      { role: "user", parts: [{ type: "text", text: "연차 휴가 규정 알려줘" }] },
      {
        role: "assistant",
        parts: [{ type: "text", text: "연차는 15일입니다 [출처: 연차휴가규정.md]" }],
      },
      { role: "user", parts: [{ type: "text", text: "예외는?" }] },
    ];
    const query = buildSearchQuery(messages);
    expect(query).toContain("연차 휴가 규정");
    expect(query).toContain("현재 질문: 예외는?");
  });

  it("긴 독립 질문은 맥락 없이 반환", () => {
    const messages = [
      { role: "user", parts: [{ type: "text", text: "재택근무 정책에서 주 3일 이상 재택 시 승인 절차가 어떻게 되나요?" }] },
    ];
    expect(buildSearchQuery(messages)).toContain("재택근무 정책");
  });
});
