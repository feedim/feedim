import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkNsfwBuffer } from '@/lib/nsfwCheck';
import { uploadToR2 } from '@/lib/r2';
import { encode as encodeBlurhash } from 'blurhash';
import { computeImageHash } from '@/lib/copyright';
import { validateMagicBytes, stripMetadataAndOptimize, extractFeedimId, generateFeedimFileId } from '@/lib/imageSecurityUtils';
import { safeError } from '@/lib/apiError';
import { createAdminClient } from '@/lib/supabase/admin';
import { getUserPlan, isAdminPlan } from '@/lib/limits';
import { getTranslations } from 'next-intl/server';
import sharp from 'sharp';
import * as jpeg from 'jpeg-js';
import { PNG } from 'pngjs';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

// Simple rate limiter — 30/dakika (yapıştırma senaryoları için yeterli)
const uploadMap = new Map<string, { count: number; resetAt: number }>();

function checkUploadLimit(userId: string): boolean {
  const now = Date.now();
  const entry = uploadMap.get(userId);
  if (!entry || now > entry.resetAt) {
    uploadMap.set(userId, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (entry.count >= 30) return false;
  entry.count++;
  return true;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    const tErrors = await getTranslations("apiErrors");

    if (authError || !user) {
      return NextResponse.json({ error: tErrors("unauthorized") }, { status: 401 });
    }

    const plan = await getUserPlan(createAdminClient(), user.id);
    if (!isAdminPlan(plan) && !checkUploadLimit(user.id)) {
      return NextResponse.json({ error: tErrors("uploadRateLimited") }, { status: 429 });
    }

    const contentType = request.headers.get('content-type') || '';

    let imageBuffer: Buffer;
    let fileType: string;
    let fileName: string | null = null;

    if (contentType.includes('application/json')) {
      // URL-based upload — server-side fetch (CORS bypass for external images)
      const body = await request.json();
      const { url } = body;
      if (!url || typeof url !== 'string' || !/^https?:\/\//i.test(url)) {
        return NextResponse.json({ error: tErrors("invalidUrl") }, { status: 400 });
      }
      // SSRF protection: block internal/private IPs
      try {
        const parsed = new URL(url);
        const host = parsed.hostname.toLowerCase();
        if (
          host === 'localhost' || host === '127.0.0.1' || host === '[::1]' || host === '0.0.0.0' ||
          host.startsWith('10.') || host.startsWith('192.168.') || host.startsWith('172.') ||
          host.endsWith('.local') || host.endsWith('.internal') ||
          /^169\.254\./.test(host) || /^fc00:/.test(host) || /^fe80:/.test(host)
        ) {
          return NextResponse.json({ error: tErrors("invalidUrl") }, { status: 400 });
        }
      } catch {
        return NextResponse.json({ error: tErrors("invalidUrl") }, { status: 400 });
      }
      // SVG görselleri kabul etme
      if (/\.svg(\?|$)/i.test(url.split('#')[0])) {
        return NextResponse.json({ error: tErrors("svgNotSupported") }, { status: 400 });
      }
      try {
        const res = await fetch(url, {
          signal: AbortSignal.timeout(10000),
          redirect: "error",
        });
        if (!res.ok) return NextResponse.json({ error: tErrors("imageDownloadFailed") }, { status: 400 });
        const ct = res.headers.get('content-type') || '';
        fileType = ALLOWED_TYPES.find(t => ct.includes(t.split('/')[1])) || '';
        if (!fileType) {
          // Fallback: detect from URL extension
          const ext = url.split('?')[0].split('.').pop()?.toLowerCase();
          if (ext === 'jpg' || ext === 'jpeg') fileType = 'image/jpeg';
          else if (ext === 'png') fileType = 'image/png';
          else if (ext === 'gif') fileType = 'image/gif';
          else if (ext === 'webp') fileType = 'image/webp';
          else return NextResponse.json({ error: tErrors("invalidFileType") }, { status: 400 });
        }
        const arrayBuf = await res.arrayBuffer();
        if (arrayBuf.byteLength > MAX_SIZE) return NextResponse.json({ error: tErrors("fileTooLarge") }, { status: 400 });
        imageBuffer = Buffer.from(arrayBuf);
        fileName = `external-${Date.now()}.${fileType.split('/')[1]}`;
      } catch {
        return NextResponse.json({ error: tErrors("imageDownloadFailed") }, { status: 400 });
      }
    } else {
      // File-based upload (FormData)
      const formData = await request.formData();
      const file = formData.get('file') as File | null;
      fileName = formData.get('fileName') as string | null;

      if (!file) {
        return NextResponse.json({ error: tErrors("noFileProvided") }, { status: 400 });
      }

      fileType = file.type;
      if (!ALLOWED_TYPES.includes(fileType)) {
        return NextResponse.json({ error: tErrors("invalidFileTypeDetailed") }, { status: 400 });
      }

      if (file.size > MAX_SIZE) {
        return NextResponse.json({ error: tErrors("fileTooLarge") }, { status: 400 });
      }

      imageBuffer = Buffer.from(await file.arrayBuffer());
      if (!fileName) fileName = file.name;
    }

    // Magic bytes validation
    if (!validateMagicBytes(imageBuffer, fileType)) {
      return NextResponse.json({ error: tErrors("invalidFileContent") }, { status: 400 });
    }

    // Check if image already has a Feedim file ID (re-upload detection)
    let originFileId: string | null = null;
    try {
      const metadata = await sharp(imageBuffer).metadata();
      if (metadata.exif) {
        originFileId = extractFeedimId(metadata.exif);
      }
    } catch {}

    // Generate new Feedim file ID
    const feedimFileId = generateFeedimFileId();

    // Metadata strip + optimize (embeds new feedimFileId in EXIF)
    const { buffer: cleanBuffer, mimeType: cleanType } = await stripMetadataAndOptimize(imageBuffer, fileType, feedimFileId);

    // NSFW pre-check — don't block upload, just tag it. Final check at publish time.
    let nsfwFlag = false;
    try {
      const nsfwResult = await checkNsfwBuffer(cleanBuffer, cleanType, 'standard');
      if (nsfwResult.action === 'flag') nsfwFlag = true;
    } catch {}

    const safeName = (fileName || 'image').replace(/[^a-zA-Z0-9._-]/g, '_').substring(0, 100);
    const ext = cleanType === 'image/jpeg' ? '.jpg' : cleanType === 'image/png' ? '.png' : cleanType === 'image/gif' ? '.gif' : '.webp';
    const path = `${user.id}/${Date.now()}_${safeName}${safeName.includes('.') ? '' : ext}`;

    const key = `images/${path}`;
    const url = await uploadToR2(key, cleanBuffer, cleanType);

    // Generate blurhash for JPEG/PNG
    let blurhash: string | null = null;
    try {
      if (cleanType === 'image/jpeg') {
        const decoded = jpeg.decode(cleanBuffer, { useTArray: true, maxMemoryUsageInMB: 64 });
        blurhash = encodeBlurhash(new Uint8ClampedArray(decoded.data), decoded.width, decoded.height, 4, 3);
      } else if (cleanType === 'image/png') {
        const decoded = PNG.sync.read(cleanBuffer);
        blurhash = encodeBlurhash(new Uint8ClampedArray(decoded.data), decoded.width, decoded.height, 4, 3);
      }
    } catch {
      // Blurhash generation failed — return without it
    }

    // Compute perceptual image hash (dHash) for copyright detection
    let imageHash: string | null = null;
    try {
      imageHash = await computeImageHash(cleanBuffer);
    } catch {
      // Hash generation failed — return without it
    }

    // Track upload for orphan cleanup (post_id set later at publish time)
    try {
      const { createAdminClient } = await import('@/lib/supabase/admin');
      await createAdminClient().from('file_identifiers').insert({
        feedim_id: feedimFileId,
        file_type: 'image',
        uploader_id: user.id,
        post_id: null,
        storage_key: key,
      });
    } catch {}

    return NextResponse.json({ success: true, url, blurhash, imageHash, nsfw: nsfwFlag, feedimFileId, originFileId });
  } catch (error: unknown) {
    return safeError(error);
  }
}
