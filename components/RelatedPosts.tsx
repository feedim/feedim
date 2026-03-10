import { getTranslations } from "next-intl/server";
import PostCard from "@/components/PostCard";
import { getAuthUserId } from "@/lib/auth";
import { attachViewerPostInteractions } from "@/lib/postViewerInteractions";

interface PostItem {
  id: number;
  title?: string | null;
  slug?: string | null;
  excerpt?: string | null;
  featured_image?: string | null;
  reading_time?: number | null;
  like_count?: number | null;
  comment_count?: number | null;
  save_count?: number | null;
  view_count?: number | null;
  content_type?: string | null;
  video_duration?: number | null;
  video_thumbnail?: string | null;
  video_url?: string | null;
  blurhash?: string | null;
  published_at?: string | null;
  profiles?: {
    user_id?: string | null;
    name?: string | null;
    surname?: string | null;
    full_name?: string | null;
    username?: string | null;
    avatar_url?: string | null;
    is_verified?: boolean | null;
    premium_plan?: string | null;
    role?: string | null;
  } | null;
}

interface RelatedPostsProps {
  posts: PostItem[];
  featuredPosts?: PostItem[];
  authorUsername?: string;
}

interface RenderablePostItem {
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
  viewer_liked?: boolean;
  viewer_saved?: boolean;
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

export default async function RelatedPosts({ posts, featuredPosts = [], authorUsername }: RelatedPostsProps) {
  const [t, currentUserId] = await Promise.all([
    getTranslations("relatedPosts"),
    getAuthUserId(),
  ]);
  const hasAuthorContent = posts.length > 0;
  const hasFeatured = featuredPosts.length > 0;

  if (!hasAuthorContent && !hasFeatured) return null;

  const items = hasAuthorContent ? posts : featuredPosts;
  const renderableItems = items.flatMap<RenderablePostItem>((post) => {
      const title = typeof post.title === "string" ? post.title.trim() : "";
      const slug = typeof post.slug === "string" ? post.slug.trim() : "";
      if (!title || !slug) return [];

      const profiles = post.profiles?.username && post.profiles.user_id
        ? {
            user_id: post.profiles.user_id,
            name: post.profiles.name ?? undefined,
            surname: post.profiles.surname ?? undefined,
            full_name: post.profiles.full_name ?? undefined,
            username: post.profiles.username,
            avatar_url: post.profiles.avatar_url ?? undefined,
            is_verified: post.profiles.is_verified ?? undefined,
            premium_plan: post.profiles.premium_plan ?? null,
            role: post.profiles.role ?? undefined,
          }
        : undefined;

      return [{
        id: post.id,
        title,
        slug,
        excerpt: post.excerpt ?? undefined,
        featured_image: post.featured_image ?? undefined,
        reading_time: post.reading_time ?? undefined,
        like_count: post.like_count ?? undefined,
        comment_count: post.comment_count ?? undefined,
        save_count: post.save_count ?? undefined,
        view_count: post.view_count ?? undefined,
        content_type: post.content_type ?? undefined,
        video_duration: post.video_duration ?? undefined,
        video_thumbnail: post.video_thumbnail ?? undefined,
        video_url: post.video_url ?? undefined,
        blurhash: post.blurhash ?? undefined,
        published_at: post.published_at ?? undefined,
        profiles,
      }];
    });
  if (renderableItems.length === 0) return null;

  const postsWithViewerInteractions = await attachViewerPostInteractions(renderableItems, currentUserId);
  const title = hasAuthorContent
    ? t("moreFromAuthor", { username: authorUsername || "" })
    : t("forYou");

  return (
    <section className="max-w-[565px] mx-auto">
      <h3 className="text-lg font-bold mb-2 px-3">{title}</h3>
      <div className="flex flex-col gap-[16px] mt-[10px]">
        {postsWithViewerInteractions.map(post => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>
    </section>
  );
}
