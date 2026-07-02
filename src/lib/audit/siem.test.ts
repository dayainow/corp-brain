import { describe, it, expect } from "vitest";
import { isDocumentExpired } from "@/lib/audit/siem";

describe("Document expiry", () => {
  it("만료일 없으면 활성", () => {
    expect(isDocumentExpired({})).toBe(false);
  });

  it("미래 만료일이면 활성", () => {
    expect(isDocumentExpired({ expires: "2099-12-31" })).toBe(false);
  });

  it("과거 만료일이면 비활성", () => {
    expect(isDocumentExpired({ expires: "2020-01-01" })).toBe(true);
  });
});
