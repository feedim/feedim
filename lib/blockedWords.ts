export function getBlockedWords(): string[] {
  try {
    const stored = localStorage.getItem("fdm-blocked-words");
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function isBlockedContent(text: string, authorId?: string | null, currentUserId?: string | null): boolean {
  if (!text) return false;
  if (authorId && currentUserId && authorId === currentUserId) return false;
  const words = getBlockedWords();
  if (words.length === 0) return false;
  const lower = text.toLowerCase();
  return words.some(w => lower.includes(w));
}
