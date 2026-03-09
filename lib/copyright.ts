import { createHash } from 'crypto';
import { SupabaseClient } from '@supabase/supabase-js';
import { stripHtmlToText } from '@/lib/htmlToText';
import { logServerError } from '@/lib/runtimeLogger';
export { stripHtmlToText } from '@/lib/htmlToText';

export type CopyrightResult = {
  flagged: boolean;
  matchType: 'exact' | 'high' | 'moderate' | null;
  similarity: number;
  matchedPostId: number | null;
  matchedAuthorId: string | null;
  reason: string | null;
  /** 'copyright' = copyright violation, 'kopya_icerik' = duplicate content */
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

/** Pick worst result: copyright > duplicate, then highest similarity */
function pickWorstResult(results: CopyrightResult[]): CopyrightResult {
  const flagged = results.filter(r => r.flagged);
  if (flagged.length === 0) return CLEAN_RESULT;
  // Copyright takes priority over kopya_icerik
  const copyrightResults = flagged.filter(r => r.category === 'copyright');
  const pool = copyrightResults.length > 0 ? copyrightResults : flagged;
  return pool.reduce((a, b) => (b.similarity > a.similarity ? b : a));
}

// ─── Content-Type Thresholds ───

export const COPYRIGHT_THRESHOLDS = {
  post: {
    minWords: 50,           // Below 50 words: skip fuzzy scan
    kopyaMin: 85,           // ≥85% → duplicate content (vs all posts)
    telifMin: 75,           // ≥75% → copyright violation (vs copyright_protected posts)
    imageAutoCheck: true,   // Auto-scan images (dHash)
    titleCheck: false,      // Title excluded from comparison
  },
  video: {
    textCheck: true,        // Text duplicate check (same rules as posts)
    thumbnailCheck: true,   // dHash thumbnail comparison
    frameHashCheck: true,   // Video frame hashing (aHash — center-crop)
    frameHammingThreshold: 10, // aHash Hamming threshold (stricter: 17 caused mass false positives)
    consecutiveFrameThreshold: 8,  // 8+ consecutive frames → duplicate (was 4, too low)
    copyrightConsecutiveThreshold: 10, // 10+ consecutive frames → copyright (vs copyright_protected)
    matchThreshold: 60,     // ≥60% → moderation (overall frame match ratio)
    minSimilarityForConsecutive: 15, // Minimum similarity % required alongside consecutive match
  },
} as const;

// ─── Utility Functions ───

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
          reason: 'Exact duplicate detected (100% match)',
          category: 'kopya_icerik',
        };
      }
    } catch {}

    const minWords = Math.max(20, Math.floor(wordCount * 0.5));
    const maxWords = Math.ceil(wordCount * 1.5);
    const typeGroup = contentType === 'moment' || contentType === 'video' ? ['video', 'moment'] : ['post'];

    let candidateQuery = admin
      .from('posts')
      .select('id, author_id, title, content')
      .eq('status', 'published')
      .neq('author_id', authorId)
      .in('content_type', typeGroup)

      .gte('word_count', minWords)
      .lte('word_count', maxWords);

    if (protectedOnly) candidateQuery = candidateQuery.eq('copyright_protected', true);
    if (postId) candidateQuery = candidateQuery.neq('id', postId);

    candidateQuery = candidateQuery.limit(500);

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
      reason: `Duplicate content detected (${bestMatch.similarity}% match)`,
      category: bestMatch.similarity >= 100 ? 'kopya_icerik' : null,
    };
  } catch (err) {
    logServerError('[Copyright] Check failed, allowing post', err, {
      operation: 'check_text_duplicate',
    });
    return CLEAN_RESULT;
  }
}

// ─── POST-specific: Body-Only Check (title excluded) ───

/**
 * Post-type text check. BODY-ONLY (title excluded from comparison).
 * ≥85% vs any post → duplicate
 * ≥75% vs copyright_protected post → copyright (only when enableCopyrightCheck=true)
 */
