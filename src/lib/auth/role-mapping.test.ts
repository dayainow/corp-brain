import { describe, it, expect } from "vitest";
import { resolveRoleFromSSO, isAllowedDomain } from "@/lib/auth/role-mapping";

describe("SSO Role Mapping", () => {
  it("novapay.kr 도메인만 허용", () => {
    expect(isAllowedDomain("kim@novapay.kr")).toBe(true);
    expect(isAllowedDomain("test@gmail.com")).toBe(false);
  });

  it("등록된 데모 계정은 DB Role 사용", () => {
    expect(resolveRoleFromSSO("lee.minho@novapay.kr")).toBe("admin");
    expect(resolveRoleFromSSO("park.suyeon@novapay.kr")).toBe("manager");
    expect(resolveRoleFromSSO("kim.junho@novapay.kr")).toBe("general");
  });

  it("미등록 novapay.kr 계정은 general 기본", () => {
    expect(resolveRoleFromSSO("new.hire@novapay.kr")).toBe("general");
  });

  it("외부 도메인은 null", () => {
    expect(resolveRoleFromSSO("hacker@evil.com")).toBeNull();
  });
});
