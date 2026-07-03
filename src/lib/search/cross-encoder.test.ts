import { describe, expect, it } from "vitest";
import {
  extractClassifierScore,
  extractLogitScore,
  normalizeCrossEncoderModelId,
} from "./cross-encoder";

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

describe("normalizeCrossEncoderModelId", () => {
  it("cross-encoder/* 를 Xenova/* 로 변환한다", () => {
    expect(normalizeCrossEncoderModelId("cross-encoder/ms-marco-MiniLM-L-6-v2")).toBe(
      "Xenova/ms-marco-MiniLM-L-6-v2"
    );
    expect(normalizeCrossEncoderModelId("Xenova/ms-marco-MiniLM-L-6-v2")).toBe(
      "Xenova/ms-marco-MiniLM-L-6-v2"
    );
  });
});

describe("extractLogitScore", () => {
  it("단일 로짓 회귀 헤드에서 배치 인덱스 점수를 읽는다", () => {
    const logits = { data: [0.1, 0.9, 0.5], dims: [3, 1] };
    expect(extractLogitScore(logits, 0)).toBe(0.1);
    expect(extractLogitScore(logits, 1)).toBe(0.9);
  });

  it("2-class 분류에서 positive 로짓을 읽는다", () => {
    const logits = { data: [0.2, 0.8, 0.6, 0.4], dims: [2, 2] };
    expect(extractLogitScore(logits, 0)).toBe(0.8);
    expect(extractLogitScore(logits, 1)).toBe(0.4);
  });
});
