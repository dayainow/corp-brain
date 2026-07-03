import { describe, it, expect } from "vitest";
import { buildRagSourceCards, displaySourceName, extractRagSourcesFromParts } from "./ui-message";

describe("buildRagSourceCards", () => {
  it("파일별 첫 청크 스니펫으로 카드를 만든다", () => {
    const cards = buildRagSourceCards([
      {
        id: "1",
        text: "연차는 15일입니다.",
        metadata: { fileName: "연차휴가규정.md" },
      },
      {
        id: "2",
        text: "중복 청크",
        metadata: { fileName: "연차휴가규정.md" },
      },
      {
        id: "3",
        text: "재택 주 2회",
        metadata: { fileName: "재택근무정책.md" },
      },
    ]);

    expect(cards).toHaveLength(2);
    expect(cards[0]).toMatchObject({
      fileName: "연차휴가규정.md",
      displayName: "연차휴가규정",
      snippet: "연차는 15일입니다.",
    });
  });
});

describe("extractRagSourcesFromParts", () => {
  it("data-rag-sources 파트에서 출처를 추출한다", () => {
    const sources = extractRagSourcesFromParts([
      {
        type: "data-rag-sources",
        data: {
          sources: [{ fileName: "a.md", displayName: "a", snippet: "내용" }],
        },
      },
    ]);
    expect(sources).toHaveLength(1);
    expect(sources[0].fileName).toBe("a.md");
  });
});

describe("displaySourceName", () => {
  it("확장자를 제거한다", () => {
    expect(displaySourceName("휴가신청서양식.md")).toBe("휴가신청서양식");
  });
});
