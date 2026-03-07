import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createNotification } from "@/lib/notifications";
import { safeError } from "@/lib/apiError";
import { checkEmailVerified } from "@/lib/emailGate";
import { getUserPlan, isAdminPlan } from "@/lib/limits";
import { getTranslations } from "next-intl/server";

// Rate limiter — max 60 comment likes per minute per user
const likeMap = new Map<string, { count: number; resetAt: number }>();
function checkLikeLimit(userId: string): boolean {
  const now = Date.now();
  const entry = likeMap.get(userId);
  if (!entry || now > entry.resetAt) {
    likeMap.set(userId, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (entry.count >= 60) return false;
  entry.count++;
  return true;
}

interface RouteParams {
  params: Promise<{ id: string; commentId: string }>;
}

export async function POST(_req: NextRequest, { params }: RouteParams) {
  try {
    const { id, commentId } = await params;
    const postId = parseInt(id);
    const cId = parseInt(commentId);
    const tErrors = await getTranslations("apiErrors");
    if (isNaN(postId) || isNaN(cId)) {
      return NextResponse.json({ error: tErrors("invalidId") }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: tErrors("unauthorized") }, { status: 401 });
    const admin = createAdminClient();
    const plan = await getUserPlan(admin, user.id);
    const isAdminUser = isAdminPlan(plan);

    if (!isAdminUser && !checkLikeLimit(user.id)) {
      return NextResponse.json({ error: tErrors("uploadRateLimited") }, { status: 429 });
    }

    // Access restriction check
    const { data: myProfile } = isAdminUser
      ? { data: null as null | { restricted_like?: boolean } }
      : await admin
          .from('profiles')
          .select('restricted_like')
          .eq('user_id', user.id)
          .single();
    if (myProfile?.restricted_like) {
      return NextResponse.json({ error: tErrors("communityProtectionRestricted") }, { status: 403 });
    }

    // Email verification check
    const emailCheck = await checkEmailVerified(admin, user.id, "comment_like");
    if (!emailCheck.allowed) {
      return NextResponse.json({ error: emailCheck.error }, { status: 403 });
    }

    // Check if already liked
    const { data: existing } = await admin
      .from("comment_likes")
      .select("id")
      .eq("user_id", user.id)
      .eq("comment_id", cId)
      .single();

    if (existing) {
      return NextResponse.json({ error: tErrors("alreadyLiked") }, { status: 409 });
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
      const tNotif = await getTranslations("notifications");
      const notifContent = comment.content_type === "gif" ? tNotif("gifCommentLiked") : (comment.content || "").slice(0, 80);
      await createNotification({ admin, user_id: comment.author_id, actor_id: user.id, type: "comment_like", object_type: "comment", object_id: cId, content: notifContent });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  try {
    const { commentId } = await params;
    const cId = parseInt(commentId);
    const tErrors = await getTranslations("apiErrors");
    if (isNaN(cId)) return NextResponse.json({ error: tErrors("invalidId") }, { status: 400 });

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: tErrors("unauthorized") }, { status: 401 });

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
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
