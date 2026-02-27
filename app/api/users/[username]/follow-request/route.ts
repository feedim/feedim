import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createNotification } from "@/lib/notifications";
import { cache } from "@/lib/cache";
import { safeError } from "@/lib/apiError";

// POST — accept or reject a follow request
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
  const { username } = await params;
  const supabase = await createClient();
  const admin = createAdminClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { action } = await req.json(); // "accept" | "reject"
  if (!["accept", "reject"].includes(action)) {
    return NextResponse.json({ error: "Geçersiz işlem" }, { status: 400 });
  }

  // Find the requester by username
  const { data: requester } = await admin
    .from("profiles")
    .select("user_id")
    .eq("username", username)
    .single();
  if (!requester) return NextResponse.json({ error: "Kullanıcı bulunamadı" }, { status: 404 });

  // Find the pending follow request
  const { data: request } = await admin
    .from("follow_requests")
    .select("id")
    .eq("requester_id", requester.user_id)
    .eq("target_id", user.id)
    .eq("status", "pending")
    .single();

  if (!request) {
    return NextResponse.json({ error: "Takip isteği bulunamadı" }, { status: 404 });
  }

  if (action === "accept") {
    // Create the follow relationship
    await admin.from("follows").insert({
      follower_id: requester.user_id,
      following_id: user.id,
    });

    // Update counts
    const { count: followerCount } = await admin
      .from("follows")
      .select("id", { count: "exact", head: true })
      .eq("following_id", user.id);
    await admin.from("profiles").update({ follower_count: followerCount || 0 }).eq("user_id", user.id);

    const { count: followingCount } = await admin
      .from("follows")
      .select("id", { count: "exact", head: true })
      .eq("follower_id", requester.user_id);
    await admin.from("profiles").update({ following_count: followingCount || 0 }).eq("user_id", requester.user_id);

    // Notify the requester that their request was accepted
    await createNotification({
      admin,
      user_id: requester.user_id,
      actor_id: user.id,
      type: "follow_accepted",
      content: "takip isteğini kabul etti",
    });

    // Delete the request
    await admin.from("follow_requests").delete().eq("id", request.id);

    // Invalidate requester's follows cache so explore/feed shows the new follow
    cache.delete(`user:${requester.user_id}:follows`);

    return NextResponse.json({ accepted: true });
  } else {
    // Reject — just delete the request
    await admin.from("follow_requests").delete().eq("id", request.id);
    return NextResponse.json({ rejected: true });
  }
  } catch (err) {
    return safeError(err);
  }
}

// GET — list pending follow requests for the current user
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const page = parseInt(req.nextUrl.searchParams.get("page") || "1");
  const limit = 10;
  const offset = (page - 1) * limit;

  const { data: requests } = await supabase
    .from("follow_requests")
    .select("id, requester_id, created_at")
    .eq("target_id", user.id)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit);

  if (!requests || requests.length === 0) {
    return NextResponse.json({ requests: [], hasMore: false });
  }

  const requesterIds = requests.map(r => r.requester_id);
  const { data: profiles } = await supabase
    .from("profiles")
    .select("user_id, username, full_name, avatar_url, is_verified, premium_plan, role")
    .in("user_id", requesterIds);

  const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));

  const enriched = requests.map(r => ({
    ...r,
    profile: profileMap.get(r.requester_id) || null,
  }));

  return NextResponse.json({
    requests: enriched,
    hasMore: requests.length >= limit,
  });
  } catch (err) {
    return safeError(err);
  }
}
