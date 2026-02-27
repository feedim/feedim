import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { safeError } from "@/lib/apiError";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
  const { username } = await params;
  const supabase = await createClient();

  let profile: any = null;

  // Try active profile first
  const { data: activeProfile } = await supabase
    .from("profiles")
    .select("*")
    .eq("username", username)
    .eq("status", "active")
    .single();

  if (activeProfile) {
    profile = activeProfile;
  } else {
    // Check if viewer is staff (admin/moderator) — allow viewing any profile
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const adminClient = createAdminClient();
      const { data: viewerP } = await adminClient.from('profiles').select('role').eq('user_id', user.id).single();
      const isStaff = viewerP?.role === 'admin' || viewerP?.role === 'moderator';
      if (isStaff) {
        const { data: anyProfile } = await adminClient.from('profiles').select('*').eq('username', username).single();
        if (anyProfile) profile = anyProfile;
      } else {
        // Check if it's the user's own profile
        const { data: ownProfile } = await adminClient.from('profiles').select('*').eq('username', username).eq('user_id', user.id).single();
        if (ownProfile) profile = ownProfile;
      }
    }
  }

  if (!profile) {
    // Check username redirects
    const { data: redir } = await supabase
      .from("username_redirects")
      .select("new_username")
      .eq("old_username", username)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    if (redir) {
      return NextResponse.json({ redirect: `/u/${redir.new_username}`, new_username: redir.new_username }, { status: 301 });
    }
    return NextResponse.json({ error: "Kullanici bulunamadi" }, { status: 404 });
  }

  // Check if current user follows this profile
  let isFollowing = false;
  let isBlocked = false;
  const { data: { user } } = await supabase.auth.getUser();
  const isOwn = user?.id === profile.user_id;

  if (user && !isOwn) {
    const { data: follow } = await supabase
      .from("follows")
      .select("id")
      .eq("follower_id", user.id)
      .eq("following_id", profile.user_id)
      .single();
    isFollowing = !!follow;

    // Check for pending follow request
    if (!isFollowing) {
      const { data: req } = await supabase
        .from("follow_requests")
        .select("id")
        .eq("requester_id", user.id)
        .eq("target_id", profile.user_id)
        .eq("status", "pending")
        .single();
      if (req) {
        // @ts-ignore — dynamic property
        profile.has_follow_request = true;
      }
    }

    const { data: block } = await supabase
      .from("blocks")
      .select("id")
      .eq("blocker_id", user.id)
      .eq("blocked_id", profile.user_id)
      .single();
    isBlocked = !!block;

    // Check if profile follows current user
    const { data: followsBack } = await supabase
      .from("follows")
      .select("id")
      .eq("follower_id", profile.user_id)
      .eq("following_id", user.id)
      .single();
    if (followsBack) {
      // @ts-ignore
      profile.follows_me = true;
    }

    // Check if TARGET blocked current user (reverse direction)
    const { data: blockedBy } = await supabase
      .from("blocks")
      .select("id")
      .eq("blocker_id", profile.user_id)
      .eq("blocked_id", user.id)
      .single();
    if (blockedBy) {
      // @ts-ignore
      profile.is_blocked_by = true;
    }
  }

  // Coin balance only visible to own profile
  let coin_balance: number | undefined;
  if (isOwn) {
    const { data: ownData } = await supabase
      .from("profiles")
      .select("coin_balance")
      .eq("user_id", user!.id)
      .single();
    coin_balance = ownData?.coin_balance || 0;
  }

  // Mutual followers (people you both follow)
  let mutual_followers: { username: string; avatar_url: string | null; full_name: string | null }[] = [];
  if (user && !isOwn) {
    // Get people the current user follows
    const { data: myFollowing } = await supabase
      .from("follows")
      .select("following_id")
      .eq("follower_id", user.id);

    if (myFollowing && myFollowing.length > 0) {
      const myFollowingIds = myFollowing.map(f => f.following_id);

      // Find who among my following also follows this profile
      const { data: mutuals } = await supabase
        .from("follows")
        .select("follower_id")
        .eq("following_id", profile.user_id)
        .in("follower_id", myFollowingIds)
        .limit(3);

      if (mutuals && mutuals.length > 0) {
        const { data: mutualProfiles } = await supabase
          .from("profiles")
          .select("username, avatar_url, full_name")
          .in("user_id", mutuals.map(m => m.follower_id));
        mutual_followers = mutualProfiles || [];
      }
    }
  }

  return NextResponse.json({
    profile: {
      ...profile,
      is_following: isFollowing,
      is_own: isOwn,
      is_blocked: isBlocked,
      mutual_followers,
      ...(coin_balance !== undefined && { coin_balance }),
    },
  });
  } catch (err) {
    return safeError(err);
  }
}
