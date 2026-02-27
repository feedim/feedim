import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { cached } from "@/lib/cache";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const admin = createAdminClient();
    const { data: { user } } = await supabase.auth.getUser();

    const locale = req.cookies.get("fdm-locale")?.value || req.headers.get("x-locale") || "tr";

    const page = parseInt(req.nextUrl.searchParams.get("page") || "1");
    const requestedLimit = Math.min(
      parseInt(req.nextUrl.searchParams.get("limit") || "10"),
      20
    );
    const offset = (page - 1) * requestedLimit;

    // Require auth for pagination (page > 1)
    if (page > 1 && !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const excludeParamGuest = req.nextUrl.searchParams.get("exclude");
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();

    // ── Guest mode ──
    if (!user) {
      const { data: profiles } = await admin
        .from("profiles")
        .select("user_id, name, surname, full_name, username, avatar_url, is_verified, premium_plan, role, bio, follower_count, following_count, profile_score, account_private, language, spam_score, last_active_at")
        .eq("status", "active")
        .neq("account_private", true)
        .lt("spam_score", 30)
        .gte("last_active_at", thirtyDaysAgo)
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
          // Language bonus
          if (p.language === locale) score += 40;
          return { ...p, _score: score };
        })
        .sort((a, b) => b._score - a._score);

      const total = scored.length;
      const paginated = scored.slice(offset, offset + requestedLimit).map(({ _score, following_count, language, spam_score, last_active_at, ...rest }) => rest);

      return NextResponse.json({
        users: paginated,
        hasMore: total > offset + requestedLimit,
        total,
      }, {
        headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
      });
    }

    // ── Auth mode ──

    // Phase 0: Fetch current user's language and location
    const userMeta = await cached(`user:${user.id}:meta`, 300, async () => {
      const { data: profile } = await admin
        .from("profiles")
        .select("language")
        .eq("user_id", user.id)
        .single();

      const { data: locations } = await admin
        .from("user_locations")
        .select("country, city")
        .eq("user_id", user.id)
        .limit(5);

      return {
        language: profile?.language || locale,
        locations: locations || [],
      };
    });

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
    // Users who follow me (for "follow back" label)
    const followerIds = await cached(`user:${user.id}:followers`, 120, async () => {
      const { data: followers } = await admin
        .from("follows")
        .select("follower_id")
        .eq("following_id", user.id);
      return new Set((followers || []).map(f => f.follower_id));
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
        .select("user_id, profile_score, is_verified, premium_plan, role, spam_score, last_active_at, language")
        .in("user_id", candidateIds);

      (candidateProfiles || []).forEach(p => {
        const existing = scoreMap.get(p.user_id);
        if (!existing) return;
        existing.score += (p.profile_score || 0) * 1.5;
        if (p.is_verified) existing.score += 50;
        if (p.premium_plan) existing.score += 20;
        // Spam penalty
        if ((p.spam_score || 0) >= 30) existing.score -= 200;
        // Phase 2.5: Language bonus
        if (p.language === userMeta.language) existing.score += 35;
      });
    }

    // Phase 2.7: Location bonus for candidates
    if (userMeta.locations.length > 0 && candidateIds.length > 0) {
      const { data: candidateLocations } = await admin
        .from("user_locations")
        .select("user_id, country, city")
        .in("user_id", candidateIds);

      if (candidateLocations && candidateLocations.length > 0) {
        const userCountries = new Set(userMeta.locations.map((l: { country: string }) => l.country));
        const userCities = new Set(userMeta.locations.map((l: { city: string }) => l.city).filter(Boolean));

        candidateLocations.forEach(loc => {
          const existing = scoreMap.get(loc.user_id);
          if (!existing) return;
          if (userCountries.has(loc.country)) existing.score += 20;
          if (loc.city && userCities.has(loc.city)) existing.score += 15;
        });
      }
    }

    // Phase 4: Popular backfill
    const { data: popular } = await admin
      .from("profiles")
      .select("user_id, follower_count, profile_score, is_verified, premium_plan, role, spam_score, last_active_at, language")
      .eq("status", "active")
      .lt("spam_score", 30)
      .not("user_id", "in", `(${excludeIds.join(",")})`)
      .order("follower_count", { ascending: false })
      .limit(100);

    (popular || []).forEach(u => {
      if (!scoreMap.has(u.user_id)) {
        let score = (u.follower_count || 0) / 10 + (u.profile_score || 0);
        // Language bonus for backfill
        if (u.language === userMeta.language) score += 35;
        scoreMap.set(u.user_id, {
          score,
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
      spam_score?: number;
      last_active_at?: string;
    }>();

    if (allCandidateIds.length > 0) {
      const { data: allProfiles } = await admin
        .from("profiles")
        .select("user_id, name, surname, full_name, username, avatar_url, is_verified, premium_plan, role, bio, follower_count, following_count, profile_score, status, account_private, spam_score, last_active_at")
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

      // Hard exclude: spam accounts
      if ((profile.spam_score || 0) >= 30) continue;

      // Hard exclude: inactive accounts (60+ days)
      if (profile.last_active_at && profile.last_active_at < sixtyDaysAgo) continue;

      // Soft exclude: 0/0 accounts with low profile_score
      const fc = profile.follower_count || 0;
      const fgc = profile.following_count || 0;
      const ps = profile.profile_score || 0;
      if (fc === 0 && fgc === 0 && ps < 20) continue;

      filtered.push([id, info]);
    }

    // Sort and cap
    const MAX_TOTAL = 80;
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
          follows_me: followerIds.has(p.user_id),
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
