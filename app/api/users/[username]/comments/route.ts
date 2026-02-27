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

  // Require auth for pagination (page > 1)
  if (page > 1) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

  // Kullanıcının yorum yaptığı benzersiz postları bul
  const { data: comments, error } = await admin
    .from("comments")
    .select(`
      id, post_id, created_at,
      posts!inner(
        id, title, slug, excerpt, featured_image, reading_time,
        like_count, comment_count, save_count, published_at, status, is_nsfw, author_id, content_type, video_duration, video_thumbnail, video_url, blurhash,
        profiles!posts_author_id_fkey(user_id, name, surname, full_name, username, avatar_url, is_verified, premium_plan, role, status)
      )
    `)
    .eq("author_id", profile.user_id)
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    return safeError(error);
  }

  // Aynı posta birden fazla yorum yapılmış olabilir — benzersiz postları al
  const seenPostIds = new Set<number>();
  const posts = (comments || [])
    .map((c: any) => {
      const post = Array.isArray(c.posts) ? c.posts[0] : c.posts;
      if (!post || seenPostIds.has(post.id)) return null;
      // Filter: only published posts
      if (post.status !== 'published') return null;
      // Filter: NSFW posts only visible to their author
      if (post.is_nsfw) return null;
      // Filter: inactive authors
      const author = Array.isArray(post.profiles) ? post.profiles[0] : post.profiles;
      if (author?.status && author.status !== 'active') return null;
      seenPostIds.add(post.id);
      return {
        ...post,
        profiles: author,
      };
    })
    .filter(Boolean);

  return NextResponse.json({
    posts,
    hasMore: (comments || []).length >= limit,
  });
  } catch (err) {
    return safeError(err);
  }
}
