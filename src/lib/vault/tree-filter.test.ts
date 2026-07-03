import { describe, expect, it } from "vitest";
import type { VaultTreeNode } from "./types";
import {
  collectFolderIds,
  countVaultFiles,
  filterVaultTree,
} from "./tree-filter";

const sampleTree: VaultTreeNode = {
  id: "/",
  name: "vault",
  type: "folder",
  children: [
    {
      id: "/hr",
      name: "hr",
      type: "folder",
      children: [
        {
          id: "/hr/vacation.md",
          name: "vacation.md",
          type: "file",
          title: "연차휴가규정",
          fileName: "vacation.md",
          fileType: "md",
        },
      ],
    },
    {
      id: "/finance/report.pdf",
      name: "report.pdf",
      type: "file",
      title: "재무보고서",
      fileName: "report.pdf",
      fileType: "pdf",
    },
  ],
};

describe("filterVaultTree", () => {
  it("빈 검색어는 전체 트리를 반환한다", () => {
    expect(filterVaultTree(sampleTree, "")).toEqual(sampleTree);
    expect(filterVaultTree(sampleTree, "   ")).toEqual(sampleTree);
  });

  it("제목·파일명으로 파일을 필터한다", () => {
    const result = filterVaultTree(sampleTree, "연차");
    expect(result?.children).toHaveLength(1);
    expect(result?.children?.[0].name).toBe("hr");
    expect(countVaultFiles(result!)).toBe(1);
  });

  it("확장자 없이 검색해도 매칭된다", () => {
    const result = filterVaultTree(sampleTree, "report");
    expect(countVaultFiles(result!)).toBe(1);
  });

  it("일치 항목이 없으면 null을 반환한다", () => {
    expect(filterVaultTree(sampleTree, "없는문서")).toBeNull();
  });
});

describe("collectFolderIds", () => {
  it("루트를 제외한 폴더 id를 수집한다", () => {
    expect(collectFolderIds(sampleTree)).toEqual(["/hr"]);
  });
});