export async function checkPostCopyright(
  admin: SupabaseClient,
  content: string,
  authorId: string,
  wordCount: number,
  postId?: number,
  enableCopyrightCheck = false,
): Promise<CopyrightResult> {
  try {
    // Body-only normalize (title excluded)
    const plainText = stripHtmlToText(content);
    const normalized = normalizeForComparison(plainText);

    const words = normalized.split(/\s+/).filter(Boolean);

    // Very short texts are too noisy; still allow exact matching for 3+ words.
    if (words.length < 3) return CLEAN_RESULT;

    const hash = computeContentHash(normalized);

    // Exact hash match vs other authors' posts (3+ kelime)
    try {
      let exactQuery = admin
        .from('posts')
        .select('id, author_id, copyright_protected')
        .eq('content_hash', hash)
        .eq('status', 'published')
        .neq('author_id', authorId);
      if (postId) exactQuery = exactQuery.neq('id', postId);

      const { data: exactMatch } = await exactQuery.limit(1).single();
      if (exactMatch) {
        const isTelif = enableCopyrightCheck && exactMatch.copyright_protected;
        return {
          flagged: true,
          matchType: 'exact',
          similarity: 100,
          matchedPostId: exactMatch.id,
          matchedAuthorId: exactMatch.author_id,
          reason: isTelif
            ? 'Copyright violation detected (100% match)'
            : 'Exact duplicate detected (100% match)',
          category: isTelif ? 'copyright' : 'kopya_icerik',
        };
      }
    } catch {}

    // Fuzzy match — body-only shingles (50+ kelime)
    if (words.length < COPYRIGHT_THRESHOLDS.post.minWords) return CLEAN_RESULT;

    const minCandidateWords = Math.max(5, Math.floor(wordCount * 0.5));
    const maxCandidateWords = Math.ceil(wordCount * 2);

    let candidateQuery = admin
      .from('posts')
      .select('id, author_id, content, copyright_protected')
      .eq('status', 'published')
      .neq('author_id', authorId)
      .gte('word_count', minCandidateWords)
      .lte('word_count', maxCandidateWords);
    if (postId) candidateQuery = candidateQuery.neq('id', postId);

    candidateQuery = candidateQuery.limit(500);

    const { data: candidates } = await candidateQuery;
    if (!candidates || candidates.length === 0) return CLEAN_RESULT;

    // Multi-scale similarity: compute at k=1 (word) and k=3 (trigram) levels
    const sourceShinglesK1 = getWordShingles(normalized, 1);
    const sourceShinglesK3 = getWordShingles(normalized, 3);
    if (sourceShinglesK1.size < 2) return CLEAN_RESULT;

    let bestAll: { id: number; authorId: string; similarity: number } | null = null;
    let bestProtected: { id: number; authorId: string; similarity: number } | null = null;

    for (const candidate of candidates) {
      const candidatePlain = stripHtmlToText(candidate.content || '');
      const candidateNormalized = normalizeForComparison(candidatePlain);
      const candidateShinglesK1 = getWordShingles(candidateNormalized, 1);
      if (candidateShinglesK1.size < 2) continue;

      const simK1 = jaccardSimilarity(sourceShinglesK1, candidateShinglesK1);
      const candidateShinglesK3 = getWordShingles(candidateNormalized, 3);
      const simK3 = candidateShinglesK3.size >= 2
        ? jaccardSimilarity(sourceShinglesK3, candidateShinglesK3)
        : 0;
      const sim = Math.max(simK1, simK3);
      const simPercent = Math.round(sim * 100);

      if (simPercent >= 60) {
        if (!bestAll || simPercent > bestAll.similarity) {
          bestAll = { id: candidate.id, authorId: candidate.author_id, similarity: simPercent };
        }
        if (enableCopyrightCheck && candidate.copyright_protected && (!bestProtected || simPercent > bestProtected.similarity)) {
          bestProtected = { id: candidate.id, authorId: candidate.author_id, similarity: simPercent };
        }
      }
    }

    // ≥85% vs any post → flag for moderation (only exact 100% gets duplicate badge visible to user)
    if (bestAll && bestAll.similarity >= COPYRIGHT_THRESHOLDS.post.kopyaMin) {
      return {
        flagged: true,
        matchType: bestAll.similarity >= 95 ? 'exact' : 'high',
        similarity: bestAll.similarity,
        matchedPostId: bestAll.id,
        matchedAuthorId: bestAll.authorId,
        reason: `Duplicate content detected (${bestAll.similarity}% match)`,
        category: bestAll.similarity >= 100 ? 'kopya_icerik' : null,
      };
    }

    // ≥75% vs copyright_protected → copyright violation
    if (bestProtected && bestProtected.similarity >= COPYRIGHT_THRESHOLDS.post.telifMin) {
      return {
        flagged: true,
        matchType: 'high',
        similarity: bestProtected.similarity,
        matchedPostId: bestProtected.id,
        matchedAuthorId: bestProtected.authorId,
        reason: `Copyright violation detected (${bestProtected.similarity}% match)`,
        category: 'copyright',
      };
    }

    return CLEAN_RESULT;
  } catch (err) {
    logServerError('[Copyright] Post check failed', err, {
      operation: 'check_post_copyright',
    });
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
    // SSRF protection: block private/internal URLs
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    if (
      host === 'localhost' || host === '127.0.0.1' || host === '[::1]' || host === '0.0.0.0' ||
      host.startsWith('10.') || host.startsWith('192.168.') || host.startsWith('172.') ||
      host.endsWith('.local') || host.endsWith('.internal') ||
      /^169\.254\./.test(host) || /^fc00:/.test(host) || /^fe80:/.test(host)
    ) {
      return null;
    }
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return null;
    const buffer = Buffer.from(await res.arrayBuffer());
    return computeImageHash(buffer);
  } catch {
    return null;
  }
}

