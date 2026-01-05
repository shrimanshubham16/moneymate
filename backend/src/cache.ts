import { Redis } from "@upstash/redis";

/**
 * Redis-based caching layer for health scores.
 * Key format: health:{userId}:{billingPeriodId}
 * Default TTL: 5 minutes
 */
const redisUrl = process.env.UPSTASH_REDIS_URL;
const redisToken = process.env.UPSTASH_REDIS_TOKEN;

let redisClient: Redis | null = null;

function getRedis(): Redis {
  if (!redisClient) {
    if (!redisUrl || !redisToken) {
      throw new Error(
        "Missing UPSTASH_REDIS_URL or UPSTASH_REDIS_TOKEN. Set these in environment variables."
      );
    }
    redisClient = new Redis({
      url: redisUrl,
      token: redisToken,
    });
  }
  return redisClient;
}

export async function getCachedHealth(userId: string, billingPeriodId: string) {
  const redis = getRedis();
  const key = `health:${userId}:${billingPeriodId}`;
  return redis.get(key);
}

export async function setCachedHealth(
  userId: string,
  billingPeriodId: string,
  data: unknown,
  ttlSeconds: number = 300
) {
  const redis = getRedis();
  const key = `health:${userId}:${billingPeriodId}`;
  await redis.set(key, data, { ex: ttlSeconds });
}

export async function invalidateHealthCache(userId: string) {
  const redis = getRedis();
  const keys = await redis.keys(`health:${userId}:*`);
  if (keys.length) {
    await redis.del(...keys);
  }
}

export async function invalidateAllHealthCaches() {
  const redis = getRedis();
  const keys = await redis.keys("health:*");
  if (keys.length) {
    await redis.del(...keys);
  }
}



