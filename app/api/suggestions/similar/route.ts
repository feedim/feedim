import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const admin = createAdminClient();
    const { data: { user } } = await supabase.auth.getUser();

    const targetUserId = req.nextUrl.searchParams.get("user_id");
    const limit = Math.min(parseInt(req.nextUrl.searchParams.get("limit") || "10"), 20);

    if (!targetUserId) {
      return NextResponse.json({ error: "user_id required" }, { status: 400 });
    }

    // Build exclude set: target user + current user + current user's following + blocks
    const excludeIds = new Set<string>([targetUserId]);

    if (user) {
      excludeIds.add(user.id);

      const [followsRes, blocksRes] = await Promise.all([
        admin.from("follows").select("following_id").eq("follower_id", user.id),
        admin.from("blocks").select("blocked_id, blocker_id").or(`blocker_id.eq.${user.id},blocked_id.eq.${user.id}`),
      ]);

      (followsRes.data || []).forEach(f => excludeIds.add(f.following_id));
      (blocksRes.data || []).forEach(b => excludeIds.add(b.blocker_id === user.id ? b.blocked_id : b.blocker_id));
    }

    const excludeArray = [...excludeIds];
    const scoreMap = new Map<string, number>();

    // Signal 1: People who the target follows also follow (mutual interests)
    const { data: targetFollowing } = await admin
      .from("follows")
      .select("following_id")
      .eq("follower_id", targetUserId)
      .limit(100);

    const targetFollowingIds = (targetFollowing || []).map(f => f.following_id);

    if (targetFollowingIds.length > 0) {
      const { data: fof } = await admin
        .from("follows")
        .select("following_id")
        .in("follower_id", targetFollowingIds)
        .not("following_id", "in", `(${excludeArray.join(",")})`)
        .limit(500);

      (fof || []).forEach(f => {
        scoreMap.set(f.following_id, (scoreMap.get(f.following_id) || 0) + 30);
      });
    }

    // Signal 2: People followed by the target's followers ("people who follow X also follow...")
    const { data: targetFollowers } = await admin
      .from("follows")
      .select("follower_id")
      .eq("following_id", targetUserId)
      .limit(200);

    const targetFollowerIds = (targetFollowers || []).map(f => f.follower_id);

    if (targetFollowerIds.length > 0) {
      const { data: followerFollowing } = await admin
        .from("follows")
        .select("following_id")
        .in("follower_id", targetFollowerIds)
        .not("following_id", "in", `(${excludeArray.join(",")})`)
        .limit(500);

      (followerFollowing || []).forEach(f => {
        scoreMap.set(f.following_id, (scoreMap.get(f.following_id) || 0) + 50);
      });
    }

    // Signal 3: People who follow the same tags as the target
    const { data: targetTags } = await admin
      .from("tag_follows")
      .select("tag_id")
      .eq("user_id", targetUserId);

    if (targetTags && targetTags.length > 0) {
      const tagIds = targetTags.map(tf => tf.tag_id);
      const { data: sameTagUsers } = await admin
        .from("tag_follows")
        .select("user_id")
        .in("tag_id", tagIds)
        .not("user_id", "in", `(${excludeArray.join(",")})`)
        .limit(200);

      (sameTagUsers || []).forEach(u => {
        scoreMap.set(u.user_id, (scoreMap.get(u.user_id) || 0) + 20);
      });
    }

    // Fetch profiles, filter spam/inactive, sort by score
    const candidateIds = [...scoreMap.keys()];
    if (candidateIds.length === 0) {
      return NextResponse.json({ users: [], hasMore: false, total: 0 });
    }

    const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();

    const { data: profiles } = await admin
      .from("profiles")
      .select("user_id, name, surname, full_name, username, avatar_url, is_verified, premium_plan, bio, follower_count, profile_score, status, account_private, spam_score, last_active_at")
      .in("user_id", candidateIds)
      .eq("status", "active")
      .lt("spam_score", 30);

    // Get users who follow me (for "follow back" label)
    let followerSet = new Set<string>();
    if (user) {
      const { data: myFollowers } = await admin
        .from("follows")
        .select("follower_id")
        .eq("following_id", user.id);
      followerSet = new Set((myFollowers || []).map(f => f.follower_id));
    }

    const results = (profiles || [])
      .filter(p => {
        if (p.account_private) return false;
        if (p.last_active_at && p.last_active_at < sixtyDaysAgo) return false;
        return true;
      })
      .map(p => ({
        user_id: p.user_id,
        name: p.name,
        surname: p.surname,
        full_name: p.full_name,
        username: p.username,
        avatar_url: p.avatar_url,
        is_verified: p.is_verified,
        premium_plan: p.premium_plan,
        bio: p.bio,
        follower_count: p.follower_count,
        follows_me: followerSet.has(p.user_id),
        _score: (scoreMap.get(p.user_id) || 0) + (p.profile_score || 0) * 0.5,
      }))
      .sort((a, b) => b._score - a._score)
      .slice(0, limit)
      .map(({ _score, ...rest }) => rest);

    return NextResponse.json({
      users: results,
      hasMore: false,
      total: results.length,
    }, {
      headers: { "Cache-Control": "private, max-age=120" },
    });
  } catch (err) {
    if (process.env.NODE_ENV === "development") console.error("[similar] Error:", err);
    return NextResponse.json({ users: [], hasMore: false, total: 0 }, { status: 500 });
  }
}
