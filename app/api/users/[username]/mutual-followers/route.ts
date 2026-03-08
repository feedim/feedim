import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { safeError } from "@/lib/apiError";
import { safePage } from "@/lib/utils";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
  const { username } = await params;
  const supabase = await createClient();
  const admin = createAdminClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ users: [] });

  const { searchParams } = new URL(req.url);
  const page = safePage(searchParams.get("page"));
  const limit = 10;

  // Get target profile
  const { data: target } = await admin
    .from("profiles")
    .select("user_id, account_private")
    .eq("username", username)
    .eq("status", "active")
    .single();
  if (!target || target.user_id === user.id) return NextResponse.json({ users: [] });

  // Private account: only followers and staff can see mutual followers
  if (target.account_private) {
    const { data: vp } = await admin.from("profiles").select("role").eq("user_id", user.id).single();
    const isStaff = vp?.role === "admin" || vp?.role === "moderator";
    if (!isStaff) {
      const { data: f } = await admin.from("follows").select("id").eq("follower_id", user.id).eq("following_id", target.user_id).single();
      if (!f) return NextResponse.json({ users: [], hasMore: false });
    }
  }

  // Get people the current user follows
  const { data: myFollowing } = await admin
    .from("follows")
    .select("following_id")
    .eq("follower_id", user.id);

  if (!myFollowing || myFollowing.length === 0) return NextResponse.json({ users: [], hasMore: false });
  const myFollowingIds = myFollowing.map(f => f.following_id);

  // Find who among my following also follows the target
  const { data: mutuals } = await admin
    .from("follows")
    .select("follower_id")
    .eq("following_id", target.user_id)
    .in("follower_id", myFollowingIds);

  if (!mutuals || mutuals.length === 0) return NextResponse.json({ users: [], hasMore: false });

  let mutualIds = mutuals.map(m => m.follower_id);

  // Filter out blocked users
  const { data: blocks } = await supabase
    .from("blocks")
    .select("blocker_id, blocked_id")
    .or(`blocker_id.eq.${user.id},blocked_id.eq.${user.id}`);
  if (blocks && blocks.length > 0) {
    const blockedIds = new Set<string>();
    for (const b of blocks) {
      blockedIds.add(b.blocker_id === user.id ? b.blocked_id : b.blocker_id);
    }
    mutualIds = mutualIds.filter(id => !blockedIds.has(id));
    if (mutualIds.length === 0) return NextResponse.json({ users: [], hasMore: false });
  }

  // Paginate
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  const paginatedIds = mutualIds.slice(from, to + 1);

  if (paginatedIds.length === 0) return NextResponse.json({ users: [], hasMore: false });

  const { data: profiles } = await supabase
    .from("profiles")
    .select("user_id, username, full_name, avatar_url, is_verified, premium_plan, role, account_private")
    .in("user_id", paginatedIds)
    .eq("status", "active");

  // Check which users the current user follows & has pending requests
  const profileIds = (profiles || []).map(p => p.user_id);
  const [myFollowsRes, myRequestsRes] = await Promise.all([
    supabase.from("follows").select("following_id").eq("follower_id", user.id).in("following_id", profileIds),
    supabase.from("follow_requests").select("target_id").eq("requester_id", user.id).eq("status", "pending").in("target_id", profileIds),
  ]);
  const followingSet = new Set((myFollowsRes.data || []).map(f => f.following_id));
  const requestedSet = new Set((myRequestsRes.data || []).map(f => f.target_id));

  const enrichedUsers = (profiles || []).map(u => ({
    ...u,
    is_following: followingSet.has(u.user_id),
    is_requested: requestedSet.has(u.user_id),
    is_own: user.id === u.user_id,
  })).sort((a, b) => (b.role === 'admin' ? 1 : 0) - (a.role === 'admin' ? 1 : 0));

  return NextResponse.json({
    users: enrichedUsers,
    hasMore: mutualIds.length > to + 1,
  });
  } catch (err) {
    return safeError(err);
  }
}
