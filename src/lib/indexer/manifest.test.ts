import { describe, it, expect } from "vitest";
import { isManifestEntryCurrent } from "./manifest";

describe("index manifest", () => {
  it("mtime·hash가 같으면 스킵", () => {
    const entry = {
      relativePath: "전사공통/인사/연차휴가규정.md",
      fileName: "연차휴가규정.md",
      mtimeMs: 1000,
      contentHash: "abc",
    };
    expect(isManifestEntryCurrent(entry, 1000, "abc")).toBe(true);
    expect(isManifestEntryCurrent(entry, 1001, "abc")).toBe(false);
    expect(isManifestEntryCurrent(undefined, 1000, "abc")).toBe(false);
  });
});
