import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getR2Client } from '@/lib/r2/client';

// Client converts everything to JPEG before sending, but accept originals too as fallback
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB (post-compression limit)

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const fileName = formData.get('fileName') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Geçersiz dosya tipi. Sadece JPEG, PNG, GIF, WebP kabul edilir.' },
        { status: 400 }
      );
    }

    // Validate size
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: 'Dosya çok büyük. Maksimum 5MB.' },
        { status: 400 }
      );
    }

    // Sanitize file name — force .jpg extension since client converts to JPEG
    const safeName = (fileName || file.name)
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .substring(0, 100);

    const key = `${user.id}/${safeName}`;

    // Upload to R2
    const r2 = getR2Client();
    const buffer = Buffer.from(await file.arrayBuffer());

    await r2.send(new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: key,
      Body: buffer,
      ContentType: file.type,
      CacheControl: 'public, max-age=31536000, immutable',
    }));

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || '';
    const imageUrl = `${siteUrl}/api/r2/${key}`;

    return NextResponse.json({ success: true, url: imageUrl });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Yükleme hatası' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { url } = await request.json();
    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'URL gerekli' }, { status: 400 });
    }

    // Extract key from proxy URL (/api/r2/...) or legacy R2 public URL
    let key = '';
    const proxyPrefix = '/api/r2/';
    const publicUrl = process.env.R2_PUBLIC_URL || '';

    if (url.includes(proxyPrefix)) {
      key = url.substring(url.indexOf(proxyPrefix) + proxyPrefix.length);
    } else if (publicUrl && url.startsWith(publicUrl)) {
      key = url.replace(`${publicUrl}/`, '');
    } else {
      return NextResponse.json({ error: 'Geçersiz URL' }, { status: 400 });
    }

    // Ensure user can only delete their own files
    if (!key.startsWith(`${user.id}/`)) {
      return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 });
    }

    const r2 = getR2Client();
    await r2.send(new DeleteObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: key,
    }));

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Silme hatası' },
      { status: 500 }
    );
  }
}
