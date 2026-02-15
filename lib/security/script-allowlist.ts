const BLOCKED_PATTERNS = [
  /document\.cookie/i,
  /document\.domain/i,
  /window\.opener/i,
  /XMLHttpRequest/i,
  /navigator\.sendBeacon/i,
  /\bindexedDB\b/i,
  /\beval\s*\(/i,
  /window\.location\s*=/i,
  /\.postMessage\s*\(/i,
  /\bimport\s*\(/i,
  /document\.write/i,
];

export function isScriptSafe(code: string): boolean {
  return !BLOCKED_PATTERNS.some((p) => p.test(code));
}
