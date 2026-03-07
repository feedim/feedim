import { createAdminClient } from "@/lib/supabase/admin";
import { getDetailPageViewerState, type DetailPageViewerState } from "@/lib/postQueries";

interface PostAuthorRef {
  user_id?: string | null;
  username?: string | null;
  status?: string | null;
  account_private?: boolean | null;
}

export interface PostPageAccessPost {
  id: number;
  author_id: string;
  status?: string | null;
  is_nsfw?: boolean | null;
  copyright_match_id?: number | null;
  removal_decision_id?: number | null;
  removed_at?: string | null;
  removal_reason?: string | null;
  profiles?: PostAuthorRef | null;
}

export type PostPageAccessResult =
  | { kind: "allow"; isStaff: boolean }
  | { kind: "redirect"; isStaff: boolean; path: string }
  | { kind: "removed"; isStaff: boolean; reason: string | null; decisionCode: string | null }
  | { kind: "not-found"; isStaff: boolean };

export interface DetailPageAccessContext {
  access: PostPageAccessResult;
  viewerState: DetailPageViewerState;
}

function isStaffRole(role?: string | null): boolean {
  return role === "admin" || role === "moderator";
}

async function resolveViewerStaffStatus(
  admin: ReturnType<typeof createAdminClient>,
  currentUserId: string | null,
) {
  if (!currentUserId) return false;

  const { data: viewerProfile } = await admin
    .from("profiles")
    .select("role")
    .eq("user_id", currentUserId)
    .maybeSingle();

  return isStaffRole(viewerProfile?.role);
}

export async function resolvePostPageAccess(
  admin: ReturnType<typeof createAdminClient>,
  post: PostPageAccessPost,
  currentUserId: string | null,
  options?: {
    isStaff?: boolean;
    followingAuthor?: boolean;
  },
): Promise<PostPageAccessResult> {
  const isStaff = options?.isStaff ?? await resolveViewerStaffStatus(admin, currentUserId);

  const author = post.profiles;

  if (!isStaff && author?.status && author.status !== "active") {
    return { kind: "not-found", isStaff };
  }

  let copyrightOwnerId: string | null = null;
  const needsCopyrightOwnerCheck =
    !!currentUserId &&
    !!post.copyright_match_id &&
    (
      post.status === "moderation" ||
      (!!post.is_nsfw && post.author_id !== currentUserId && !isStaff)
    );

  if (needsCopyrightOwnerCheck) {
    const { data: originalPost } = await admin
      .from("posts")
      .select("author_id")
      .eq("id", post.copyright_match_id!)
      .maybeSingle();
    copyrightOwnerId = originalPost?.author_id || null;
  }

  if (post.status === "moderation") {
    const canViewModeration =
      isStaff ||
      post.author_id === currentUserId ||
      (!!currentUserId && copyrightOwnerId === currentUserId);

    if (!canViewModeration) {
      return { kind: "not-found", isStaff };
    }
  }

  if (post.status === "removed") {
    if (!isStaff) {
      if (post.author_id !== currentUserId) {
        return { kind: "not-found", isStaff };
      }
      const removedAt = post.removed_at ? new Date(post.removed_at) : null;
      const hoursAgo = removedAt ? (Date.now() - removedAt.getTime()) / (1000 * 60 * 60) : 999;
      if (hoursAgo > 24) {
        return { kind: "not-found", isStaff };
      }
      let decisionCode: string | null = null;
      if (post.removal_decision_id) {
        const { data: decision } = await admin
          .from("moderation_decisions")
          .select("decision_code")
          .eq("id", post.removal_decision_id)
          .maybeSingle();
        decisionCode = decision?.decision_code || null;
      }
      return {
        kind: "removed",
        isStaff,
        reason: post.removal_reason || null,
        decisionCode,
      };
    }
  }

  if (post.is_nsfw && post.author_id !== currentUserId && !isStaff) {
    const isCopyrightOwner = !!currentUserId && copyrightOwnerId === currentUserId;
    if (!isCopyrightOwner) {
      return { kind: "not-found", isStaff };
    }
  }

  if (author?.account_private && !isStaff && currentUserId !== author.user_id) {
    if (!currentUserId) {
      return { kind: "redirect", isStaff, path: `/u/${author.username}` };
    }

    const isFollowingAuthor = typeof options?.followingAuthor === "boolean"
      ? options.followingAuthor
      : !!(await admin
        .from("follows")
        .select("id")
        .eq("follower_id", currentUserId)
        .eq("following_id", author.user_id)
        .maybeSingle()).data;

    if (!isFollowingAuthor) {
      return { kind: "redirect", isStaff, path: `/u/${author.username}` };
    }
  }

  return { kind: "allow", isStaff };
}

export async function getDetailPageAccessContext(
  admin: ReturnType<typeof createAdminClient>,
  post: PostPageAccessPost,
  currentUserId: string | null,
): Promise<DetailPageAccessContext> {
  const [viewerState, isStaff] = await Promise.all([
    getDetailPageViewerState(post.id, post.author_id, currentUserId, admin),
    resolveViewerStaffStatus(admin, currentUserId),
  ]);
  const access = await resolvePostPageAccess(admin, post, currentUserId, {
    isStaff,
    followingAuthor: viewerState.interactions.followingAuthor,
  });

  return { access, viewerState };
}
