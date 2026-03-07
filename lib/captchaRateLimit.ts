import { getRedis } from "@/lib/redis";

// ─── Config ─────────────────────────────────────────────────────
const MAX_FAILURES = 12;
const LOCKOUT_DURATION = 10 * 60_000;    // 10 minutes
const CLEANUP_INTERVAL = 5 * 60_000;     // 5 min
const NONCE_TTL = 3 * 60_000;            // 3 min
const REDIS_PREFIX = "captcha_rl:";
const NONCE_PREFIX = "captcha_nonce:";

// ─── In-memory fallback stores ──────────────────────────────────

interface IpRecord {
  failures: number;
  lockedUntil: number;
  lastAttempt: number;
}

const memStore = new Map<string, IpRecord>();
const memNonces = new Set<string>();
const memNonceTimestamps = new Map<string, number>();

// Cleanup intervals (only for in-memory mode)
setInterval(() => {
  const now = Date.now();
  for (const [ip, rec] of memStore) {
    if (rec.lockedUntil < now && now - rec.lastAttempt > 15 * 60_000) {
      memStore.delete(ip);
    }
  }
}, CLEANUP_INTERVAL);

setInterval(() => {
  const now = Date.now();
  for (const [nonce, expiresAt] of memNonceTimestamps) {
    if (now > expiresAt) {
      memNonces.delete(nonce);
      memNonceTimestamps.delete(nonce);
    }
  }
}, 60_000);

// ─── Nonce replay protection ────────────────────────────────────

export async function isNonceUsed(nonce: string): Promise<boolean> {
  const redis = getRedis();
  if (redis) {
    try {
      const exists = await redis.exists(`${NONCE_PREFIX}${nonce}`);
      return exists === 1;
    } catch { /* fallback */ }
  }
  return memNonces.has(nonce);
}

export async function markNonceUsed(nonce: string, ttlMs?: number): Promise<void> {
  const ttl = ttlMs || NONCE_TTL;
  const redis = getRedis();
  if (redis) {
    try {
      await redis.set(`${NONCE_PREFIX}${nonce}`, 1, { px: ttl });
      return;
    } catch { /* fallback */ }
  }
  memNonces.add(nonce);
  // Negatif timestamp encode: gerçek expiry zamanını sakla (cleanup buna bakar)
  memNonceTimestamps.set(nonce, Date.now() + ttl);
}

// ─── Rate limit checks ─────────────────────────────────────────

export async function isIpLocked(ip: string): Promise<{ locked: boolean; retryAfter?: number }> {
  const redis = getRedis();
  if (redis) {
    try {
      const data = await redis.get<IpRecord>(`${REDIS_PREFIX}${ip}`);
      if (!data) return { locked: false };

      const now = Date.now();
      if (data.lockedUntil > now) {
        return { locked: true, retryAfter: Math.ceil((data.lockedUntil - now) / 1000) };
      }
      if (data.lockedUntil > 0) {
        await redis.del(`${REDIS_PREFIX}${ip}`);
      }
      return { locked: false };
    } catch { /* fallback */ }
  }

  // In-memory fallback
  const rec = memStore.get(ip);
  if (!rec) return { locked: false };
  const now = Date.now();
  if (rec.lockedUntil > now) {
    return { locked: true, retryAfter: Math.ceil((rec.lockedUntil - now) / 1000) };
  }
  if (rec.lockedUntil > 0) memStore.delete(ip);
  return { locked: false };
}

export async function recordFailure(ip: string): Promise<void> {
  const now = Date.now();
  const redis = getRedis();

  if (redis) {
    try {
      const rKey = `${REDIS_PREFIX}${ip}`;
      const data = await redis.get<IpRecord>(rKey) || { failures: 0, lockedUntil: 0, lastAttempt: now };
      data.failures += 1;
      data.lastAttempt = now;

      if (data.failures >= MAX_FAILURES) {
        data.lockedUntil = now + LOCKOUT_DURATION;
      }

      await redis.set(rKey, data, { px: LOCKOUT_DURATION + 60_000 });
      return;
    } catch { /* fallback */ }
  }

  // In-memory fallback
  const rec = memStore.get(ip) || { failures: 0, lockedUntil: 0, lastAttempt: now };
  rec.failures += 1;
  rec.lastAttempt = now;
  if (rec.failures >= MAX_FAILURES) {
    rec.lockedUntil = now + LOCKOUT_DURATION;
  }
  memStore.set(ip, rec);
}

export async function recordSuccess(ip: string): Promise<void> {
  const redis = getRedis();
  if (redis) {
    try {
      await redis.del(`${REDIS_PREFIX}${ip}`);
      return;
    } catch { /* fallback */ }
  }
  memStore.delete(ip);
}

export async function getFailureCount(ip: string): Promise<number> {
  const redis = getRedis();
  if (redis) {
    try {
      const data = await redis.get<IpRecord>(`${REDIS_PREFIX}${ip}`);
      return data?.failures || 0;
    } catch { /* fallback */ }
  }
  return memStore.get(ip)?.failures || 0;
}
