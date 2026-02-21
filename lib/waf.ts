/**
 * Web Application Firewall (WAF) - Request sanitization and attack detection.
 * Detects: XSS, SQL injection, LFI/path traversal, command injection.
 */

// ─── XSS Detection Patterns ───
const XSS_PATTERNS = [
  /<script\b[^>]*>/i,
  /javascript\s*:/i,
  /on(load|error|click|mouseover|focus|blur|change|submit|keydown|keyup)\s*=/i,
  /data\s*:\s*text\/html/i,
  /<iframe\b/i,
  /<object\b/i,
  /<embed\b/i,
  /<svg\b[^>]*\bon/i,
  /expression\s*\(/i,
  /vbscript\s*:/i,
  /document\s*\.\s*(cookie|write|location)/i,
  /window\s*\.\s*(location|open)/i,
  /\.innerHTML\s*=/i,
  /eval\s*\(/i,
  /Function\s*\(/i,
  /setTimeout\s*\(\s*['"`]/i,
  /setInterval\s*\(\s*['"`]/i,
];

// ─── SQL Injection Detection Patterns ───
const SQLI_PATTERNS = [
  /(\b(union|select|insert|update|delete|drop|alter|create|exec|execute|truncate|declare)\b\s+(all\s+)?)/i,
  /('|")\s*(or|and)\s*('|"|\d)/i,
  /;\s*(drop|delete|truncate|alter|update|insert)\s/i,
  /--\s*$/,
  /\/\*[\s\S]*?\*\//,
  /\b(waitfor|benchmark|sleep)\s*\(/i,
  /\b(char|nchar|varchar|nvarchar)\s*\(/i,
  /\bconvert\s*\(/i,
  /\bcast\s*\(/i,
  /\b(into|from)\s+(outfile|dumpfile|load_file)/i,
  /\binformation_schema\b/i,
  /\bsys\.(columns|tables|objects)\b/i,
];

// ─── LFI / Path Traversal Patterns ───
const LFI_PATTERNS = [
  /\.\.\//,
  /\.\.\\/, // backslash traversal
  /\/etc\/(passwd|shadow|hosts)/i,
  /\/proc\/(self|version)/i,
  /\/var\/log\//i,
  /\/(boot|root|usr)\//i,
  /\\(windows|system32|boot)\\/i,
  /%2e%2e[\\/]/i, // URL-encoded traversal
  /%252e%252e/i, // double URL-encoded
  /php:\/\//i,
  /file:\/\//i,
  /expect:\/\//i,
  /glob:\/\//i,
];

// ─── Command Injection Patterns ───
const CMD_PATTERNS = [
  /[;&|`]\s*(cat|ls|dir|whoami|id|uname|pwd|wget|curl|nc|bash|sh|cmd|powershell)\b/i,
  /\$\(.*\)/, // command substitution
  /`[^`]*`/, // backtick execution
  /\|\s*(cat|ls|dir|whoami|id|uname)\b/i,
];

export interface WafResult {
  blocked: boolean;
  reason?: string;
  pattern?: string;
}

/**
 * Check a string value against WAF rules.
 * Returns blocked: true if the value matches any attack pattern.
 */
export function checkValue(value: string): WafResult {
  if (!value || typeof value !== 'string') return { blocked: false };

  // Decode common encodings for deeper inspection
  let decoded = value;
  try { decoded = decodeURIComponent(value); } catch {}

  for (const pattern of XSS_PATTERNS) {
    if (pattern.test(decoded)) {
      return { blocked: true, reason: 'XSS', pattern: pattern.source };
    }
  }

  for (const pattern of SQLI_PATTERNS) {
    if (pattern.test(decoded)) {
      return { blocked: true, reason: 'SQLi', pattern: pattern.source };
    }
  }

  for (const pattern of LFI_PATTERNS) {
    if (pattern.test(decoded)) {
      return { blocked: true, reason: 'LFI', pattern: pattern.source };
    }
  }

  for (const pattern of CMD_PATTERNS) {
    if (pattern.test(decoded)) {
      return { blocked: true, reason: 'CMD', pattern: pattern.source };
    }
  }

  return { blocked: false };
}

/**
 * Recursively check all string values in an object (e.g., request body).
 * Returns the first match found, or { blocked: false } if clean.
 */
export function checkObject(obj: unknown, maxDepth = 5): WafResult {
  if (maxDepth <= 0) return { blocked: false };

  if (typeof obj === 'string') {
    return checkValue(obj);
  }

  if (Array.isArray(obj)) {
    for (const item of obj) {
      const result = checkObject(item, maxDepth - 1);
      if (result.blocked) return result;
    }
  }

  if (obj && typeof obj === 'object') {
    for (const value of Object.values(obj)) {
      const result = checkObject(value, maxDepth - 1);
      if (result.blocked) return result;
    }
  }

  return { blocked: false };
}

/**
 * Check URL path and query parameters for attacks.
 */
export function checkUrl(pathname: string, searchParams: URLSearchParams): WafResult {
  // Check path
  const pathResult = checkValue(pathname);
  if (pathResult.blocked) return pathResult;

  // Check query parameters
  for (const [, value] of searchParams) {
    const result = checkValue(value);
    if (result.blocked) return result;
  }

  return { blocked: false };
}

// ─── Exempt paths (content that may contain HTML/code) ───
const WAF_EXEMPT_PATHS = [
  '/api/posts',       // Post content contains HTML
  '/api/upload',      // File uploads
  '/api/payment/payttr/callback', // PayTR coin webhook
  '/api/payment/payttr/premium/callback', // PayTR premium webhook
];

/**
 * Check if a path should be exempt from WAF body scanning.
 * Some paths (like post creation) intentionally contain HTML.
 */
export function isExemptPath(pathname: string): boolean {
  return WAF_EXEMPT_PATHS.some(p => pathname.startsWith(p));
}
