import { describe, expect, it } from "vitest";
import { extractClassifierScore } from "./cross-encoder";

describe("extractClassifierScore", () => {
  it("POSITIVE 라벨 점수를 우선 사용한다", () => {
    const output = [
      { label: "NEGATIVE", score: 0.2 },
      { label: "POSITIVE", score: 0.9 },
    ];
    expect(extractClassifierScore(output)).toBe(0.9);
  });

  it("양성 라벨이 없으면 최고 점수를 사용한다", () => {
    const output = [
      { label: "LABEL_0", score: 0.3 },
      { label: "LABEL_1", score: 0.6 },
    ];
    expect(extractClassifierScore(output)).toBe(0.6);
  });
});
