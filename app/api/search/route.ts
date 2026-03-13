import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { cached } from "@/lib/cache";
import {
  computeFeedScore,
  type FeedCandidate,
  type FeedContext,
} from "@/lib/feedAlgorithm";
import { getViewerAffinity } from "@/lib/viewerAffinity";
import { logServerError } from "@/lib/runtimeLogger";
import { attachViewerPostInteractions } from "@/lib/postViewerInteractions";

type SearchSound = {
  id: number;
  title: string;
  artist: string | null;
  audio_url: string;
  duration: number | null;
  usage_count: number | null;
  cover_image_url: string | null;
  is_original: boolean | null;
  created_at: string | null;
  country: string | null;
};

type SearchSoundResult = Omit<SearchSound, "country">;

type RelationValue<T> = T | T[] | null;

type SearchResults = {
  users?: SearchUser[];
  posts?: SearchPost[];
  tags?: SearchTag[];
  sounds?: SearchSoundResult[];
};

interface SearchUser {
  user_id: string;
  name: string | null;
  surname: string | null;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  is_verified: boolean | null;
  premium_plan: string | null;
  role: string | null;
  bio: string | null;
  follower_count: number | null;
  language: string | null;
  country: string | null;
  _score?: number;
}

interface SearchPostProfile {
  user_id: string | null;
  name: string | null;
  surname: string | null;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  is_verified: boolean | null;
  premium_plan: string | null;
  role: string | null;
  status?: string | null;
  account_private?: boolean | null;
}

interface SearchPost {
  id: number;
  title: string | null;
  slug: string | null;
  excerpt: string | null;
  featured_image: string | null;
  reading_time: number | null;
  like_count: number | null;
  comment_count: number | null;
  view_count: number | null;
  save_count?: number | null;
  share_count?: number | null;
  published_at: string | null;
  author_id: string;
  content_type: string | null;
  video_duration: number | null;
  video_thumbnail: string | null;
  video_url: string | null;
  blurhash?: string | null;
  trending_score?: number | null;
  quality_score?: number | null;
  spam_score?: number | null;
  is_nsfw?: boolean | null;
  profiles: RelationValue<SearchPostProfile>;
  _score?: number;
}

interface SearchTag {
  id: number;
  name: string | null;
  slug: string | null;
  post_count: number | null;
  trending_score?: number | null;
  _score?: number;
}

interface SearchAuthorProfile {
  user_id: string;
  profile_score: number | null;
  is_verified: boolean | null;
  follower_count: number | null;
  language: string | null;
  country: string | null;
}

interface PostTagMapping {
  post_id: number;
  tag_id: number;
}

interface PostInterestMapping {
  post_id: number;
  interest_id: number;
}

function unwrapRelation<T>(value: RelationValue<T>): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function stripSearchSoundCountry(sound: SearchSound & { _score?: number }): SearchSoundResult {
  const { country, _score, ...rest } = sound;
  void country;
  void _score;
  return rest;
}

