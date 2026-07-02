import { describe, it, expect } from "vitest";
import { parseSlackUserMap, resolveSlackUserRole } from "./slack-mapping";

describe("slack-mapping", () => {
  it("SLACK_USER_MAP JSON 파싱", () => {
    const map = parseSlackUserMap('{"U001":"lee.minho@novapay.kr"}');
    expect(map.U001).toBe("lee.minho@novapay.kr");
  });

  it("매핑된 Slack 사용자 Role 반환", () => {
    const { role, email } = resolveSlackUserRole("U001", "lee.minho", {
      U001: "lee.minho@novapay.kr",
    });
    expect(role).toBe("admin");
    expect(email).toBe("lee.minho@novapay.kr");
  });

  it("미매핑 사용자는 general", () => {
    const { role } = resolveSlackUserRole("U999", "unknown");
    expect(role).toBe("general");
  });
});
