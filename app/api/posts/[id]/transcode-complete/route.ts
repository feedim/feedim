import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * POST /api/posts/[id]/transcode-complete
 * Called by the external transcode worker when HLS segmentation is done.
 * Updates the post with the HLS master playlist URL and video_status.
 *
 * Expected body: { hls_url: string, status: "ready" | "error" }
 * Auth: Bearer token matching TRANSCODE_CALLBACK_SECRET env var.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Verify shared secret
  const secret = process.env.TRANSCODE_CALLBACK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Not configured" }, { status: 503 });
  }

  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const postId = parseInt(id, 10);
  if (!postId || isNaN(postId)) {
    return NextResponse.json({ error: "Invalid post ID" }, { status: 400 });
  }

  const body = await request.json();
  const { hls_url, status } = body;

  if (!status || !["ready", "error"].includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Verify the post exists and is a video/moment
  const { data: post } = await admin
    .from("posts")
    .select("id, content_type, video_status")
    .eq("id", postId)
    .single();

  if (!post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  if (post.content_type !== "video" && post.content_type !== "moment") {
    return NextResponse.json(
      { error: "Not a video post" },
      { status: 400 }
    );
  }

  // Update post with HLS data
  const update: Record<string, unknown> = {
    video_status: status,
  };

  if (status === "ready" && hls_url) {
    update.hls_url = hls_url;
  }

  const { error } = await admin
    .from("posts")
    .update(update)
    .eq("id", postId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
