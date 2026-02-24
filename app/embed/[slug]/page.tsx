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
      view_count, like_count, comment_count, published_at,
      profiles!posts_author_id_fkey(username, full_name, name, surname, avatar_url, is_verified)
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

function formatRelative(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "az önce";
  if (mins < 60) return `${mins}dk`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}sa`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}g`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}ay`;
  return `${Math.floor(months / 12)}y`;
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
        <div className="flex-1 min-h-0 flex items-center">
          <div className="w-full max-h-full [&_video]:!max-h-[calc(100dvh-36px)]">
            <VideoPlayer
              src={post.video_url}
              poster={post.video_thumbnail || post.featured_image || undefined}
              autoStart
            />
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
          <span className="ml-auto text-white/40 text-[0.7rem] font-medium shrink-0">Feedim&apos;da izle</span>
        </a>
      </div>
    );
  }

  // Article embed — PostCard style
  const thumbnail = post.featured_image || post.video_thumbnail;

  return (
    <div
      className="w-full h-[100dvh] flex flex-col overflow-hidden"
      style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", background: "#fff" }}
    >
      <a
        href={postUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex-1 min-h-0 flex flex-col no-underline overflow-hidden"
        style={{ color: "inherit", textDecoration: "none" }}
      >
        {/* Author row */}
        <div className="flex items-center gap-2 px-3 pt-3 pb-1.5">
          {author?.avatar_url ? (
            <img src={author.avatar_url} alt="" className="h-9 w-9 rounded-full object-cover shrink-0" />
          ) : (
            <div className="h-9 w-9 rounded-full bg-neutral-200 shrink-0" />
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1">
              <span style={{ fontSize: "0.84rem", fontWeight: 600, color: "#111" }}>{author?.username || "Anonim"}</span>
              {author?.is_verified && (
                <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="#1d9bf0"><path d="M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.9-.81-3.91s-2.52-1.27-3.91-.81C14.67 2.63 13.43 1.75 12 1.75s-2.67.88-3.34 2.19c-1.39-.46-2.9-.2-3.91.81s-1.27 2.52-.81 3.91C2.63 9.33 1.75 10.57 1.75 12s.88 2.67 2.19 3.34c-.46 1.39-.2 2.9.81 3.91s2.52 1.27 3.91.81c.67 1.31 1.91 2.19 3.34 2.19s2.67-.88 3.34-2.19c1.39.46 2.9.2 3.91-.81s1.27-2.52.81-3.91c1.31-.67 2.19-1.91 2.19-3.34zm-11.29 4.71-4.17-4.17 1.41-1.41 2.76 2.75 6.17-6.17 1.41 1.42-7.58 7.58z" /></svg>
              )}
              {post.published_at && (
                <>
                  <span style={{ color: "#999", fontSize: "0.72rem" }}>·</span>
                  <span style={{ fontSize: "0.68rem", color: "#999" }}>{formatRelative(post.published_at)}</span>
                </>
              )}
            </div>
            {authorName && authorName !== author?.username && (
              <div style={{ fontSize: "0.72rem", color: "#777", marginTop: 1 }}>{authorName}</div>
            )}
          </div>
        </div>

        {/* Title */}
        <div className="px-3">
          <h2 style={{ fontSize: "1.08rem", fontWeight: 600, lineHeight: 1.35, color: "#111", margin: "2px 0 0", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
            {post.title}
          </h2>
        </div>

        {/* Excerpt */}
        {post.excerpt && (
          <p className="px-3" style={{ fontSize: "0.8rem", lineHeight: 1.55, color: "#666", margin: "4px 0 0", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
            {post.excerpt}
          </p>
        )}

        {/* Thumbnail */}
        {thumbnail && (
          <div className="mx-3 mt-2 flex-1 min-h-0 rounded-xl overflow-hidden" style={{ background: "#f3f3f3" }}>
            <img
              src={thumbnail}
              alt=""
              className="w-full h-full object-cover"
              draggable={false}
            />
          </div>
        )}

        {/* Stats */}
        <div className="flex items-center gap-3 px-3 py-1.5" style={{ fontSize: "0.72rem", color: "#999" }}>
          {(post.view_count ?? 0) > 0 && <span>{post.view_count} görüntülenme</span>}
          {(post.like_count ?? 0) > 0 && <span>{post.like_count} beğeni</span>}
          {(post.comment_count ?? 0) > 0 && <span>{post.comment_count} yorum</span>}
        </div>
      </a>

      {/* Feedim branding bar */}
      <a
        href={postUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 px-3 py-2 shrink-0 no-underline"
        style={{ background: "#fafafa", borderTop: "1px solid #eee", textDecoration: "none" }}
      >
        <img src="/imgs/feedim-mobile-light.svg" alt="Feedim" className="h-5 w-5" draggable={false} />
        <span style={{ fontSize: "0.78rem", fontWeight: 600, color: "#111" }}>Feedim</span>
        <span className="ml-auto" style={{ fontSize: "0.72rem", fontWeight: 500, color: "#1d9bf0" }}>Feedim&apos;da gör</span>
      </a>
    </div>
  );
}
