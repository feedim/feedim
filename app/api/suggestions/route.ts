import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { cached } from "@/lib/cache";
import { safePage } from "@/lib/utils";
import { getTranslations } from "next-intl/server";
import { logServerError } from "@/lib/runtimeLogger";

// In-memory rate limit: max 10 requests per user per hour
const suggestionsRateLimit = new Map<string, number[]>();
const SUGGESTIONS_RATE_WINDOW = 60 * 60 * 1000; // 1 hour
const SUGGESTIONS_RATE_MAX = 10;
const MAX_PAGE = 2; // Hard cap: max 2 pages (20 suggestions total)
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

    const locale = req.cookies.get("fdm-locale")?.value || req.headers.get("x-locale") || "tr";

    const page = Math.min(safePage(req.nextUrl.searchParams.get("page")), MAX_PAGE);
    const requestedLimit = Math.min(
      parseInt(req.nextUrl.searchParams.get("limit") || "10"),
      20
    );
    const offset = (page - 1) * requestedLimit;

    // Require auth for pagination (page > 1)
    if (page > 1 && !user) {
      return NextResponse.json({ error: tErrors("unauthorized") }, { status: 401 });
    }

    // Rate limit: prevent bot abuse on suggestions endpoint
    if (user) {
      const now = Date.now();
      const timestamps = (suggestionsRateLimit.get(user.id) || []).filter(t => now - t < SUGGESTIONS_RATE_WINDOW);
      if (timestamps.length >= SUGGESTIONS_RATE_MAX) {
        return NextResponse.json({ users: [], hasMore: false }, { status: 200 });
      }
      timestamps.push(now);
      suggestionsRateLimit.set(user.id, timestamps);
    }

    const excludeParamGuest = req.nextUrl.searchParams.get("exclude");
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();

    // ── Guest mode ──
    if (!user) {
      const { data: profiles } = await admin
        .from("profiles")
        .select("user_id, name, surname, full_name, username, avatar_url, is_verified, premium_plan, role, bio, follower_count, following_count, profile_score, account_private, language, country, spam_score, last_active_at")
        .eq("status", "active")
        .neq("account_private", true)
        .lt("spam_score", 30)
        .gte("last_active_at", thirtyDaysAgo)
        .order("follower_count", { ascending: false })
        .limit(100);

      const scored = (profiles || [])
        .filter(p => {
          if (excludeParamGuest && p.user_id === excludeParamGuest) return false;
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
          if (p.language === locale) score += 40;
          if (p.role === 'admin') score += 100000;
          return { ...p, _score: score };
        })
        .sort((a, b) => b._score - a._score);

      const total = scored.length;
      const paginated = scored.slice(offset, offset + requestedLimit).map(({ _score, following_count, language, country, spam_score, last_active_at, ...rest }) => rest);

      return NextResponse.json({
        users: paginated,
        hasMore: total > offset + requestedLimit,
        total,
      }, {
        headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=600" },
      });
    }

    // ── Auth mode — collect every data signal we have ──

    const [
      userMeta, followingIds, blockedIds, followerIds,
      userInterestIds, likedPostLikers, savedPostSavers, profileVisitors,
    ] = await Promise.all([
      // User's full profile + location data
      cached(`user:${user.id}:suggestion-meta-v2`, 300, async () => {
        const { data: profile } = await admin
          .from("profiles")
          .select("language, country, gender, birth_date")
          .eq("user_id", user.id)
          .single();

        const { data: locations } = await admin
          .from("user_locations")
          .select("country_code, city, region")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(5);

        // Compute age from birth_date
        let age: number | undefined;
        if (profile?.birth_date) {
          age = Math.floor((Date.now() - new Date(profile.birth_date).getTime()) / (365.25 * 24 * 3600_000));
        }

        return {
          language: profile?.language || locale,
          country: profile?.country || '',
          gender: profile?.gender || '',
          age,
          locations: locations || [],
          // Derive country from geolocation if profiles.country empty
          geoCountry: (locations && locations.length > 0) ? locations[0].country_code : '',
        };
      }),

      cached(`user:${user.id}:follows`, 120, async () => {
        const { data: follows } = await admin
          .from("follows")
          .select("following_id")
          .eq("follower_id", user.id);
        return (follows || []).map(f => f.following_id);
      }),

      cached(`user:${user.id}:blocks`, 120, async () => {
        const { data: blocks } = await admin
          .from("blocks")
          .select("blocked_id, blocker_id")
          .or(`blocker_id.eq.${user.id},blocked_id.eq.${user.id}`);
        return new Set(
          (blocks || []).map(b => b.blocker_id === user.id ? b.blocked_id : b.blocker_id)
        );
      }),

      cached(`user:${user.id}:followers`, 120, async () => {
        const { data: followers } = await admin
          .from("follows")
          .select("follower_id")
          .eq("following_id", user.id);
        return new Set((followers || []).map(f => f.follower_id));
      }),

      // User interests
      cached(`user:${user.id}:interests`, 300, async () => {
        const { data: interests } = await admin
          .from("user_interests")
          .select("interest_id")
          .eq("user_id", user.id);
        return (interests || []).map((i: { interest_id: number }) => i.interest_id);
      }),

      // People who liked posts I liked (shared taste)
      cached(`user:${user.id}:liked-post-likers`, 600, async () => {
        const { data: myLikes } = await admin
          .from("likes")
          .select("post_id")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(50);
        if (!myLikes || myLikes.length === 0) return new Map<string, number>();

        const { data: otherLikes } = await admin
          .from("likes")
          .select("user_id")
          .in("post_id", myLikes.map(l => l.post_id))
          .neq("user_id", user.id)
          .limit(200);

        const likerCounts = new Map<string, number>();
        for (const l of (otherLikes || [])) {
          likerCounts.set(l.user_id, (likerCounts.get(l.user_id) || 0) + 1);
        }
        return likerCounts;
      }),

      // People who saved same posts as me (even stronger taste signal)
      cached(`user:${user.id}:saved-post-savers`, 600, async () => {
        const { data: mySaves } = await admin
          .from("bookmarks")
          .select("post_id")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(30);
        if (!mySaves || mySaves.length === 0) return new Map<string, number>();

        const { data: otherSavers } = await admin
          .from("bookmarks")
          .select("user_id")
          .in("post_id", mySaves.map(s => s.post_id))
          .neq("user_id", user.id)
          .limit(300);

        const saverCounts = new Map<string, number>();
        for (const s of (otherSavers || [])) {
          saverCounts.set(s.user_id, (saverCounts.get(s.user_id) || 0) + 1);
        }
        return saverCounts;
      }),

      // People who visited my profile (interested in me but didn't follow)
      cached(`user:${user.id}:profile-visitors`, 600, async () => {
        const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
        const { data: visitors } = await admin
          .from("profile_visits")
          .select("visitor_id")
          .eq("visited_id", user.id)
          .gte("created_at", fourteenDaysAgo)
          .limit(100);
        return new Set((visitors || []).map(v => v.visitor_id));
      }),
    ]);

    const effectiveCountry = userMeta?.country || userMeta?.geoCountry || '';
    const excludeParam = req.nextUrl.searchParams.get("exclude");
    const excludeIds = [user.id, ...followingIds, ...(blockedIds || [])];
    if (excludeParam) excludeIds.push(excludeParam);
    // Cap exclude list to prevent PostgREST URI-too-long (414) errors
    const excludeIdsForQuery = excludeIds.slice(0, MAX_EXCLUDE_IDS);
    const excludeIdStr = excludeIdsForQuery.join(",");
    const excludeSet = new Set(excludeIds);

    const scoreMap = new Map<string, { score: number; mutual_count: number }>();

    // ── Signal 1: Friends-of-friends (strongest social proof) ──
    if (followingIds.length > 0) {
      const { data: fof } = await admin
        .from("follows")
        .select("following_id")
        .in("follower_id", followingIds)
        .not("following_id", "in", `(${excludeIdStr})`);

      (fof || []).forEach(f => {
        const existing = scoreMap.get(f.following_id) || { score: 0, mutual_count: 0 };
        existing.mutual_count += 1;
        existing.score += 100; // 100 per mutual connection
        scoreMap.set(f.following_id, existing);
      });
    }

    // ── Signal 2: Same tag followers ──
    const { data: tagFollows } = await admin
      .from("tag_follows")
      .select("tag_id")
      .eq("user_id", user.id);

    if (tagFollows && tagFollows.length > 0) {
      const tagIds = tagFollows.map(tf => tf.tag_id);
      const { data: sameTagUsers } = await admin
        .from("tag_follows")
        .select("user_id, tag_id")
        .in("tag_id", tagIds)
        .not("user_id", "in", `(${excludeIdStr})`)
        .limit(300);

      // Count overlapping tags per user
      const tagCounts = new Map<string, number>();
      for (const u of (sameTagUsers || [])) {
        tagCounts.set(u.user_id, (tagCounts.get(u.user_id) || 0) + 1);
      }
      for (const [uid, count] of tagCounts) {
        const existing = scoreMap.get(uid) || { score: 0, mutual_count: 0 };
        existing.score += count * 30; // 30 per shared tag
        scoreMap.set(uid, existing);
      }
    }

    // ── Signal 3: Same interest followers ──
    if (userInterestIds.length > 0) {
      const { data: sameInterestUsers } = await admin
        .from("user_interests")
        .select("user_id, interest_id")
        .in("interest_id", userInterestIds)
        .not("user_id", "in", `(${excludeIdStr})`)
        .limit(300);

      const interestCounts = new Map<string, number>();
      for (const u of (sameInterestUsers || [])) {
        interestCounts.set(u.user_id, (interestCounts.get(u.user_id) || 0) + 1);
      }
      for (const [uid, count] of interestCounts) {
        const existing = scoreMap.get(uid) || { score: 0, mutual_count: 0 };
        existing.score += count * 40; // 40 per shared interest
        scoreMap.set(uid, existing);
      }
    }

    // ── Signal 4: Shared taste — people who liked same posts ──
    if (likedPostLikers && likedPostLikers.size > 0) {
      for (const [uid, sharedCount] of likedPostLikers) {
        if (excludeSet.has(uid)) continue;
        const existing = scoreMap.get(uid) || { score: 0, mutual_count: 0 };
        existing.score += Math.min(sharedCount * 25, 150);
        scoreMap.set(uid, existing);
      }
    }

    // ── Signal 5: Shared saves — people who saved same posts (stronger than likes) ──
    if (savedPostSavers && savedPostSavers.size > 0) {
      for (const [uid, sharedCount] of savedPostSavers) {
        if (excludeSet.has(uid)) continue;
        const existing = scoreMap.get(uid) || { score: 0, mutual_count: 0 };
        existing.score += Math.min(sharedCount * 35, 180); // Saves = deeper interest
        scoreMap.set(uid, existing);
      }
    }

    // ── Signal 6: Profile visitors (they showed interest in me) ──
    if (profileVisitors && profileVisitors.size > 0) {
      for (const visitorId of profileVisitors) {
        if (excludeSet.has(visitorId)) continue;
        const existing = scoreMap.get(visitorId) || { score: 0, mutual_count: 0 };
        existing.score += 45; // They already know me — high conversion
        scoreMap.set(visitorId, existing);
      }
    }

    // ── Enrichment: Profile quality + demographics for all candidates ──
    const candidateIds = [...scoreMap.keys()];
    if (candidateIds.length > 0) {
      const [candidateProfiles, candidateLocations] = await Promise.all([
        admin
          .from("profiles")
          .select("user_id, profile_score, is_verified, premium_plan, role, spam_score, last_active_at, language, country, gender, birth_date, follower_count")
          .in("user_id", candidateIds)
          .then(r => r.data || []),
        // Geolocation data for candidates
        admin
          .from("user_locations")
          .select("user_id, country_code, city, region")
          .in("user_id", candidateIds)
          .then(r => r.data || []),
      ]);

      // Build location lookup
      const candidateLocationMap = new Map<string, { country_code: string; city: string; region: string }[]>();
      for (const loc of candidateLocations) {
        if (!candidateLocationMap.has(loc.user_id)) candidateLocationMap.set(loc.user_id, []);
        candidateLocationMap.get(loc.user_id)!.push(loc);
      }

      // User's geo data sets
      const locations = userMeta?.locations || [];
      const userCountryCodes = new Set(locations.map((l: any) => l.country_code).filter(Boolean));
      const userCities = new Set(locations.map((l: any) => l.city).filter(Boolean));
      const userRegions = new Set(locations.map((l: any) => l.region).filter(Boolean));

      for (const p of candidateProfiles) {
        const existing = scoreMap.get(p.user_id);
        if (!existing) continue;

        // Profile quality
        existing.score += (p.profile_score || 0) * 1.5;
        if (p.is_verified) existing.score += 50;
        if (p.premium_plan) existing.score += 20;

        // Spam penalty
        if ((p.spam_score || 0) >= 30) existing.score -= 200;

        // Language match (strong signal)
        if (p.language && userMeta?.language && p.language === userMeta.language) existing.score += 50;

        // Country match (from profiles.country)
        if (p.country && effectiveCountry && p.country === effectiveCountry) existing.score += 40;

        // Follower count as quality signal (diminishing returns)
        existing.score += Math.min((p.follower_count || 0) / 20, 50);

        // Aktif hesap bonusu — çok aktif olanlar çok daha iyi öneriler
        if (p.last_active_at) {
          const hoursAgo = (Date.now() - new Date(p.last_active_at).getTime()) / 3_600_000;
          if (hoursAgo < 1) existing.score += 50;        // Online now
          else if (hoursAgo < 6) existing.score += 40;   // Very recent
          else if (hoursAgo < 24) existing.score += 30;  // Today
          else if (hoursAgo < 72) existing.score += 15;  // Last 3 days
          else if (hoursAgo < 168) existing.score += 5;  // Last week
          // 7+ days: no bonus (stale accounts)
        } else {
          existing.score -= 20; // No activity data = penalty
        }

        // Cross-gender affinity — suggest opposite gender more
        if (userMeta?.gender && p.gender) {
          if (p.gender !== userMeta.gender) {
            existing.score += 30; // Opposite gender = higher priority
          } else {
            existing.score += 10; // Same gender = slight boost
          }
        }

        // Age proximity — people in similar age range
        if (userMeta?.age && p.birth_date) {
          const candidateAge = Math.floor((Date.now() - new Date(p.birth_date).getTime()) / (365.25 * 24 * 3600_000));
          const ageDiff = Math.abs(userMeta.age - candidateAge);
          if (ageDiff <= 5) existing.score += 25;       // Same age group
          else if (ageDiff <= 10) existing.score += 10;  // Close range
        }

        // Geolocation match (browser-level precision)
        const candidateLocs = candidateLocationMap.get(p.user_id);
        if (candidateLocs) {
          for (const loc of candidateLocs) {
            if (loc.city && userCities.has(loc.city)) {
              existing.score += 35; // Same city = very relevant
              break; // Only count once
            }
            if (loc.region && userRegions.has(loc.region)) {
              existing.score += 20; // Same region
              break;
            }
            if (loc.country_code && userCountryCodes.has(loc.country_code)) {
              existing.score += 15; // Same country via geolocation
              break;
            }
          }
        }
      }
    }

    // ── Phase 4: Country-aware popular backfill ──
    const userLocations = userMeta?.locations || [];
    const backfillCountry = effectiveCountry || (userLocations.length > 0 ? (userLocations[0] as any).country_code : '');

    const [popularSameCountry, popularGlobal] = await Promise.all([
      backfillCountry
        ? admin
            .from("profiles")
            .select("user_id, follower_count, profile_score, is_verified, premium_plan, role, spam_score, last_active_at, language, country")
            .eq("status", "active")
            .eq("country", backfillCountry)
            .lt("spam_score", 30)
            .not("user_id", "in", `(${excludeIdStr})`)
            .order("follower_count", { ascending: false })
            .limit(50)
            .then(r => r.data || [])
        : Promise.resolve([]),
      admin
        .from("profiles")
        .select("user_id, follower_count, profile_score, is_verified, premium_plan, role, spam_score, last_active_at, language, country")
        .eq("status", "active")
        .lt("spam_score", 30)
        .not("user_id", "in", `(${excludeIdStr})`)
        .order("follower_count", { ascending: false })
        .limit(100)
        .then(r => r.data || []),
    ]);

    const processedPopular = new Set<string>();
    for (const u of popularSameCountry) {
      if (processedPopular.has(u.user_id)) continue;
      processedPopular.add(u.user_id);
      if (!scoreMap.has(u.user_id)) {
        let score = (u.follower_count || 0) / 10 + (u.profile_score || 0);
        score += 60; // Same country bonus
        if (userMeta?.language && u.language === userMeta.language) score += 35;
        if (u.is_verified) score += 30;
        scoreMap.set(u.user_id, { score, mutual_count: 0 });
      }
    }

    for (const u of popularGlobal) {
      if (processedPopular.has(u.user_id)) continue;
      processedPopular.add(u.user_id);
      if (!scoreMap.has(u.user_id)) {
        let score = (u.follower_count || 0) / 10 + (u.profile_score || 0);
        if (userMeta?.language && u.language === userMeta.language) score += 35;
        if (u.country && effectiveCountry && u.country === effectiveCountry) score += 40;
        scoreMap.set(u.user_id, { score, mutual_count: 0 });
      } else {
        const existing = scoreMap.get(u.user_id)!;
        existing.score += (u.follower_count || 0) / 20;
      }
    }

    // ── Fetch full profiles ──
    const allCandidateIds = [...scoreMap.keys()];
    const profileMap = new Map<string, any>();

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
      if (id === user.id) continue;
      const profile = profileMap.get(id);
      if (!profile) continue;
      if (profile.status !== "active") continue;
      if (profile.account_private) continue;
      if ((profile.spam_score || 0) >= 30) continue;
      if (profile.last_active_at && profile.last_active_at < sixtyDaysAgo) continue;

      const fc = profile.follower_count || 0;
      const fgc = profile.following_count || 0;
      const ps = profile.profile_score || 0;
      if (fc === 0 && fgc === 0 && ps < 20) continue;

      filtered.push([id, info]);
    }

    // Admin users always on top
    for (const [id, info] of filtered) {
      const profile = profileMap.get(id);
      if (profile?.role === 'admin') info.score += 100000;
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
          role: p.role,
          bio: p.bio,
          follower_count: p.follower_count,
          mutual_count: info?.mutual_count || 0,
          follows_me: followerIds?.has(p.user_id) || false,
        } : null;
      })
      .filter(Boolean);

    return NextResponse.json({
      users: suggestions,
      hasMore: total > offset + requestedLimit,
      total,
    }, {
      headers: { "Cache-Control": "private, max-age=3600, stale-while-revalidate=600" },
    });
  } catch (err) {
    logServerError("[suggestions] request failed", err, { operation: "suggestions" });
    return NextResponse.json({ users: [], hasMore: false, total: 0 }, { status: 500 });
  }
}
