// In-memory OTP rate limiter (same pattern as middleware.ts IP rate limiter)

interface OtpEntry {
  count: number;
  windowStart: number;
  blockedUntil: number;
}

const otpMap = new Map<string, OtpEntry>();

const MAX_REQUESTS = 6;
const WINDOW_MS = 10 * 60_000; // 10 minutes
const BLOCK_MS = 5 * 60_000;   // 5 minutes

export function checkOtpRateLimit(key: string): { allowed: boolean; retryAfterSeconds?: number } {
  const now = Date.now();
  const entry = otpMap.get(key);

  if (!entry) return { allowed: true };

  // Currently blocked
  if (entry.blockedUntil > now) {
    return { allowed: false, retryAfterSeconds: Math.ceil((entry.blockedUntil - now) / 1000) };
  }

  // Window expired → allow
  if (now - entry.windowStart > WINDOW_MS) return { allowed: true };

  // Within window, check count
  if (entry.count >= MAX_REQUESTS) {
    entry.blockedUntil = now + BLOCK_MS;
    return { allowed: false, retryAfterSeconds: Math.ceil(BLOCK_MS / 1000) };
  }

  return { allowed: true };
}

export function recordOtpSend(key: string): void {
  const now = Date.now();
  const entry = otpMap.get(key);

  if (!entry || now - entry.windowStart > WINDOW_MS) {
    otpMap.set(key, { count: 1, windowStart: now, blockedUntil: 0 });
    return;
  }

  entry.count++;
}

// Cleanup stale entries every 5 minutes
let lastOtpCleanup = Date.now();
export function cleanupOtpMap(): void {
  const now = Date.now();
  if (now - lastOtpCleanup < 300_000) return;
  lastOtpCleanup = now;
  for (const [key, entry] of otpMap) {
    if (now - entry.windowStart > WINDOW_MS && entry.blockedUntil < now) {
      otpMap.delete(key);
    }
  }
}
