import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkImageBuffer } from '@/lib/moderation';
import { uploadToR2 } from '@/lib/r2';
import { encode as encodeBlurhash } from 'blurhash';
import * as jpeg from 'jpeg-js';
import { PNG } from 'pngjs';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

// Simple rate limiter
const uploadMap = new Map<string, { count: number; resetAt: number }>();

function checkUploadLimit(userId: string): boolean {
  const now = Date.now();
  const entry = uploadMap.get(userId);
  if (!entry || now > entry.resetAt) {
    uploadMap.set(userId, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (entry.count >= 20) return false;
  entry.count++;
  return true;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!checkUploadLimit(user.id)) {
      return NextResponse.json({ error: 'Çok fazla yükleme. Lütfen bekleyin.' }, { status: 429 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const fileName = formData.get('fileName') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'Geçersiz dosya tipi. Sadece JPEG, PNG, GIF, WebP kabul edilir.' }, { status: 400 });
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'Dosya çok büyük. Maksimum 5MB.' }, { status: 400 });
    }

    // NSFW check (JPEG/PNG only — WebP/GIF pass through, caught at publish)
    const imageBuffer = Buffer.from(await file.arrayBuffer());
    if (file.type === 'image/jpeg' || file.type === 'image/png') {
      const nsfwResult = await checkImageBuffer(imageBuffer, file.type);
      if (nsfwResult.action === 'block') {
        return NextResponse.json(
          { error: 'Uygunsuz görsel tespit edildi. Bu görseli yükleyemezsiniz.' },
          { status: 400 }
        );
      }
    }

    const safeName = (fileName || file.name).replace(/[^a-zA-Z0-9._-]/g, '_').substring(0, 100);
    const ext = file.type === 'image/jpeg' ? '.jpg' : file.type === 'image/png' ? '.png' : file.type === 'image/gif' ? '.gif' : '.webp';
    const path = `${user.id}/${Date.now()}_${safeName}${safeName.includes('.') ? '' : ext}`;

    const key = `images/${path}`;
    const url = await uploadToR2(key, imageBuffer, file.type);

    // Generate blurhash for JPEG/PNG
    let blurhash: string | null = null;
    try {
      if (file.type === 'image/jpeg') {
        const decoded = jpeg.decode(imageBuffer, { useTArray: true, maxMemoryUsageInMB: 64 });
        blurhash = encodeBlurhash(new Uint8ClampedArray(decoded.data), decoded.width, decoded.height, 4, 3);
      } else if (file.type === 'image/png') {
        const decoded = PNG.sync.read(imageBuffer);
        blurhash = encodeBlurhash(new Uint8ClampedArray(decoded.data), decoded.width, decoded.height, 4, 3);
      }
    } catch {
      // Blurhash generation failed — return without it
    }

    return NextResponse.json({ success: true, url, blurhash });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Yükleme hatası' }, { status: 500 });
  }
}
