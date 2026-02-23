import { createHash } from 'crypto';
import { SupabaseClient } from '@supabase/supabase-js';

export type CopyrightResult = {
  flagged: boolean;
  matchType: 'exact' | 'high' | 'moderate' | null;
  similarity: number;
  matchedPostId: number | null;
  matchedAuthorId: string | null;
  reason: string | null;
  /** 'copyright' = telif hakkı korumalı, 'kopya_icerik' = metin kopyası */
  category: 'copyright' | 'kopya_icerik' | null;
  /** Extra data for verified copyright matches */
  verifiedOwner?: { ownerName: string; companyName?: string | null } | null;
  consecutiveMatches?: number;
};

const CLEAN_RESULT: CopyrightResult = {
  flagged: false,
  matchType: null,
  similarity: 0,
  matchedPostId: null,
  matchedAuthorId: null,
  reason: null,
  category: null,
};

// ─── Content-Type Thresholds ───

export const COPYRIGHT_THRESHOLDS = {
  post: {
    minWords: 50,           // 50 kelimenin altı taranmaz
    telifMin: 75,           // %75-79 → telif hakkı (copyright_protected posts'a karşı)
    kopyaMin: 80,           // %80+ → kopya içerik (tüm postlara karşı)
    imageAutoCheck: false,  // Görseller auto taranmaz (rapor ile)
    titleCheck: false,      // Title karşılaştırmaya DAHİL EDİLMEZ
  },
  video: {
    textCheck: true,        // Metin kopya kontrolü (post kurallarıyla aynı)
    thumbnailCheck: true,   // dHash thumbnail karşılaştırma
    frameHashCheck: true,   // Video frame hashing (aHash — center-crop)
    frameHammingThreshold: 17, // aHash Hamming threshold (dHash'ten yüksek: aHash daha robust)
    consecutiveFrameThreshold: 4, // 4+ ardışık frame = 4 saniye kuralı
    matchThreshold: 80,     // %80+ → moderasyon
    nonProtectedReshare: true, // Telif hakkı olmayan video tekrar paylaşılabilir
  },
  moment: {
    autoScan: false,        // Otomatik tarama YOK
    duplicateThreshold: 90, // Aynı metin + aynı video %90+ → kopya içerik
    copyrightViaReports: true, // Telif sadece rapor ile
  },
} as const;

// ─── Utility Functions ───

