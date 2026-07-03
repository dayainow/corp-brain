import { describe, expect, it } from "vitest";
import { getEmbeddingPreset, resolveAbPresets } from "./models";

describe("embedding models", () => {
  it("프리셋 키로 모델을 조회한다", () => {
    expect(getEmbeddingPreset("e5_small")?.dimensions).toBe(384);
    expect(getEmbeddingPreset("ko_sroberta")?.dimensions).toBe(768);
  });

  it("A/B 기본 프리셋 2종을 반환한다", () => {
    const specs = resolveAbPresets();
    expect(specs).toHaveLength(2);
    expect(specs.map((s) => s.key)).toEqual(["e5_small", "ko_sroberta"]);
  });
});
