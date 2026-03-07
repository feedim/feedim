import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { safeError } from "@/lib/apiError";
import { getUserPlan, isAdminPlan } from "@/lib/limits";
import { getTranslations } from "next-intl/server";

// In-memory burst rate limit for comment deletions
const deleteTimestamps = new Map<string, number[]>();

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  const { commentId } = await params;
  const supabase = await createClient();
  const tErrors = await getTranslations("apiErrors");
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: tErrors("unauthorized") }, { status: 401 });

  const { data: comment } = await supabase
    .from("comments")
    .select("id, author_id, post_id")
    .eq("id", commentId)
    .single();

  if (!comment) return NextResponse.json({ error: tErrors("commentNotFound") }, { status: 404 });

  const admin = createAdminClient();
  const plan = await getUserPlan(admin, user.id);
  const isAdmin = isAdminPlan(plan);

  // Burst rate limit — max 10 comment deletions per minute
  const now = Date.now();
  const timestamps = (deleteTimestamps.get(user.id) || []).filter(t => now - t < 60_000);
  if (!isAdmin && timestamps.length >= 10) {
    return NextResponse.json({ error: tErrors("tooFastAction") }, { status: 429 });
  }
  timestamps.push(now);
  deleteTimestamps.set(user.id, timestamps);

  if (comment.author_id !== user.id && !isAdmin) return NextResponse.json({ error: tErrors("unauthorized") }, { status: 403 });

  // Promote child replies to root-level before deleting parent
  await admin.from("comments").update({ parent_id: null }).eq("parent_id", Number(commentId));

  await admin.from("comment_likes").delete().eq("comment_id", Number(commentId));
  const { error } = await admin.from("comments").delete().eq("id", commentId);
  if (error) return safeError(error);

  // Recalculate post comment_count (exclude NSFW)
  try {
    if (comment.post_id) {
      const admin = createAdminClient();
      const { count } = await admin
        .from("comments")
        .select("id", { count: "exact", head: true })
        .eq("post_id", comment.post_id)
        .eq("status", "approved")
        .eq("is_nsfw", false);
      await admin.from("posts").update({ comment_count: count || 0 }).eq("id", comment.post_id);
    }
  } catch {}

  // Cleanup moderation artifacts + notifications for deleted comments
  try {
    const admin = createAdminClient();
    await Promise.all([
      admin.from("reports").delete().eq("content_type", "comment").eq("content_id", Number(commentId)),
      admin.from("moderation_decisions").delete().eq("target_type", "comment").eq("target_id", String(commentId)),
      admin.from("moderation_logs").delete().eq("target_type", "comment").eq("target_id", String(commentId)),
      admin.from("notifications").delete().eq("object_type", "comment").eq("object_id", Number(commentId)),
    ]);
  } catch {}

  return NextResponse.json({ success: true });
}
