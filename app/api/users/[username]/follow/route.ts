import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createNotification } from "@/lib/notifications";
import { cache } from "@/lib/cache";
import { getUserPlan, checkDailyLimit, logRateLimitHit } from "@/lib/limits";
import { safeError } from "@/lib/apiError";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params;
  const supabase = await createClient();
  const admin = createAdminClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Access restriction check
  const { data: myProfile } = await admin
    .from("profiles")
    .select("restricted_follow")
    .eq("user_id", user.id)
    .single();
  if (myProfile?.restricted_follow) {
    return NextResponse.json({ error: "Takip etme özelliğiniz kısıtlanmıştır" }, { status: 403 });
  }

  const { data: target } = await admin
    .from("profiles")
    .select("user_id, account_private")
    .eq("username", username)
    .single();

  if (!target) return NextResponse.json({ error: "Kullanici bulunamadi" }, { status: 404 });
  if (target.user_id === user.id) return NextResponse.json({ error: "Kendini takip edemezsin" }, { status: 400 });

  // Check block status (both directions)
  const { data: block } = await admin
    .from("blocks")
    .select("id")
    .or(`and(blocker_id.eq.${user.id},blocked_id.eq.${target.user_id}),and(blocker_id.eq.${target.user_id},blocked_id.eq.${user.id})`)
    .limit(1)
    .maybeSingle();
  if (block) return NextResponse.json({ error: "Engellenen kullanıcı takip edilemez" }, { status: 403 });

  // Check if already following
  const { data: existing } = await admin
    .from("follows")
    .select("id")
    .eq("follower_id", user.id)
    .eq("following_id", target.user_id)
    .single();

  if (existing) {
    // Unfollow — trigger updates follower_count/following_count
    await admin.from("follows").delete().eq("id", existing.id);
    await admin.from("notifications").delete()
      .eq("actor_id", user.id)
      .eq("user_id", target.user_id)
      .eq("type", "follow");
    // Invalidate follows cache
    cache.delete(`user:${user.id}:follows`);
    return NextResponse.json({ following: false, requested: false });
  }

  // Check if there's a pending follow request → cancel it
  const { data: pendingRequest } = await admin
    .from("follow_requests")
    .select("id")
    .eq("requester_id", user.id)
    .eq("target_id", target.user_id)
    .eq("status", "pending")
    .single();

  if (pendingRequest) {
    await admin.from("follow_requests").delete().eq("id", pendingRequest.id);
    await admin.from("notifications").delete()
      .eq("actor_id", user.id)
      .eq("user_id", target.user_id)
      .eq("type", "follow_request");
    return NextResponse.json({ following: false, requested: false });
  }

  // Daily follow limit check
  const plan = await getUserPlan(admin, user.id);
  const { allowed, remaining, limit } = await checkDailyLimit(admin, user.id, "follow", plan);
  if (!allowed) {
    logRateLimitHit(admin, user.id, "follow", req.headers.get("x-forwarded-for")?.split(",")[0]?.trim());
    return NextResponse.json(
      { error: `Günlük takip limitine ulaştın (${limit}). Premium ile artır.`, limit, remaining: 0 },
      { status: 429 }
    );
  }

  // Private account → send follow request
  if (target.account_private) {
    const { error } = await admin
      .from("follow_requests")
      .insert({ requester_id: user.id, target_id: target.user_id, status: "pending" });
    if (error) return safeError(error);
    await createNotification({
      admin,
      user_id: target.user_id,
      actor_id: user.id,
      type: "follow_request",
      content: "seni takip etmek istiyor",
    });
    return NextResponse.json({ following: false, requested: true });
  }

  // Public account → follow directly — trigger updates follower_count/following_count
  const { error } = await admin
    .from("follows")
    .insert({ follower_id: user.id, following_id: target.user_id });
  if (error) return safeError(error);
  // Invalidate follows cache
  cache.delete(`user:${user.id}:follows`);
  await createNotification({
    admin,
    user_id: target.user_id,
    actor_id: user.id,
    type: "follow",
    content: "seni takip etmeye başladı",
  });
  return NextResponse.json({ following: true, requested: false });
}
