import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { MOMENT_PAGE_SIZE } from "@/lib/constants";
import { cached } from "@/lib/cache";
import { safeError } from "@/lib/apiError";
import { getTranslations } from "next-intl/server";
import {
  computeFeedScore,
  enforceDiversity,
  type FeedCandidate,
  type FeedContext,
} from "@/lib/feedAlgorithm";
import { getViewerAffinity } from "@/lib/viewerAffinity";
import { attachViewerPostInteractions } from "@/lib/postViewerInteractions";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || String(MOMENT_PAGE_SIZE)), 20);
    const excludeParam = searchParams.get("exclude");
    const excludeIds = excludeParam
      ? new Set(excludeParam.split(",").map(Number).filter(n => !isNaN(n)).slice(0, 200))
      : new Set<number>();

    const admin = createAdminClient();

    // Get user for NSFW/block filtering
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Check staff role for NSFW visibility
    let isStaff = false;
    if (user) {
      const { data: userProfile } = await admin.from('profiles').select('role').eq('user_id', user.id).single();
      isStaff = userProfile?.role === 'admin' || userProfile?.role === 'moderator';
    }

    // Cached user data (parallel)
    const [blockedIds, followedUserIds, likedAuthorIds, viewerAffinity, likedTagIds, trendingTagIds, userInterestIds] = await Promise.all([
      user ? cached(`user:${user.id}:blocks`, 30, async () => {
        const { data: blocks } = await admin
          .from("blocks")
          .select("blocked_id, blocker_id")
          .or(`blocker_id.eq.${user.id},blocked_id.eq.${user.id}`);
        return new Set((blocks || []).map(b => b.blocker_id === user.id ? b.blocked_id : b.blocker_id));
      }) : Promise.resolve(new Set<string>()),

      user ? cached(`user:${user.id}:follows`, 30, async () => {
        const { data: follows } = await admin
          .from("follows")
          .select("following_id")
          .eq("follower_id", user.id);
        return (follows || []).map(f => f.following_id);
      }) : Promise.resolve([] as string[]),

      user ? cached(`user:${user.id}:liked-authors`, 600, async () => {
        const { data: recentLikes } = await admin
          .from("likes")
          .select("post_id")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(50);
        if (!recentLikes || recentLikes.length === 0) return new Set<string>();
        const { data: likedPosts } = await admin
          .from("posts")
          .select("author_id")
          .in("id", recentLikes.map(l => l.post_id));
        return new Set((likedPosts || []).map(p => p.author_id));
      }) : Promise.resolve(new Set<string>()),

      getViewerAffinity(req, admin, user?.id),

      user ? cached(`user:${user.id}:liked-tags`, 600, async () => {
        const { data: recentLikes } = await admin
          .from("likes")
          .select("post_id")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(100);
        if (!recentLikes || recentLikes.length === 0) return new Set<number>();
        const { data: likedPostTags } = await admin
          .from("post_tags")
          .select("tag_id")
          .in("post_id", recentLikes.map(l => l.post_id));
        return new Set((likedPostTags || []).map((pt: { tag_id: number }) => pt.tag_id));
      }) : Promise.resolve(new Set<number>()),

      cached("trending-tag-ids", 300, async () => {
        const res = await admin
          .from("tags")
          .select("id")
          .gt("trending_score", 50)
          .order("trending_score", { ascending: false })
          .limit(30);
        return new Set((res.data || []).map((t: { id: number }) => t.id));
      }),

      user ? cached(`user:${user.id}:interests`, 300, async () => {
        const { data: interests } = await admin
          .from("user_interests")
          .select("interest_id")
          .eq("user_id", user.id);
        return new Set((interests || []).map((i: { interest_id: number }) => i.interest_id));
      }) : Promise.resolve(new Set<number>()),
    ]);

    const followedUserIdSet = new Set(followedUserIds.filter(id => !blockedIds.has(id)));
    const cutoff30d = new Date(Date.now() - 30 * 24 * 3600_000).toISOString();
    const candidateFields = "id, author_id, content_type, published_at, trending_score, quality_score, spam_score, like_count, comment_count, save_count, share_count, view_count, is_nsfw, status";

    // 10% followed, 90% discovery — large pool for variety
    const poolSize = 300;
    const followedLimit = Math.round(poolSize * 0.10);
    const discoveryLimit = poolSize - followedLimit;

    // Fetch candidates (parallel)
    const excludeAuthors = user ? [user.id, ...followedUserIds] : [];
    const countryDiscoveryLimit = viewerAffinity.country
      ? Math.min(Math.ceil(discoveryLimit * 0.45), 120)
      : 0;

    const [followedMoments, countryDiscoveryMoments, discoveryMoments] = await Promise.all([
      // Source 1: Followed users' moments
      followedUserIds.length > 0
        ? admin
            .from("posts")
            .select(candidateFields)
            .in("author_id", followedUserIds)
            .eq("content_type", "moment")
            .in("status", ["published", "moderation"])
            .gte("published_at", cutoff30d)
            .order("published_at", { ascending: false })
            .limit(followedLimit)
            .then(r => (r.data || []).map((p: any) => ({ ...p, source: "followed" as const })))
        : Promise.resolve([]),

      // Source 2: Same-country discovery moments
      (() => {
        if (!viewerAffinity.country || countryDiscoveryLimit <= 0) {
          return Promise.resolve([]);
        }
        return admin
          .from("profiles")
          .select("user_id, follower_count")
          .eq("status", "active")
          .eq("country", viewerAffinity.country)
          .order("follower_count", { ascending: false })
          .limit(80)
          .then(async (res) => {
            const countryAuthorIds = (res.data || [])
              .map((profile) => profile.user_id)
              .filter((authorId: string) => !excludeAuthors.includes(authorId));
            if (countryAuthorIds.length === 0) return [];

            const { data } = await admin
              .from("posts")
              .select(candidateFields)
              .in("author_id", countryAuthorIds)
              .eq("content_type", "moment")
              .eq("status", "published")
              .or("is_nsfw.eq.false,is_nsfw.is.null")
              .gte("published_at", cutoff30d)
              .order("trending_score", { ascending: false })
              .limit(countryDiscoveryLimit);

            return (data || []).map((post) => ({ ...post, source: "discovery" as const }));
          });
      })(),

      // Source 3: Global discovery moments
      (() => {
        let q = admin
          .from("posts")
          .select(candidateFields)
          .eq("content_type", "moment")
          .eq("status", "published")
          .or("is_nsfw.eq.false,is_nsfw.is.null")
          .gte("published_at", cutoff30d)
          .order("trending_score", { ascending: false })
          .limit(discoveryLimit);
        if (excludeAuthors.length > 0) {
          q = q.not("author_id", "in", `(${excludeAuthors.join(",")})`);
        }
        return q.then(r => (r.data || []).map((p: any) => ({ ...p, source: "discovery" as const })));
      })(),
    ]);

    // Dedupe + filter
    const map = new Map<number, FeedCandidate>();
    for (const p of [...followedMoments, ...countryDiscoveryMoments, ...discoveryMoments]) {
      if (!map.has(p.id)) map.set(p.id, p as FeedCandidate);
    }
    const candidates = Array.from(map.values()).filter(c => {
      if (blockedIds.has(c.author_id)) return false;
      if (c.is_nsfw && c.author_id !== user?.id && !isStaff) return false;
      if (c.status === "moderation" && c.author_id !== user?.id && !isStaff) return false;
      return true;
    });

    if (candidates.length === 0) {
      return NextResponse.json({ moments: [], hasMore: false });
    }

    // Enrichment (parallel)
    const candidateIds = candidates.map(c => c.id);
    const authorIds = [...new Set(candidates.map(c => c.author_id))];

    const [authorProfiles, postTagMappings, postInterestMappings] = await Promise.all([
      admin
        .from("profiles")
        .select("user_id, profile_score, is_verified, follower_count, language, country")
        .in("user_id", authorIds)
        .then(r => {
          const m = new Map<string, any>();
          for (const p of (r.data || [])) m.set(p.user_id, p);
          return m;
        }),

      (likedTagIds.size > 0 || trendingTagIds.size > 0)
        ? admin
            .from("post_tags")
            .select("post_id, tag_id")
            .in("post_id", candidateIds)
            .then(r => {
              const m = new Map<number, number[]>();
              for (const pt of (r.data || [])) {
                if (!m.has(pt.post_id)) m.set(pt.post_id, []);
                m.get(pt.post_id)!.push(pt.tag_id);
              }
              return m;
            })
        : Promise.resolve(new Map<number, number[]>()),

      userInterestIds.size > 0
        ? admin
            .from("post_interests")
            .select("post_id, interest_id")
            .in("post_id", candidateIds)
            .then(r => {
              const m = new Map<number, number[]>();
              for (const pi of (r.data || [])) {
                if (!m.has(pi.post_id)) m.set(pi.post_id, []);
                m.get(pi.post_id)!.push(pi.interest_id);
              }
              return m;
            })
        : Promise.resolve(new Map<number, number[]>()),
    ]);

    for (const c of candidates) {
      const profile = authorProfiles.get(c.author_id);
      if (profile) {
        c.author_profile_score = profile.profile_score || 0;
        c.author_is_verified = profile.is_verified || false;
        c.author_follower_count = profile.follower_count || 0;
        c.author_language = profile.language || undefined;
        c.author_country = profile.country || undefined;
      }

      const pTags = postTagMappings.get(c.id) || [];
      c.matched_tag_count = 0;
      c.matched_liked_tag_count = likedTagIds.size > 0 ? pTags.filter(tid => likedTagIds.has(tid)).length : 0;
      c.has_trending_tag = pTags.some(tid => trendingTagIds.has(tid));

      const pInterests = postInterestMappings.get(c.id) || [];
      c.matched_interest_count = pInterests.filter(iid => userInterestIds.has(iid)).length;
    }

    // Score
    const ctx: FeedContext = {
      followedUserIds: followedUserIdSet,
      likedAuthorIds,
      blockedIds,
      userId: user?.id || "",
      userLanguage: viewerAffinity.language || undefined,
      userCountry: viewerAffinity.country || undefined,
      likedTagIds,
    };

    const scored = candidates.map(c => ({
      candidate: c,
      score: computeFeedScore(c, ctx),
    }));

    // Diversity enforcement (relaxed — moments are short-form, less strict)
    const diversified = enforceDiversity(scored, poolSize, false);

    // Weighted shuffle — high scores more likely to be early, but not deterministic
    // This ensures each request returns a different order (TikTok/Reels-like)
    for (let i = diversified.length - 1; i > 0; i--) {
      // Bias toward keeping high-scored items early: swap within a window
      const window = Math.min(i, Math.max(3, Math.floor(i * 0.4)));
      const j = i - Math.floor(Math.random() * window);
      [diversified[i], diversified[j]] = [diversified[j], diversified[i]];
    }

    // Exclude already-loaded moments and paginate
    const available = diversified.filter(c => !excludeIds.has(c.id));
    const pageCandidates = available.slice(0, limit);
    const hasMore = available.length > limit;

    if (pageCandidates.length === 0) {
      return NextResponse.json({ moments: [], hasMore: false });
    }

    // Fetch full moment data with joins (sounds, post_tags)
    const pageIds = pageCandidates.map(c => c.id);
    const { data: fullMoments, error } = await admin
      .from("posts")
      .select(`
        id, title, slug, excerpt, featured_image, video_url, hls_url, video_duration, video_thumbnail, blurhash, visibility, is_nsfw, moderation_category,
        like_count, comment_count, view_count, save_count, share_count, published_at, author_id,
        profiles!posts_author_id_fkey(user_id, name, surname, full_name, username, avatar_url, is_verified, premium_plan, role, status, account_private),
        post_tags(tag_id, tags(id, name, slug)),
        sounds!posts_sound_id_fkey(id, title, artist, audio_url, duration, status, cover_image_url, is_original)
      `)
      .in("id", pageIds)
      .in("status", ["published", "moderation"]);

    if (error) {
      return safeError(error);
    }

    // Maintain score order + filter inactive/private
    const postMap = new Map((fullMoments || []).map((m: any) => [m.id, m]));
    const ordered = pageIds
      .map(id => postMap.get(id))
      .filter((m: any) => {
        if (!m) return false;
        const author = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
        if (!author) return false;
        if (author.status && author.status !== "active") return false;
        if (author.account_private && author.user_id !== user?.id && !followedUserIdSet.has(author.user_id)) return false;
        return true;
      })
      .map((m: any) => ({
        ...m,
        profiles: Array.isArray(m.profiles) ? m.profiles[0] : m.profiles,
        sounds: Array.isArray(m.sounds) ? m.sounds[0] : (m.sounds || null),
      }));

    const enrichedMoments = user
      ? await attachViewerPostInteractions(ordered, user.id, admin)
      : ordered;

    return NextResponse.json({
      moments: enrichedMoments,
      hasMore,
    });
  } catch (err) {
    console.error("[moments] Error:", err);
    const tErrors = await getTranslations("apiErrors");
    return NextResponse.json({ error: tErrors("serverError") }, { status: 500 });
  }
}
