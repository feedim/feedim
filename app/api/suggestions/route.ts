import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { cached } from "@/lib/cache";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const admin = createAdminClient();
    const { data: { user } } = await supabase.auth.getUser();

    const page = parseInt(req.nextUrl.searchParams.get("page") || "1");
    const requestedLimit = Math.min(
      parseInt(req.nextUrl.searchParams.get("limit") || "20"),
      20
    );
    const offset = (page - 1) * requestedLimit;

    // Require auth for pagination (page > 1)
    if (page > 1 && !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const excludeParamGuest = req.nextUrl.searchParams.get("exclude");

    // ── Guest mode ──
    if (!user) {
      const { data: profiles } = await admin
        .from("profiles")
        .select("user_id, name, surname, full_name, username, avatar_url, is_verified, premium_plan, role, bio, follower_count, following_count, profile_score, account_private")
        .eq("status", "active")
        .neq("account_private", true)
        .order("follower_count", { ascending: false })
        .limit(100);

      const scored = (profiles || [])
        .filter(p => {
          if (excludeParamGuest && p.user_id === excludeParamGuest) return false;
          // Soft exclude: 0/0 accounts with very low profile_score
          const fc = p.follower_count || 0;
          const fgc = p.following_count || 0;
          const ps = p.profile_score || 0;
          if (fc === 0 && fgc === 0 && ps < 20) return false;
          return true;
        })
        .map(p => {
          let score = (p.profile_score || 0) * 1.5;
          if (p.is_verified) score += 50;
          if (p.avatar_url) score += 5;
          score += (p.follower_count || 0) / 10;
          return { ...p, _score: score };
        })
        .sort((a, b) => b._score - a._score);

      const total = scored.length;
      const paginated = scored.slice(offset, offset + requestedLimit).map(({ _score, following_count, ...rest }) => rest);

      return NextResponse.json({
        users: paginated,
        hasMore: total > offset + requestedLimit,
        total,
      }, {
        headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
      });
    }

    // ── Auth mode ──

    const followingIds = await cached(`user:${user.id}:follows`, 120, async () => {
      const { data: follows } = await admin
        .from("follows")
        .select("following_id")
        .eq("follower_id", user.id);
      return (follows || []).map(f => f.following_id);
    });

    const blockedIds = await cached(`user:${user.id}:blocks`, 120, async () => {
      const { data: blocks } = await admin
        .from("blocks")
        .select("blocked_id, blocker_id")
        .or(`blocker_id.eq.${user.id},blocked_id.eq.${user.id}`);
      return new Set(
        (blocks || []).map(b => b.blocker_id === user.id ? b.blocked_id : b.blocker_id)
      );
    });
    const excludeParam = req.nextUrl.searchParams.get("exclude");
    const excludeIds = [user.id, ...followingIds, ...blockedIds];
    if (excludeParam) excludeIds.push(excludeParam);

    const scoreMap = new Map<string, { score: number; mutual_count: number }>();

    // Phase 1: Friends-of-friends
    if (followingIds.length > 0) {
      const { data: fof } = await admin
        .from("follows")
        .select("following_id")
        .in("follower_id", followingIds)
        .not("following_id", "in", `(${excludeIds.join(",")})`);

      (fof || []).forEach(f => {
        const existing = scoreMap.get(f.following_id) || { score: 0, mutual_count: 0 };
        existing.mutual_count += 1;
        existing.score += 100;
        scoreMap.set(f.following_id, existing);
      });
    }

    // Phase 2: Same tag followers
    const { data: tagFollows } = await admin
      .from("tag_follows")
      .select("tag_id")
      .eq("user_id", user.id);

    if (tagFollows && tagFollows.length > 0) {
      const tagIds = tagFollows.map(tf => tf.tag_id);
      const { data: sameTagUsers } = await admin
        .from("tag_follows")
        .select("user_id")
        .in("tag_id", tagIds)
        .not("user_id", "in", `(${excludeIds.join(",")})`)
        .limit(200);

      (sameTagUsers || []).forEach(u => {
        const existing = scoreMap.get(u.user_id) || { score: 0, mutual_count: 0 };
        existing.score += 30;
        scoreMap.set(u.user_id, existing);
      });
    }

    // Phase 3: Profile score boost for Phase 1-2 candidates
    const candidateIds = [...scoreMap.keys()];
    if (candidateIds.length > 0) {
      const { data: candidateProfiles } = await admin
        .from("profiles")
        .select("user_id, profile_score, is_verified, premium_plan, role")
        .in("user_id", candidateIds);

      (candidateProfiles || []).forEach(p => {
        const existing = scoreMap.get(p.user_id);
        if (!existing) return;
        existing.score += (p.profile_score || 0) * 1.5;
        if (p.is_verified) existing.score += 50;
        if (p.premium_plan) existing.score += 20;
      });
    }

    // Phase 4: Popular backfill
    const { data: popular } = await admin
      .from("profiles")
      .select("user_id, follower_count, profile_score, is_verified, premium_plan, role")
      .eq("status", "active")
      .not("user_id", "in", `(${excludeIds.join(",")})`)
      .order("follower_count", { ascending: false })
      .limit(100);

    (popular || []).forEach(u => {
      if (!scoreMap.has(u.user_id)) {
        scoreMap.set(u.user_id, {
          score: (u.follower_count || 0) / 10 + (u.profile_score || 0),
          mutual_count: 0,
        });
      } else {
        const existing = scoreMap.get(u.user_id)!;
        existing.score += (u.follower_count || 0) / 20;
      }
    });

    // ── Fetch full profiles ──
    const allCandidateIds = [...scoreMap.keys()];
    const profileMap = new Map<string, {
      user_id: string;
      name?: string;
      surname?: string;
      full_name?: string;
      username: string;
      avatar_url?: string;
      is_verified?: boolean;
      premium_plan?: string | null;
      bio?: string;
      follower_count?: number;
      following_count?: number;
      profile_score?: number;
      status?: string;
      account_private?: boolean;
    }>();

    if (allCandidateIds.length > 0) {
      const { data: allProfiles } = await admin
        .from("profiles")
        .select("user_id, name, surname, full_name, username, avatar_url, is_verified, premium_plan, role, bio, follower_count, following_count, profile_score, status, account_private")
        .in("user_id", allCandidateIds);

      (allProfiles || []).forEach(p => profileMap.set(p.user_id, p));
    }

    // ── Apply filters ──
    const filtered: [string, { score: number; mutual_count: number }][] = [];

    for (const [id, info] of scoreMap.entries()) {
      if (id === user.id) continue; // Never suggest self
      const profile = profileMap.get(id);
      if (!profile) continue;
      if (profile.status !== "active") continue;
      if (profile.account_private) continue;

      // Soft exclude: 0/0 accounts with low profile_score
      const fc = profile.follower_count || 0;
      const fgc = profile.following_count || 0;
      const ps = profile.profile_score || 0;
      if (fc === 0 && fgc === 0 && ps < 20) continue;

      filtered.push([id, info]);
    }

    // Sort and cap
    const MAX_TOTAL = 60;
    const sorted = filtered
      .sort((a, b) => b[1].score - a[1].score)
      .slice(0, MAX_TOTAL);

    const total = sorted.length;
    const paginatedEntries = sorted.slice(offset, offset + requestedLimit);
    const paginatedIds = paginatedEntries.map(([id]) => id);

    if (paginatedIds.length === 0) {
      return NextResponse.json({ users: [], hasMore: false, total: 0 });
    }

    const suggestions = paginatedIds
      .map(id => {
        const p = profileMap.get(id);
        const info = scoreMap.get(id);
        return p ? {
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
          mutual_count: info?.mutual_count || 0,
        } : null;
      })
      .filter(Boolean);

    return NextResponse.json({
      users: suggestions,
      hasMore: total > offset + requestedLimit,
      total,
    }, {
      headers: { "Cache-Control": "private, max-age=60" },
    });
  } catch (err) {
    if (process.env.NODE_ENV === "development") console.error("[suggestions] Error:", err);
    return NextResponse.json({ users: [], hasMore: false, total: 0 }, { status: 500 });
  }
}
