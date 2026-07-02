import { describe, expect, it } from "vitest";
import { checkRateLimitMemory, resetMemoryRateLimits } from "./memory";

describe("checkRateLimitMemory", () => {
  it("한도 내 요청은 허용한다", () => {
    resetMemoryRateLimits();
    const result = checkRateLimitMemory("user:1", { maxRequests: 2, windowMs: 60_000 });
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(1);
  });

  it("한도 초과 시 거부한다", () => {
    resetMemoryRateLimits();
    checkRateLimitMemory("user:2", { maxRequests: 1, windowMs: 60_000 });
    const blocked = checkRateLimitMemory("user:2", { maxRequests: 1, windowMs: 60_000 });
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
  });
});
