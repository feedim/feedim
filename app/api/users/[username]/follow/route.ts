import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createNotification } from "@/lib/notifications";
import { cache } from "@/lib/cache";
import { getUserPlan, checkDailyLimit, isAdminPlan, logRateLimitHit } from "@/lib/limits";
import { safeError } from "@/lib/apiError";
import { checkEmailVerified } from "@/lib/emailGate";
import { getTranslations } from "next-intl/server";

function getDbErrorCode(error: unknown): string | null {
  if (!error || typeof error !== "object" || !("code" in error)) return null;
  const code = (error as { code?: unknown }).code;
  return typeof code === "string" ? code : null;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const tErrors = await getTranslations("apiErrors");
    const tNotif = await getTranslations("notifications");
    const { username } = await params;
    const supabase = await createClient();
    const admin = createAdminClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: tErrors("unauthorized") }, { status: 401 });
    const plan = await getUserPlan(admin, user.id);
    const isAdminUser = isAdminPlan(plan);

    // Parallel: restriction check + target lookup + email gate
    const [{ data: myProfile }, emailCheck, { data: target }] = await Promise.all([
      isAdminUser
        ? Promise.resolve({ data: null })
        : admin.from("profiles").select("restricted_follow").eq("user_id", user.id).single(),
      checkEmailVerified(admin, user.id, "follow"),
      admin.from("profiles").select("user_id, account_private").eq("username", username).single(),
    ]);

    if (myProfile?.restricted_follow) {
      return NextResponse.json({ error: tErrors("communityRestricted") }, { status: 403 });
    }
    if (!emailCheck.allowed) {
      return NextResponse.json({ error: emailCheck.error }, { status: 403 });
    }
    if (!target) return NextResponse.json({ error: tErrors("userNotFound") }, { status: 404 });
    if (target.user_id === user.id) return NextResponse.json({ error: tErrors("cannotFollowYourself") }, { status: 400 });

    // Parallel: block check + existing follow + pending request
    const [{ data: block }, { data: existing }, { data: pendingRequest }] = await Promise.all([
      admin.from("blocks").select("id")
        .or(`and(blocker_id.eq.${user.id},blocked_id.eq.${target.user_id}),and(blocker_id.eq.${target.user_id},blocked_id.eq.${user.id})`)
        .limit(1).maybeSingle(),
      admin.from("follows").select("id").eq("follower_id", user.id).eq("following_id", target.user_id).maybeSingle(),
      admin.from("follow_requests").select("id").eq("requester_id", user.id).eq("target_id", target.user_id).eq("status", "pending").maybeSingle(),
    ]);

    if (block) return NextResponse.json({ error: tErrors("blockedUserCannotFollow") }, { status: 403 });

    if (existing) {
      await admin.from("follows").delete().eq("id", existing.id);
      await Promise.all([
        admin.from("notifications").delete()
          .eq("actor_id", user.id)
          .eq("user_id", target.user_id)
          .eq("type", "follow"),
        admin.from("notifications").delete()
          .eq("actor_id", target.user_id)
          .eq("user_id", user.id)
          .eq("type", "follow_accepted"),
      ]);
      cache.delete(`user:${user.id}:follows`);
      return NextResponse.json({ following: false, requested: false });
    }

    if (pendingRequest) {
      await admin.from("follow_requests").delete().eq("id", pendingRequest.id);
      await admin.from("notifications").delete()
        .eq("actor_id", user.id)
        .eq("user_id", target.user_id)
        .eq("type", "follow_request");
      return NextResponse.json({ following: false, requested: false });
    }

    // Daily follow limit check
    const { allowed, limit } = await checkDailyLimit(admin, user.id, "follow", plan);
    if (!allowed) {
      logRateLimitHit(admin, user.id, "follow", req.headers.get("x-forwarded-for")?.split(",")[0]?.trim());
      return NextResponse.json(
        { error: tErrors("communityFeatureRestricted"), limit, remaining: 0 },
        { status: 429 }
      );
    }

    // Private account → send follow request
    if (target.account_private) {
      const { error } = await admin
        .from("follow_requests")
        .insert({ requester_id: user.id, target_id: target.user_id, status: "pending" });
      if (error) {
        const code = getDbErrorCode(error);
        if (code === "23505") {
          return NextResponse.json({ following: false, requested: true });
        }
        if (code === "23503") {
          return NextResponse.json({ error: tErrors("userNotFound") }, { status: 404 });
        }
        return safeError(error);
      }
      await createNotification({
        admin,
        user_id: target.user_id,
        actor_id: user.id,
        type: "follow_request",
        content: tNotif("followRequestContent"),
      });
      return NextResponse.json({ following: false, requested: true });
    }

    // Public account → follow directly — trigger updates follower_count/following_count
    const { error } = await admin
      .from("follows")
      .insert({ follower_id: user.id, following_id: target.user_id });
    if (error) {
      const code = getDbErrorCode(error);
      if (code === "23505") {
        return NextResponse.json({ following: true, requested: false });
      }
      if (code === "23503") {
        return NextResponse.json({ error: tErrors("userNotFound") }, { status: 404 });
      }
      return safeError(error);
    }
    cache.delete(`user:${user.id}:follows`);
    await createNotification({
      admin,
      user_id: target.user_id,
      actor_id: user.id,
      type: "follow",
      content: tNotif("followContent"),
    });
    return NextResponse.json({ following: true, requested: false });
  } catch (err) {
    return safeError(err);
  }
}

/** DELETE — Remove a follower (the target user stops following you) */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const tErrors = await getTranslations("apiErrors");
    const { username } = await params;
    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");

    if (action !== "remove-follower") {
      return NextResponse.json({ error: tErrors("invalidAction") }, { status: 400 });
    }

    const supabase = await createClient();
    const admin = createAdminClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: tErrors("unauthorized") }, { status: 401 });

    const { data: target } = await admin
      .from("profiles")
      .select("user_id")
      .eq("username", username)
      .single();

    if (!target) return NextResponse.json({ error: tErrors("userNotFound") }, { status: 404 });

    // Delete the follow where target follows me
    await admin.from("follows").delete()
      .eq("follower_id", target.user_id)
      .eq("following_id", user.id);

    return NextResponse.json({ removed: true });
  } catch (err) {
    return safeError(err);
  }
}
