import { unstable_cache } from "next/cache";
import type { VideoItem } from "@/components/VideoSidebar";
import { computeFeedScore, type FeedCandidate, type FeedContext } from "@/lib/feedAlgorithm";
import { createAdminClient } from "@/lib/supabase/admin";

type SourceType = "followed" | "discovery";

type RawAuthorProfile = {
  profile_score?: number | null;
  follower_count?: number | null;
  is_verified?: boolean | null;
  post_count?: number | null;
  status?: string | null;
  language?: string | null;
  country?: string | null;
};

type RawPostProfile = {
  user_id?: string | null;
  name?: string | null;
  surname?: string | null;
  full_name?: string | null;
  username?: string | null;
  avatar_url?: string | null;
  is_verified?: boolean | null;
  premium_plan?: string | null;
  role?: string | null;
  status?: string | null;
  profile_score?: number | null;
  follower_count?: number | null;
  language?: string | null;
  country?: string | null;
};

type RawRecommendationRow = {
  id: number;
  author_id: string;
  title?: string | null;
  slug?: string | null;
  excerpt?: string | null;
  featured_image?: string | null;
  reading_time?: number | null;
  like_count?: number | null;
  comment_count?: number | null;
  save_count?: number | null;
  share_count?: number | null;
  view_count?: number | null;
  published_at?: string | null;
  content_type?: string | null;
  video_duration?: number | null;
  video_thumbnail?: string | null;
  video_url?: string | null;
  blurhash?: string | null;
  trending_score?: number | null;
  quality_score?: number | null;
  spam_score?: number | null;
  is_nsfw?: boolean | null;
  status?: string | null;
  profiles?: RawPostProfile | RawPostProfile[] | null;
};

type RecommendationRow = Omit<RawRecommendationRow, "profiles"> & {
  profiles: RawPostProfile | null;
};

const AUTHOR_CONTENT_SELECT = `
  id, title, slug, excerpt, featured_image, reading_time, like_count, comment_count, save_count, share_count, view_count, published_at, content_type, video_duration, video_thumbnail, video_url, blurhash, trending_score, quality_score, spam_score, is_nsfw, status,
  profiles!posts_author_id_fkey(user_id, name, surname, full_name, username, avatar_url, is_verified, premium_plan, role, status)
`;

const FEATURED_CONTENT_SELECT = `
  id, title, slug, excerpt, featured_image, reading_time, like_count, comment_count, save_count, share_count, view_count, published_at, content_type, video_duration, video_thumbnail, video_url, blurhash, trending_score, quality_score, spam_score, is_nsfw, status, author_id,
  profiles!posts_author_id_fkey(user_id, name, surname, full_name, username, avatar_url, is_verified, premium_plan, role, status, profile_score, follower_count)
`;

const NEXT_VIDEO_SELECT = `
  id, title, slug, video_url, video_thumbnail, featured_image, video_duration, view_count, published_at, author_id, content_type, like_count, comment_count, save_count, share_count, trending_score, quality_score, spam_score, is_nsfw, status,
  profiles!posts_author_id_fkey(user_id, username, avatar_url, is_verified, premium_plan, role, status, profile_score, follower_count, language, country)
`;

function unwrapProfile(profile: RawPostProfile | RawPostProfile[] | null | undefined) {
  return Array.isArray(profile) ? (profile[0] || null) : (profile || null);
}

function hasActiveAuthor(row: RawRecommendationRow) {
  const author = unwrapProfile(row.profiles);
  return !author?.status || author.status === "active";
}

function withFlatProfile<T extends RawRecommendationRow>(row: T): Omit<T, "profiles"> & { profiles: RawPostProfile | null } {
  return {
    ...row,
    profiles: unwrapProfile(row.profiles),
  };
}

function buildContext(locale?: string, country?: string): FeedContext {
  return {
    followedUserIds: new Set(),
    likedAuthorIds: new Set(),
    blockedIds: new Set(),
    userId: "",
    userLanguage: locale || undefined,
    userCountry: country || undefined,
  };
}

