const buckets = new Map<string, { count: number; resetAt: number }>();

interface RateLimitOptions {
  windowMs?: number;
  maxRequests?: number;
}

/**
 * 간단한 인메모리 Rate Limiter
 * 프로덕션에서는 Redis 기반으로 교체 권장
 */
export function checkRateLimit(
  key: string,
  { windowMs = 60_000, maxRequests = 30 }: RateLimitOptions = {}
): { allowed: boolean; remaining: number; resetAt: number } {
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
  return { allowed: true, remaining: maxRequests - bucket.count, resetAt: bucket.resetAt };
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
    JSON.stringify({ error: "요청 한도를 초과했습니다. 잠시 후 다시 시도하세요.", code: "RATE_LIMIT" }),
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
