import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkMetadataContent } from "@/lib/moderation";
import { safeError } from "@/lib/apiError";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") || "";
    const sort = searchParams.get("sort") || "popular";
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50);
    const cursor = searchParams.get("cursor");

    const admin = createAdminClient();

    let query = admin
      .from("sounds")
      .select("id, title, artist, audio_url, duration, usage_count, cover_image_url, is_original, created_at")
      .eq("status", "active")
      .limit(limit + 1);

    if (q.trim()) {
      query = query.or(`title.ilike.%${q}%,artist.ilike.%${q}%`);
    }

    if (sort === "popular") {
      query = query.order("usage_count", { ascending: false }).order("created_at", { ascending: false });
    } else {
      query = query.order("created_at", { ascending: false });
    }

    if (cursor) {
      if (sort === "popular") {
        const { data: cursorSound } = await admin
          .from("sounds")
          .select("usage_count, created_at")
          .eq("id", cursor)
          .single();
        if (cursorSound) {
          query = query.or(
            `usage_count.lt.${cursorSound.usage_count},and(usage_count.eq.${cursorSound.usage_count},created_at.lt.${cursorSound.created_at})`
          );
        }
      } else {
        const { data: cursorSound } = await admin
          .from("sounds")
          .select("created_at")
          .eq("id", cursor)
          .single();
        if (cursorSound) {
          query = query.lt("created_at", cursorSound.created_at);
        }
      }
    }

    const { data: sounds, error } = await query;
    if (error) return safeError(error);

    const items = (sounds || []).slice(0, limit);
    return NextResponse.json({
      sounds: items,
      hasMore: (sounds || []).length > limit,
    });
  } catch {
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

    const admin = createAdminClient();
    const { title, audio_url, duration, audio_hash, cover_image_url, artist } = await req.json();

    if (!title || !audio_url) {
      return NextResponse.json({ error: "Başlık ve ses URL gerekli" }, { status: 400 });
    }

    // Dedup by audio_hash
    if (audio_hash) {
      const { data: existing } = await admin
        .from("sounds")
        .select("id, title, artist, audio_url, duration, usage_count, cover_image_url, is_original, status")
        .eq("audio_hash", audio_hash)
        .single();

      if (existing) {
        return NextResponse.json({ sound: existing, deduplicated: true });
      }
    }

    // Sound title moderation
    const soundModResult = await checkMetadataContent({ soundTitle: title.trim() });
    if (!soundModResult.safe) {
      return NextResponse.json({ error: soundModResult.reason || 'Ses başlığı uygunsuz içerik içeriyor' }, { status: 400 });
    }

    const { data: sound, error } = await admin
      .from("sounds")
      .insert({
        title: title.trim(),
        artist: artist?.trim() || null,
        audio_url,
        duration: duration || null,
        audio_hash: audio_hash || null,
        cover_image_url: cover_image_url || null,
        created_by: user.id,
        usage_count: 0,
      })
      .select("id, title, artist, audio_url, duration, usage_count, cover_image_url, is_original, status")
      .single();

    if (error) return safeError(error);

    return NextResponse.json({ sound, deduplicated: false }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
