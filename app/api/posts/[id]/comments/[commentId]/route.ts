import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  const { commentId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: comment } = await supabase
    .from("comments")
    .select("id, author_id, post_id")
    .eq("id", commentId)
    .single();

  if (!comment) return NextResponse.json({ error: "Yorum bulunamadı" }, { status: 404 });

  // Admin can delete any comment
  const admin = createAdminClient();
  const { data: deleterProfile } = await admin.from('profiles').select('role').eq('user_id', user.id).single();
  const isAdmin = deleterProfile?.role === 'admin';

  if (comment.author_id !== user.id && !isAdmin) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });

  const { error } = await admin.from("comments").delete().eq("id", commentId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

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
