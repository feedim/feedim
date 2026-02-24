import PostCard from "@/components/PostCard";

interface PostItem {
  id: number;
  title: string;
  slug: string;
  excerpt?: string;
  featured_image?: string;
  reading_time?: number;
  like_count?: number;
  comment_count?: number;
  save_count?: number;
  view_count?: number;
  content_type?: string;
  video_duration?: number;
  video_thumbnail?: string;
  video_url?: string;
  blurhash?: string | null;
  published_at?: string;
  profiles?: {
    user_id: string;
    name?: string;
    surname?: string;
    full_name?: string;
    username: string;
    avatar_url?: string;
    is_verified?: boolean;
    premium_plan?: string | null;
    role?: string;
  };
}

interface RelatedPostsProps {
  posts: PostItem[];
  featuredPosts?: PostItem[];
  authorUsername?: string;
}

export default function RelatedPosts({ posts, featuredPosts = [], authorUsername }: RelatedPostsProps) {
  const hasAuthorContent = posts.length > 0;
  const hasFeatured = featuredPosts.length > 0;

  if (!hasAuthorContent && !hasFeatured) return null;

  const items = hasAuthorContent ? posts : featuredPosts;
  const title = hasAuthorContent
    ? `@${authorUsername} adlı kişiden daha fazla`
    : "Öne Çıkanlar";

  return (
    <section className="mt-6 pt-6">
      <h3 className="text-lg font-bold mb-6">{title}</h3>
      <div className="-mx-4 flex flex-col gap-[40px]">
        {items.map(post => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>
    </section>
  );
}
