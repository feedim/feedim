import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { cached } from "@/lib/cache";

// Sanitize input for PostgREST filter/ilike strings to prevent injection
function sanitizeForFilter(input: string): string {
  // Remove PostgREST operators and special characters
  return input
    .replace(/[,.()"'\\;:@<>{}[\]|`~!#$^&*+=?/]/g, "")
    .replace(/%/g, "")
    .slice(0, 100);
}

export async function GET(req: NextRequest) {
  try {
  const { searchParams } = new URL(req.url);
  let q = sanitizeForFilter(searchParams.get("q")?.trim() || "");
  const type = searchParams.get("type") || "all"; // all, users, posts, tags, sounds

  const supabase = await createClient();
  const admin = createAdminClient();
  const limit = parseInt(searchParams.get("limit") || "0") || (type === "all" ? 5 : 20);
  const results: { users?: any[]; posts?: any[]; tags?: any[]; sounds?: any[] } = {};

  // Get current user for personalized scoring + blocked users
  const { data: { user } } = await supabase.auth.getUser();
  let blockedIds = new Set<string>();
  let followingIds = new Set<string>();

  if (user) {
    blockedIds = await cached(`user:${user.id}:blocks`, 120, async () => {
      const { data: blocks } = await admin
        .from("blocks")
        .select("blocked_id, blocker_id")
        .or(`blocker_id.eq.${user.id},blocked_id.eq.${user.id}`);
      return new Set((blocks || []).map(b => b.blocker_id === user.id ? b.blocked_id : b.blocker_id));
    });

    followingIds = await cached(`user:${user.id}:follows`, 120, async () => {
      const { data: follows } = await admin
        .from("follows")
        .select("following_id")
        .eq("follower_id", user.id);
      return new Set((follows || []).map(f => f.following_id));
    });
  }

  // Intent detection: @ prefix means user search
  const isUserIntent = q.startsWith("@");
  if (isUserIntent) q = q.slice(1);

  // No query — return popular/suggested results
  if (!q || q.length < 2) {
    if (type === "all" || type === "users") {
      const { data: users } = await admin
        .from("profiles")
        .select("user_id, name, surname, full_name, username, avatar_url, is_verified, premium_plan, role, bio, follower_count")
        .eq("status", "active")
        .order("follower_count", { ascending: false })
        .limit(50);
      results.users = (users || [])
        .filter(u => !blockedIds.has(u.user_id))
        .slice(0, limit);
    }
    if (type === "all" || type === "posts") {
      let popQuery = admin
        .from("posts")
        .select(`
          id, title, slug, excerpt, featured_image, reading_time,
          like_count, comment_count, view_count, published_at, author_id, content_type, video_duration, video_thumbnail, video_url,
          profiles!posts_author_id_fkey(user_id, name, surname, full_name, username, avatar_url, is_verified, premium_plan, role, status, account_private)
        `)
        .eq("status", "published")
        .eq("is_nsfw", false)
        .order("published_at", { ascending: false })
        .limit(50);
      if (blockedIds.size > 0) {
        popQuery = popQuery.not("author_id", "in", `(${[...blockedIds].join(",")})`);
      }
      const { data: posts } = await popQuery;
      results.posts = (posts || [])
        .filter(p => {
          const author = (p as any).profiles;
          if (author?.status && author.status !== 'active') return false;
          if (author?.account_private && author?.user_id !== user?.id) return false;
          return true;
        })
        .slice(0, limit);
    }
    if (type === "all" || type === "tags") {
      const { data: tags } = await supabase
        .from("tags")
        .select("id, name, slug, post_count")
        .order("post_count", { ascending: false })
        .limit(limit);
      results.tags = tags || [];
    }
    if (type === "all" || type === "sounds") {
      const { data: sounds } = await admin
        .from("sounds")
        .select("id, title, artist, audio_url, duration, usage_count, cover_image_url, is_original, created_at")
        .eq("status", "active")
        .order("usage_count", { ascending: false })
        .limit(limit);
      results.sounds = sounds || [];
    }
    return NextResponse.json(results);
  }

  const searchType = isUserIntent ? "users" : type;

  // Search users with scoring
  if (searchType === "all" || searchType === "users") {
    const { data: users } = await supabase
      .from("profiles")
      .select("user_id, name, surname, full_name, username, avatar_url, is_verified, premium_plan, role, bio, follower_count")
      .eq("status", "active")
      .or(`username.ilike.%${q}%,full_name.ilike.%${q}%,name.ilike.%${q}%,surname.ilike.%${q}%`)
      .limit(50);

    const scored = (users || [])
      .filter(u => !blockedIds.has(u.user_id))
      .map(u => {
        let score = 0;
        const lq = q.toLowerCase();
        const lu = (u.username || "").toLowerCase();
        const lfn = (u.full_name || "").toLowerCase();

        // Username matching
        if (lu === lq) score += 200;
        else if (lu.startsWith(lq)) score += 100;
        else if (lu.includes(lq)) score += 50;

        // Display name matching
        if (lfn === lq) score += 150;
        else if (lfn.startsWith(lq)) score += 80;
        else if (lfn.includes(lq)) score += 40;

        // Profile quality bonuses
        if (u.is_verified) score += 500;
        if (u.avatar_url) score += 300; else score -= 200;
        if (u.bio) score += 150; else score -= 50;

        // Social bonuses
        if (followingIds.has(u.user_id)) score += 600;
        score += Math.min((u.follower_count || 0) / 10, 200);

        return { ...u, _score: score };
      })
      .filter(u => u._score > -100)
      .sort((a, b) => b._score - a._score)
      .slice(0, limit);

    results.users = scored;
  }

  // Search posts with scoring
  if (searchType === "all" || searchType === "posts") {
    let searchPostQuery = admin
      .from("posts")
      .select(`
        id, title, slug, excerpt, featured_image, reading_time,
        like_count, comment_count, published_at, author_id, content_type, video_duration, video_thumbnail, video_url,
        profiles:user_id (user_id, name, surname, full_name, username, avatar_url, is_verified, premium_plan, role, status, account_private)
      `)
      .eq("status", "published")
      .eq("is_nsfw", false)
      .or(`title.ilike.%${q}%,excerpt.ilike.%${q}%`)
      .limit(100);
    if (blockedIds.size > 0) {
      searchPostQuery = searchPostQuery.not("author_id", "in", `(${[...blockedIds].join(",")})`);
    }
    const { data: posts } = await searchPostQuery;

    const scored = (posts || [])
      .filter(p => !blockedIds.has((p as any).author_id))
      .filter(p => { const s = (p as any).profiles?.status; return !s || s === 'active'; })
      .filter(p => !(p as any).profiles?.account_private)
      .map(p => {
        let score = 0;
        const lq = q.toLowerCase();
        const title = (p.title || "").toLowerCase();
        const excerpt = (p.excerpt || "").toLowerCase();

        if (title.includes(lq)) score += title === lq ? 600 : title.startsWith(lq) ? 400 : 200;
        if (excerpt.includes(lq)) score += 100;

        score += Math.min(((p.like_count || 0) + (p.comment_count || 0)) / 5, 100);
        if (p.featured_image) score += 50;

        return { ...p, _score: score };
      })
      .sort((a, b) => b._score - a._score)
      .slice(0, limit);

    results.posts = scored;
  }

  // Search tags
  if (searchType === "all" || searchType === "tags") {
    const { data: tags } = await admin
      .from("tags")
      .select("id, name, slug, post_count")
      .ilike("name", `%${q}%`)
      .order("post_count", { ascending: false })
      .limit(limit);

    results.tags = tags || [];
  }

  // Search sounds
  if (searchType === "all" || searchType === "sounds") {
    const { data: sounds } = await admin
      .from("sounds")
      .select("id, title, artist, audio_url, duration, usage_count, cover_image_url, is_original, created_at")
      .eq("status", "active")
      .or(`title.ilike.%${q}%,artist.ilike.%${q}%`)
      .order("usage_count", { ascending: false })
      .limit(limit);

    results.sounds = sounds || [];
  }

  const response = NextResponse.json(results);
  response.headers.set('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=120');
  return response;
  } catch (error: any) {
    console.error('[Search] Error:', error?.message);
    return NextResponse.json({ users: [], posts: [], tags: [], sounds: [] });
  }
}