/**
 * Check if a hash is degenerate (nearly all 0s or all 1s).
 * These come from low-variance frames (black screens, solid colors)
 * and match each other falsely across unrelated content.
 * A hash with fewer than 8 or more than 56 set bits out of 64 is uniform.
 */
function isUniformHash(hash: string): boolean {
  let bits = 0;
  let val = BigInt('0x' + hash);
  while (val > 0n) {
    bits += Number(val & 1n);
    val >>= 1n;
  }
  return bits < 8 || bits > 56;
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
 * enableCopyrightCheck=true → returns 'copyright' if matched post is copyright_protected.
 */
export async function checkImageCopyright(
  admin: SupabaseClient,
  imageHash: string,
  authorId: string,
  contentType: string,
  postId?: number,
  enableCopyrightCheck = false,
): Promise<CopyrightResult> {
  try {
    let query = admin
      .from('posts')
      .select('id, author_id, image_hash, copyright_protected')
      .eq('status', 'published')
      .neq('author_id', authorId)
      .not('image_hash', 'is', null);

    if (postId) query = query.neq('id', postId);

    query = query.limit(500);

    const { data: candidates } = await query;
    if (!candidates || candidates.length === 0) return CLEAN_RESULT;

    let bestMatch: { id: number; authorId: string; distance: number; copyrightProtected: boolean } | null = null;

    for (const c of candidates) {
      if (!c.image_hash) continue;
      const dist = hammingDistance(imageHash, c.image_hash);
      if (dist <= 12 && (!bestMatch || dist < bestMatch.distance)) {
        bestMatch = { id: c.id, authorId: c.author_id, distance: dist, copyrightProtected: !!c.copyright_protected };
      }
    }

    if (!bestMatch) return CLEAN_RESULT;

    const similarity = Math.round((1 - bestMatch.distance / 64) * 100);
    const isTelif = enableCopyrightCheck && bestMatch.copyrightProtected;
    return {
      flagged: true,
      matchType: bestMatch.distance === 0 ? 'exact' : 'high',
      similarity,
      matchedPostId: bestMatch.id,
      matchedAuthorId: bestMatch.authorId,
      reason: isTelif
        ? (bestMatch.distance === 0 ? 'Copyright violation: identical image' : `Copyright violation: similar image (${similarity}%)`)
        : (bestMatch.distance === 0 ? 'Identical image detected' : `Similar image detected (${similarity}% match)`),
      category: isTelif ? 'copyright' : (bestMatch.distance === 0 ? 'kopya_icerik' : null),
    };
  } catch (err) {
    logServerError('[Copyright] Image check failed', err, {
      operation: 'check_image_copyright',
    });
    return CLEAN_RESULT;
  }
}

// ─── Inline Images Copyright Check ───

/** Extract all <img src="..."> URLs from HTML content */
function extractInlineImageUrls(html: string): Set<string> {
  const urls = new Set<string>();
  const regex = /<img[^>]+src=["']([^"']+)["']/gi;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(html)) !== null) {
    const url = match[1].trim();
    if (url) urls.add(url);
  }
  return urls;
}

