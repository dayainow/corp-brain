import type { RateLimitOptions, RateLimitResult } from "./types";

const buckets = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimitMemory(
  key: string,
  { windowMs = 60_000, maxRequests = 30 }: RateLimitOptions = {}
): RateLimitResult {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now > bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1, resetAt: now + windowMs };
  }

  if (bucket.count >= maxRequests) {
    return { allowed: false, remaining: 0, resetAt: bucket.resetAt };
  }

  bucket.count++;
  return {
    allowed: true,
    remaining: maxRequests - bucket.count,
    resetAt: bucket.resetAt,
  };
}

/** 테스트용 초기화 */
export function resetMemoryRateLimits(): void {
  buckets.clear();
}