/** Strip HTML tags → plain text */
export function stripHtmlToText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/?(p|div|li|h[1-6]|blockquote|tr|td|th|figure|figcaption)[^>]*>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/** Normalize for comparison: lowercase, remove punctuation, collapse whitespace */
export function normalizeForComparison(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** SHA-256 hash of normalized content */
export function computeContentHash(normalizedText: string): string {
  return createHash('sha256').update(normalizedText).digest('hex');
}

/** Build word trigram (shingle) set */
export function getWordShingles(text: string, k = 3): Set<string> {
  const words = text.split(/\s+/).filter(Boolean);
  const shingles = new Set<string>();
  for (let i = 0; i <= words.length - k; i++) {
    shingles.add(words.slice(i, i + k).join(' '));
  }
  return shingles;
}

/** Jaccard similarity between two sets (0.0 - 1.0) */
export function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0;
  let intersection = 0;
  const smaller = a.size <= b.size ? a : b;
  const larger = a.size <= b.size ? b : a;
  for (const item of smaller) {
    if (larger.has(item)) intersection++;
  }
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/** Overlap coefficient — intersection / min(|A|,|B|). Better for short texts. */
export function overlapCoefficient(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  const smaller = a.size <= b.size ? a : b;
  const larger = a.size <= b.size ? b : a;
  for (const item of smaller) {
    if (larger.has(item)) intersection++;
  }
  return intersection / smaller.size;
}

// ─── Legacy checkCopyright (kept for backward compat, used by copyright-scan) ───

/**
 * Text-based copyright check (title + content).
 * Used by copyright-scan admin tool. New code should use checkPostCopyright.
 */
export async function checkCopyright(
  admin: SupabaseClient,
  title: string,
  content: string,
  authorId: string,
  contentType: string,
  wordCount: number,
  postId?: number,
  protectedOnly = false,
): Promise<CopyrightResult> {
  try {
    const plainText = stripHtmlToText(content);
    const fullText = `${title} ${plainText}`;
    const normalized = normalizeForComparison(fullText);

    const words = normalized.split(/\s+/).filter(Boolean);
    if (words.length < 50) return CLEAN_RESULT;

    const hash = computeContentHash(normalized);

    try {
      let exactQuery = admin
        .from('posts')
        .select('id, author_id')
        .eq('content_hash', hash)
        .eq('status', 'published')
        .neq('author_id', authorId);

      if (protectedOnly) exactQuery = exactQuery.eq('copyright_protected', true);
      if (postId) exactQuery = exactQuery.neq('id', postId);

      const { data: exactMatch } = await exactQuery.limit(1).single();

      if (exactMatch) {
        return {
          flagged: true,
          matchType: 'exact',
          similarity: 100,
          matchedPostId: exactMatch.id,
          matchedAuthorId: exactMatch.author_id,
          reason: 'Birebir kopya tespit edildi (%100 eşleşme)',
          category: protectedOnly ? 'copyright' : 'kopya_icerik',
        };
      }
    } catch {}

    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    const minWords = Math.max(20, Math.floor(wordCount * 0.5));
    const maxWords = Math.ceil(wordCount * 1.5);
    const typeGroup = contentType === 'moment' || contentType === 'video' ? ['video', 'moment'] : ['post'];

    let candidateQuery = admin
      .from('posts')
      .select('id, author_id, title, content')
      .eq('status', 'published')
      .neq('author_id', authorId)
      .in('content_type', typeGroup)
      .gte('published_at', ninetyDaysAgo)
      .gte('word_count', minWords)
      .lte('word_count', maxWords);

    if (protectedOnly) candidateQuery = candidateQuery.eq('copyright_protected', true);
    if (postId) candidateQuery = candidateQuery.neq('id', postId);

    candidateQuery = candidateQuery.order('published_at', { ascending: false }).limit(200);

    const { data: candidates } = await candidateQuery;
    if (!candidates || candidates.length === 0) return { ...CLEAN_RESULT, similarity: 0 };

    const sourceShingles = getWordShingles(normalized);
    if (sourceShingles.size < 3) return CLEAN_RESULT;

    let bestMatch: { id: number; authorId: string; similarity: number } | null = null;

    for (const candidate of candidates) {
      const candidatePlain = stripHtmlToText(candidate.content || '');
      const candidateFullText = `${candidate.title} ${candidatePlain}`;
      const candidateNormalized = normalizeForComparison(candidateFullText);
      const candidateShingles = getWordShingles(candidateNormalized);
      if (candidateShingles.size < 3) continue;

      const sim = jaccardSimilarity(sourceShingles, candidateShingles);
      const simPercent = Math.round(sim * 100);
      if (simPercent >= 60 && (!bestMatch || simPercent > bestMatch.similarity)) {
        bestMatch = { id: candidate.id, authorId: candidate.author_id, similarity: simPercent };
      }
    }

    if (!bestMatch) return CLEAN_RESULT;

    let matchType: 'exact' | 'high' | 'moderate' = 'moderate';
    if (bestMatch.similarity >= 95) matchType = 'exact';
    else if (bestMatch.similarity >= 80) matchType = 'high';

    return {
      flagged: true,
      matchType,
      similarity: bestMatch.similarity,
      matchedPostId: bestMatch.id,
      matchedAuthorId: bestMatch.authorId,
      reason: protectedOnly
        ? `Telif hakkı ihlali tespit edildi (%${bestMatch.similarity} eşleşme)`
        : `Kopya içerik tespit edildi (%${bestMatch.similarity} eşleşme)`,
      category: protectedOnly ? 'copyright' : 'kopya_icerik',
    };
  } catch (err) {
    console.error('[Copyright] Check failed, allowing post:', err);
    return CLEAN_RESULT;
  }
}

// ─── POST-specific: Body-Only Check (title HARİÇ) ───

/**
 * Post-type copyright check. BODY-ONLY (title excluded from comparison).
 * ≥80% vs any post → kopya_icerik
 * 75-79% vs copyright_protected post → copyright (telif)
 * <75% → clean
 */
export async function checkPostCopyright(
  admin: SupabaseClient,
  content: string,
  authorId: string,
  wordCount: number,
  postId?: number,
): Promise<CopyrightResult> {
  try {
    // Body-only normalize (title excluded)
    const plainText = stripHtmlToText(content);
    const normalized = normalizeForComparison(plainText);

    const words = normalized.split(/\s+/).filter(Boolean);

    // 10 kelime altı hiç taranmaz
    if (words.length < 10) return CLEAN_RESULT;

    const hash = computeContentHash(normalized);

    // Exact hash match vs all posts including same author (10+ kelime)
    try {
      let exactQuery = admin
        .from('posts')
        .select('id, author_id, copyright_protected')
        .eq('content_hash', hash)
        .eq('status', 'published');
      if (postId) exactQuery = exactQuery.neq('id', postId);

      const { data: exactMatch } = await exactQuery.limit(1).single();
      if (exactMatch) {
        const isCopyrightMatch = exactMatch.copyright_protected && words.length >= COPYRIGHT_THRESHOLDS.post.minWords && exactMatch.author_id !== authorId;
        return {
          flagged: true,
          matchType: 'exact',
          similarity: 100,
          matchedPostId: exactMatch.id,
          matchedAuthorId: exactMatch.author_id,
          reason: 'Birebir kopya tespit edildi (%100 eşleşme)',
          category: isCopyrightMatch ? 'copyright' : 'kopya_icerik',
        };
      }
    } catch {}

    // Fuzzy match — body-only shingles (10+ kelime)
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    const minCandidateWords = Math.max(5, Math.floor(wordCount * 0.5));
    const maxCandidateWords = Math.ceil(wordCount * 2);

    let candidateQuery = admin
      .from('posts')
      .select('id, author_id, content, copyright_protected')
      .eq('status', 'published')
      .neq('author_id', authorId)
      .gte('published_at', ninetyDaysAgo)
      .gte('word_count', minCandidateWords)
      .lte('word_count', maxCandidateWords);
    if (postId) candidateQuery = candidateQuery.neq('id', postId);

    candidateQuery = candidateQuery.order('published_at', { ascending: false }).limit(200);

    const { data: candidates } = await candidateQuery;
    if (!candidates || candidates.length === 0) return CLEAN_RESULT;

    // Multi-scale similarity: compute at k=1 (word) and k=3 (trigram) levels
    // Short texts (<30 words): k=1 + overlap coefficient
    // Longer texts: max(k=1 Jaccard, k=3 Jaccard) — catches both word substitutions and structural copies
    const isShortText = words.length < 30;
    const sourceShinglesK1 = getWordShingles(normalized, 1);
    const sourceShinglesK3 = isShortText ? null : getWordShingles(normalized, 3);
    if (sourceShinglesK1.size < 2) return CLEAN_RESULT;

    let bestAll: { id: number; authorId: string; similarity: number } | null = null;
    let bestProtected: { id: number; authorId: string; similarity: number } | null = null;

    for (const candidate of candidates) {
      const candidatePlain = stripHtmlToText(candidate.content || '');
      const candidateNormalized = normalizeForComparison(candidatePlain);
      const candidateShinglesK1 = getWordShingles(candidateNormalized, 1);
      if (candidateShinglesK1.size < 2) continue;

      let sim: number;
      if (isShortText) {
        sim = overlapCoefficient(sourceShinglesK1, candidateShinglesK1);
      } else {
        // Word-level Jaccard (catches word substitutions)
        const simK1 = jaccardSimilarity(sourceShinglesK1, candidateShinglesK1);
        // Trigram-level Jaccard (catches structural/paraphrase copies)
        const candidateShinglesK3 = getWordShingles(candidateNormalized, 3);
        const simK3 = (sourceShinglesK3 && candidateShinglesK3.size >= 2)
          ? jaccardSimilarity(sourceShinglesK3, candidateShinglesK3)
          : 0;
        sim = Math.max(simK1, simK3);
      }
      const simPercent = Math.round(sim * 100);

      if (simPercent >= 60) {
        if (!bestAll || simPercent > bestAll.similarity) {
          bestAll = { id: candidate.id, authorId: candidate.author_id, similarity: simPercent };
        }
        if (candidate.copyright_protected && (!bestProtected || simPercent > bestProtected.similarity)) {
          bestProtected = { id: candidate.id, authorId: candidate.author_id, similarity: simPercent };
        }
      }
    }

    // %90+ vs any post → kopya_icerik (tüm 10+ kelime içerikler)
    if (bestAll && bestAll.similarity >= 90) {
      return {
        flagged: true,
        matchType: 'exact',
        similarity: bestAll.similarity,
        matchedPostId: bestAll.id,
        matchedAuthorId: bestAll.authorId,
        reason: `Kopya içerik tespit edildi (%${bestAll.similarity} eşleşme)`,
        category: 'kopya_icerik',
      };
    }

    // 50+ kelime: ek telif hakkı kontrolleri
    if (words.length >= COPYRIGHT_THRESHOLDS.post.minWords) {
      // ≥80% vs any post → kopya_icerik
      if (bestAll && bestAll.similarity >= COPYRIGHT_THRESHOLDS.post.kopyaMin) {
        return {
          flagged: true,
          matchType: 'exact',
          similarity: bestAll.similarity,
          matchedPostId: bestAll.id,
          matchedAuthorId: bestAll.authorId,
          reason: `Kopya içerik tespit edildi (%${bestAll.similarity} eşleşme)`,
          category: 'kopya_icerik',
        };
      }

      // 75-79% vs copyright_protected post → telif
      if (bestProtected && bestProtected.similarity >= COPYRIGHT_THRESHOLDS.post.telifMin) {
        return {
          flagged: true,
          matchType: 'high',
          similarity: bestProtected.similarity,
          matchedPostId: bestProtected.id,
          matchedAuthorId: bestProtected.authorId,
          reason: `Telif hakkı ihlali tespit edildi (%${bestProtected.similarity} eşleşme)`,
          category: 'copyright',
        };
      }
    }

    return CLEAN_RESULT;
  } catch (err) {
    console.error('[Copyright] Post check failed:', err);
    return CLEAN_RESULT;
  }
}

// ─── Image Copyright (dHash) ───

/**
 * Compute dHash (difference hash) of an image buffer.
 * Sharp resizes to 9x8 grayscale, then compares adjacent pixels.
 * Returns 16 hex char string (64 bits).
 */
export async function computeImageHash(buffer: Buffer): Promise<string> {
  const sharp = (await import('sharp')).default;
  const { data } = await sharp(buffer)
    .resize(9, 8, { fit: 'fill' })
    .grayscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  let hash = BigInt(0);
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const idx = row * 9 + col;
      if (data[idx] > data[idx + 1]) {
        hash |= BigInt(1) << BigInt(row * 8 + col);
      }
    }
  }
  return hash.toString(16).padStart(16, '0');
}

