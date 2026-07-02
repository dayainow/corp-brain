import { describe, it, expect } from "vitest";
import { reciprocalRankFusion } from "./hybrid-core";
import type { VectorDocument } from "@/lib/vector-store/types";

function doc(id: string, text: string, embedding: number[]): VectorDocument {
  return {
    id,
    text,
    embedding,
    metadata: { fileName: `${id}.md`, role: "general", source: "/", title: id },
  };
}

describe("reciprocalRankFusion", () => {
  it("벡터·키워드 점수를 RRF로 병합", () => {
    const vectors = [
      doc("a", "연차 휴가 규정", [1, 0, 0]),
      doc("b", "출장 경비 정책", [0, 1, 0]),
      doc("c", "연차 신청 양식", [0.9, 0.1, 0]),
    ];
    const queryEmbedding = [1, 0, 0];
    const ranked = reciprocalRankFusion(vectors, "연차 휴가", queryEmbedding);
    expect(ranked[0].document.id).toBe("a");
  });
});
