import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const admin = createAdminClient();

    const { data: sound, error } = await admin
      .from("sounds")
      .select("id, title, artist, audio_url, duration, usage_count, cover_image_url, is_original, status, created_at, created_by")
      .eq("id", id)
      .eq("status", "active")
      .single();

    if (error || !sound) {
      return NextResponse.json({ error: "Ses bulunamadı" }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50);
    const cursor = searchParams.get("cursor");

    let momentsQuery = admin
      .from("posts")
      .select(`
        id, title, slug, featured_image, video_url, video_duration, video_thumbnail, blurhash,
        like_count, comment_count, view_count, published_at, author_id,
        profiles!posts_author_id_fkey(user_id, username, full_name, avatar_url, is_verified, premium_plan, role)
      `)
      .eq("sound_id", id)
      .eq("content_type", "moment")
      .eq("status", "published")
      .eq("is_nsfw", false)
      .order("published_at", { ascending: false })
      .limit(limit + 1);

    if (cursor) {
      const { data: cursorPost } = await admin
        .from("posts")
        .select("published_at")
        .eq("id", cursor)
        .single();
      if (cursorPost) {
        momentsQuery = momentsQuery.lt("published_at", cursorPost.published_at);
      }
    }

    const { data: moments } = await momentsQuery;
    const items = (moments || []).slice(0, limit).map((m: any) => ({
      ...m,
      profiles: Array.isArray(m.profiles) ? m.profiles[0] : m.profiles,
    }));

    return NextResponse.json({
      sound,
      moments: items,
      hasMore: (moments || []).length > limit,
    });
  } catch {
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

    const admin = createAdminClient();

    // Admin/mod check
    const { data: profile } = await admin
      .from("profiles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (!profile || !["admin", "moderator"].includes(profile.role)) {
      return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
    }

    const { status } = await req.json();
    if (!["active", "muted", "removed"].includes(status)) {
      return NextResponse.json({ error: "Geçersiz durum" }, { status: 400 });
    }

    const { data: sound, error } = await admin
      .from("sounds")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select("id, title, status")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ sound });
  } catch {
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