// Sanitize input for PostgREST filter/ilike strings to prevent injection
function sanitizeForFilter(input: string): string {
  // Remove PostgREST operators and special characters
  return input
    .replace(/[,.()"'\\;:@<>{}[\]|`~!#$^&*+=?/]/g, "")
    .replace(/%/g, "")
    .slice(0, 100);
}

// Rate limiter: 30 search requests per minute per IP
const searchRateMap = new Map<string, { count: number; resetAt: number }>();
function checkSearchLimit(ip: string): boolean {
  const now = Date.now();
  const entry = searchRateMap.get(ip);
  if (!entry || now > entry.resetAt) {
    searchRateMap.set(ip, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (entry.count >= 30) return false;
  entry.count++;
  return true;
}

export async function GET(req: NextRequest) {
  try {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!checkSearchLimit(ip)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }
  const { searchParams } = new URL(req.url);
  const rawQ = searchParams.get("q")?.trim() || "";
  const isUserIntent = rawQ.startsWith("@");
  const isTagIntent = rawQ.startsWith("#");
  let q = sanitizeForFilter(isUserIntent || isTagIntent ? rawQ.slice(1) : rawQ);
  const type = searchParams.get("type") || "all";
  const contentType = searchParams.get("content_type") || "";

  const supabase = await createClient();
  const admin = createAdminClient();
  const limit = Math.min(parseInt(searchParams.get("limit") || "0") || (type === "all" ? 8 : 30), 50);
  const results: SearchResults = {};

  // Get current user for personalized scoring + blocked users
  const { data: { user } } = await supabase.auth.getUser();
  let blockedIds = new Set<string>();
  let followingIds = new Set<string>();

  if (user) {
    [blockedIds, followingIds] = await Promise.all([
      cached(`user:${user.id}:blocks`, 30, async () => {
        const { data: blocks } = await admin
          .from("blocks")
          .select("blocked_id, blocker_id")
          .or(`blocker_id.eq.${user.id},blocked_id.eq.${user.id}`);
        return new Set((blocks || []).map(b => b.blocker_id === user.id ? b.blocked_id : b.blocker_id));
      }),
      cached(`user:${user.id}:follows`, 30, async () => {
        const { data: follows } = await admin
          .from("follows")
          .select("following_id")
          .eq("follower_id", user.id);
        return new Set((follows || []).map(f => f.following_id));
      }),
    ]);
  }

  const viewerAffinity = await getViewerAffinity(req, admin, user?.id);

  // No query — return popular/suggested results
  if (!q || q.length < 2) {
    if (type === "all" || type === "users") {
      const { data: users } = await admin
        .from("profiles")
        .select("user_id, name, surname, full_name, username, avatar_url, is_verified, premium_plan, role, bio, follower_count, language, country")
        .eq("status", "active")
        .order("follower_count", { ascending: false })
        .limit(50);
      results.users = (users || [])
        .filter(u => u.user_id !== user?.id && !blockedIds.has(u.user_id))
        .sort((a, b) => {
          const aScore =
            (viewerAffinity.language && a.language === viewerAffinity.language ? 1 : 0) +
            (viewerAffinity.country && a.country === viewerAffinity.country ? 1 : 0);
          const bScore =
            (viewerAffinity.language && b.language === viewerAffinity.language ? 1 : 0) +
            (viewerAffinity.country && b.country === viewerAffinity.country ? 1 : 0);
          if (bScore !== aScore) return bScore - aScore;
          return (b.follower_count || 0) - (a.follower_count || 0);
        })
        .slice(0, limit);
    }
    if (type === "all" || type === "posts") {
      let popQuery = admin
        .from("posts")
        .select(`
          id, title, slug, excerpt, featured_image, reading_time,
          like_count, comment_count, view_count, published_at, author_id, content_type, video_duration, video_thumbnail, video_url,
          profiles!posts_author_id_fkey(user_id, name, surname, full_name, username, avatar_url, is_verified, premium_plan, role, status, account_private)
        `)
        .eq("status", "published")
        .eq("is_nsfw", false)
        .order("published_at", { ascending: false })
        .limit(50);
      if (contentType) popQuery = popQuery.eq("content_type", contentType);
      if (blockedIds.size > 0) {
        popQuery = popQuery.not("author_id", "in", `(${[...blockedIds].join(",")})`);
      }
      const { data: posts } = await popQuery;
      results.posts = ((posts || []) as SearchPost[])
        .filter(p => {
          const author = unwrapRelation(p.profiles);
          if (author?.status && author.status !== 'active') return false;
          if (author?.account_private && author?.user_id !== user?.id) return false;
          return true;
        })
        .slice(0, limit);
    }
    if (type === "all" || type === "tags") {
      const { data: tags } = await supabase
        .from("tags")
        .select("id, name, slug, post_count")
        .order("post_count", { ascending: false })
        .limit(limit);
      results.tags = tags || [];
    }
    if (type === "all" || type === "sounds") {
      const soundSelect = "id, title, artist, audio_url, duration, usage_count, cover_image_url, is_original, created_at, country";
      if (viewerAffinity.country) {
        const [countrySoundsRes, globalSoundsRes] = await Promise.all([
          admin
            .from("sounds")
            .select(soundSelect)
            .eq("status", "active")
            .eq("country", viewerAffinity.country)
            .order("usage_count", { ascending: false })
            .limit(limit + 6),
          admin
            .from("sounds")
            .select(soundSelect)
            .eq("status", "active")
            .order("usage_count", { ascending: false })
            .limit(limit + 12),
        ]);
        if (countrySoundsRes.error || globalSoundsRes.error) {
          results.sounds = [];
        } else {
          const merged = new Map<number, SearchSound>();
          for (const sound of [...(countrySoundsRes.data || []), ...(globalSoundsRes.data || [])]) {
            if (!merged.has(sound.id)) merged.set(sound.id, sound);
          }
          results.sounds = Array.from(merged.values())
            .slice(0, limit)
            .map(stripSearchSoundCountry);
        }
      } else {
        const { data: sounds } = await admin
          .from("sounds")
          .select(soundSelect)
          .eq("status", "active")
          .order("usage_count", { ascending: false })
          .limit(limit);
        results.sounds = (sounds || []).map(stripSearchSoundCountry);
      }
    }
    if (user && results.posts && results.posts.length > 0) {
      results.posts = await attachViewerPostInteractions(results.posts, user.id, admin);
    }

    const response = NextResponse.json(results);
    response.headers.set("Cache-Control", user ? "private, max-age=30" : "public, s-maxage=30, stale-while-revalidate=120");
    return response;
  }

  const searchType = isUserIntent ? "users" : isTagIntent ? "tags" : type;

  // Search users with scoring
  if (searchType === "all" || searchType === "users") {
    const { data: users } = await admin
      .from("profiles")
      .select("user_id, name, surname, full_name, username, avatar_url, is_verified, premium_plan, role, bio, follower_count, language, country")
      .eq("status", "active")
      .or(`username.ilike.%${q}%,full_name.ilike.%${q}%,name.ilike.%${q}%,surname.ilike.%${q}%`)
      .limit(50);

    const scored = (users || [])
      .filter(u => u.user_id !== user?.id && !blockedIds.has(u.user_id))
      .map(u => {
        let score = 0;
        const lq = q.toLowerCase();
        const lu = (u.username || "").toLowerCase();
        const lfn = (u.full_name || "").toLowerCase();

        // Username matching
        if (lu === lq) score += 200;
        else if (lu.startsWith(lq)) score += 100;
        else if (lu.includes(lq)) score += 50;

        // Display name matching
        if (lfn === lq) score += 150;
        else if (lfn.startsWith(lq)) score += 80;
        else if (lfn.includes(lq)) score += 40;

        // Profile quality bonuses
        if (u.is_verified) score += 500;
        if (u.avatar_url) score += 300; else score -= 200;
        if (u.bio) score += 150; else score -= 50;

        // Social bonuses
        if (followingIds.has(u.user_id)) score += 600;
        score += Math.min((u.follower_count || 0) / 10, 200);

        // Language/country affinity
        if (viewerAffinity.language && u.language === viewerAffinity.language) score += 100;
        if (viewerAffinity.country && u.country === viewerAffinity.country) score += 80;

        return { ...u, _score: score };
      })
      .filter(u => u._score > -100)
      .sort((a, b) => b._score - a._score)
      .slice(0, limit);

    results.users = scored;
  }

  // Search posts with computeFeedScore
  if (searchType === "all" || searchType === "posts") {
    let searchPostQuery = admin
      .from("posts")
      .select(`
        id, title, slug, excerpt, featured_image, reading_time,
        like_count, comment_count, view_count, save_count, share_count, published_at, author_id, content_type,
        video_duration, video_thumbnail, video_url, blurhash, trending_score, quality_score, spam_score, is_nsfw,
        profiles!posts_author_id_fkey(user_id, name, surname, full_name, username, avatar_url, is_verified, premium_plan, role, status, account_private)
      `)
      .eq("status", "published")
      .eq("is_nsfw", false)
      .or(`title.ilike.%${q}%,excerpt.ilike.%${q}%,slug.ilike.%${q}%`)
      .limit(100);
    if (contentType) {
      searchPostQuery = searchPostQuery.eq("content_type", contentType);
    }
    if (blockedIds.size > 0) {
      searchPostQuery = searchPostQuery.not("author_id", "in", `(${[...blockedIds].join(",")})`);
    }
    // Also search posts by matching tag names (parallel with main search)
    const tagSearchPromise = (async (): Promise<SearchPost[]> => {
      try {
        const { data: matchingTags } = await admin
          .from("tags")
          .select("id")
          .ilike("name", `%${q}%`)
          .limit(10);
        if (!matchingTags || matchingTags.length === 0) return [];
        const { data: tpm } = await admin
          .from("post_tags")
          .select("post_id")
          .in("tag_id", matchingTags.map((t: { id: number }) => t.id))
          .limit(50);
        if (!tpm || tpm.length === 0) return [];
        let tagPostQuery = admin
          .from("posts")
          .select(`
            id, title, slug, excerpt, featured_image, reading_time,
            like_count, comment_count, view_count, save_count, share_count, published_at, author_id, content_type,
            video_duration, video_thumbnail, video_url, blurhash, trending_score, quality_score, spam_score, is_nsfw,
            profiles!posts_author_id_fkey(user_id, name, surname, full_name, username, avatar_url, is_verified, premium_plan, role, status, account_private)
          `)
          .in("id", (tpm as { post_id: number }[]).map(t => t.post_id))
          .eq("status", "published")
          .eq("is_nsfw", false);
        if (contentType) tagPostQuery = tagPostQuery.eq("content_type", contentType);
        if (blockedIds.size > 0) {
          tagPostQuery = tagPostQuery.not("author_id", "in", `(${[...blockedIds].join(",")})`);
        }
        const { data: tagPosts } = await tagPostQuery;
        return (tagPosts || []) as SearchPost[];
      } catch { return []; }
    })();

    const [{ data: posts }, tagMatchedPosts] = await Promise.all([searchPostQuery, tagSearchPromise]);

    // Merge text-matched and tag-matched posts (deduplicate)
    const allSearchPosts = [...((posts || []) as SearchPost[])];
    const seenPostIds = new Set(allSearchPosts.map(p => p.id));
    for (const tp of tagMatchedPosts) {
      if (!seenPostIds.has(tp.id)) { allSearchPosts.push(tp); seenPostIds.add(tp.id); }
    }
    const tagMatchedIds = new Set(tagMatchedPosts.map(p => p.id));

    const filteredPosts = allSearchPosts
      .filter((post) => !blockedIds.has(post.author_id))
      .filter((post) => {
        const status = unwrapRelation(post.profiles)?.status;
        return !status || status === "active";
      })
      .filter((post) => {
        const author = unwrapRelation(post.profiles);
        if (!author?.account_private) return true;
        if (author.user_id === user?.id) return true;
        if (author.user_id && followingIds.has(author.user_id)) return true;
        return false;
      });

    if (filteredPosts.length > 0) {
      // Cached user signals for computeFeedScore
      const [likedAuthorIds, likedTagIds, trendingTagIdSet, userInterestIds] = await Promise.all([
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

        cached('trending-tag-ids', 300, async () => {
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

      // Enrichment (parallel)
      const postIds = filteredPosts.map((post) => post.id);
      const authorIds = [...new Set(filteredPosts.map((post) => post.author_id).filter(Boolean))] as string[];

      const [authorProfiles, postTagMappings, postInterestMappings] = await Promise.all([
        admin
          .from("profiles")
          .select("user_id, profile_score, is_verified, follower_count, language, country")
          .in("user_id", authorIds)
          .then(r => {
            const map = new Map<string, SearchAuthorProfile>();
            for (const profile of ((r.data || []) as SearchAuthorProfile[])) map.set(profile.user_id, profile);
            return map;
          }),

        (likedTagIds.size > 0 || trendingTagIdSet.size > 0)
          ? admin
              .from("post_tags")
              .select("post_id, tag_id")
              .in("post_id", postIds)
              .then(r => {
                const map = new Map<number, number[]>();
                for (const pt of ((r.data || []) as PostTagMapping[])) {
                  if (!map.has(pt.post_id)) map.set(pt.post_id, []);
                  map.get(pt.post_id)!.push(pt.tag_id);
                }
                return map;
              })
          : Promise.resolve(new Map<number, number[]>()),

        userInterestIds.size > 0
          ? admin
              .from("post_interests")
              .select("post_id, interest_id")
              .in("post_id", postIds)
              .then(r => {
                const map = new Map<number, number[]>();
                for (const pi of ((r.data || []) as PostInterestMapping[])) {
                  if (!map.has(pi.post_id)) map.set(pi.post_id, []);
                  map.get(pi.post_id)!.push(pi.interest_id);
                }
                return map;
              })
          : Promise.resolve(new Map<number, number[]>()),
      ]);

      // Build FeedContext
      const ctx: FeedContext = {
        followedUserIds: followingIds,
        likedAuthorIds,
        blockedIds,
        userId: user?.id || '',
        userLanguage: viewerAffinity.language || undefined,
        userCountry: viewerAffinity.country || undefined,
        likedTagIds,
      };

      // Score: text relevance (40%) + computeFeedScore (60%)
      const lq = q.toLowerCase();
      const scored = filteredPosts.map((p) => {
        // Text relevance score (0-1000)
        let textScore = 0;
        const title = (p.title || "").toLowerCase();
        const excerpt = (p.excerpt || "").toLowerCase();
        if (title.includes(lq)) textScore += title === lq ? 600 : title.startsWith(lq) ? 400 : 200;
        if (excerpt.includes(lq)) textScore += 100;
        if (p.featured_image) textScore += 50;
        if (tagMatchedIds.has(p.id)) textScore += 150; // Tag name match bonus

        // computeFeedScore
        const profile = authorProfiles.get(p.author_id);
        const pTags = postTagMappings.get(p.id) || [];
        const pInterests = postInterestMappings.get(p.id) || [];

        const candidate: FeedCandidate = {
          id: p.id,
          author_id: p.author_id || '',
          content_type: p.content_type || 'post',
          published_at: p.published_at || '',
          trending_score: p.trending_score || 0,
          quality_score: p.quality_score || 0,
          spam_score: p.spam_score || 0,
          like_count: p.like_count || 0,
          comment_count: p.comment_count || 0,
          save_count: p.save_count || 0,
          share_count: p.share_count || 0,
          view_count: p.view_count || 0,
          is_nsfw: p.is_nsfw || false,
          status: 'published',
          source: followingIds.has(p.author_id) ? 'followed' : 'discovery',
          author_profile_score: profile?.profile_score || 0,
          author_is_verified: profile?.is_verified || false,
          author_follower_count: profile?.follower_count || 0,
          author_language: profile?.language || undefined,
          author_country: profile?.country || undefined,
          matched_tag_count: 0,
          matched_liked_tag_count: likedTagIds.size > 0 ? pTags.filter(tid => likedTagIds.has(tid)).length : 0,
          has_trending_tag: pTags.some(tid => trendingTagIdSet.has(tid)),
          matched_interest_count: pInterests.filter(iid => userInterestIds.has(iid)).length,
        };

        const feedScore = computeFeedScore(candidate, ctx, { disableJitter: true, disableReachGating: true });
        // Combine: text relevance (65%) + feed score (35%) — search prioritizes text match
        const combinedScore = textScore * 0.65 + feedScore * 0.35;

        return { ...p, _score: combinedScore };
      });

      scored.sort((a, b) => (b._score || 0) - (a._score || 0));
      results.posts = scored.slice(0, limit);
    } else {
      results.posts = [];
    }
  }

  // Search tags with scoring algorithm
  if (searchType === "all" || searchType === "tags") {
    // Fetch user's followed tags for affinity
    const userFollowedTagIds = user ? await cached(`user:${user.id}:tag-follows`, 30, async () => {
      const { data: followedTags } = await admin
        .from("tag_follows")
        .select("tag_id")
        .eq("user_id", user.id);
      return new Set((followedTags || []).map((f: { tag_id: number }) => f.tag_id));
    }) : new Set<number>();

    const { data: tags } = await admin
      .from("tags")
      .select("id, name, slug, post_count, trending_score")
      .ilike("name", `%${q}%`)
      .limit(50);

    const lq = q.toLowerCase();
    const scored = (tags || []).map(tag => {
      let score = 0;
      const name = (tag.name || "").toLowerCase();

      // Text relevance (0-600)
      if (name === lq) score += 600;
      else if (name.startsWith(lq)) score += 400;
      else if (name.includes(lq)) score += 200;

      // Popularity (0-300)
      score += Math.min((tag.post_count || 0) / 10, 300);

      // Trending bonus (0-200)
      score += Math.min((tag.trending_score || 0) / 5, 200);

      // User follows this tag
      if (userFollowedTagIds.has(tag.id)) score += 150;

      return { ...tag, _score: score };
    });

    scored.sort((a, b) => b._score - a._score);
    results.tags = scored.slice(0, limit);
  }

  // Search sounds with scoring algorithm
  if (searchType === "all" || searchType === "sounds") {
    const { data: sounds } = await admin
      .from("sounds")
      .select("id, title, artist, audio_url, duration, usage_count, cover_image_url, is_original, created_at, country")
      .eq("status", "active")
      .or(`title.ilike.%${q}%,artist.ilike.%${q}%`)
      .limit(50);

    const lq = q.toLowerCase();
    const now = Date.now();
    const scored = (sounds || []).map(s => {
      let score = 0;
      const title = (s.title || "").toLowerCase();
      const artist = (s.artist || "").toLowerCase();

      // Text relevance (0-600)
      if (title === lq) score += 600;
      else if (title.startsWith(lq)) score += 400;
      else if (title.includes(lq)) score += 200;
      if (artist === lq) score += 300;
      else if (artist.startsWith(lq)) score += 200;
      else if (artist.includes(lq)) score += 100;

      // Popularity (0-300)
      score += Math.min((s.usage_count || 0) / 5, 300);

      // Recency bonus (0-150) — newer sounds get a boost
      if (s.created_at) {
        const ageMs = now - new Date(s.created_at).getTime();
        const ageDays = ageMs / (1000 * 60 * 60 * 24);
        if (ageDays < 7) score += 150;
        else if (ageDays < 30) score += 100;
        else if (ageDays < 90) score += 50;
      }

      // Quality bonuses
      if (s.cover_image_url) score += 50;
      if (s.is_original) score += 30;
      if (s.duration && s.duration > 5) score += 20;
      if (viewerAffinity.country && s.country === viewerAffinity.country) score += 90;

      return { ...s, _score: score };
    });

    scored.sort((a, b) => b._score - a._score);
    results.sounds = scored
      .slice(0, limit)
      .map(stripSearchSoundCountry);
  }

  if (user && results.posts && results.posts.length > 0) {
    results.posts = await attachViewerPostInteractions(results.posts, user.id, admin);
  }

  const response = NextResponse.json(results);
  response.headers.set('Cache-Control', user ? 'private, max-age=30' : 'public, s-maxage=30, stale-while-revalidate=120');
  return response;
  } catch (error: unknown) {
    logServerError("[Search] request failed", error, { operation: "search" });
    return NextResponse.json({ users: [], posts: [], tags: [], sounds: [] });
  }
}
