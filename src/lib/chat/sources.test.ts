import { describe, expect, it } from "vitest";
import { extractSourcesFromContent } from "./sources";

describe("extractSourcesFromContent", () => {
  it("[출처: ...] 뱃지에서 파일명을 추출한다", () => {
    const content = "연차는 15일입니다. [출처: 연차휴가규정] 추가 [출처: 인사규정.md]";
    expect(extractSourcesFromContent(content)).toEqual(["연차휴가규정", "인사규정.md"]);
  });
});
