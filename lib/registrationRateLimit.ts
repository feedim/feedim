import { getRedis } from "@/lib/redis";

// ─── Kayıt limiti (IP + Device Fingerprint) ─────────────────────
// Aynı IP'den günde max 3, aynı cihazdan günde max 2 hesap.
// İki katman birlikte çalışır — IP rotasyonu yapsa bile cihaz engeli kalır.

const MAX_PER_IP = 3;
const MAX_PER_DEVICE = 2;
const WINDOW_MS = 24 * 60 * 60_000; // 24 saat
const REDIS_IP_PREFIX = "reg_ip:";
const REDIS_DEV_PREFIX = "reg_dev:";

// ─── In-memory fallback ─────────────────────────────────────────
const memMap = new Map<string, { count: number; resetAt: number }>();

let lastCleanup = Date.now();
function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < 300_000) return;
  lastCleanup = now;
  for (const [k, v] of memMap) {
    if (now > v.resetAt) memMap.delete(k);
  }
}

// ─── Generic check/record ───────────────────────────────────────

async function checkLimit(key: string, max: number): Promise<{ allowed: boolean; remaining: number }> {
  const redis = getRedis();

  if (redis) {
    try {
      const count = await redis.get<number>(key) || 0;
      return { allowed: count < max, remaining: Math.max(0, max - count) };
    } catch { /* fallback */ }
  }

  cleanup();
  const now = Date.now();
  const entry = memMap.get(key);
  if (!entry || now > entry.resetAt) {
    return { allowed: true, remaining: max };
  }
  return { allowed: entry.count < max, remaining: Math.max(0, max - entry.count) };
}

/** Atomik INCR-then-check: Artır, limit aşılırsa false dön */
async function incrAndCheck(key: string, max: number): Promise<{ allowed: boolean; count: number }> {
  const redis = getRedis();

  if (redis) {
    try {
      const count = await redis.incr(key);
      if (count === 1) {
        await redis.pexpire(key, WINDOW_MS);
      }
      return { allowed: count <= max, count };
    } catch { /* fallback */ }
  }

  cleanup();
  const now = Date.now();
  const entry = memMap.get(key);
  if (!entry || now > entry.resetAt) {
    memMap.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, count: 1 };
  }
  entry.count++;
  return { allowed: entry.count <= max, count: entry.count };
}

async function decrementKey(key: string): Promise<void> {
  const redis = getRedis();
  if (redis) {
    try {
      await redis.decr(key);
      return;
    } catch { /* fallback */ }
  }
  const entry = memMap.get(key);
  if (entry && entry.count > 0) entry.count--;
}

// ─── Public API ─────────────────────────────────────────────────

export async function checkRegistrationLimit(
  ip: string,
  deviceHash?: string
): Promise<{ allowed: boolean; reason?: "ip" | "device" }> {
  // IP kontrolü
  const ipCheck = await checkLimit(`${REDIS_IP_PREFIX}${ip}`, MAX_PER_IP);
  if (!ipCheck.allowed) {
    return { allowed: false, reason: "ip" };
  }

  // Device fingerprint kontrolü
  if (deviceHash && deviceHash.length >= 3) {
    const devCheck = await checkLimit(`${REDIS_DEV_PREFIX}${deviceHash}`, MAX_PER_DEVICE);
    if (!devCheck.allowed) {
      return { allowed: false, reason: "device" };
    }
  }

  return { allowed: true };
}

/** Atomik kayıt: INCR yapıp limit kontrolü yapar. Aşılırsa geri alır. */
export async function recordRegistration(
  ip: string,
  deviceHash?: string
): Promise<{ allowed: boolean; reason?: "ip" | "device" }> {
  // IP kontrolü: atomik INCR → limit aşılırsa reddet
  const ipResult = await incrAndCheck(`${REDIS_IP_PREFIX}${ip}`, MAX_PER_IP);
  if (!ipResult.allowed) {
    return { allowed: false, reason: "ip" };
  }

  // Device kontrolü: atomik INCR → limit aşılırsa IP'yi geri al
  if (deviceHash && deviceHash.length >= 3) {
    const devResult = await incrAndCheck(`${REDIS_DEV_PREFIX}${deviceHash}`, MAX_PER_DEVICE);
    if (!devResult.allowed) {
      await decrementKey(`${REDIS_IP_PREFIX}${ip}`);
      return { allowed: false, reason: "device" };
    }
  }

  return { allowed: true };
}