/**
 * Compute dHash from an image URL (fetch → buffer → hash).
 */
export async function computeImageHashFromUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const buffer = Buffer.from(await res.arrayBuffer());
    return computeImageHash(buffer);
  } catch {
    return null;
  }
}

/**
 * Hamming distance between two hex hash strings.
 * Returns number of differing bits (0 = identical, 64 = max).
 */
export function hammingDistance(a: string, b: string): number {
  const xor = BigInt('0x' + a) ^ BigInt('0x' + b);
  let dist = 0;
  let val = xor;
  while (val > 0n) {
    dist += Number(val & 1n);
    val >>= 1n;
  }
  return dist;
}

/**
 * Check if an image hash matches any existing published post.
 * distance ≤ 12 = similar (≥81%), distance 0 = identical.
 */
export async function checkImageCopyright(
  admin: SupabaseClient,
  imageHash: string,
  authorId: string,
  contentType: string,
  postId?: number,
  protectedOnly = false,
): Promise<CopyrightResult> {
  try {
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();

    let query = admin
      .from('posts')
      .select('id, author_id, image_hash')
      .eq('status', 'published')
      .neq('author_id', authorId)
      .not('image_hash', 'is', null)
      .gte('published_at', ninetyDaysAgo);

    if (protectedOnly) query = query.eq('copyright_protected', true);
    if (postId) query = query.neq('id', postId);

    query = query.order('published_at', { ascending: false }).limit(500);

    const { data: candidates } = await query;
    if (!candidates || candidates.length === 0) return CLEAN_RESULT;

    let bestMatch: { id: number; authorId: string; distance: number } | null = null;

    for (const c of candidates) {
      if (!c.image_hash) continue;
      const dist = hammingDistance(imageHash, c.image_hash);
      if (dist <= 12 && (!bestMatch || dist < bestMatch.distance)) {
        bestMatch = { id: c.id, authorId: c.author_id, distance: dist };
      }
    }

    if (!bestMatch) return CLEAN_RESULT;

    const similarity = Math.round((1 - bestMatch.distance / 64) * 100);
    return {
      flagged: true,
      matchType: bestMatch.distance === 0 ? 'exact' : 'high',
      similarity,
      matchedPostId: bestMatch.id,
      matchedAuthorId: bestMatch.authorId,
      reason: bestMatch.distance === 0
        ? 'Birebir aynı görsel tespit edildi'
        : `Benzer görsel tespit edildi (%${similarity} eşleşme)`,
      category: 'copyright',
    };
  } catch (err) {
    console.error('[Copyright] Image check failed:', err);
    return CLEAN_RESULT;
  }
}

