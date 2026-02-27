import PostCard from "@/components/PostCard";

interface PostGridProps {
  posts: Array<{
    id: number;
    title: string;
    slug: string;
    excerpt?: string;
    featured_image?: string;
    reading_time?: number;
    like_count?: number;
    comment_count?: number;
    save_count?: number;
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
}

export default function PostGrid({ posts }: PostGridProps) {
  return (
    <div className="flex flex-col gap-[40px] mt-[10px]">
      {posts.map(post => (
        <PostCard key={post.id} post={post} />
      ))}
    </div>
  );
}
