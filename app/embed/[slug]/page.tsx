import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { unstable_cache } from "next/cache";
import VideoPlayer from "@/components/VideoPlayer";

interface PageProps {
  params: Promise<{ slug: string }>;
}

async function getPost(rawSlug: string) {
  const admin = createAdminClient();
  const slug = decodeURIComponent(rawSlug);

  const { data: post, error } = await admin
    .from("posts")
    .select(`
      id, title, slug, video_url, video_thumbnail, featured_image, content_type, status, excerpt,
      profiles!posts_author_id_fkey(username, full_name, name, surname, avatar_url)
    `)
    .eq("slug", slug)
    .eq("status", "published")
    .single();

  if (error || !post) return null;
  return post;
}

const getCachedPost = unstable_cache(getPost, ["embed-post"], { revalidate: 60, tags: ["posts"] });

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getCachedPost(slug);
  if (!post) return { title: "İçerik bulunamadı" };

  return {
    title: post.title,
    description: post.excerpt || "",
    robots: { index: false, follow: false },
  };
}

export default async function EmbedPage({ params }: PageProps) {
  const { slug } = await params;
  const post = await getCachedPost(slug);
  if (!post) notFound();

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://feedim.com";
  const postUrl = `${baseUrl}/post/${post.slug}`;
  const isVideo = (post.content_type === "video" || post.content_type === "moment") && post.video_url;
  const author = Array.isArray(post.profiles) ? post.profiles[0] : post.profiles;
  const authorName = author?.full_name || [author?.name, author?.surname].filter(Boolean).join(" ") || author?.username || "";

  if (isVideo) {
    return (
      <div className="w-full h-[100dvh] bg-black flex flex-col overflow-hidden">
        <div className="flex-1 min-h-0 relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full">
              <VideoPlayer
                src={post.video_url}
                poster={post.video_thumbnail || post.featured_image || undefined}
                autoStart
              />
            </div>
          </div>
        </div>
        <a
          href={postUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2.5 px-3 py-1.5 bg-[#0a0a0a] hover:bg-[#151515] transition-colors shrink-0"
        >
          <img src="/imgs/feedim-mobile-dark.svg" alt="Feedim" className="h-5 w-5" draggable={false} />
          <span className="text-white/90 text-[0.78rem] font-semibold truncate">{post.title}</span>
          <span className="ml-auto text-white/40 text-[0.7rem] font-medium shrink-0">Feedim&apos;de izle</span>
        </a>
      </div>
    );
  }

  // Article embed — card style
  const thumbnail = post.featured_image || post.video_thumbnail;

  return (
    <a
      href={postUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="flex w-full h-[100dvh] bg-white dark:bg-[#0a0a0a] overflow-hidden no-underline text-inherit"
      style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}
    >
      {thumbnail && (
        <div className="w-[40%] max-w-[280px] shrink-0 bg-neutral-100 dark:bg-neutral-900">
          <img src={thumbnail} alt="" className="w-full h-full object-cover" draggable={false} />
        </div>
      )}
      <div className="flex-1 min-w-0 flex flex-col justify-center p-4 gap-2">
        <div className="flex items-center gap-1.5">
          <img src="/imgs/feedim-mobile-dark.svg" alt="Feedim" className="h-4 w-4 dark:block hidden" draggable={false} />
          <img src="/imgs/feedim-mobile-light.svg" alt="Feedim" className="h-4 w-4 dark:hidden block" draggable={false} />
          <span className="text-neutral-400 text-[0.7rem] font-medium">feedim.com</span>
        </div>
        <h2 className="text-neutral-900 dark:text-white text-[0.95rem] font-bold leading-snug line-clamp-2 m-0">{post.title}</h2>
        {post.excerpt && (
          <p className="text-neutral-500 dark:text-neutral-400 text-[0.78rem] leading-relaxed line-clamp-3 m-0">{post.excerpt}</p>
        )}
        {authorName && (
          <span className="text-neutral-400 text-[0.72rem] mt-auto">{authorName}</span>
        )}
      </div>
    </a>
  );
}