function buildCandidate(
  row: RecommendationRow,
  source: SourceType,
  authorProfile?: RawAuthorProfile,
): FeedCandidate {
  const author = row.profiles;
  return {
    id: row.id,
    author_id: row.author_id,
    content_type: row.content_type || "post",
    published_at: row.published_at || "",
    trending_score: row.trending_score || 0,
    quality_score: row.quality_score || 0,
    spam_score: row.spam_score || 0,
    like_count: row.like_count || 0,
    comment_count: row.comment_count || 0,
    save_count: row.save_count || 0,
    share_count: row.share_count || 0,
    view_count: row.view_count || 0,
    is_nsfw: false,
    status: "published",
    source,
    author_profile_score: authorProfile?.profile_score ?? author?.profile_score ?? 0,
    author_is_verified: authorProfile?.is_verified ?? author?.is_verified ?? false,
    author_follower_count: authorProfile?.follower_count ?? author?.follower_count ?? 0,
    author_language: authorProfile?.language ?? author?.language ?? undefined,
    author_country: authorProfile?.country ?? author?.country ?? undefined,
  };
}

function rankRows(rows: RecommendationRow[], ctx: FeedContext, source: SourceType, authorProfile?: RawAuthorProfile) {
  return rows
    .map((row) => ({ row, score: computeFeedScore(buildCandidate(row, source, authorProfile), ctx) }))
    .sort((a, b) => b.score - a.score)
    .map(({ row }) => row);
}

export async function getAuthorContent(authorId: string, currentPostId: number, locale?: string, country?: string) {
  const admin = createAdminClient();
  const { data: authorProfile } = await admin
    .from("profiles")
    .select("profile_score, follower_count, is_verified, post_count, status, language, country")
    .eq("user_id", authorId)
    .single<RawAuthorProfile>();

  if (!authorProfile || authorProfile.status !== "active") return [];
  const profileScore = authorProfile.profile_score || 0;
  const followerCount = authorProfile.follower_count || 0;
  const postCount = authorProfile.post_count || 0;
  if (profileScore < 15 && !authorProfile.is_verified) return [];
  if (followerCount < 1 && postCount < 3) return [];

  const { data: posts } = await admin
    .from("posts")
    .select(AUTHOR_CONTENT_SELECT)
    .eq("author_id", authorId)
    .eq("status", "published")
    .or("is_nsfw.eq.false,is_nsfw.is.null")
    .neq("id", currentPostId)
    .order("trending_score", { ascending: false })
    .limit(10);

  const filtered = ((posts || []) as RawRecommendationRow[])
    .filter(hasActiveAuthor)
    .map(withFlatProfile);

  return rankRows(filtered, buildContext(locale, country), "followed", authorProfile).slice(0, 3);
}

export async function getFeaturedContent(currentPostId: number, authorId: string, locale?: string, country?: string) {
  const admin = createAdminClient();
  const { data: posts } = await admin
    .from("posts")
    .select(FEATURED_CONTENT_SELECT)
    .eq("status", "published")
    .or("is_nsfw.eq.false,is_nsfw.is.null")
    .neq("id", currentPostId)
    .neq("author_id", authorId)
    .order("trending_score", { ascending: false })
    .limit(10);

  const filtered = ((posts || []) as RawRecommendationRow[])
    .filter(hasActiveAuthor)
    .map(withFlatProfile);

  return rankRows(filtered, buildContext(locale, country), "discovery").slice(0, 3);
}

