import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ users: [] });

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = 20;

  // Get target profile
  const { data: target } = await supabase
    .from("profiles")
    .select("user_id")
    .eq("username", username)
    .single();
  if (!target || target.user_id === user.id) return NextResponse.json({ users: [] });

  // Get people the current user follows
  const { data: myFollowing } = await supabase
    .from("follows")
    .select("following_id")
    .eq("follower_id", user.id);

  if (!myFollowing || myFollowing.length === 0) return NextResponse.json({ users: [], hasMore: false });
  const myFollowingIds = myFollowing.map(f => f.following_id);

  // Find who among my following also follows the target
  const { data: mutuals } = await supabase
    .from("follows")
    .select("follower_id")
    .eq("following_id", target.user_id)
    .in("follower_id", myFollowingIds);

  if (!mutuals || mutuals.length === 0) return NextResponse.json({ users: [], hasMore: false });

  const mutualIds = mutuals.map(m => m.follower_id);

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
  }));

  return NextResponse.json({
    users: enrichedUsers,
    hasMore: mutualIds.length > to + 1,
  });
}
