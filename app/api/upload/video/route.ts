import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getPresignedUploadUrl } from "@/lib/r2";

const MAX_FILE_SIZE = 52428800; // 50MB

// POST: Generate presigned URL for direct-to-R2 upload
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

    const { filename, contentType, fileSize } = await request.json();

    if (!filename || !contentType || !fileSize) {
      return NextResponse.json({ error: "Dosya bilgisi gerekli" }, { status: 400 });
    }

    if (!contentType.startsWith("video/")) {
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
