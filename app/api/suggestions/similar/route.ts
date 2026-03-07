import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { cached } from "@/lib/cache";
import { getTranslations } from "next-intl/server";
import { logServerError } from "@/lib/runtimeLogger";

const MAX_EXCLUDE_IDS = 500; // Prevent PostgREST URI-too-long errors

export async function GET(req: NextRequest) {
  try {
    const tErrors = await getTranslations("apiErrors");
    const supabase = await createClient();
    const admin = createAdminClient();

    let user: { id: string } | null = null;
    try {
      const { data } = await supabase.auth.getUser();
      user = data.user;
    } catch {
      user = null;
    }

    const targetUserId = req.nextUrl.searchParams.get("user_id");
    const limit = Math.min(parseInt(req.nextUrl.searchParams.get("limit") || "10"), 20);

    if (!targetUserId) {
      return NextResponse.json({ error: tErrors("userIdRequired") }, { status: 400 });
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

    const excludeArray = [...excludeIds].slice(0, MAX_EXCLUDE_IDS);
    const excludeIdStr = excludeArray.join(",");
    const scoreMap = new Map<string, number>();

    // Fetch target user's profile (language, country) — determines "similar" context
    const targetProfile = await cached(`similar:target:${targetUserId}:v2`, 300, async () => {
      const { data: profile } = await admin
        .from("profiles")
        .select("language, country, gender")
        .eq("user_id", targetUserId)
        .single();
      return {
        language: profile?.language || '',
        country: profile?.country || '',
        gender: profile?.gender || '',
      };
    });

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
        .not("following_id", "in", `(${excludeIdStr})`)
        .limit(200);

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
        .not("following_id", "in", `(${excludeIdStr})`)
        .limit(200);

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
        .not("user_id", "in", `(${excludeIdStr})`)
        .limit(200);

      // Count overlapping tags per user
      const tagCounts = new Map<string, number>();
      for (const u of (sameTagUsers || [])) {
        tagCounts.set(u.user_id, (tagCounts.get(u.user_id) || 0) + 1);
      }
      for (const [uid, count] of tagCounts) {
        scoreMap.set(uid, (scoreMap.get(uid) || 0) + count * 20);
      }
    }

    // Signal 4 NEW: People with same interests as the target
    const { data: targetInterests } = await admin
      .from("user_interests")
      .select("interest_id")
      .eq("user_id", targetUserId);

    if (targetInterests && targetInterests.length > 0) {
      const interestIds = targetInterests.map(i => i.interest_id);
      const { data: sameInterestUsers } = await admin
        .from("user_interests")
        .select("user_id")
        .in("interest_id", interestIds)
        .not("user_id", "in", `(${excludeIdStr})`)
        .limit(300);

      const interestCounts = new Map<string, number>();
      for (const u of (sameInterestUsers || [])) {
        interestCounts.set(u.user_id, (interestCounts.get(u.user_id) || 0) + 1);
      }
      for (const [uid, count] of interestCounts) {
        scoreMap.set(uid, (scoreMap.get(uid) || 0) + count * 25);
      }
    }

    // Signal 5 NEW: People who liked same posts as the target (shared taste)
    const { data: targetLikes } = await admin
      .from("likes")
      .select("post_id")
      .eq("user_id", targetUserId)
      .order("created_at", { ascending: false })
      .limit(30);

    if (targetLikes && targetLikes.length > 0) {
      const { data: otherLikers } = await admin
        .from("likes")
        .select("user_id")
        .in("post_id", targetLikes.map(l => l.post_id))
        .neq("user_id", targetUserId)
        .limit(300);

      const likerCounts = new Map<string, number>();
      for (const l of (otherLikers || [])) {
        if (excludeIds.has(l.user_id)) continue;
        likerCounts.set(l.user_id, (likerCounts.get(l.user_id) || 0) + 1);
      }
      for (const [uid, count] of likerCounts) {
        scoreMap.set(uid, (scoreMap.get(uid) || 0) + Math.min(count * 15, 100));
      }
    }

    // Fetch profiles, apply language/country affinity from TARGET user, filter spam/inactive
    const candidateIds = [...scoreMap.keys()];
    if (candidateIds.length === 0) {
      return NextResponse.json({ users: [], hasMore: false, total: 0 });
    }

    const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();

    const [profiles, candidateLocations] = await Promise.all([
      admin
        .from("profiles")
        .select("user_id, name, surname, full_name, username, avatar_url, is_verified, premium_plan, role, bio, follower_count, profile_score, status, account_private, spam_score, last_active_at, language, country, gender")
        .in("user_id", candidateIds)
        .eq("status", "active")
        .lt("spam_score", 30)
        .then(r => r.data || []),
      // Geolocation data for candidates
      admin
        .from("user_locations")
        .select("user_id, country_code, city")
        .in("user_id", candidateIds)
        .then(r => r.data || []),
    ]);

    // Target user's geolocation
    const { data: targetLocations } = await admin
      .from("user_locations")
      .select("country_code, city")
      .eq("user_id", targetUserId)
      .order("created_at", { ascending: false })
      .limit(3);

    const targetCountryCodes = new Set((targetLocations || []).map(l => l.country_code).filter(Boolean));
    const targetCities = new Set((targetLocations || []).map(l => l.city).filter(Boolean));

    // Build candidate location lookup
    const candidateLocMap = new Map<string, { country_code: string; city: string }[]>();
    for (const loc of candidateLocations) {
      if (!candidateLocMap.has(loc.user_id)) candidateLocMap.set(loc.user_id, []);
      candidateLocMap.get(loc.user_id)!.push(loc);
    }

    // Get users who follow me (for "follow back" label)
    let followerSet = new Set<string>();
    if (user) {
      const { data: myFollowers } = await admin
        .from("follows")
        .select("follower_id")
        .eq("following_id", user.id);
      followerSet = new Set((myFollowers || []).map(f => f.follower_id));
    }

    const results = profiles
      .filter(p => {
        if (p.account_private) return false;
        if (p.last_active_at && p.last_active_at < sixtyDaysAgo) return false;
        return true;
      })
      .map(p => {
        let finalScore = scoreMap.get(p.user_id) || 0;

        // Profile quality boost
        finalScore += (p.profile_score || 0) * 0.5;

        // Target user's language/country affinity
        // "Selena Gomez benzeri hesaplar" → prefer accounts from same country/language as Selena
        if (targetProfile.language && p.language === targetProfile.language) {
          finalScore += 60;
        }
        if (targetProfile.country && p.country === targetProfile.country) {
          finalScore += 50;
        }

        // Geolocation match with target
        const candidateLocs = candidateLocMap.get(p.user_id);
        if (candidateLocs) {
          for (const loc of candidateLocs) {
            if (loc.city && targetCities.has(loc.city)) {
              finalScore += 35; // Same city as target
              break;
            }
            if (loc.country_code && targetCountryCodes.has(loc.country_code)) {
              finalScore += 20; // Same country via geolocation
              break;
            }
          }
        }

        // Cross-gender affinity — same as target's gender more relevant for "similar"
        if (targetProfile.gender && p.gender) {
          if (p.gender === targetProfile.gender) finalScore += 20; // Same gender = more "similar"
        }

        // Verified boost
        if (p.is_verified) finalScore += 40;

        // Follower count as quality signal (diminishing)
        finalScore += Math.min((p.follower_count || 0) / 20, 40);

        // Aktif hesap bonusu
        if (p.last_active_at) {
          const hoursAgo = (Date.now() - new Date(p.last_active_at).getTime()) / 3_600_000;
          if (hoursAgo < 6) finalScore += 35;
          else if (hoursAgo < 24) finalScore += 25;
          else if (hoursAgo < 72) finalScore += 10;
        } else {
          finalScore -= 15;
        }

        // Admin always on top
        if ((p as any).role === 'admin') finalScore += 100000;

        return {
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
          _score: finalScore,
        };
      })
      .sort((a, b) => b._score - a._score)
      .slice(0, limit)
      .map(({ _score, ...rest }) => rest);

    return NextResponse.json({
      users: results,
      hasMore: false,
      total: results.length,
    }, {
      headers: { "Cache-Control": "private, max-age=3600, stale-while-revalidate=600" },
    });
  } catch (err) {
    logServerError("[similar] request failed", err, { operation: "similar_suggestions" });
    return NextResponse.json({ users: [], hasMore: false, total: 0 }, { status: 500 });
  }
}
