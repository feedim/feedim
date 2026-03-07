import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthUserId } from "@/lib/auth";
import { unstable_cache } from "next/cache";

const POST_SELECT = `
  *,
  profiles!posts_author_id_fkey(user_id, name, surname, full_name, username, avatar_url, is_verified, is_premium, premium_plan, role, profile_score, follower_count, post_count, status, account_private),
  post_tags(tag_id, tags(id, name, slug)),
  sounds!posts_sound_id_fkey(id, title, artist, audio_url, duration, status, cover_image_url, is_original)
`;

export async function getPost(rawSlug: string) {
  const admin = createAdminClient();
  const slug = decodeURIComponent(rawSlug);

  const { data: post, error } = await admin
    .from("posts")
    .select(POST_SELECT)
    .eq("slug", slug)
    .in("status", ["published", "removed", "moderation"])
    .single();

  if (error || !post) return null;
  return post;
}

export const getCachedPost = unstable_cache(getPost, ["post-by-slug"], { revalidate: 60, tags: ["posts"] });

export interface UserInteractions {
  liked: boolean;
  saved: boolean;
  userId: string | null;
  followingAuthor: boolean;
  requestedAuthor: boolean;
  authorFollowsMe: boolean;
}

export interface BoostInfo {
  isBoosted: boolean;
  boostStats: { impressions: number; clicks: number; boost_code: string } | null;
  boostStatus: string | null;
}

export interface DetailPageViewerState {
  interactions: UserInteractions;
  boostInfo: BoostInfo;
}

type AdminClient = ReturnType<typeof createAdminClient>;

const EMPTY_INTERACTIONS: UserInteractions = {
  liked: false,
  saved: false,
  userId: null,
  followingAuthor: false,
  requestedAuthor: false,
  authorFollowsMe: false,
};

const EMPTY_BOOST_INFO: BoostInfo = {
  isBoosted: false,
  boostStats: null,
  boostStatus: null,
};

async function resolveViewerId(currentUserId?: string | null) {
  if (typeof currentUserId !== "undefined") return currentUserId;
  return getAuthUserId();
}

export async function getDetailPageViewerState(
  postId: number,
  authorId: string,
  currentUserId?: string | null,
  adminClient?: AdminClient,
): Promise<DetailPageViewerState> {
  const userId = await resolveViewerId(currentUserId);
  if (!userId) {
    return {
      interactions: EMPTY_INTERACTIONS,
      boostInfo: EMPTY_BOOST_INFO,
    };
  }

  const admin = adminClient ?? createAdminClient();
  const isOwn = userId === authorId;

  const [
    { data: like },
    { data: bookmark },
    followResult,
    followRequestResult,
    followsMeResult,
    boostResult,
  ] = await Promise.all([
    admin.from("likes").select("id").eq("user_id", userId).eq("post_id", postId).maybeSingle(),
    admin.from("bookmarks").select("id").eq("user_id", userId).eq("post_id", postId).maybeSingle(),
    isOwn
      ? Promise.resolve({ data: null })
      : admin.from("follows").select("id").eq("follower_id", userId).eq("following_id", authorId).maybeSingle(),
    isOwn
      ? Promise.resolve({ data: null })
      : admin.from("follow_requests").select("id").eq("requester_id", userId).eq("target_id", authorId).eq("status", "pending").maybeSingle(),
    isOwn
      ? Promise.resolve({ data: null })
      : admin.from("follows").select("id").eq("follower_id", authorId).eq("following_id", userId).maybeSingle(),
    isOwn
      ? admin
          .from("post_boosts")
          .select("id, impressions, clicks, boost_code, status")
          .eq("post_id", postId)
          .in("status", ["pending_review", "active", "paused"])
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const boost = boostResult.data;

  return {
    interactions: {
      liked: !!like,
      saved: !!bookmark,
      userId,
      followingAuthor: !!followResult.data,
      requestedAuthor: !!followRequestResult.data,
      authorFollowsMe: !!followsMeResult.data,
    },
    boostInfo: boost
      ? {
          isBoosted: true,
          boostStats: {
            impressions: boost.impressions || 0,
            clicks: boost.clicks || 0,
            boost_code: boost.boost_code,
          },
          boostStatus: boost.status || null,
        }
      : EMPTY_BOOST_INFO,
  };
}

export async function getUserInteractions(postId: number, authorId: string, currentUserId?: string | null): Promise<UserInteractions> {
  const { interactions } = await getDetailPageViewerState(postId, authorId, currentUserId);
  return interactions;
}

export async function getBoostInfo(postId: number, authorId: string, currentUserId?: string | null): Promise<BoostInfo> {
  const { boostInfo } = await getDetailPageViewerState(postId, authorId, currentUserId);
  return boostInfo;
}
