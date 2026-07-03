import { describe, it, expect } from "vitest";
import { resolveChunkHighlight } from "./preview-target";

describe("resolveChunkHighlight", () => {
  const map = {
    "연차휴가규정.md": "청크 텍스트",
    "전사공통/인사/표준nda.md": "NDA 조항",
  };

  it("정확한 fileName으로 조회한다", () => {
    expect(resolveChunkHighlight("연차휴가규정.md", map)).toBe("청크 텍스트");
  });

  it("베이스명으로 조회한다", () => {
    expect(resolveChunkHighlight("표준nda.md", map)).toBe("NDA 조항");
  });

  it("매핑이 없으면 undefined", () => {
    expect(resolveChunkHighlight("없음.md", map)).toBeUndefined();
  });
});
