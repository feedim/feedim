import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { safeError } from "@/lib/apiError";
import { getTranslations } from "next-intl/server";
import crypto from "crypto";

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
  const tErrors = await getTranslations("apiErrors");

  // Verify shared secret (timing-safe)
  const secret = process.env.TRANSCODE_CALLBACK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: tErrors("notConfigured") }, { status: 503 });
  }

  const auth = request.headers.get("authorization") || "";
  const expected = `Bearer ${secret}`;
  if (auth.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(auth), Buffer.from(expected))) {
    return NextResponse.json({ error: tErrors("unauthorized") }, { status: 401 });
  }

  const { id } = await params;
  const postId = parseInt(id, 10);
  if (!postId || isNaN(postId)) {
    return NextResponse.json({ error: tErrors("invalidPostId") }, { status: 400 });
  }

  const body = await request.json();
  const { hls_url, status } = body;

  if (!status || !["ready", "error"].includes(status)) {
    return NextResponse.json({ error: tErrors("invalidStatus") }, { status: 400 });
  }

  const admin = createAdminClient();

  // Verify the post exists and is a video/moment
  const { data: post } = await admin
    .from("posts")
    .select("id, content_type, video_status")
    .eq("id", postId)
    .single();

  if (!post) {
    return NextResponse.json({ error: tErrors("postNotFoundShort") }, { status: 404 });
  }

  if (post.content_type !== "video" && post.content_type !== "moment") {
    return NextResponse.json(
      { error: tErrors("notVideoPost") },
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
    return safeError(error);
  }

  return NextResponse.json({ ok: true });
}
