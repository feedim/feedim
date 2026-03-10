export function sanitizeAvatarUrl(src?: string | null): string | null {
  if (!src) return null;
  const normalized = src.trim();
  if (!normalized) return null;
  if (/googleusercontent\.com/i.test(normalized)) return null;
  return normalized;
}
