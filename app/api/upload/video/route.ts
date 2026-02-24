import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getPresignedUploadUrl } from "@/lib/r2";
import { VIDEO_ALLOWED_TYPES } from "@/lib/constants";

const MAX_FILE_SIZE = 209715200; // 200MB

// Rate limiter: 5 requests per 10 minutes
const videoLimitMap = new Map<string, { count: number; resetAt: number }>();
function checkVideoLimit(userId: string): boolean {
  const now = Date.now();
  const entry = videoLimitMap.get(userId);
  if (!entry || now > entry.resetAt) {
    videoLimitMap.set(userId, { count: 1, resetAt: now + 600_000 });
    return true;
  }
  if (entry.count >= 5) return false;
  entry.count++;
  return true;
}

// POST: Generate presigned URL for direct-to-R2 upload
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

    if (!checkVideoLimit(user.id)) {
      return NextResponse.json({ error: "Çok fazla yükleme. Lütfen bekleyin." }, { status: 429 });
    }

    const { filename, contentType, fileSize } = await request.json();

    if (!filename || !contentType || !fileSize) {
      return NextResponse.json({ error: "Dosya bilgisi gerekli" }, { status: 400 });
    }

    if (!(VIDEO_ALLOWED_TYPES as readonly string[]).includes(contentType)) {
      return NextResponse.json({ error: "Desteklenmeyen format" }, { status: 400 });
    }

    if (fileSize > MAX_FILE_SIZE) {
      return NextResponse.json({ error: `Video en fazla ${MAX_FILE_SIZE / 1024 / 1024}MB olabilir` }, { status: 400 });
    }

    const ext = filename.split(".").pop()?.toLowerCase() || "mp4";
    const safeExt = ext.replace(/[^a-z0-9]/g, "").slice(0, 10) || "mp4";
    const key = `videos/${user.id}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${safeExt}`;

    const { uploadUrl, publicUrl } = await getPresignedUploadUrl(key, contentType);

    return NextResponse.json({ uploadUrl, publicUrl, key });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Video upload init error:", msg);
    return NextResponse.json({ error: msg || "Sunucu hatasi" }, { status: 500 });
  }
}
