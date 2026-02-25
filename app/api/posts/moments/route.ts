import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { MOMENT_PAGE_SIZE } from "@/lib/constants";
import { cached } from "@/lib/cache";
import { safeError } from "@/lib/apiError";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || String(MOMENT_PAGE_SIZE)), 20);
    const cursor = searchParams.get("cursor"); // last moment id for pagination

    const admin = createAdminClient();

    // Get user for NSFW/block filtering
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Get blocked user IDs
    let blockedIds = new Set<string>();
    let followedIdSet = new Set<string>();
    if (user) {
      blockedIds = await cached(`user:${user.id}:blocks`, 120, async () => {
        const { data: blocks } = await admin
          .from("blocks")
          .select("blocked_id, blocker_id")
          .or(`blocker_id.eq.${user.id},blocked_id.eq.${user.id}`);
        return new Set((blocks || []).map(b => b.blocker_id === user.id ? b.blocked_id : b.blocker_id));
      });
      followedIdSet = await cached(`user:${user.id}:follows`, 120, async () => {
        const { data: follows } = await admin
          .from("follows")
          .select("following_id")
          .eq("follower_id", user.id);
        return new Set((follows || []).map(f => f.following_id));
      });
    }

    let query = admin
      .from("posts")
      .select(`
        id, title, slug, excerpt, featured_image, video_url, video_duration, video_thumbnail, blurhash,
        like_count, comment_count, view_count, save_count, share_count, published_at, author_id,
        profiles!posts_author_id_fkey(user_id, name, surname, full_name, username, avatar_url, is_verified, premium_plan, role, status, account_private),
        post_tags(tag_id, tags(id, name, slug)),
        sounds!posts_sound_id_fkey(id, title, artist, audio_url, duration, status, cover_image_url, is_original)
      `)
      .eq("content_type", "moment")
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit((limit + 1) * 2); // fetch extra to compensate for post-query filters

    // NSFW filter: logged-in users see their own NSFW moments, others see none
    if (user) {
      query = query.or(`is_nsfw.eq.false,author_id.eq.${user.id}`);
    } else {
      query = query.eq("is_nsfw", false);
    }

    // Block filter
    if (blockedIds.size > 0) {
      query = query.not("author_id", "in", `(${[...blockedIds].join(",")})`);
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
      return safeError(error);
    }

    // Filter inactive authors + private accounts
    const filtered = (moments || []).filter((m: any) => {
      const author = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
      if (!author) return false;
      if (author.status && author.status !== "active") return false;
      if (author.account_private && author.user_id !== user?.id && !followedIdSet.has(author.user_id)) return false;
      return true;
    });

    const items = filtered.slice(0, limit).map((m: any) => ({
      ...m,
      profiles: Array.isArray(m.profiles) ? m.profiles[0] : m.profiles,
      sounds: Array.isArray(m.sounds) ? m.sounds[0] : (m.sounds || null),
    }));

    return NextResponse.json({
      moments: items,
      hasMore: filtered.length > limit,
    });
  } catch {
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
