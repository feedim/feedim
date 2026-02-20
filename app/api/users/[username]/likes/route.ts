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
  const limit = 12;

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

  const { data: likes, error } = await supabase
    .from("likes")
    .select(`
      id,
      posts!inner(
        id, title, slug, excerpt, featured_image, reading_time,
        like_count, comment_count, save_count, published_at, content_type, video_duration, video_thumbnail,
        profiles!posts_author_id_fkey(user_id, name, surname, full_name, username, avatar_url, is_verified, premium_plan)
      )
    `)
    .eq("user_id", profile.user_id)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const posts = (likes || []).map((l: any) => {
    const post = Array.isArray(l.posts) ? l.posts[0] : l.posts;
    return {
      ...post,
      profiles: Array.isArray(post?.profiles) ? post.profiles[0] : post?.profiles,
    };
  }).filter(Boolean);

  return NextResponse.json({
    posts,
    hasMore: (likes || []).length >= limit,
  });
}