// ─── Video Copyright ───

/** Normalize video URL — extract platform ID or strip query params */
export function normalizeVideoUrl(url: string): string {
  try {
    const u = new URL(url);
    if (u.hostname.includes('youtube.com') || u.hostname.includes('youtu.be')) {
      const videoId = u.hostname.includes('youtu.be')
        ? u.pathname.slice(1)
        : u.searchParams.get('v');
      if (videoId) return `youtube:${videoId}`;
    }
    if (u.hostname.includes('vimeo.com')) {
      const match = u.pathname.match(/\/(\d+)/);
      if (match) return `vimeo:${match[1]}`;
    }
    return `${u.hostname}${u.pathname}`;
  } catch {
    return url.toLowerCase().trim();
  }
}

/**
 * Check video copyright by comparing video URLs and duration.
 * Exact URL match → 100%, same duration (±1s) → 75%.
 */
export async function checkVideoCopyright(
  admin: SupabaseClient,
  videoUrl: string,
  videoDuration: number | null,
  authorId: string,
  contentType: string,
  postId?: number,
  protectedOnly = false,
): Promise<CopyrightResult> {
  try {
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    const normalizedUrl = normalizeVideoUrl(videoUrl);

    let query = admin
      .from('posts')
      .select('id, author_id, video_url, video_duration')
      .eq('status', 'published')
      .neq('author_id', authorId)
      .not('video_url', 'is', null)
      .gte('published_at', ninetyDaysAgo);

    if (protectedOnly) query = query.eq('copyright_protected', true);
    if (postId) query = query.neq('id', postId);

    query = query.order('published_at', { ascending: false }).limit(500);

    const { data: candidates } = await query;
    if (!candidates || candidates.length === 0) return CLEAN_RESULT;

    let bestMatch: { id: number; authorId: string; similarity: number } | null = null;

    for (const c of candidates) {
      if (!c.video_url) continue;
      const cNormalized = normalizeVideoUrl(c.video_url);

      let similarity = 0;
      if (normalizedUrl === cNormalized) {
        similarity = 100;
      } else if (videoDuration && c.video_duration && Math.abs(videoDuration - c.video_duration) <= 1) {
        similarity = 75;
      }

      if (similarity > 0 && (!bestMatch || similarity > bestMatch.similarity)) {
        bestMatch = { id: c.id, authorId: c.author_id, similarity };
      }
    }

    if (!bestMatch) return CLEAN_RESULT;

    return {
      flagged: true,
      matchType: bestMatch.similarity >= 80 ? 'exact' : 'high',
      similarity: bestMatch.similarity,
      matchedPostId: bestMatch.id,
      matchedAuthorId: bestMatch.authorId,
      reason: bestMatch.similarity === 100
        ? 'Aynı video tespit edildi'
        : `Benzer video tespit edildi (%${bestMatch.similarity} eşleşme)`,
      category: 'copyright',
    };
  } catch (err) {
    console.error('[Copyright] Video check failed:', err);
    return CLEAN_RESULT;
  }
}

