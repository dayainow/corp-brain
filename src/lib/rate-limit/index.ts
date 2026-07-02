import type { RateLimitOptions, RateLimitResult } from "./types";
import { checkRateLimitRedis } from "./redis";

export type { RateLimitOptions, RateLimitResult } from "./types";

/**
 * Rate limiter — REDIS_URL 설정 시 Redis, 없으면 인메모리
 */
export async function checkRateLimit(
  key: string,
  options?: RateLimitOptions
): Promise<RateLimitResult> {
  return checkRateLimitRedis(key, options);
}

export function rateLimitHeaders(
  remaining: number,
  resetAt: number
): Record<string, string> {
  return {
    "X-RateLimit-Remaining": String(Math.max(remaining, 0)),
    "X-RateLimit-Reset": String(Math.ceil(resetAt / 1000)),
  };
}

export function denyRateLimit(resetAt: number): Response {
  const retryAfter = Math.max(1, Math.ceil((resetAt - Date.now()) / 1000));
  return new Response(
    JSON.stringify({
      error: "요청 한도를 초과했습니다. 잠시 후 다시 시도하세요.",
      code: "RATE_LIMIT",
    }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(retryAfter),
        ...rateLimitHeaders(0, resetAt),
      },
    }
  );
}
