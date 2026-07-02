import { describe, it, expect } from "vitest";
import { isSupportedExtension, getFileType } from "@/lib/parsers";

describe("Document parsers", () => {
  it("지원 확장자 판별", () => {
    expect(isSupportedExtension(".md")).toBe(true);
    expect(isSupportedExtension(".pdf")).toBe(true);
    expect(isSupportedExtension(".docx")).toBe(true);
    expect(isSupportedExtension(".txt")).toBe(false);
  });

  it("파일 타입 분류", () => {
    expect(getFileType(".md")).toBe("markdown");
    expect(getFileType(".pdf")).toBe("pdf");
    expect(getFileType(".docx")).toBe("docx");
    expect(getFileType(".txt")).toBe("unknown");
  });
});

describe("chunkText plain text fallback", () => {
  it("헤더 없는 긴 텍스트도 청킹", async () => {
    const { chunkText } = await import("@/lib/indexer");
    const longText = "가".repeat(2500);
    const chunks = chunkText(longText, 1000);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.join("").length).toBeGreaterThanOrEqual(2500);
  });
});