// ─── VIDEO Frame Hash Check ───

/**
 * Check video frame hashes against copyright_protected videos.
 * Compares frame-by-frame using Hamming distance.
 * 5+ consecutive matching frames = "5-second rule" violation.
 */
export async function checkVideoFrameCopyright(
  admin: SupabaseClient,
  frameHashes: { frameIndex: number; hash: string }[],
  authorId: string,
  postId?: number,
): Promise<CopyrightResult & { consecutiveMatches: number }> {
  const cleanResult = { ...CLEAN_RESULT, consecutiveMatches: 0 };
  try {
    if (!frameHashes || frameHashes.length === 0) return cleanResult;

    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();

    // Get copyright_protected video post IDs from last 90 days
    let postQuery = admin
      .from('posts')
      .select('id, author_id')
      .eq('status', 'published')
      .eq('copyright_protected', true)
      .in('content_type', ['video', 'moment'])
      .neq('author_id', authorId)
      .gte('published_at', ninetyDaysAgo);
    if (postId) postQuery = postQuery.neq('id', postId);
    postQuery = postQuery.limit(200);

    const { data: protectedPosts } = await postQuery;
    if (!protectedPosts || protectedPosts.length === 0) return cleanResult;

    const protectedPostIds = protectedPosts.map(p => p.id);
    const postAuthorMap = new Map(protectedPosts.map(p => [p.id, p.author_id]));

    // Get frame hashes for these posts
    const { data: existingHashes } = await admin
      .from('video_frame_hashes')
      .select('post_id, frame_index, frame_hash')
      .in('post_id', protectedPostIds)
      .order('frame_index', { ascending: true });

    if (!existingHashes || existingHashes.length === 0) return cleanResult;

    // Group hashes by post_id
    const hashesByPost = new Map<number, { frameIndex: number; hash: string }[]>();
    for (const h of existingHashes) {
      const arr = hashesByPost.get(h.post_id) || [];
      arr.push({ frameIndex: h.frame_index, hash: h.frame_hash });
      hashesByPost.set(h.post_id, arr);
    }

    let bestMatch: { postId: number; authorId: string; similarity: number; consecutive: number } | null = null;

    for (const [candidatePostId, candidateHashes] of hashesByPost) {
      // Sliding-window comparison: check EVERY source frame against EVERY candidate frame.
      // This handles the case where protected content appears at ANY position in the longer video.
      // E.g. 7s protected clip embedded at seconds 7-13 of a 21s video.

      // 1. Find all matching pairs (srcIdx, candIdx) with Hamming ≤ threshold
      //    Uses frameHammingThreshold (17 for aHash) — more tolerant than image dHash (12)
      const frameThreshold = COPYRIGHT_THRESHOLDS.video.frameHammingThreshold;
      const matchPairs: { srcIdx: number; candIdx: number }[] = [];
      for (const srcFrame of frameHashes) {
        for (const candFrame of candidateHashes) {
          const dist = hammingDistance(srcFrame.hash, candFrame.hash);
          if (dist <= frameThreshold) {
            matchPairs.push({ srcIdx: srcFrame.frameIndex, candIdx: candFrame.frameIndex });
          }
        }
      }

      if (matchPairs.length === 0) continue;

      // 2. Group by offset (srcIdx - candIdx) — same offset means aligned sequence
      const offsetGroups = new Map<number, Set<number>>();
      for (const pair of matchPairs) {
        const offset = pair.srcIdx - pair.candIdx;
        if (!offsetGroups.has(offset)) offsetGroups.set(offset, new Set());
        offsetGroups.get(offset)!.add(pair.srcIdx);
      }

      // 3. For each offset, find longest consecutive run + total matched frames
      let maxConsecutive = 0;
      let bestOffsetMatchCount = 0;

      for (const [, srcFrames] of offsetGroups) {
        const sorted = [...srcFrames].sort((a, b) => a - b);
        let consecutive = 1;
        let longestRun = 1;
        for (let i = 1; i < sorted.length; i++) {
          if (sorted[i] === sorted[i - 1] + 1) {
            consecutive++;
            if (consecutive > longestRun) longestRun = consecutive;
          } else {
            consecutive = 1;
          }
        }
        if (longestRun > maxConsecutive) maxConsecutive = longestRun;
        if (srcFrames.size > bestOffsetMatchCount) bestOffsetMatchCount = srcFrames.size;
      }

      // 4. Similarity: relative to protected video length (how much of original was copied)
      const similarity = Math.round((bestOffsetMatchCount / candidateHashes.length) * 100);

      if (
        (maxConsecutive >= COPYRIGHT_THRESHOLDS.video.consecutiveFrameThreshold || similarity >= COPYRIGHT_THRESHOLDS.video.matchThreshold) &&
        (!bestMatch || maxConsecutive > bestMatch.consecutive || (maxConsecutive === bestMatch.consecutive && similarity > bestMatch.similarity))
      ) {
        bestMatch = {
          postId: candidatePostId,
          authorId: postAuthorMap.get(candidatePostId) || '',
          similarity,
          consecutive: maxConsecutive,
        };
      }
    }

    if (!bestMatch) return cleanResult;

    const reason = bestMatch.consecutive >= COPYRIGHT_THRESHOLDS.video.consecutiveFrameThreshold
      ? `Video frame eşleşmesi: ${bestMatch.consecutive} ardışık frame (%${bestMatch.similarity} benzerlik)`
      : `Video frame eşleşmesi (%${bestMatch.similarity} benzerlik)`;

    return {
      flagged: true,
      matchType: 'exact',
      similarity: bestMatch.similarity,
      matchedPostId: bestMatch.postId,
      matchedAuthorId: bestMatch.authorId,
      reason,
      category: 'copyright',
      consecutiveMatches: bestMatch.consecutive,
    };
  } catch (err) {
    console.error('[Copyright] Video frame check failed:', err);
    return cleanResult;
  }
}

