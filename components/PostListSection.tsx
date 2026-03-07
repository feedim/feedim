"use client";

import { ReactNode, useState, useEffect, type ComponentProps } from "react";
import PostCard from "@/components/PostCard";
import { isBlockedContent } from "@/lib/blockedWords";
import EmptyState from "@/components/EmptyState";
import LoadMoreTrigger from "@/components/LoadMoreTrigger";
import { useTranslations } from "next-intl";
import PostCardSkeleton from "@/components/PostCardSkeleton";

type PostCardPost = ComponentProps<typeof PostCard>["post"];

type PostListItem = {
  id: number;
  title?: string | null;
  slug?: string;
  excerpt?: string | null;
  profiles?: { user_id?: string | null } | null;
  [key: string]: unknown;
};

interface PostListSectionProps {
  posts: PostListItem[];
  loading: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
  onDelete?: (postId: number) => void;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyIcon?: ReactNode;
  emptyAction?: ReactNode | { label: string; href?: string; onClick?: () => void };
  interactions?: Record<number, { liked: boolean; saved: boolean }>;
  skeletonVariant?: "post" | "video" | "note" | "mixed";
}

export default function PostListSection({
  posts,
  loading,
  hasMore = false,
  onLoadMore,
  onDelete,
  emptyTitle,
  emptyDescription = "",
  emptyIcon,
  emptyAction,
  interactions,
  skeletonVariant,
}: PostListSectionProps) {
  const t = useTranslations("profile");
  const resolvedEmptyTitle = emptyTitle ?? t("noPostsYet");

  // Filter out optimistically deleted posts from sessionStorage
  const [deletedIds, setDeletedIds] = useState<Set<number>>(new Set());
  useEffect(() => {
    try {
      const deleted = JSON.parse(sessionStorage.getItem("fdm-deleted-posts") || "[]");
      if (deleted.length > 0) setDeletedIds(new Set(deleted));
    } catch {}
    const onDeleted = (e: Event) => {
      const id = (e as CustomEvent).detail;
      if (typeof id === "number") setDeletedIds(prev => new Set(prev).add(id));
    };
    window.addEventListener("fdm-post-deleted", onDeleted);
    return () => window.removeEventListener("fdm-post-deleted", onDeleted);
  }, []);

  const visiblePosts = posts.filter(p => !deletedIds.has(p.id));

  if (loading && posts.length === 0) {
    return <PostCardSkeleton count={5} variant={skeletonVariant} />;
  }

  if (visiblePosts.length === 0 && !loading) {
    return (
      <EmptyState
        title={resolvedEmptyTitle}
        description={emptyDescription}
        icon={emptyIcon}
        action={emptyAction}
      />
    );
  }

  return (
    <>
      <div className="flex flex-col gap-[16px] mt-[10px]">
      {visiblePosts.filter((post) => !isBlockedContent(`${post.title || ""} ${post.excerpt || ""}`, post.profiles?.user_id)).map((post) => (
        <PostCard key={post.id} post={post as unknown as PostCardPost} initialLiked={interactions?.[post.id]?.liked} initialSaved={interactions?.[post.id]?.saved} onDelete={onDelete ? () => onDelete(post.id) : undefined} />
      ))}
      </div>
      {onLoadMore && <LoadMoreTrigger onLoadMore={onLoadMore} loading={loading} hasMore={hasMore} />}
    </>
  );
}
