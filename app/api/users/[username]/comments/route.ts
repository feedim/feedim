import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { safeError } from "@/lib/apiError";
import { getTranslations } from "next-intl/server";
import { safePage } from "@/lib/utils";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
  const tErrors = await getTranslations("apiErrors");
  const { username } = await params;
  const supabase = await createClient();
  const admin = createAdminClient();
  const { searchParams } = new URL(req.url);
  const page = safePage(searchParams.get("page"));
  const limit = 10;

  const { data: { user } } = await supabase.auth.getUser();

  // Require auth for pagination (page > 1)
  if (page > 1 && !user) {
    return NextResponse.json({ error: tErrors("unauthorized") }, { status: 401 });
  }

  const { data: profile } = await admin
    .from("profiles")
    .select("user_id, account_private")
    .eq("username", username)
    .eq("status", "active")
    .single();

  if (!profile) {
    return NextResponse.json({ error: tErrors("userNotFound") }, { status: 404 });
  }

  // Check staff role for moderation/NSFW visibility
  let isStaff = false;
  if (user) {
    const { data: viewerProfile } = await admin.from('profiles').select('role').eq('user_id', user.id).single();
    isStaff = viewerProfile?.role === 'admin' || viewerProfile?.role === 'moderator';
  }

  // Private account: only owner, followers, and staff can see comments
  const isOwn = user?.id === profile.user_id;
  if (profile.account_private && !isOwn && !isStaff) {
    if (!user) return NextResponse.json({ posts: [], hasMore: false });
    const { data: follow } = await admin.from("follows").select("id").eq("follower_id", user.id).eq("following_id", profile.user_id).single();
    if (!follow) return NextResponse.json({ posts: [], hasMore: false });
  }

  const from = (page - 1) * limit;
  const to = from + limit; // fetch 1 extra for hasMore detection

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
    .neq("is_nsfw", true)
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
      // Filter: moderation posts only visible to post author or staff
      const isViewerPostOwner = user && post.author_id === user.id;
      if (post.status === 'moderation' && !isViewerPostOwner && !isStaff) return null;
      if (post.status !== 'published' && post.status !== 'moderation') return null;
      // Filter: NSFW posts only visible to post author or staff
      if (post.is_nsfw && !isViewerPostOwner && !isStaff) return null;
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
    posts: posts.slice(0, limit),
    hasMore: (comments || []).length > limit,
  });
  } catch (err) {
    return safeError(err);
  }
}
