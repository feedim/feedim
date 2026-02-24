import PostCard from "@/components/PostCard";

interface RelatedPostsProps {
  posts: Array<{
    id: number;
    title: string;
    slug: string;
    excerpt?: string;
    featured_image?: string;
    reading_time?: number;
    like_count?: number;
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
    };
  }>;
  title?: string;
}

export default function RelatedPosts({ posts, title = "Benzer Yazılar" }: RelatedPostsProps) {
  if (!posts || posts.length === 0) return null;

  return (
    <section className="mt-6 pt-6">
      <h3 className="text-lg font-bold mb-6">{title}</h3>
      <div className="-mx-4 flex flex-col gap-[40px]">
        {posts.map(post => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>
    </section>
  );
}
