import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Parse and clamp page number from URL params (prevents DoS via huge offsets) */
export function safePage(raw: string | null, max = 500): number {
  const n = parseInt(raw || "1", 10);
  if (isNaN(n) || n < 1) return 1;
  return Math.min(n, max);
}

/**
 * Türkçe sayı formatı: 1B, 10.5B, 100B, 1Mn vb.
 * B = Bin (thousand), Mn = Milyon (million)
 */
export function formatCount(n: number): string {
  if (n < 1000) return String(n);
  if (n < 1_000_000) {
    const k = n / 1000;
    return k % 1 === 0 ? `${k}B` : `${parseFloat(k.toFixed(1))}B`;
  }
  const m = n / 1_000_000;
  return m % 1 === 0 ? `${m}Mn` : `${parseFloat(m.toFixed(1))}Mn`;
}

const TR_MAP: Record<string, string> = {
  'ç': 'c', 'Ç': 'C', 'ğ': 'g', 'Ğ': 'G', 'ı': 'i', 'İ': 'I',
  'ö': 'o', 'Ö': 'O', 'ş': 's', 'Ş': 'S', 'ü': 'u', 'Ü': 'U',
};

/** Türkçe karakterleri ASCII karşılıklarına çevirir (aşk → ask) */
export function transliterateTurkish(text: string): string {
  return text
    .replace(/[çÇğĞıİöÖşŞüÜ]/g, (ch) => TR_MAP[ch] || ch)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

export function slugify(text: string): string {
  return text
    .replace(/[çÇğĞıİöÖşŞüÜ]/g, (ch) => TR_MAP[ch] || ch)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 120);
}

// Encode/decode numeric IDs for URLs (XOR obfuscation + base36)
const ID_XOR_KEY = 0x5A3C9E;
export function encodeId(id: number): string {
  return ((id ^ ID_XOR_KEY) >>> 0).toString(36);
}
export function decodeId(encoded: string): number {
  return (parseInt(encoded, 36) ^ ID_XOR_KEY) >>> 0;
}

export function generateSlugHash(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let hash = '';
  for (let i = 0; i < 12; i++) {
    hash += chars[Math.floor(Math.random() * chars.length)];
  }
  return hash;
}

export function calculateReadingTime(html: string): { wordCount: number; readingTime: number } {
  const text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  const wordCount = text ? text.split(' ').length : 0;
  const readingTime = Math.max(1, Math.ceil(wordCount / 200));
  return { wordCount, readingTime };
}

export function generateExcerpt(html: string, maxLen = 160): string {
  const text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  if (text.length <= maxLen) return text;
  return text.substring(0, maxLen).replace(/\s+\S*$/, '') + '…';
}

export function normalizeUsername(input: string): string {
  return input
    .replace(/[çÇğĞıİöÖşŞüÜ]/g, (ch) => TR_MAP[ch] || ch)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9._]/g, '');
}

export function filterNameInput(input: string): string {
  return input.replace(/[^\p{L}\s]/gu, '');
}

/**
 * Tag adını sosyal medya formatına çevirir:
 * "Türkçe Şölen!" → "turkcesolen"
 * "İstanbul/Ankara" → "istanbulankara"
 * Kurallar: Türkçe karakter → ASCII, sadece a-z 0-9, max 50 karakter
 */
export function formatTagName(name: string): string {
  return name
    .replace(/[şŞ]/g, 's')
    .replace(/[ıİ]/g, 'i')
    .replace(/[ğĞ]/g, 'g')
    .replace(/[üÜ]/g, 'u')
    .replace(/[öÖ]/g, 'o')
    .replace(/[çÇ]/g, 'c')
    .replace(/[äÄ]/g, 'a')
    .replace(/[ëË]/g, 'e')
    .replace(/[ïÏ]/g, 'i')
    .replace(/[âÂ]/g, 'a')
    .replace(/[êÊ]/g, 'e')
    .replace(/[îÎ]/g, 'i')
    .replace(/[ôÔ]/g, 'o')
    .replace(/[ûÛ]/g, 'u')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .substring(0, 50);
}

export function formatRelativeDate(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.floor((now - then) / 1000);

  if (diff < 60) return 'az önce';
  const mins = Math.floor(diff / 60);
  if (diff < 3600) return `${mins} dakika önce`;
  const hours = Math.floor(diff / 3600);
  if (diff < 86400) return `${hours} saat önce`;
  const days = Math.floor(diff / 86400);
  if (days < 7) return `${days} gün önce`;
  const weeks = Math.floor(days / 7);
  if (days < 30) return `${weeks} hafta önce`;
  const months = Math.floor(days / 30);
  if (days < 365) return `${months} ay önce`;
  const years = Math.floor(days / 365);
  return `${years} yıl önce`;
}