// ─── Audio Fingerprint Check ───

/**
 * Check audio fingerprint hashes against copyright_protected videos.
 * Uses same sliding-window algorithm as video frame check.
 * 4+ consecutive matching audio chunks = audio copyright violation.
 */
export async function checkAudioCopyright(
  admin: SupabaseClient,
  audioHashes: { chunkIndex: number; hash: string }[],
  authorId: string,
  postId?: number,
): Promise<CopyrightResult & { consecutiveMatches: number }> {
  const cleanResult = { ...CLEAN_RESULT, consecutiveMatches: 0 };
  try {
    if (!audioHashes || audioHashes.length === 0) return cleanResult;

    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();

    // Get copyright_protected video/moment posts
    let postQuery = admin
      .from('posts')
      .select('id, author_id')
      .eq('status', 'published')
      .eq('copyright_protected', true)
      .in('content_type', ['video', 'moment'])
      .neq('author_id', authorId)
      .gte('published_at', ninetyDaysAgo);
    if (postId) postQuery = postQuery.neq('id', postId);
    postQuery = postQuery.limit(200);

    const { data: protectedPosts } = await postQuery;
    if (!protectedPosts || protectedPosts.length === 0) return cleanResult;

    const protectedPostIds = protectedPosts.map(p => p.id);
    const postAuthorMap = new Map(protectedPosts.map(p => [p.id, p.author_id]));

    // Get audio hashes for protected posts
    const { data: existingHashes } = await admin
      .from('audio_fingerprints')
      .select('post_id, chunk_index, chunk_hash')
      .in('post_id', protectedPostIds)
      .order('chunk_index', { ascending: true });

    if (!existingHashes || existingHashes.length === 0) return cleanResult;

    // Group by post_id
    const hashesByPost = new Map<number, { chunkIndex: number; hash: string }[]>();
    for (const h of existingHashes) {
      const arr = hashesByPost.get(h.post_id) || [];
      arr.push({ chunkIndex: h.chunk_index, hash: h.chunk_hash });
      hashesByPost.set(h.post_id, arr);
    }

    let bestMatch: { postId: number; authorId: string; similarity: number; consecutive: number } | null = null;
    const audioThreshold = COPYRIGHT_THRESHOLDS.video.frameHammingThreshold; // Same threshold as video frames

    for (const [candidatePostId, candidateHashes] of hashesByPost) {
      // Sliding-window: check every source chunk against every candidate chunk
      const matchPairs: { srcIdx: number; candIdx: number }[] = [];
      for (const srcChunk of audioHashes) {
        for (const candChunk of candidateHashes) {
          const dist = hammingDistance(srcChunk.hash, candChunk.hash);
          if (dist <= audioThreshold) {
            matchPairs.push({ srcIdx: srcChunk.chunkIndex, candIdx: candChunk.chunkIndex });
          }
        }
      }

      if (matchPairs.length === 0) continue;

      // Group by offset
      const offsetGroups = new Map<number, Set<number>>();
      for (const pair of matchPairs) {
        const offset = pair.srcIdx - pair.candIdx;
        if (!offsetGroups.has(offset)) offsetGroups.set(offset, new Set());
        offsetGroups.get(offset)!.add(pair.srcIdx);
      }

      // Find longest consecutive run
      let maxConsecutive = 0;
      let bestOffsetMatchCount = 0;

      for (const [, srcChunks] of offsetGroups) {
        const sorted = [...srcChunks].sort((a, b) => a - b);
        let consecutive = 1;
        let longestRun = 1;
        for (let i = 1; i < sorted.length; i++) {
          if (sorted[i] === sorted[i - 1] + 1) {
            consecutive++;
            if (consecutive > longestRun) longestRun = consecutive;
          } else {
            consecutive = 1;
          }
        }
        if (longestRun > maxConsecutive) maxConsecutive = longestRun;
        if (srcChunks.size > bestOffsetMatchCount) bestOffsetMatchCount = srcChunks.size;
      }

      const similarity = Math.round((bestOffsetMatchCount / candidateHashes.length) * 100);

      if (
        (maxConsecutive >= COPYRIGHT_THRESHOLDS.video.consecutiveFrameThreshold || similarity >= COPYRIGHT_THRESHOLDS.video.matchThreshold) &&
        (!bestMatch || maxConsecutive > bestMatch.consecutive || (maxConsecutive === bestMatch.consecutive && similarity > bestMatch.similarity))
      ) {
        bestMatch = {
          postId: candidatePostId,
          authorId: postAuthorMap.get(candidatePostId) || '',
          similarity,
          consecutive: maxConsecutive,
        };
      }
    }

    if (!bestMatch) return cleanResult;

    const reason = bestMatch.consecutive >= COPYRIGHT_THRESHOLDS.video.consecutiveFrameThreshold
      ? `Ses eşleşmesi: ${bestMatch.consecutive} ardışık saniye (%${bestMatch.similarity} benzerlik)`
      : `Ses eşleşmesi (%${bestMatch.similarity} benzerlik)`;

    return {
      flagged: true,
      matchType: 'exact',
      similarity: bestMatch.similarity,
      matchedPostId: bestMatch.postId,
      matchedAuthorId: bestMatch.authorId,
      reason,
      category: 'copyright',
      consecutiveMatches: bestMatch.consecutive,
    };
  } catch (err) {
    console.error('[Copyright] Audio check failed:', err);
    return cleanResult;
  }
}

