// ♥ Forilove — Shared AI Utilities

export const AI_MODEL = "claude-haiku-4-5-20251001";

// ♥ Rate Limiter Factory
export function createRateLimiter(maxRequests: number, windowMs = 60_000) {
  const map = new Map<string, { count: number; resetAt: number }>();
  return (userId: string): boolean => {
    const now = Date.now();
    const entry = map.get(userId);
    if (!entry || now > entry.resetAt) {
      map.set(userId, { count: 1, resetAt: now + windowMs });
      return true;
    }
    if (entry.count >= maxRequests) return false;
    entry.count++;
    return true;
  };
}

// ♥ JSON Parser — handles both raw JSON and markdown-fenced JSON
export function parseAIJSON(raw: string): unknown | null {
  let s = raw.trim();
  // Strip markdown code fences
  const fenceMatch = s.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) s = fenceMatch[1].trim();
  // Try direct parse
  try { return JSON.parse(s); } catch { /* continue */ }
  // Try extracting first {...}
  const objMatch = s.match(/\{[\s\S]*\}/);
  if (objMatch) {
    try { return JSON.parse(objMatch[0]); } catch { /* continue */ }
  }
  return null;
}
