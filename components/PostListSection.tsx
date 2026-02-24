import { ReactNode } from "react";
import PostCard from "@/components/PostCard";
import { PostGridSkeleton } from "@/components/Skeletons";
import EmptyState from "@/components/EmptyState";
import LoadMoreTrigger from "@/components/LoadMoreTrigger";

interface PostListSectionProps {
  posts: any[];
  loading: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyIcon?: ReactNode;
  emptyAction?: ReactNode | { label: string; href?: string; onClick?: () => void };
  skeletonCount?: number;
}

export default function PostListSection({
  posts,
  loading,
  hasMore = false,
  onLoadMore,
  emptyTitle = "Henüz gönderi yok",
  emptyDescription = "",
  emptyIcon,
  emptyAction,
  skeletonCount = 3,
}: PostListSectionProps) {
  if (loading && posts.length === 0) {
    return <PostGridSkeleton count={skeletonCount} />;
  }

  if (posts.length === 0) {
    return (
      <EmptyState
        title={emptyTitle}
        description={emptyDescription}
        icon={emptyIcon}
        action={emptyAction}
      />
    );
  }

  return (
    <>
      <div className="flex flex-col gap-[40px]">
      {posts.map((post: any) => (
        <PostCard key={post.id} post={post} />
      ))}
      </div>
      {onLoadMore && <LoadMoreTrigger onLoadMore={onLoadMore} loading={loading} hasMore={hasMore} />}
    </>
  );
}
