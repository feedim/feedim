import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { safeError } from "@/lib/apiError";
import { getTranslations } from "next-intl/server";
import { safePage } from "@/lib/utils";
import { attachViewerPostInteractions } from "@/lib/postViewerInteractions";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
  const { username } = await params;
  const supabase = await createClient();
  const { searchParams } = new URL(req.url);
  const page = safePage(searchParams.get("page"));
  const contentType = searchParams.get("content_type");
  const limit = 10;

  const { data: profile } = await supabase
    .from("profiles")
    .select("user_id, account_private")
    .eq("username", username)
    .single();

  const tErrors = await getTranslations("apiErrors");
  if (!profile) {
    return NextResponse.json({ error: tErrors("userNotFound") }, { status: 404 });
  }

  // Require auth for pagination (page > 1)
  const { data: { user } } = await supabase.auth.getUser();
  if (page > 1 && !user) {
    return NextResponse.json({ error: tErrors("unauthorized") }, { status: 401 });
  }

  const isOwn = user?.id === profile.user_id;

  // Check staff role for NSFW visibility
  let isStaff = false;
  if (user && !isOwn) {
    const admin = createAdminClient();
    const { data: viewerProfile } = await admin.from('profiles').select('role').eq('user_id', user.id).single();
    isStaff = viewerProfile?.role === 'admin' || viewerProfile?.role === 'moderator';
  }

  // Private account check — only owner or followers can see posts
  if (profile.account_private && !isOwn) {
    if (!user) {
      return NextResponse.json({ posts: [], hasMore: false });
    }
    const { data: follow } = await supabase
      .from("follows")
      .select("id")
      .eq("follower_id", user.id)
      .eq("following_id", profile.user_id)
      .single();
    if (!follow) {
      return NextResponse.json({ posts: [], hasMore: false });
    }
  }

  const from = (page - 1) * limit;
  const to = from + limit; // fetch 1 extra for hasMore detection

  const admin = createAdminClient();

  let query = admin
    .from("posts")
    .select(`
      id, title, slug, excerpt, featured_image, reading_time,
      like_count, comment_count, save_count, view_count, published_at, content_type, video_duration, video_thumbnail, video_url, blurhash, visibility, is_nsfw, moderation_category, status,
      profiles!posts_author_id_fkey(user_id, name, surname, full_name, username, avatar_url, is_verified, premium_plan, role),
      post_tags(tag_id, tags(id, name, slug))
    `)
    .eq("author_id", profile.user_id);

  // Status + NSFW filter: owner and staff see moderation posts too
  if (isOwn || isStaff) {
    query = query.in("status", ["published", "moderation"]);
  } else {
    query = query.eq("status", "published").eq("is_nsfw", false);
  }

  if (contentType) {
    query = query.eq("content_type", contentType);
  }

  const excludeType = searchParams.get("exclude_type");
  if (excludeType) {
    for (const t of excludeType.split(",")) {
      query = query.neq("content_type", t.trim());
    }
  }

  const { data: posts, error } = await query
    .order("published_at", { ascending: false })
    .range(from, to);

  if (error) {
    return safeError(error);
  }

  const allPosts = posts || [];
  const normalized = allPosts.slice(0, limit).map((p: any) => ({
    ...p,
    profiles: Array.isArray(p.profiles) ? p.profiles[0] : p.profiles,
  }));

  const enrichedPosts = user
    ? await attachViewerPostInteractions(normalized, user.id, admin)
    : normalized;

  return NextResponse.json({
    posts: enrichedPosts,
    hasMore: allPosts.length > limit,
  });
  } catch (err) {
    return safeError(err);
  }
}
