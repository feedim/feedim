import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createNotification } from "@/lib/notifications";
import { safeError } from "@/lib/apiError";

interface RouteParams {
  params: Promise<{ id: string; commentId: string }>;
}

export async function POST(_req: NextRequest, { params }: RouteParams) {
  try {
    const { id, commentId } = await params;
    const postId = parseInt(id);
    const cId = parseInt(commentId);
    if (isNaN(postId) || isNaN(cId)) {
      return NextResponse.json({ error: "Geçersiz ID" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = createAdminClient();

    // Check if already liked
    const { data: existing } = await admin
      .from("comment_likes")
      .select("id")
      .eq("user_id", user.id)
      .eq("comment_id", cId)
      .single();

    if (existing) {
      return NextResponse.json({ error: "Zaten beğenilmiş" }, { status: 409 });
    }

    // Insert like
    const { error } = await admin
      .from("comment_likes")
      .insert({ user_id: user.id, comment_id: cId });

    if (error) return safeError(error);

    // Update like_count
    const { count } = await admin
      .from("comment_likes")
      .select("id", { count: "exact", head: true })
      .eq("comment_id", cId);
    await admin.from("comments").update({ like_count: count || 0 }).eq("id", cId);

    // Create notification for comment author
    const { data: comment } = await admin
      .from("comments")
      .select("author_id, content, content_type")
      .eq("id", cId)
      .single();

    if (comment) {
      const notifContent = comment.content_type === "gif" ? "GIF yorumunuzu beğendi" : (comment.content || "").slice(0, 80);
      await createNotification({ admin, user_id: comment.author_id, actor_id: user.id, type: "comment_like", object_type: "comment", object_id: postId, content: notifContent });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  try {
    const { commentId } = await params;
    const cId = parseInt(commentId);
    if (isNaN(cId)) return NextResponse.json({ error: "Geçersiz ID" }, { status: 400 });

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = createAdminClient();

    const { error } = await admin
      .from("comment_likes")
      .delete()
      .eq("user_id", user.id)
      .eq("comment_id", cId);

    if (error) return safeError(error);

    // Update like_count
    const { count } = await admin
      .from("comment_likes")
      .select("id", { count: "exact", head: true })
      .eq("comment_id", cId);
    await admin.from("comments").update({ like_count: count || 0 }).eq("id", cId);

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
