import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getPresignedUploadUrl } from "@/lib/r2";
import { AUDIO_MAX_SIZE_MB } from "@/lib/constants";

const MAX_FILE_SIZE = AUDIO_MAX_SIZE_MB * 1024 * 1024;

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

    const { filename, contentType, fileSize } = await request.json();

    if (!filename || !contentType || !fileSize) {
      return NextResponse.json({ error: "Dosya bilgisi gerekli" }, { status: 400 });
    }

    if (!contentType.startsWith("audio/")) {
      return NextResponse.json({ error: "Desteklenmeyen format" }, { status: 400 });
    }

    if (fileSize > MAX_FILE_SIZE) {
      return NextResponse.json({ error: `Ses dosyası en fazla ${AUDIO_MAX_SIZE_MB}MB olabilir` }, { status: 400 });
    }

    const ext = filename.split(".").pop()?.toLowerCase() || "mp3";
    const safeExt = ext.replace(/[^a-z0-9]/g, "").slice(0, 10) || "mp3";
    const key = `audio/${user.id}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${safeExt}`;

    const { uploadUrl, publicUrl } = await getPresignedUploadUrl(key, contentType);

    return NextResponse.json({ uploadUrl, publicUrl, key });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Audio upload init error:", msg);
    return NextResponse.json({ error: msg || "Sunucu hatası" }, { status: 500 });
  }
}
