import { createClient, type RedisClientType } from "redis";
import { config } from "@/lib/config";
import type { RateLimitOptions, RateLimitResult } from "./types";
import { checkRateLimitMemory } from "./memory";

let client: RedisClientType | null = null;
let connectPromise: Promise<RedisClientType | null> | null = null;

async function getRedisClient(): Promise<RedisClientType | null> {
  if (!config.redis.url) return null;
  if (client?.isOpen) return client;

  if (!connectPromise) {
    connectPromise = (async () => {
      try {
        const redis = createClient({ url: config.redis.url });
        redis.on("error", (err) => {
          console.error("Redis rate-limit error:", err);
        });
        await redis.connect();
        client = redis as RedisClientType;
        return client;
      } catch (err) {
        console.error("Redis connect failed, falling back to memory:", err);
        client = null;
        return null;
      } finally {
        connectPromise = null;
      }
    })();
  }

  return connectPromise;
}

export async function checkRateLimitRedis(
  key: string,
  { windowMs = 60_000, maxRequests = 30 }: RateLimitOptions = {}
): Promise<RateLimitResult> {
  const redis = await getRedisClient();
  if (!redis) {
    return checkRateLimitMemory(key, { windowMs, maxRequests });
  }

  const windowSec = Math.max(1, Math.ceil(windowMs / 1000));
  const bucket = Math.floor(Date.now() / windowMs);
  const redisKey = `ratelimit:${key}:${bucket}`;

  try {
    const count = await redis.incr(redisKey);
    if (count === 1) {
      await redis.expire(redisKey, windowSec);
    }

    const ttl = await redis.ttl(redisKey);
    const resetAt = Date.now() + Math.max(ttl, 0) * 1000;

    if (count > maxRequests) {
      return { allowed: false, remaining: 0, resetAt };
    }

    return {
      allowed: true,
      remaining: Math.max(maxRequests - count, 0),
      resetAt,
    };
  } catch (err) {
    console.error("Redis rate-limit failed, falling back to memory:", err);
    return checkRateLimitMemory(key, { windowMs, maxRequests });
  }
}

export async function pingRedis(): Promise<boolean> {
  const redis = await getRedisClient();
  if (!redis) return false;
  try {
    const pong = await redis.ping();
    return pong === "PONG";
  } catch {
    return false;
  }
}
