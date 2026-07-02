import { describe, it, expect } from "vitest";
import { getSectionsForRole } from "./content";

describe("guide content", () => {
  it("general 사용자는 admin 가이드를 보지 않는다", () => {
    const sections = getSectionsForRole("general");
    expect(sections.map((s) => s.id)).not.toContain("admin");
    expect(sections.map((s) => s.id)).not.toContain("upload");
  });

  it("manager 사용자는 업로드 가이드를 볼 수 있다", () => {
    const sections = getSectionsForRole("manager");
    expect(sections.map((s) => s.id)).toContain("upload");
    expect(sections.map((s) => s.id)).not.toContain("admin");
  });

  it("admin 사용자는 모든 가이드 섹션을 볼 수 있다", () => {
    const sections = getSectionsForRole("admin");
    expect(sections.map((s) => s.id)).toContain("admin");
    expect(sections.map((s) => s.id)).toContain("upload");
  });
});
