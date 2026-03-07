import { getRedis } from "@/lib/redis";

// ─── Config ─────────────────────────────────────────────────────
const MAX_REQUESTS = 6;
const WINDOW_MS = 10 * 60_000; // 10 minutes
const BLOCK_MS = 5 * 60_000;   // 5 minutes
const REDIS_PREFIX = "otp_rl:";

// ─── In-memory fallback ─────────────────────────────────────────

interface OtpEntry {
  count: number;
  windowStart: number;
  blockedUntil: number;
}

const otpMap = new Map<string, OtpEntry>();

let lastOtpCleanup = Date.now();
function cleanupOtpMap(): void {
  const now = Date.now();
  if (now - lastOtpCleanup < 300_000) return;
  lastOtpCleanup = now;
  for (const [key, entry] of otpMap) {
    if (now - entry.windowStart > WINDOW_MS && entry.blockedUntil < now) {
      otpMap.delete(key);
    }
  }
}

// ─── Redis implementation ───────────────────────────────────────

async function checkRedis(key: string): Promise<{ allowed: boolean; retryAfterSeconds?: number }> {
  const redis = getRedis();
  if (!redis) return checkMemory(key);

  try {
    const rKey = `${REDIS_PREFIX}${key}`;
    const data = await redis.get<{ count: number; windowStart: number; blockedUntil: number }>(rKey);

    if (!data) return { allowed: true };

    const now = Date.now();

    if (data.blockedUntil > now) {
      return { allowed: false, retryAfterSeconds: Math.ceil((data.blockedUntil - now) / 1000) };
    }

    if (now - data.windowStart > WINDOW_MS) {
      await redis.del(rKey);
      return { allowed: true };
    }

    if (data.count >= MAX_REQUESTS) {
      data.blockedUntil = now + BLOCK_MS;
      await redis.set(rKey, data, { px: WINDOW_MS + BLOCK_MS });
      return { allowed: false, retryAfterSeconds: Math.ceil(BLOCK_MS / 1000) };
    }

    return { allowed: true };
  } catch {
    return checkMemory(key);
  }
}

async function recordRedis(key: string): Promise<void> {
  const redis = getRedis();
  if (!redis) { recordMemory(key); return; }

  try {
    const rKey = `${REDIS_PREFIX}${key}`;
    const now = Date.now();
    const data = await redis.get<{ count: number; windowStart: number; blockedUntil: number }>(rKey);

    if (!data || now - data.windowStart > WINDOW_MS) {
      await redis.set(rKey, { count: 1, windowStart: now, blockedUntil: 0 }, { px: WINDOW_MS + BLOCK_MS });
      return;
    }

    data.count++;
    await redis.set(rKey, data, { px: WINDOW_MS + BLOCK_MS });
  } catch {
    recordMemory(key);
  }
}

// ─── In-memory implementation ───────────────────────────────────

function checkMemory(key: string): { allowed: boolean; retryAfterSeconds?: number } {
  cleanupOtpMap();
  const now = Date.now();
  const entry = otpMap.get(key);

  if (!entry) return { allowed: true };
  if (entry.blockedUntil > now) {
    return { allowed: false, retryAfterSeconds: Math.ceil((entry.blockedUntil - now) / 1000) };
  }
  if (now - entry.windowStart > WINDOW_MS) {
    otpMap.delete(key);
    return { allowed: true };
  }
  if (entry.count >= MAX_REQUESTS) {
    entry.blockedUntil = now + BLOCK_MS;
    return { allowed: false, retryAfterSeconds: Math.ceil(BLOCK_MS / 1000) };
  }
  return { allowed: true };
}

function recordMemory(key: string): void {
  const now = Date.now();
  const entry = otpMap.get(key);
  if (!entry || now - entry.windowStart > WINDOW_MS) {
    otpMap.set(key, { count: 1, windowStart: now, blockedUntil: 0 });
    return;
  }
  entry.count++;
}

// ─── Public API ─────────────────────────────────────────────────

export async function checkOtpRateLimit(key: string): Promise<{ allowed: boolean; retryAfterSeconds?: number }> {
  return checkRedis(key);
}

export async function recordOtpSend(key: string): Promise<void> {
  return recordRedis(key);
}