/**
 * Check if a post's inline images are copied from another post.
 * If the source has ≥2 inline images and ALL of them exist in a candidate post → kopya_icerik.
 * Only checks against 'post' type, last 90 days, different author.
 */
export async function checkInlineImagesCopyright(
  admin: SupabaseClient,
  content: string,
  authorId: string,
  postId?: number,
): Promise<CopyrightResult> {
  try {
    const sourceUrls = extractInlineImageUrls(content);
    if (sourceUrls.size < 2) return CLEAN_RESULT;

    let query = admin
      .from('posts')
      .select('id, author_id, content')
      .eq('status', 'published')
      .eq('content_type', 'post')
      .neq('author_id', authorId);
    if (postId) query = query.neq('id', postId);

    query = query.limit(500);

    const { data: candidates } = await query;
    if (!candidates || candidates.length === 0) return CLEAN_RESULT;

    for (const candidate of candidates) {
      if (!candidate.content) continue;
      const candidateUrls = extractInlineImageUrls(candidate.content);
      if (candidateUrls.size < sourceUrls.size) continue;

      // Check if ALL source URLs exist in candidate
      let allFound = true;
      for (const url of sourceUrls) {
        if (!candidateUrls.has(url)) {
          allFound = false;
          break;
        }
      }

      if (allFound) {
        return {
          flagged: true,
          matchType: 'exact',
          similarity: 100,
          matchedPostId: candidate.id,
          matchedAuthorId: candidate.author_id,
          reason: `Duplicate content detected (${sourceUrls.size} identical images)`,
          category: 'kopya_icerik',
        };
      }
    }

    return CLEAN_RESULT;
  } catch (err) {
    logServerError('[Copyright] Inline images check failed', err, {
      operation: 'check_inline_images',
    });
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

    const normalizedUrl = normalizeVideoUrl(videoUrl);

    let query = admin
      .from('posts')
      .select('id, author_id, video_url, video_duration')
      .eq('status', 'published')
      .neq('author_id', authorId)
      .not('video_url', 'is', null);

    if (protectedOnly) query = query.eq('copyright_protected', true);
    if (postId) query = query.neq('id', postId);

    query = query.limit(500);

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
        ? 'Identical video detected'
        : `Similar video detected (${bestMatch.similarity}% match)`,
      category: bestMatch.similarity === 100 ? 'kopya_icerik' : null,
    };
  } catch (err) {
    logServerError('[Copyright] Video check failed', err, {
      operation: 'check_video_copyright',
    });
    return CLEAN_RESULT;
  }
}

// ─── VIDEO Frame Hash Check ───

