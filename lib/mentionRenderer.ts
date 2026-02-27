const MENTION_REGEX = /@([A-Za-z0-9._-]+)/g;

function escapeHTML(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Convert plain text @username mentions into clickable links.
 * Only the FIRST occurrence of each unique username becomes a link (up to `max` unique users).
 * Subsequent mentions of the same user stay as plain text.
 */
export function renderMentionsAsHTML(text: string, max = 3): string {
  const escaped = escapeHTML(text);
  const seen = new Set<string>();
  return escaped.replace(MENTION_REGEX, (_match, username: string) => {
    const safe = username.replace(/[^A-Za-z0-9._-]/g, "");
    const lower = safe.toLowerCase();
    if (!seen.has(lower) && seen.size < max) {
      seen.add(lower);
      return `<a href="/u/${safe}" class="text-accent-main hover:underline" onclick="event.stopPropagation()">@${safe}</a>`;
    }
    if (!seen.has(lower)) seen.add(lower);
    return `@${safe}`;
  });
}

/**
 * Count the number of unique @username mentions in text.
 */
export function countMentions(text: string): number {
  const matches = text.match(MENTION_REGEX);
  if (!matches) return 0;
  const unique = new Set(matches.map((m) => m.slice(1).toLowerCase()));
  return unique.size;
}

/**
 * Process mentions inside already-sanitized HTML content (for rich text posts).
 * Only the FIRST occurrence of each unique username becomes a link (up to `max` unique users).
 */
export function renderMentionsInHTML(html: string, max = 3): string {
  const seen = new Set<string>();
  return html.replace(/(<[^>]+>)|(@([A-Za-z0-9._-]+))/g, (match, tag, mention, username) => {
    if (tag) return tag;
    if (mention && username) {
      const safe = username.replace(/[^A-Za-z0-9._-]/g, "");
      const lower = safe.toLowerCase();
      if (!seen.has(lower) && seen.size < max) {
        seen.add(lower);
        return `<a href="/u/${safe}" class="text-accent-main hover:underline" onclick="event.stopPropagation()">@${safe}</a>`;
      }
      if (!seen.has(lower)) seen.add(lower);
      return `@${safe}`;
    }
    return match;
  });
}

/**
 * Extract unique mentioned usernames (lowercase), limited to first `max`.
 */
export function extractMentions(text: string, max = 3): string[] {
  const matches = text.match(MENTION_REGEX);
  if (!matches) return [];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const m of matches) {
    const username = m.slice(1).toLowerCase();
    if (!seen.has(username)) {
      seen.add(username);
      result.push(username);
      if (result.length >= max) break;
    }
  }
  return result;
}
