import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params;
  const supabase = await createClient();
  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") || "1");
  const contentType = searchParams.get("content_type");
  const limit = 12;

  const { data: profile } = await supabase
    .from("profiles")
    .select("user_id, account_private")
    .eq("username", username)
    .single();

  if (!profile) {
    return NextResponse.json({ error: "Kullanici bulunamadi" }, { status: 404 });
  }

  // Require auth for pagination (page > 1)
  const { data: { user } } = await supabase.auth.getUser();
  if (page > 1 && !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isOwn = user?.id === profile.user_id;

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
  const to = from + limit - 1;

  let query = supabase
    .from("posts")
    .select(`
      id, title, slug, excerpt, featured_image, reading_time,
      like_count, comment_count, save_count, view_count, published_at, content_type, video_duration, video_thumbnail, blurhash,
      profiles!posts_author_id_fkey(user_id, name, surname, full_name, username, avatar_url, is_verified, premium_plan)
    `)
    .eq("author_id", profile.user_id)
    .eq("status", "published");

  if (contentType) {
    query = query.eq("content_type", contentType);
  }

  const { data: posts, error } = await query
    .order("published_at", { ascending: false })
    .range(from, to);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const normalized = (posts || []).map((p: any) => ({
    ...p,
    profiles: Array.isArray(p.profiles) ? p.profiles[0] : p.profiles,
  }));

  return NextResponse.json({
    posts: normalized,
    hasMore: (posts || []).length >= limit,
  });
}
