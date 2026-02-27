import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { safeError } from "@/lib/apiError";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
  const { username } = await params;
  const supabase = await createClient();
  const admin = createAdminClient();
  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = 10;

  const { data: { user } } = await supabase.auth.getUser();

  // Require auth for pagination (page > 1)
  if (page > 1 && !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("user_id")
    .eq("username", username)
    .single();

  if (!profile) {
    return NextResponse.json({ error: "Kullanici bulunamadi" }, { status: 404 });
  }

  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const { data: likes, error } = await admin
    .from("likes")
    .select(`
      id,
      posts!inner(
        id, title, slug, excerpt, featured_image, reading_time,
        like_count, comment_count, save_count, published_at, content_type, video_duration, video_thumbnail, video_url, blurhash, is_nsfw, author_id, status,
        profiles!posts_author_id_fkey(user_id, name, surname, full_name, username, avatar_url, is_verified, premium_plan, role, status)
      )
    `)
    .eq("user_id", profile.user_id)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    return safeError(error);
  }

  const posts = (likes || []).map((l: any) => {
    const post = Array.isArray(l.posts) ? l.posts[0] : l.posts;
    if (!post) return null;
    // Filter: only published posts
    if (post.status !== 'published') return null;
    // Filter: NSFW posts only visible to author
    if (post.is_nsfw && post.author_id !== user?.id) return null;
    // Filter: inactive authors
    const author = Array.isArray(post.profiles) ? post.profiles[0] : post.profiles;
    if (author?.status && author.status !== 'active') return null;
    return {
      ...post,
      profiles: author,
    };
  }).filter(Boolean);

  return NextResponse.json({
    posts,
    hasMore: (likes || []).length >= limit,
  });
  } catch (err) {
    return safeError(err);
  }
}
