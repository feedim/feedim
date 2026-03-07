import { Redis } from "@upstash/redis";

/**
 * Upstash Redis client — serverless-uyumlu, instance'lar arası paylaşımlı.
 *
 * Env vars:
 *   UPSTASH_REDIS_REST_URL
 *   UPSTASH_REDIS_REST_TOKEN
 *
 * Yoksa null döner → in-memory fallback kullanılır.
 */

let redis: Redis | null = null;

export function getRedis(): Redis | null {
  if (redis) return redis;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) return null;

  try {
    redis = new Redis({ url, token });
    return redis;
  } catch {
    console.warn("[Redis] Connection failed, falling back to in-memory");
    return null;
  }
}
