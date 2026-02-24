import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { unstable_cache } from "next/cache";
import EmbedVideoPlayer from "@/components/EmbedVideoPlayer";
import EmbedMomentPlayer from "@/components/EmbedMomentPlayer";

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
  const postUrl = `${baseUrl}/${post.slug}`;
  const isVideo = post.content_type === "video" && post.video_url;
  const isMoment = post.content_type === "moment" && post.video_url;
  const author = Array.isArray(post.profiles) ? post.profiles[0] : post.profiles;
  const authorName = author?.full_name || [author?.name, author?.surname].filter(Boolean).join(" ") || author?.username || "";

  // Moment embed — portrait 9:16
  if (isMoment) {
    return (
      <div className="w-full h-full bg-black flex items-center justify-center overflow-hidden">
        <div className="relative flex flex-col h-full" style={{ aspectRatio: "9/16", maxWidth: "100%", maxHeight: "100%" }}>
        <div className="flex-1 min-h-0 relative">
          <EmbedMomentPlayer
            src={post.video_url}
            poster={post.video_thumbnail || post.featured_image || undefined}
          />
          {/* Author overlay — bottom left */}
          <div className="absolute bottom-10 left-3 right-12 z-[7] pointer-events-none">
            <div className="flex items-center gap-2 mb-1">
              {author?.avatar_url ? (
                <img src={author.avatar_url} alt="" className="h-7 w-7 rounded-full object-cover shrink-0" />
              ) : (
                <div className="h-7 w-7 rounded-full bg-white/20 shrink-0" />
              )}
              <span className="text-white text-[0.8rem] font-semibold truncate">@{author?.username || "Anonim"}</span>
              {author?.is_verified && (
                <svg className="h-[12px] w-[12px] min-w-[12px] shrink-0" viewBox="0 0 24 24" fill="none" style={{ color: "var(--accent-color, #ff3e00)" }}><path d="M10.4521 1.31159C11.2522 0.334228 12.7469 0.334225 13.5471 1.31159L14.5389 2.52304L16.0036 1.96981C17.1853 1.52349 18.4796 2.2708 18.6839 3.51732L18.9372 5.06239L20.4823 5.31562C21.7288 5.51992 22.4761 6.81431 22.0298 7.99598L21.4765 9.46066L22.688 10.4525C23.6653 11.2527 23.6653 12.7473 22.688 13.5475L21.4765 14.5394L22.0298 16.004C22.4761 17.1857 21.7288 18.4801 20.4823 18.6844L18.9372 18.9376L18.684 20.4827C18.4796 21.7292 17.1853 22.4765 16.0036 22.0302L14.5389 21.477L13.5471 22.6884C12.7469 23.6658 11.2522 23.6658 10.4521 22.6884L9.46022 21.477L7.99553 22.0302C6.81386 22.4765 5.51948 21.7292 5.31518 20.4827L5.06194 18.9376L3.51687 18.6844C2.27035 18.4801 1.52305 17.1857 1.96937 16.004L2.5226 14.5394L1.31115 13.5475C0.333786 12.7473 0.333782 11.2527 1.31115 10.4525L2.5226 9.46066L1.96937 7.99598C1.52304 6.81431 2.27036 5.51992 3.51688 5.31562L5.06194 5.06239L5.31518 3.51732C5.51948 2.2708 6.81387 1.52349 7.99553 1.96981L9.46022 2.52304L10.4521 1.31159Z" fill="currentColor"/><path d="M11.2071 16.2071L18.2071 9.20712L16.7929 7.79291L10.5 14.0858L7.20711 10.7929L5.79289 12.2071L9.79289 16.2071C9.98043 16.3947 10.2348 16.5 10.5 16.5C10.7652 16.5 11.0196 16.3947 11.2071 16.2071Z" fill="white"/></svg>
              )}
            </div>
            <p className="text-white/90 text-[0.75rem] line-clamp-2">{post.title}</p>
          </div>
        </div>
        <a
          href={postUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2.5 px-3 py-1.5 bg-[#0a0a0a] hover:bg-[#151515] transition-colors shrink-0"
        >
          <img src="/imgs/feedim-mobile-dark.svg" alt="Feedim" className="h-5 w-5" draggable={false} />
          <span className="text-white/90 text-[0.78rem] font-semibold truncate">Moment</span>
          <span className="ml-auto text-white/40 text-[0.7rem] font-medium shrink-0">Feedim&apos;da izle</span>
        </a>
        </div>
      </div>
    );
  }

  // Video embed — landscape 16:9
  if (isVideo) {
    return (
      <div className="w-full h-full bg-black flex flex-col overflow-hidden">
        <div className="flex-1 min-h-0 flex items-center">
          <div className="w-full max-h-full [&_video]:!max-h-[calc(100dvh-36px)]">
            <EmbedVideoPlayer
              src={post.video_url}
              poster={post.video_thumbnail || post.featured_image || undefined}
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

  // Note embed — Twitter-like text card
  const isNote = post.content_type === "note";
  if (isNote) {
    const noteText = (post.excerpt || post.title || "").replace(/<[^>]+>/g, "");
    return (
      <div className="w-full h-full flex flex-col overflow-hidden" style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", background: "#fff", maxWidth: 420, margin: "0 auto" }}>
        <a
          href={postUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 min-h-0 no-underline overflow-hidden"
          style={{ color: "inherit", textDecoration: "none" }}
        >
          <article className="pt-[4px] pb-[9px] pl-3 pr-3.5">
            <div className="flex gap-2 items-stretch">
              <div className="shrink-0 w-[42px] pt-[11px] pb-0 flex flex-col items-center">
                {author?.avatar_url ? (
                  <img src={author.avatar_url} alt={author?.username || ""} className="h-[42px] w-[42px] min-w-[42px] max-w-[42px] rounded-full object-cover relative z-[1]" />
                ) : (
                  <div className="h-[42px] w-[42px] min-w-[42px] max-w-[42px] rounded-full relative z-[1]" style={{ background: "#e5e7eb" }} />
                )}
                <div className="flex-1 w-px mt-1" style={{ background: "#e5e7eb" }} />
              </div>
              <div className="flex-1 min-w-0 flex flex-col gap-0 p-[5px]">
                <div className="flex items-center gap-1 min-w-0">
                  <span style={{ fontSize: "0.84rem", fontWeight: 600, color: "#111" }} className="truncate">@{author?.username || "Anonim"}</span>
                  {author?.is_verified && (
                    <svg className="h-[12px] w-[12px] min-w-[12px] shrink-0" viewBox="0 0 24 24" fill="none" style={{ color: "var(--accent-color, #ff3e00)" }}><path d="M10.4521 1.31159C11.2522 0.334228 12.7469 0.334225 13.5471 1.31159L14.5389 2.52304L16.0036 1.96981C17.1853 1.52349 18.4796 2.2708 18.6839 3.51732L18.9372 5.06239L20.4823 5.31562C21.7288 5.51992 22.4761 6.81431 22.0298 7.99598L21.4765 9.46066L22.688 10.4525C23.6653 11.2527 23.6653 12.7473 22.688 13.5475L21.4765 14.5394L22.0298 16.004C22.4761 17.1857 21.7288 18.4801 20.4823 18.6844L18.9372 18.9376L18.684 20.4827C18.4796 21.7292 17.1853 22.4765 16.0036 22.0302L14.5389 21.477L13.5471 22.6884C12.7469 23.6658 11.2522 23.6658 10.4521 22.6884L9.46022 21.477L7.99553 22.0302C6.81386 22.4765 5.51948 21.7292 5.31518 20.4827L5.06194 18.9376L3.51687 18.6844C2.27035 18.4801 1.52305 17.1857 1.96937 16.004L2.5226 14.5394L1.31115 13.5475C0.333786 12.7473 0.333782 11.2527 1.31115 10.4525L2.5226 9.46066L1.96937 7.99598C1.52304 6.81431 2.27036 5.51992 3.51688 5.31562L5.06194 5.06239L5.31518 3.51732C5.51948 2.2708 6.81387 1.52349 7.99553 1.96981L9.46022 2.52304L10.4521 1.31159Z" fill="currentColor"/><path d="M11.2071 16.2071L18.2071 9.20712L16.7929 7.79291L10.5 14.0858L7.20711 10.7929L5.79289 12.2071L9.79289 16.2071C9.98043 16.3947 10.2348 16.5 10.5 16.5C10.7652 16.5 11.0196 16.3947 11.2071 16.2071Z" fill="white"/></svg>
                  )}
                  {post.published_at && (
                    <>
                      <span style={{ color: "#9ca3af80", fontSize: "0.75rem" }}>·</span>
                      <span style={{ fontSize: "0.62rem", color: "#6b7280" }} className="shrink-0">{formatRelative(post.published_at)}</span>
                    </>
                  )}
                  <span style={{ color: "#9ca3af80", fontSize: "0.75rem" }}>·</span>
                  <span style={{ fontSize: "0.62rem", color: "#6b7280" }} className="shrink-0">Not</span>
                </div>
                <p style={{ fontSize: "0.88rem", lineHeight: 1.45, color: "#111", margin: "4px 0 0", whiteSpace: "pre-line", display: "-webkit-box", WebkitLineClamp: 8, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                  {noteText}
                </p>
              </div>
            </div>
          </article>

          <div className="flex items-center gap-2 px-3 mt-3">
            {(post.comment_count ?? 0) > 0 && (
              <div className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5" style={{ borderRadius: 12, background: "#f3f4f6", fontSize: "0.82rem", fontWeight: 500, color: "#6b7280" }}>
                <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                <span>{post.comment_count}</span>
              </div>
            )}
            {(post.like_count ?? 0) > 0 && (
              <div className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5" style={{ borderRadius: 12, background: "#f3f4f6", fontSize: "0.82rem", fontWeight: 500, color: "#6b7280" }}>
                <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0016.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 002 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
                <span>{post.like_count}</span>
              </div>
            )}
          </div>
        </a>

        <a
          href={postUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2.5 px-3 py-1.5 shrink-0 no-underline"
          style={{ background: "#0a0a0a", textDecoration: "none", marginTop: "auto" }}
        >
          <img src="/imgs/feedim-mobile-dark.svg" alt="Feedim" className="h-5 w-5" draggable={false} />
          <span style={{ fontSize: "0.78rem", fontWeight: 600, color: "rgba(255,255,255,0.9)" }} className="truncate">Not</span>
          <span className="ml-auto shrink-0" style={{ fontSize: "0.7rem", fontWeight: 500, color: "rgba(255,255,255,0.4)" }}>Feedim&apos;da gör</span>
        </a>
      </div>
    );
  }

  // Article embed — birebir PostCard tasarımı
  const thumbnail = post.featured_image || post.video_thumbnail;
  const hasThumbnail = !!thumbnail;

  return (
    <div className="w-full h-full flex flex-col overflow-hidden" style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", background: "#fff", maxWidth: 420, margin: "0 auto" }}>
      <a
        href={postUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex-1 min-h-0 no-underline overflow-hidden"
        style={{ color: "inherit", textDecoration: "none" }}
      >
        <article className="pt-[4px] pb-[9px] pl-3 pr-3.5">
          <div className="flex gap-2 items-stretch">
            {/* Avatar — fixed left column with timeline line */}
            <div className="shrink-0 w-[42px] pt-[11px] pb-0 flex flex-col items-center">
              {author?.avatar_url ? (
                <img src={author.avatar_url} alt={author?.username || ""} className="h-[42px] w-[42px] min-w-[42px] max-w-[42px] rounded-full object-cover relative z-[1]" />
              ) : (
                <div className="h-[42px] w-[42px] min-w-[42px] max-w-[42px] rounded-full relative z-[1]" style={{ background: "#e5e7eb" }} />
              )}
              <div className="flex-1 w-px mt-1" style={{ background: "#e5e7eb" }} />
            </div>

            {/* Content — right side */}
            <div className="flex-1 min-w-0 flex flex-col gap-0 p-[5px]">
              {/* Name row */}
              <div className="flex items-center gap-1 min-w-0">
                <span style={{ fontSize: "0.84rem", fontWeight: 600, color: "#111" }} className="truncate">@{author?.username || "Anonim"}</span>
                {author?.is_verified && (
                  <svg className="h-[12px] w-[12px] min-w-[12px] shrink-0" viewBox="0 0 24 24" fill="none" style={{ color: "var(--accent-color, #ff3e00)" }}><path d="M10.4521 1.31159C11.2522 0.334228 12.7469 0.334225 13.5471 1.31159L14.5389 2.52304L16.0036 1.96981C17.1853 1.52349 18.4796 2.2708 18.6839 3.51732L18.9372 5.06239L20.4823 5.31562C21.7288 5.51992 22.4761 6.81431 22.0298 7.99598L21.4765 9.46066L22.688 10.4525C23.6653 11.2527 23.6653 12.7473 22.688 13.5475L21.4765 14.5394L22.0298 16.004C22.4761 17.1857 21.7288 18.4801 20.4823 18.6844L18.9372 18.9376L18.684 20.4827C18.4796 21.7292 17.1853 22.4765 16.0036 22.0302L14.5389 21.477L13.5471 22.6884C12.7469 23.6658 11.2522 23.6658 10.4521 22.6884L9.46022 21.477L7.99553 22.0302C6.81386 22.4765 5.51948 21.7292 5.31518 20.4827L5.06194 18.9376L3.51687 18.6844C2.27035 18.4801 1.52305 17.1857 1.96937 16.004L2.5226 14.5394L1.31115 13.5475C0.333786 12.7473 0.333782 11.2527 1.31115 10.4525L2.5226 9.46066L1.96937 7.99598C1.52304 6.81431 2.27036 5.51992 3.51688 5.31562L5.06194 5.06239L5.31518 3.51732C5.51948 2.2708 6.81387 1.52349 7.99553 1.96981L9.46022 2.52304L10.4521 1.31159Z" fill="currentColor"/><path d="M11.2071 16.2071L18.2071 9.20712L16.7929 7.79291L10.5 14.0858L7.20711 10.7929L5.79289 12.2071L9.79289 16.2071C9.98043 16.3947 10.2348 16.5 10.5 16.5C10.7652 16.5 11.0196 16.3947 11.2071 16.2071Z" fill="white"/></svg>
                )}
                {post.published_at && (
                  <>
                    <span style={{ color: "#9ca3af80", fontSize: "0.75rem" }}>·</span>
                    <span style={{ fontSize: "0.62rem", color: "#6b7280" }} className="shrink-0">{formatRelative(post.published_at)}</span>
                  </>
                )}
                <span style={{ color: "#9ca3af80", fontSize: "0.75rem" }}>·</span>
                <span style={{ fontSize: "0.62rem", color: "#6b7280" }} className="shrink-0">Gönderi</span>
              </div>

              {/* Title */}
              <h3 style={{ fontSize: "1.12rem", fontWeight: 600, lineHeight: 1.4, color: "#111", margin: 0, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                {post.title}
              </h3>

              {/* Excerpt */}
              {post.excerpt && (
                <p style={{ fontSize: "0.8rem", color: "#6b7280", lineHeight: 1.35, margin: "2px 0 0", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                  {post.excerpt}
                </p>
              )}

              {/* Thumbnail */}
              {hasThumbnail && (
                <div className="mt-2 overflow-hidden" style={{ borderRadius: 12, background: "#f3f4f6" }}>
                  <div className="relative w-full" style={{ aspectRatio: "4/3" }}>
                    <img
                      src={thumbnail}
                      alt={post.title}
                      className="w-full h-full object-cover"
                      draggable={false}
                    />
                  </div>
                </div>
              )}

              {/* View count */}
              {(post.view_count ?? 0) > 0 && (
                <span style={{ fontSize: "0.7rem", color: "#6b7280", marginTop: 4 }}>{post.view_count} görüntülenme</span>
              )}
            </div>
          </div>
        </article>

        {/* Stats bar — like PostInteractionBar */}
        <div className="flex items-center gap-2 px-3 mt-3">
          <div className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5" style={{ borderRadius: 12, background: "#f3f4f6", fontSize: "0.82rem", fontWeight: 500, color: "#111" }}>
            <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
            <span>Devamı</span>
          </div>
          {(post.comment_count ?? 0) > 0 && (
            <div className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5" style={{ borderRadius: 12, background: "#f3f4f6", fontSize: "0.82rem", fontWeight: 500, color: "#6b7280" }}>
              <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              <span>{post.comment_count}</span>
            </div>
          )}
          {(post.like_count ?? 0) > 0 && (
            <div className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5" style={{ borderRadius: 12, background: "#f3f4f6", fontSize: "0.82rem", fontWeight: 500, color: "#6b7280" }}>
              <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0016.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 002 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
              <span>{post.like_count}</span>
            </div>
          )}
        </div>
      </a>

      {/* Feedim branding bar — same as video/moment embeds */}
      <a
        href={postUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2.5 px-3 py-1.5 shrink-0 no-underline"
        style={{ background: "#0a0a0a", textDecoration: "none", marginTop: "auto" }}
      >
        <img src="/imgs/feedim-mobile-dark.svg" alt="Feedim" className="h-5 w-5" draggable={false} />
        <span style={{ fontSize: "0.78rem", fontWeight: 600, color: "rgba(255,255,255,0.9)" }} className="truncate">{post.title}</span>
        <span className="ml-auto shrink-0" style={{ fontSize: "0.7rem", fontWeight: 500, color: "rgba(255,255,255,0.4)" }}>Feedim&apos;da gör</span>
      </a>
    </div>
  );
}
