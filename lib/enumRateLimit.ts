import { getRedis } from "@/lib/redis";

// ─── Enumeration rate limiter ───────────────────────────────────
// check-email, check-username, resolve gibi endpoint'leri
// toplu sorgulama (enumeration) saldırılarına karşı korur.

const MAX_CHECKS = 20;           // IP başına max istek
const WINDOW_MS = 5 * 60_000;    // 5 dakika pencere
const REDIS_PREFIX = "enum_rl:";

// ─── In-memory fallback ─────────────────────────────────────────
const memMap = new Map<string, { count: number; resetAt: number }>();

let lastCleanup = Date.now();
function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < 60_000) return;
  lastCleanup = now;
  for (const [k, v] of memMap) {
    if (now > v.resetAt) memMap.delete(k);
  }
}

// ─── Public API ─────────────────────────────────────────────────

export async function checkEnumRateLimit(ip: string): Promise<boolean> {
  const redis = getRedis();

  if (redis) {
    try {
      const rKey = `${REDIS_PREFIX}${ip}`;
      const count = await redis.incr(rKey);
      if (count === 1) {
        await redis.pexpire(rKey, WINDOW_MS);
      }
      return count <= MAX_CHECKS;
    } catch { /* fallback */ }
  }

  // In-memory fallback
  cleanup();
  const now = Date.now();
  const entry = memMap.get(ip);

  if (!entry || now > entry.resetAt) {
    memMap.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }

  entry.count++;
  return entry.count <= MAX_CHECKS;
}
