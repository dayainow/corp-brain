import { describe, it, expect } from "vitest";
import {
  canAccessDocument,
  canUploadDocuments,
  canReindexVault,
  hasMinimumRole,
} from "@/lib/rbac";

describe("RBAC", () => {
  it("general은 general 문서만 열람", () => {
    expect(canAccessDocument("general", "general")).toBe(true);
    expect(canAccessDocument("general", "manager")).toBe(false);
    expect(canAccessDocument("general", "admin")).toBe(false);
  });

  it("manager는 general + manager 문서 열람", () => {
    expect(canAccessDocument("manager", "general")).toBe(true);
    expect(canAccessDocument("manager", "manager")).toBe(true);
    expect(canAccessDocument("manager", "admin")).toBe(false);
  });

  it("admin은 모든 문서 열람", () => {
    expect(canAccessDocument("admin", "general")).toBe(true);
    expect(canAccessDocument("admin", "manager")).toBe(true);
    expect(canAccessDocument("admin", "admin")).toBe(true);
  });

  it("업로드는 manager 이상", () => {
    expect(canUploadDocuments("general")).toBe(false);
    expect(canUploadDocuments("manager")).toBe(true);
    expect(canUploadDocuments("admin")).toBe(true);
  });

  it("인덱싱은 admin만", () => {
    expect(canReindexVault("general")).toBe(false);
    expect(canReindexVault("manager")).toBe(false);
    expect(canReindexVault("admin")).toBe(true);
  });

  it("hasMinimumRole 계층 검증", () => {
    expect(hasMinimumRole("admin", "manager")).toBe(true);
    expect(hasMinimumRole("general", "manager")).toBe(false);
  });
});
