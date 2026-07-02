import { describe, expect, it } from "vitest";
import { buildVaultTree } from "./tree";
import type { VaultDocumentInfo } from "./types";

const sampleDocs: VaultDocumentInfo[] = [
  {
    fileName: "연차휴가규정.md",
    relativePath: "/전사공통/인사/연차휴가규정.md",
    folderPath: "/전사공통/인사",
    role: "general",
    title: "연차 휴가 규정",
    fileType: "md",
    size: 100,
  },
  {
    fileName: "2026-q2-마케팅실적.md",
    relativePath: "/재무회계/보고서/2026-q2-마케팅실적.md",
    folderPath: "/재무회계/보고서",
    role: "manager",
    title: "Q2 마케팅 실적",
    fileType: "md",
    size: 200,
  },
];

describe("buildVaultTree", () => {
  it("폴더·파일 계층을 만든다", () => {
    const tree = buildVaultTree(sampleDocs);
    const topFolders = tree.children?.map((c) => c.name) ?? [];
    expect(topFolders).toContain("전사공통");
    expect(topFolders).toContain("재무회계");

    const hrFolder = tree.children?.find((c) => c.name === "전사공통")
      ?.children?.find((c) => c.name === "인사");
    const file = hrFolder?.children?.find((c) => c.type === "file");
    expect(file?.title).toBe("연차 휴가 규정");
  });

  it("빈 문서 목록이면 루트만 반환한다", () => {
    const tree = buildVaultTree([]);
    expect(tree.type).toBe("folder");
    expect(tree.children).toEqual([]);
  });
});
