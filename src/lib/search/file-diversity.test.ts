import { describe, expect, it } from "vitest";
import { diversifyByFile } from "./file-diversity";
import type { VectorDocument } from "@/lib/vector-store/types";

function doc(fileName: string, score: number) {
  const document: VectorDocument = {
    id: `${fileName}-0`,
    text: "sample",
    embedding: [],
    metadata: { fileName, source: "", role: "general" },
  };
  return { document, rerankScore: score };
}

describe("diversifyByFile", () => {
  it("파일당 1청크 우선으로 topK를 채운다", () => {
    const ranked = [
      doc("a.md", 10),
      doc("a.md", 9),
      doc("b.md", 8),
      doc("c.md", 7),
    ];
    const result = diversifyByFile(ranked, 3);
    expect(result.map((r) => r.document.metadata.fileName)).toEqual([
      "a.md",
      "b.md",
      "c.md",
    ]);
  });
});