// ─── Unified Copyright Check (Content-Type Routing) ───

/**
 * Unified copyright check with content-type specific routing.
 *
 * POST: Body-only text check (title excluded), image auto-check SKIP
 * VIDEO: Text check SKIP, thumbnail dHash + frame hash + video URL check
 * MOMENT: Auto scan SKIP, simple duplicate (same video_url + body ≥90%)
 */
export async function checkCopyrightUnified(
  admin: SupabaseClient,
  title: string,
  content: string,
  authorId: string,
  contentType: string,
  wordCount: number,
  options: {
    featuredImage?: string | null;
    videoUrl?: string | null;
    videoDuration?: number | null;
    videoThumbnail?: string | null;
    imageHash?: string | null;
    postId?: number;
    frameHashes?: { frameIndex: number; hash: string }[];
    audioHashes?: { chunkIndex: number; hash: string }[];
  } = {},
): Promise<CopyrightResult> {
  try {
    // ─── POST type ───
    if (contentType === 'post') {
      // Body-only check (title excluded), 75/80 thresholds
      const postResult = await checkPostCopyright(
        admin, content, authorId, wordCount, options.postId,
      );
      // Image auto-check SKIP (NSFW scan continues separately)
      return postResult;
    }

    // ─── VIDEO type ───
    if (contentType === 'video') {
      const results: CopyrightResult[] = [];

      // 1. Text-based kopya check (same rules as posts — body/description)
      //    Checks against ALL video posts → kopya_icerik
      const textResult = await checkPostCopyright(
        admin, content, authorId, wordCount, options.postId,
      );
      if (textResult.flagged) {
        // Text matches are always kopya_icerik for videos
        results.push({ ...textResult, category: 'kopya_icerik' });
      }

      // 2. Thumbnail dHash check (against protected posts → telif hakkı)
      const imgUrl = options.videoThumbnail || options.featuredImage;
      let imgHash = options.imageHash || null;
      if (!imgHash && imgUrl) imgHash = await computeImageHashFromUrl(imgUrl);
      if (imgHash && COPYRIGHT_THRESHOLDS.video.thumbnailCheck) {
        results.push(await checkImageCopyright(
          admin, imgHash, authorId, contentType, options.postId, true,
        ));
      }

      // 3. Video frame hash check (against protected posts → telif hakkı)
      if (options.frameHashes && options.frameHashes.length > 0 && COPYRIGHT_THRESHOLDS.video.frameHashCheck) {
        const frameResult = await checkVideoFrameCopyright(
          admin, options.frameHashes, authorId, options.postId,
        );
        results.push(frameResult);
      }

      // 4. Audio fingerprint check (against protected posts → telif hakkı)
      if (options.audioHashes && options.audioHashes.length > 0) {
        const audioResult = await checkAudioCopyright(
          admin, options.audioHashes, authorId, options.postId,
        );
        results.push(audioResult);
      }

      // 5. Video URL check (against protected posts → telif hakkı)
      if (options.videoUrl) {
        results.push(await checkVideoCopyright(
          admin, options.videoUrl, options.videoDuration || null, authorId, contentType, options.postId, true,
        ));
      }

      // Take worst result
      const best = results.reduce((a, b) => (b.similarity > a.similarity ? b : a), CLEAN_RESULT);

      if (best.flagged) {
        // kopya_icerik from text keeps its category, visual matches are copyright
        return best;
      }

      return CLEAN_RESULT;
    }

    // ─── MOMENT type ───
    if (contentType === 'moment') {
      // Auto telif taraması YOK
      // Simple duplicate: same video_url + body text ≥90%
      if (options.videoUrl) {
        try {
          const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
          const normalizedUrl = normalizeVideoUrl(options.videoUrl);

          const { data: urlCandidates } = await admin
            .from('posts')
            .select('id, author_id, content, video_url')
            .eq('status', 'published')
            .in('content_type', ['moment', 'video'])
            .neq('author_id', authorId)
            .not('video_url', 'is', null)
            .gte('published_at', ninetyDaysAgo)
            .order('published_at', { ascending: false })
            .limit(200);

          if (urlCandidates && urlCandidates.length > 0) {
            const sourceBody = normalizeForComparison(stripHtmlToText(content || ''));
            const sourceShingles = sourceBody.length > 10 ? getWordShingles(sourceBody) : null;

            for (const c of urlCandidates) {
              if (!c.video_url) continue;
              const cNormalized = normalizeVideoUrl(c.video_url);
              if (normalizedUrl !== cNormalized) continue;

              // Same video URL found → check body similarity
              let bodySim = 100; // Default: if both empty, 100%
              if (sourceShingles && sourceShingles.size >= 3) {
                const candidateBody = normalizeForComparison(stripHtmlToText(c.content || ''));
                const candidateShingles = getWordShingles(candidateBody);
                if (candidateShingles.size >= 3) {
                  bodySim = Math.round(jaccardSimilarity(sourceShingles, candidateShingles) * 100);
                }
              }

              if (bodySim >= COPYRIGHT_THRESHOLDS.moment.duplicateThreshold) {
                return {
                  flagged: true,
                  matchType: 'exact',
                  similarity: bodySim,
                  matchedPostId: c.id,
                  matchedAuthorId: c.author_id,
                  reason: `Kopya içerik tespit edildi (aynı video + %${bodySim} metin benzerliği)`,
                  category: 'kopya_icerik',
                };
              }
            }
          }
        } catch {}
      }

      return CLEAN_RESULT;
    }

    // Fallback: unknown content type → legacy dual-pass
    return await checkCopyright(admin, title, content, authorId, contentType, wordCount, options.postId, false);
  } catch (err) {
    console.error('[Copyright] Unified check failed:', err);
    return CLEAN_RESULT;
  }
}
