import { describe, it, expect } from "vitest";
import { findChunkHighlightRange } from "./highlight-chunk";

describe("findChunkHighlightRange", () => {
  const document = `# 휴가 규정

입사 후 1년 이상이 된 직원은 15일의 기본 연차가 발생하며,
이후 매 2년마다 1일씩 가산됩니다.

## 반차
- 반차: 4시간 휴가`;

  it("청크 전문이 일치하면 구간을 반환한다", () => {
    const range = findChunkHighlightRange(
      document,
      "입사 후 1년 이상이 된 직원은 15일의 기본 연차가 발생하며"
    );
    expect(range).not.toBeNull();
    expect(document.slice(range!.start, range!.end)).toContain("15일");
  });

  it("공백이 다른 경우에도 유연 매칭한다", () => {
    const range = findChunkHighlightRange(
      document,
      "입사 후  1년   이상이 된 직원은 15일의 기본 연차"
    );
    expect(range).not.toBeNull();
  });

  it("스니펫 말줄임이 있어도 매칭한다", () => {
    const range = findChunkHighlightRange(
      document,
      "입사 후 1년 이상이 된 직원은 15일의 기본 연차가 발생하며…"
    );
    expect(range).not.toBeNull();
  });

  it("매칭 실패 시 null", () => {
    expect(findChunkHighlightRange(document, "존재하지 않는 문장")).toBeNull();
  });
});
