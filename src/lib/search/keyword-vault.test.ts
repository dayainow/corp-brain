import { describe, it, expect } from "vitest";
import {
  buildKeywordSnippet,
  scoreKeywordDocument,
} from "@/lib/search/keyword-vault";
import type { VectorDocument } from "@/lib/vector-store/types";

function makeDoc(
  fileName: string,
  text: string,
  title?: string
): VectorDocument {
  return {
    id: `${fileName}-0`,
    text,
    metadata: { source: "/", fileName, role: "general", title },
    embedding: [],
  };
}

describe("keyword-vault", () => {
  it("본문 키워드가 있으면 점수를 부여한다", () => {
    const doc = makeDoc("연차휴가규정.md", "연차는 15일이며 반차는 4시간입니다.");
    expect(scoreKeywordDocument("반차", doc)).toBeGreaterThan(0);
  });

  it("매칭 없으면 0점", () => {
    const doc = makeDoc("회의록.md", "주간 회의 일정 안내");
    expect(scoreKeywordDocument("휴가", doc)).toBe(0);
  });

  it("파일명 매칭에 가산점", () => {
    const body = makeDoc("unrelated.md", "일반 안내");
    const named = makeDoc("재택근무정책.md", "재택 근무 세부 규정");
    expect(scoreKeywordDocument("재택", named)).toBeGreaterThan(
      scoreKeywordDocument("재택", body)
    );
  });

  it("스니펫에 매칭 구간 주변을 포함한다", () => {
    const text =
      "앞부분 안내입니다. " +
      "연차는 입사 1년 후 15일 부여됩니다. " +
      "뒷부분 참고 사항.";
    const snippet = buildKeywordSnippet(text, "연차");
    expect(snippet.toLowerCase()).toContain("연차");
  });
});
