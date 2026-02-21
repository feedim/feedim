import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { unstable_cache } from "next/cache";
import VideoPlayer from "@/components/VideoPlayer";

interface PageProps {
  params: Promise<{ slug: string }>;
}

async function getVideoPost(rawSlug: string) {
  const admin = createAdminClient();
  const slug = decodeURIComponent(rawSlug);

  const { data: post, error } = await admin
    .from("posts")
    .select("id, title, slug, video_url, video_thumbnail, featured_image, content_type, status, excerpt")
    .eq("slug", slug)
    .eq("status", "published")
    .in("content_type", ["video", "moment"])
    .single();

  if (error || !post || !post.video_url) return null;
  return post;
}

const getCachedVideoPost = unstable_cache(getVideoPost, ["embed-video"], { revalidate: 60, tags: ["posts"] });

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getCachedVideoPost(slug);
  if (!post) return { title: "Video bulunamadı" };

  return {
    title: post.title,
    description: post.excerpt || "",
    robots: { index: false, follow: false },
  };
}

export default async function EmbedPage({ params }: PageProps) {
  const { slug } = await params;
  const post = await getCachedVideoPost(slug);
  if (!post) notFound();

  const postUrl = `${process.env.NEXT_PUBLIC_BASE_URL || "https://feedim.com"}/post/${post.slug}`;

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
      {/* Feedim branding bar */}
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
