import { describe, it, expect } from "vitest";
import { validateChatMessages, toModelMessages } from "./messages";

describe("validateChatMessages", () => {
  it("UIMessage parts 형식을 허용한다", () => {
    const result = validateChatMessages([
      {
        role: "user",
        parts: [{ type: "text", text: "휴가 규정 알려줘" }],
      },
    ]);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.text).toBe("휴가 규정 알려줘");
  });

  it("legacy content 형식을 허용한다", () => {
    const result = validateChatMessages([{ role: "user", content: "hello" }]);
    expect(result.ok).toBe(true);
  });

  it("빈 메시지를 거부한다", () => {
    const result = validateChatMessages([{ role: "user", parts: [] }]);
    expect(result.ok).toBe(false);
  });

  it("너무 긴 메시지를 거부한다", () => {
    const result = validateChatMessages([
      { role: "user", content: "a".repeat(4001) },
    ]);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("MESSAGE_TOO_LONG");
  });

  it("UIMessage parts를 ModelMessage로 변환한다", () => {
    const result = toModelMessages([
      { role: "user", parts: [{ type: "text", text: "NDA 계약서 주요 조항 알려줘" }] },
    ]);
    expect(result).toEqual([
      { role: "user", content: "NDA 계약서 주요 조항 알려줘" },
    ]);
  });
});
