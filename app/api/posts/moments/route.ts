import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { MOMENT_PAGE_SIZE } from "@/lib/constants";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || String(MOMENT_PAGE_SIZE)), 20);
    const cursor = searchParams.get("cursor"); // last moment id for pagination

    const admin = createAdminClient();

    // Get user for NSFW filtering
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    let query = admin
      .from("posts")
      .select(`
        id, title, slug, excerpt, featured_image, video_url, video_duration, video_thumbnail, blurhash,
        like_count, comment_count, view_count, save_count, share_count, published_at, author_id,
        profiles!posts_author_id_fkey(user_id, name, surname, full_name, username, avatar_url, is_verified, premium_plan),
        post_tags(tag_id, tags(id, name, slug))
      `)
      .eq("content_type", "moment")
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(limit + 1);

    // NSFW filter: logged-in users see their own NSFW moments, others see none
    if (user) {
      query = query.or(`is_nsfw.eq.false,author_id.eq.${user.id}`);
    } else {
      query = query.eq("is_nsfw", false);
    }

    if (cursor) {
      const { data: cursorPost } = await admin
        .from("posts")
        .select("published_at")
        .eq("id", cursor)
        .single();
      if (cursorPost) {
        query = query.lt("published_at", cursorPost.published_at);
      }
    }

    const { data: moments, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const items = (moments || []).slice(0, limit).map((m: any) => ({
      ...m,
      profiles: Array.isArray(m.profiles) ? m.profiles[0] : m.profiles,
    }));

    return NextResponse.json({
      moments: items,
      hasMore: (moments || []).length > limit,
    });
  } catch {
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
