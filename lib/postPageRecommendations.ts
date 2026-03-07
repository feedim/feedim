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
    .eq("is_nsfw", false)
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
    .eq("is_nsfw", false)
    .neq("id", currentPostId)
    .neq("author_id", authorId)
    .order("trending_score", { ascending: false })
    .limit(10);

  const filtered = ((posts || []) as RawRecommendationRow[])
    .filter(hasActiveAuthor)
    .map(withFlatProfile);

  return rankRows(filtered, buildContext(locale, country), "discovery").slice(0, 3);
}

export async function getNextVideos(currentPostId: number, authorId: string, locale?: string, country?: string): Promise<VideoItem[]> {
  const admin = createAdminClient();
  const [{ data: authorVideos }, { data: otherVideos }] = await Promise.all([
    admin
      .from("posts")
      .select(NEXT_VIDEO_SELECT)
      .eq("content_type", "video")
      .eq("status", "published")
      .eq("is_nsfw", false)
      .eq("author_id", authorId)
      .neq("id", currentPostId)
      .order("published_at", { ascending: false })
      .limit(5),
    admin
      .from("posts")
      .select(NEXT_VIDEO_SELECT)
      .eq("content_type", "video")
      .eq("status", "published")
      .eq("is_nsfw", false)
      .neq("author_id", authorId)
      .neq("id", currentPostId)
      .order("trending_score", { ascending: false })
      .limit(30),
  ]);

  const authorList = ((authorVideos || []) as RawRecommendationRow[])
    .filter(hasActiveAuthor)
    .map(withFlatProfile);
  const rankedOthers = rankRows(
    ((otherVideos || []) as RawRecommendationRow[]).filter(hasActiveAuthor).map(withFlatProfile),
    buildContext(locale, country),
    "discovery",
  );

  return [...authorList, ...rankedOthers].slice(0, 20) as VideoItem[];
}

export const getCachedAuthorContent = unstable_cache(getAuthorContent, ["author-content"], {
  revalidate: 300,
  tags: ["posts"],
});

export const getCachedFeaturedContent = unstable_cache(getFeaturedContent, ["featured-content"], {
  revalidate: 300,
  tags: ["posts"],
});

export const getCachedNextVideos = unstable_cache(getNextVideos, ["next-videos"], {
  revalidate: 300,
  tags: ["posts"],
});