/**
 * Check video frame hashes against ALL video posts.
 * Compares frame-by-frame using Hamming distance.
 * 4+ consecutive → kopya_icerik, 5+ consecutive vs copyright_protected → copyright.
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

    // Get ALL video posts (with copyright_protected info)
    let postQuery = admin
      .from('posts')
      .select('id, author_id, copyright_protected')
      .eq('status', 'published')
      .in('content_type', ['video'])
      .neq('author_id', authorId);
    if (postId) postQuery = postQuery.neq('id', postId);
    postQuery = postQuery.limit(500);

    const { data: videoPosts } = await postQuery;
    if (!videoPosts || videoPosts.length === 0) return cleanResult;

    const videoPostIds = videoPosts.map(p => p.id);
    const postInfoMap = new Map(videoPosts.map(p => [p.id, { authorId: p.author_id, copyrightProtected: !!p.copyright_protected }]));

    // Get frame hashes for these posts
    const { data: existingHashes } = await admin
      .from('video_frame_hashes')
      .select('post_id, frame_index, frame_hash')
      .in('post_id', videoPostIds)
      .order('frame_index', { ascending: true });

    if (!existingHashes || existingHashes.length === 0) return cleanResult;

    // Group hashes by post_id
    const hashesByPost = new Map<number, { frameIndex: number; hash: string }[]>();
    for (const h of existingHashes) {
      const arr = hashesByPost.get(h.post_id) || [];
      arr.push({ frameIndex: h.frame_index, hash: h.frame_hash });
      hashesByPost.set(h.post_id, arr);
    }

    // Track best kopya match and best copyright match separately
    type FrameMatch = { postId: number; authorId: string; similarity: number; consecutive: number };
    let bestKopya: FrameMatch | null = null;
    let bestTelif: FrameMatch | null = null;

    for (const [candidatePostId, candidateHashes] of hashesByPost) {
      const info = postInfoMap.get(candidatePostId);
      if (!info) continue;

      const frameThreshold = COPYRIGHT_THRESHOLDS.video.frameHammingThreshold;
      const matchPairs: { srcIdx: number; candIdx: number }[] = [];
      for (const srcFrame of frameHashes) {
        if (isUniformHash(srcFrame.hash)) continue;
        for (const candFrame of candidateHashes) {
          if (isUniformHash(candFrame.hash)) continue;
          const dist = hammingDistance(srcFrame.hash, candFrame.hash);
          if (dist <= frameThreshold) {
            matchPairs.push({ srcIdx: srcFrame.frameIndex, candIdx: candFrame.frameIndex });
          }
        }
      }

      if (matchPairs.length === 0) continue;

      const offsetGroups = new Map<number, Set<number>>();
      for (const pair of matchPairs) {
        const offset = pair.srcIdx - pair.candIdx;
        if (!offsetGroups.has(offset)) offsetGroups.set(offset, new Set());
        offsetGroups.get(offset)!.add(pair.srcIdx);
      }

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

      const similarity = Math.round((bestOffsetMatchCount / candidateHashes.length) * 100);
      const match: FrameMatch = { postId: candidatePostId, authorId: info.authorId, similarity, consecutive: maxConsecutive };

      const minSimForConsec = COPYRIGHT_THRESHOLDS.video.minSimilarityForConsecutive;

      // Copyright: protected post + enough consecutive frames + minimum similarity
      if (info.copyrightProtected && (
        (maxConsecutive >= COPYRIGHT_THRESHOLDS.video.copyrightConsecutiveThreshold && similarity >= minSimForConsec) ||
        similarity >= COPYRIGHT_THRESHOLDS.video.matchThreshold
      )) {
        if (!bestTelif || maxConsecutive > bestTelif.consecutive || (maxConsecutive === bestTelif.consecutive && similarity > bestTelif.similarity)) {
          bestTelif = match;
        }
      }

      // Duplicate: enough consecutive frames + minimum similarity, or high overall match
      if (
        (maxConsecutive >= COPYRIGHT_THRESHOLDS.video.consecutiveFrameThreshold && similarity >= minSimForConsec) ||
        similarity >= COPYRIGHT_THRESHOLDS.video.matchThreshold
      ) {
        if (!bestKopya || maxConsecutive > bestKopya.consecutive || (maxConsecutive === bestKopya.consecutive && similarity > bestKopya.similarity)) {
          bestKopya = match;
        }
      }
    }

    // Copyright takes priority over kopya
    const finalMatch = bestTelif || bestKopya;
    if (!finalMatch) return cleanResult;

    const isTelif = finalMatch === bestTelif;
    const threshold = isTelif ? COPYRIGHT_THRESHOLDS.video.copyrightConsecutiveThreshold : COPYRIGHT_THRESHOLDS.video.consecutiveFrameThreshold;
    const reason = finalMatch.consecutive >= threshold
      ? `${isTelif ? 'Copyright violation' : 'Video frame match'}: ${finalMatch.consecutive} consecutive frames (${finalMatch.similarity}% similarity)`
      : `${isTelif ? 'Copyright violation' : 'Video frame match'} (${finalMatch.similarity}% similarity)`;

    return {
      flagged: true,
      matchType: 'exact',
      similarity: finalMatch.similarity,
      matchedPostId: finalMatch.postId,
      matchedAuthorId: finalMatch.authorId,
      reason,
      category: isTelif ? 'copyright' : (finalMatch.similarity >= 100 ? 'kopya_icerik' : null),
      consecutiveMatches: finalMatch.consecutive,
    };
  } catch (err) {
    logServerError('[Copyright] Video frame check failed', err, {
      operation: 'check_video_frames',
    });
    return cleanResult;
  }
}

// ─── Audio Fingerprint Check ───

/**
 * Check audio fingerprint hashes against ALL video posts.
 * Uses same sliding-window algorithm as video frame check.
 * 4+ consecutive → duplicate, 5+ consecutive vs copyright_protected → copyright.
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

    // Get ALL video posts (with copyright_protected info)
    let postQuery = admin
      .from('posts')
      .select('id, author_id, copyright_protected')
      .eq('status', 'published')
      .in('content_type', ['video'])
      .neq('author_id', authorId);
    if (postId) postQuery = postQuery.neq('id', postId);
    postQuery = postQuery.limit(500);

    const { data: videoPosts } = await postQuery;
    if (!videoPosts || videoPosts.length === 0) return cleanResult;

    const videoPostIds = videoPosts.map(p => p.id);
    const postInfoMap = new Map(videoPosts.map(p => [p.id, { authorId: p.author_id, copyrightProtected: !!p.copyright_protected }]));

    // Get audio hashes for video posts
    const { data: existingHashes } = await admin
      .from('audio_fingerprints')
      .select('post_id, chunk_index, chunk_hash')
      .in('post_id', videoPostIds)
      .order('chunk_index', { ascending: true });

    if (!existingHashes || existingHashes.length === 0) return cleanResult;

    // Group by post_id
    const hashesByPost = new Map<number, { chunkIndex: number; hash: string }[]>();
    for (const h of existingHashes) {
      const arr = hashesByPost.get(h.post_id) || [];
      arr.push({ chunkIndex: h.chunk_index, hash: h.chunk_hash });
      hashesByPost.set(h.post_id, arr);
    }

    type AudioMatch = { postId: number; authorId: string; similarity: number; consecutive: number };
    let bestKopya: AudioMatch | null = null;
    let bestTelif: AudioMatch | null = null;
    const audioThreshold = COPYRIGHT_THRESHOLDS.video.frameHammingThreshold;

    for (const [candidatePostId, candidateHashes] of hashesByPost) {
      const info = postInfoMap.get(candidatePostId);
      if (!info) continue;

      const matchPairs: { srcIdx: number; candIdx: number }[] = [];
      for (const srcChunk of audioHashes) {
        if (isUniformHash(srcChunk.hash)) continue;
        for (const candChunk of candidateHashes) {
          if (isUniformHash(candChunk.hash)) continue;
          const dist = hammingDistance(srcChunk.hash, candChunk.hash);
          if (dist <= audioThreshold) {
            matchPairs.push({ srcIdx: srcChunk.chunkIndex, candIdx: candChunk.chunkIndex });
          }
        }
      }

      if (matchPairs.length === 0) continue;

      const offsetGroups = new Map<number, Set<number>>();
      for (const pair of matchPairs) {
        const offset = pair.srcIdx - pair.candIdx;
        if (!offsetGroups.has(offset)) offsetGroups.set(offset, new Set());
        offsetGroups.get(offset)!.add(pair.srcIdx);
      }

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
      const match: AudioMatch = { postId: candidatePostId, authorId: info.authorId, similarity, consecutive: maxConsecutive };

      const minSimForConsec = COPYRIGHT_THRESHOLDS.video.minSimilarityForConsecutive;

      // Copyright: protected post + enough consecutive seconds + minimum similarity
      if (info.copyrightProtected && (
        (maxConsecutive >= COPYRIGHT_THRESHOLDS.video.copyrightConsecutiveThreshold && similarity >= minSimForConsec) ||
        similarity >= COPYRIGHT_THRESHOLDS.video.matchThreshold
      )) {
        if (!bestTelif || maxConsecutive > bestTelif.consecutive || (maxConsecutive === bestTelif.consecutive && similarity > bestTelif.similarity)) {
          bestTelif = match;
        }
      }

      // Duplicate: enough consecutive seconds + minimum similarity, or high overall match
      if (
        (maxConsecutive >= COPYRIGHT_THRESHOLDS.video.consecutiveFrameThreshold && similarity >= minSimForConsec) ||
        similarity >= COPYRIGHT_THRESHOLDS.video.matchThreshold
      ) {
        if (!bestKopya || maxConsecutive > bestKopya.consecutive || (maxConsecutive === bestKopya.consecutive && similarity > bestKopya.similarity)) {
          bestKopya = match;
        }
      }
    }

    // Copyright takes priority
    const finalMatch = bestTelif || bestKopya;
    if (!finalMatch) return cleanResult;

    const isTelif = finalMatch === bestTelif;
    const threshold = isTelif ? COPYRIGHT_THRESHOLDS.video.copyrightConsecutiveThreshold : COPYRIGHT_THRESHOLDS.video.consecutiveFrameThreshold;
    const reason = finalMatch.consecutive >= threshold
      ? `${isTelif ? 'Copyright violation: audio' : 'Audio match'}: ${finalMatch.consecutive} consecutive seconds (${finalMatch.similarity}% similarity)`
      : `${isTelif ? 'Copyright violation: audio' : 'Audio match'} (${finalMatch.similarity}% similarity)`;

    return {
      flagged: true,
      matchType: 'exact',
      similarity: finalMatch.similarity,
      matchedPostId: finalMatch.postId,
      matchedAuthorId: finalMatch.authorId,
      reason,
      category: isTelif ? 'copyright' : (finalMatch.similarity >= 100 ? 'kopya_icerik' : null),
      consecutiveMatches: finalMatch.consecutive,
    };
  } catch (err) {
    logServerError('[Copyright] Audio check failed', err, {
      operation: 'check_audio_fingerprint',
    });
    return cleanResult;
  }
}

// ─── Unified Copyright Check (Content-Type Routing) ───

/**
 * Unified duplicate + copyright check with content-type specific routing.
 *
 * POST: Text (≥85% dup / ≥75% copyright) + thumbnail dHash (dup) + inline images (dup)
 * VIDEO/MOMENT: Text (≥85% dup only) + thumbnail dHash (dup+copyright) + frame hash (dup+copyright) + audio (dup+copyright)
 * NOTE: Text (exact dup + fuzzy dup/copyright)
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
    originFileId?: string | null;
  } = {},
): Promise<CopyrightResult> {
  try {
    // ─── Feedim file re-upload detection ───
    if (options.originFileId) {
      try {
        const { data: origin } = await admin
          .from('file_identifiers')
          .select('post_id, uploader_id, file_type')
          .eq('feedim_id', options.originFileId)
          .single();

        if (origin && origin.uploader_id !== authorId) {
          return {
            flagged: true,
            matchType: 'exact',
            similarity: 100,
            matchedPostId: origin.post_id,
            matchedAuthorId: origin.uploader_id,
            reason: 'Duplicate content detected via Feedim file ID (re-upload)',
            category: 'kopya_icerik',
          };
        }
      } catch {
        // file_identifiers table may not exist yet — skip silently
      }
    }
    // ─── POST type ───
    if (contentType === 'post') {
      const results: CopyrightResult[] = [];

      // 1. Body-only text check (≥85% dup / ≥75% copyright — vs copyright_protected)
      const postResult = await checkPostCopyright(
        admin, content, authorId, wordCount, options.postId, true,
      );
      if (postResult.flagged) results.push(postResult);

      // 2. Thumbnail dHash check (dup + copyright)
      if (COPYRIGHT_THRESHOLDS.post.imageAutoCheck) {
        const imgUrl = options.featuredImage;
        let imgHash = options.imageHash || null;
        if (!imgHash && imgUrl) imgHash = await computeImageHashFromUrl(imgUrl);
        if (imgHash) {
          results.push(await checkImageCopyright(
            admin, imgHash, authorId, contentType, options.postId, true,
          ));
        }
      }

      // 3. Inline images check (dup only — post images not auto-checked for copyright)
      const inlineResult = await checkInlineImagesCopyright(
        admin, content, authorId, options.postId,
      );
      if (inlineResult.flagged) results.push(inlineResult);

      // Copyright takes priority, then highest similarity
      const best = pickWorstResult(results);
      if (best.flagged) return best;
      return CLEAN_RESULT;
    }

    // ─── VIDEO type ───
    if (contentType === 'video' || contentType === 'moment') {
      const results: CopyrightResult[] = [];

      // 1. Text check (≥85% dup only — video text not subject to copyright)
      const textResult = await checkPostCopyright(
        admin, content, authorId, wordCount, options.postId, false,
      );
      if (textResult.flagged) results.push(textResult);

      // 2. Thumbnail dHash check (dup + copyright — video thumbnail subject to copyright)
      const imgUrl = options.videoThumbnail || options.featuredImage;
      let imgHash = options.imageHash || null;
      if (!imgHash && imgUrl) imgHash = await computeImageHashFromUrl(imgUrl);
      if (imgHash && COPYRIGHT_THRESHOLDS.video.thumbnailCheck) {
        results.push(await checkImageCopyright(
          admin, imgHash, authorId, contentType, options.postId, true,
        ));
      }

      // 3. Video frame hash check (dup 4s + copyright 5s — vs copyright_protected)
      if (options.frameHashes && options.frameHashes.length > 0 && COPYRIGHT_THRESHOLDS.video.frameHashCheck) {
        const frameResult = await checkVideoFrameCopyright(
          admin, options.frameHashes, authorId, options.postId,
        );
        results.push(frameResult);
      }

      // 4. Audio fingerprint check (dup 4s + copyright 5s — vs copyright_protected)
      if (options.audioHashes && options.audioHashes.length > 0) {
        const audioResult = await checkAudioCopyright(
          admin, options.audioHashes, authorId, options.postId,
        );
        results.push(audioResult);
      }

      // Copyright takes priority, then highest similarity
      const best = pickWorstResult(results);
      if (best.flagged) return best;
      return CLEAN_RESULT;
    }

    // ─── NOTE type ───
    if (contentType === 'note') {
      const textResult = await checkPostCopyright(
        admin, content, authorId, wordCount, options.postId, true,
      );
      if (textResult.flagged) return textResult;
      return CLEAN_RESULT;
    }

    // Fallback: unknown content type → legacy check
    return await checkCopyright(admin, title, content, authorId, contentType, wordCount, options.postId, false);
  } catch (err) {
    logServerError('[Copyright] Unified check failed', err, {
      operation: 'check_copyright_unified',
    });
    return CLEAN_RESULT;
  }
}
