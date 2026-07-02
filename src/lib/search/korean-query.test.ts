import { describe, it, expect } from "vitest";
import { expandKoreanTokens, normalizeKoreanQuery } from "./korean-query";

describe("korean-query", () => {
  it("한국어 조사·종결어미를 정규화", () => {
    expect(normalizeKoreanQuery("휴가 규정 알려줘")).toContain("휴가");
    expect(normalizeKoreanQuery("휴가 규정 알려줘")).toContain("규정");
  });

  it("동의어 토큰을 확장", () => {
    const tokens = expandKoreanTokens("NDA 계약서");
    expect(tokens).toContain("nda");
    expect(tokens.some((t) => t.includes("비밀"))).toBe(true);
  });
});