export async function getNextVideos(currentPostId: number, authorId: string, locale?: string, country?: string, contentTypes?: string[], viewerId?: string | null): Promise<VideoItem[]> {
  const admin = createAdminClient();

  // Default to video+moment; callers can narrow down
  const types = contentTypes && contentTypes.length > 0 ? contentTypes : ["video", "moment"];
  const typeFilter = types.length === 1
    ? (q: any) => q.eq("content_type", types[0])
    : (q: any) => q.in("content_type", types);

  // For logged-in users, get viewed post IDs for sorting (NOT excluding)
  const viewedIds = new Set<number>();
  if (viewerId) {
    const { data: viewedRows } = await admin
      .from("post_views")
      .select("post_id")
      .eq("viewer_id", viewerId)
      .order("created_at", { ascending: false })
      .limit(200);
    if (viewedRows?.length) {
      for (const r of viewedRows) viewedIds.add(r.post_id as number);
    }
  }

  // Fetch larger pools: more author videos + much larger discovery pool
  const authorQuery = typeFilter(admin
    .from("posts")
    .select(NEXT_VIDEO_SELECT))
    .eq("status", "published")
    .or("is_nsfw.eq.false,is_nsfw.is.null")
    .eq("author_id", authorId)
    .neq("id", currentPostId)
    .order("published_at", { ascending: false })
    .limit(8);

  const otherQuery = typeFilter(admin
    .from("posts")
    .select(NEXT_VIDEO_SELECT))
    .eq("status", "published")
    .or("is_nsfw.eq.false,is_nsfw.is.null")
    .neq("author_id", authorId)
    .neq("id", currentPostId)
    .order("trending_score", { ascending: false })
    .limit(60);

  const [{ data: authorVideos }, { data: otherVideos }] = await Promise.all([
    authorQuery,
    otherQuery,
  ]);

  const authorList = ((authorVideos || []) as RawRecommendationRow[])
    .filter(hasActiveAuthor)
    .map(withFlatProfile);

  const ctx = buildContext(locale, country);
  const rankedOthers = rankRows(
    ((otherVideos || []) as RawRecommendationRow[]).filter(hasActiveAuthor).map(withFlatProfile),
    ctx,
    "discovery",
  );

  // Per-author diversity cap: max 3 videos from any single author in discovery
  const authorCounts = new Map<string, number>();
  const diverseOthers: RecommendationRow[] = [];
  for (const row of rankedOthers) {
    const count = authorCounts.get(row.author_id) || 0;
    if (count >= 3) continue;
    authorCounts.set(row.author_id, count + 1);
    diverseOthers.push(row);
  }

  // Interleave: 2 author → 4 discovery → 1 author → rest discovery
  const result: RecommendationRow[] = [];
  const authorQueue = [...authorList];
  const discoveryQueue = [...diverseOthers];
  const seen = new Set<number>();

  const take = (queue: RecommendationRow[], n: number) => {
    let taken = 0;
    while (taken < n && queue.length > 0) {
      const item = queue.shift()!;
      if (seen.has(item.id)) continue;
      seen.add(item.id);
      result.push(item);
      taken++;
    }
  };

  // Slot pattern: 2 from author, 4 discovery, 1 author, then fill with discovery
  take(authorQueue, 2);
  take(discoveryQueue, 4);
  take(authorQueue, 1);
  take(discoveryQueue, 4);
  take(authorQueue, authorQueue.length); // remaining author videos
  take(discoveryQueue, discoveryQueue.length); // remaining discovery

  // Sort: unwatched first, watched at bottom (priority change only, never remove)
  const final = result.slice(0, 24);
  if (viewedIds.size > 0) {
    final.sort((a, b) => {
      const aWatched = viewedIds.has(a.id) ? 1 : 0;
      const bWatched = viewedIds.has(b.id) ? 1 : 0;
      return aWatched - bWatched;
    });
  }

  return final as VideoItem[];
}

export const getCachedAuthorContent = unstable_cache(getAuthorContent, ["author-content"], {
  revalidate: 300,
  tags: ["posts"],
});

export const getCachedFeaturedContent = unstable_cache(getFeaturedContent, ["featured-content"], {
  revalidate: 300,
  tags: ["posts"],
});

export const getCachedNextVideos = (currentPostId: number, authorId: string, locale?: string, country?: string, contentTypes?: string[], viewerId?: string | null) =>
  unstable_cache(
    () => getNextVideos(currentPostId, authorId, locale, country, contentTypes, viewerId),
    ["next-videos", String(currentPostId), authorId, locale || "", country || "", (contentTypes || []).join(","), viewerId || "anon"],
    { revalidate: 300, tags: ["posts"] },
  )();
