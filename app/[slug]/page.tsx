import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthUserId } from "@/lib/auth";
import { unstable_cache } from "next/cache";
import PostInteractionBar from "@/components/PostInteractionBar";
import PostHeaderActions from "@/components/PostHeaderActions";
import RelatedPosts from "@/components/RelatedPosts";
import Link from "next/link";

import { formatRelativeDate, formatCount, getPostUrl } from "@/lib/utils";
import PostStats from "@/components/PostStats";
import sanitizeHtml from "sanitize-html";
import PostContentClient from "@/components/PostContentClient";
import VideoPlayerClient from "@/components/VideoPlayerClient";
import VideoSidebar from "@/components/VideoSidebar";
import VideoSidebarPortal from "@/components/VideoSidebarPortal";
import VideoDescription from "@/components/VideoDescription";
import VideoGridCard from "@/components/VideoGridCard";
import type { VideoItem } from "@/components/VideoSidebar";
import PostViewTracker from "@/components/PostViewTracker";
import VideoViewTracker from "@/components/VideoViewTracker";
import RemovedPostTemplate from "@/components/RemovedPostTemplate";
import VerifiedBadge, { getBadgeVariant } from "@/components/VerifiedBadge";
import PostFollowButton from "@/components/PostFollowButton";
import HeaderTitle from "@/components/HeaderTitle";
import AmbientLight from "@/components/AmbientLight";
import ModerationBadge from "@/components/ModerationBadge";
import { getTranslations } from "next-intl/server";
import { getAlternateLanguages } from "@/lib/seo";

interface PageProps {
  params: Promise<{ slug: string }>;
}

async function getPost(rawSlug: string) {
  // Use admin client for public reads — bypasses JWT validation entirely.
  // Published posts are public content; no auth dependency needed.
  const admin = createAdminClient();
  const slug = decodeURIComponent(rawSlug);

  const { data: post, error } = await admin
    .from("posts")
    .select(`
      *,
      profiles!posts_author_id_fkey(user_id, name, surname, full_name, username, avatar_url, is_verified, is_premium, premium_plan, role, profile_score, follower_count, post_count, status, account_private),
      post_tags(tag_id, tags(id, name, slug)),
      post_categories(category_id, categories(id, name, slug))
    `)
    .eq("slug", slug)
    .in("status", ["published", "removed", "moderation"])
    .single();

  if (error || !post) return null;

  return post;
}

async function getAuthorContent(authorId: string, currentPostId: number) {
  const admin = createAdminClient();

  // Quality gate: author must meet minimum criteria
  const { data: authorProfile } = await admin
    .from("profiles")
    .select("profile_score, follower_count, is_verified, post_count, status")
    .eq("user_id", authorId)
    .single();

  if (!authorProfile || authorProfile.status !== "active") return [];
  const ps = authorProfile.profile_score || 0;
  const fc = authorProfile.follower_count || 0;
  const pc = authorProfile.post_count || 0;
  if (ps < 15 && !authorProfile.is_verified) return [];
  if (fc < 1 && pc < 3) return [];

  const { data: posts } = await admin
    .from("posts")
    .select(`
      id, title, slug, excerpt, featured_image, reading_time, like_count, comment_count, save_count, view_count, published_at, content_type, video_duration, video_thumbnail, video_url, blurhash,
      profiles!posts_author_id_fkey(user_id, name, surname, full_name, username, avatar_url, is_verified, premium_plan, role, status)
    `)
    .eq("author_id", authorId)
    .eq("status", "published")
    .eq("is_nsfw", false)
    .neq("id", currentPostId)
    .order("trending_score", { ascending: false })
    .limit(6);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (posts || []).filter((p: any) => {
    const a = Array.isArray(p.profiles) ? p.profiles[0] : p.profiles;
    return !a?.status || a.status === 'active';
  }).slice(0, 3).map((p: any) => ({
    ...p,
    profiles: Array.isArray(p.profiles) ? p.profiles[0] : p.profiles,
  }));
}

async function getFeaturedContent(currentPostId: number, authorId: string) {
  const admin = createAdminClient();

  const { data: posts } = await admin
    .from("posts")
    .select(`
      id, title, slug, excerpt, featured_image, reading_time, like_count, comment_count, save_count, view_count, published_at, content_type, video_duration, video_thumbnail, video_url, blurhash,
      profiles!posts_author_id_fkey(user_id, name, surname, full_name, username, avatar_url, is_verified, premium_plan, role, status)
    `)
    .eq("status", "published")
    .eq("is_nsfw", false)
    .neq("id", currentPostId)
    .neq("author_id", authorId)
    .order("trending_score", { ascending: false })
    .limit(6);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (posts || []).filter((p: any) => {
    const a = Array.isArray(p.profiles) ? p.profiles[0] : p.profiles;
    return !a?.status || a.status === 'active';
  }).slice(0, 3).map((p: any) => ({
    ...p,
    profiles: Array.isArray(p.profiles) ? p.profiles[0] : p.profiles,
  }));
}

async function getNextVideos(currentPostId: number, authorId: string): Promise<VideoItem[]> {
  const admin = createAdminClient();

  // Fetch videos + moments: prioritize same author, then others
  const { data: authorVideos } = await admin
    .from("posts")
    .select(`
      id, title, slug, video_thumbnail, featured_image, video_duration, view_count, published_at, author_id, content_type,
      profiles!posts_author_id_fkey(user_id, username, avatar_url, is_verified, premium_plan, role, status)
    `)
    .in("content_type", ["video", "moment"])
    .eq("status", "published")
    .eq("is_nsfw", false)
    .eq("author_id", authorId)
    .neq("id", currentPostId)
    .order("published_at", { ascending: false })
    .limit(5);

  const { data: otherVideos } = await admin
    .from("posts")
    .select(`
      id, title, slug, video_thumbnail, featured_image, video_duration, view_count, published_at, author_id, content_type,
      profiles!posts_author_id_fkey(user_id, username, avatar_url, is_verified, premium_plan, role, status)
    `)
    .in("content_type", ["video", "moment"])
    .eq("status", "published")
    .eq("is_nsfw", false)
    .neq("author_id", authorId)
    .neq("id", currentPostId)
    .order("published_at", { ascending: false })
    .limit(20);

  const filterActive = (v: any) => {
    const author = Array.isArray(v.profiles) ? v.profiles[0] : v.profiles;
    return !author?.status || author.status === 'active';
  };

  const authorList = (authorVideos || []).filter(filterActive).map((v: any) => ({
    ...v,
    profiles: Array.isArray(v.profiles) ? v.profiles[0] : v.profiles,
  }));

  const otherList = (otherVideos || []).filter(filterActive).map((v: any) => ({
    ...v,
    profiles: Array.isArray(v.profiles) ? v.profiles[0] : v.profiles,
  }));

  return [...authorList, ...otherList].slice(0, 20);
}

const getCachedPost = unstable_cache(getPost, ["post-by-slug"], { revalidate: 60, tags: ["posts"] });
const getCachedAuthorContent = unstable_cache(getAuthorContent, ["author-content"], { revalidate: 300, tags: ["posts"] });
const getCachedFeaturedContent = unstable_cache(getFeaturedContent, ["featured-content"], { revalidate: 300, tags: ["posts"] });
const getCachedNextVideos = unstable_cache(getNextVideos, ["next-videos"], { revalidate: 300, tags: ["posts"] });

async function getUserInteractions(postId: number) {
  const userId = await getAuthUserId();
  if (!userId) return { liked: false, saved: false, userId: null };

  const admin = createAdminClient();
  const [{ data: like }, { data: bookmark }] = await Promise.all([
    admin.from("likes").select("id").eq("user_id", userId).eq("post_id", postId).single(),
    admin.from("bookmarks").select("id").eq("user_id", userId).eq("post_id", postId).single(),
  ]);

  return { liked: !!like, saved: !!bookmark, userId };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getCachedPost(slug);
  const tp = await getTranslations("post");
  if (!post) return { title: tp("postNotFound") };

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://feedim.com";
  const title = post.meta_title || post.title;
  const description = post.meta_description || post.excerpt || "";
  const url = `${baseUrl}${getPostUrl(encodeURIComponent(post.slug), post.content_type)}`;
  const authorName = post.profiles?.full_name || post.profiles?.username || "Feedim";

  const keywords = post.meta_keywords
    ? post.meta_keywords.split(",").map((k: string) => k.trim()).filter(Boolean)
    : undefined;

  const isVideo = post.content_type === "video" || post.content_type === "moment";
  const ogImage = post.video_thumbnail || post.featured_image;

  return {
    title: `${title} | Feedim`,
    description,
    keywords,
    authors: [{ name: authorName }],
    openGraph: {
      title,
      description,
      type: isVideo ? "video.other" : "article",
      url,
      publishedTime: post.published_at,
      modifiedTime: post.updated_at,
      authors: [authorName],
      images: ogImage ? [{ url: ogImage, width: 1200, height: 630 }] : undefined,
      ...(isVideo && post.video_url ? { videos: [{ url: post.video_url, type: "video/mp4" }] } : {}),
      siteName: "Feedim",
      locale: "tr_TR",
    },
    twitter: {
      card: isVideo ? "player" : "summary_large_image",
      title,
      description,
      images: ogImage ? [ogImage] : undefined,
    },
    alternates: {
      canonical: url,
      languages: getAlternateLanguages(`/${encodeURIComponent(post.slug)}`),
      types: {
        'application/json+oembed': `${baseUrl}/api/oembed?url=${encodeURIComponent(url)}&format=json`,
      },
    },
  };
}

export default async function PostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = await getCachedPost(slug);
  if (!post) notFound();

  // Redirect typed content to their canonical URLs
  if (post.content_type === "video" || post.content_type === "note" || post.content_type === "moment") {
    redirect(getPostUrl(post.slug, post.content_type));
  }

  const currentUserId = await getAuthUserId();

  // Check if viewer is admin or moderator
  let isStaff = false;
  if (currentUserId) {
    const staffAdmin = createAdminClient();
    const { data: viewerProfile } = await staffAdmin
      .from('profiles')
      .select('role')
      .eq('user_id', currentUserId)
      .single();
    isStaff = viewerProfile?.role === 'admin' || viewerProfile?.role === 'moderator';
  }

  // Author status check — staff can see posts from inactive authors
  const postAuthorData = post.profiles;
  if (!isStaff && postAuthorData?.status && postAuthorData.status !== 'active') notFound();

  // Moderation status — staff, author, and copyright owner can view
  if (post.status === 'moderation') {
    let canViewModeration = isStaff || post.author_id === currentUserId;
    // Allow copyright owner to view infringing post
    if (!canViewModeration && currentUserId && post.copyright_match_id) {
      const adminCheck = createAdminClient();
      const { data: originalPost } = await adminCheck
        .from('posts')
        .select('author_id')
        .eq('id', post.copyright_match_id)
        .single();
      if (originalPost?.author_id === currentUserId) canViewModeration = true;
    }
    if (!canViewModeration) notFound();
  }

  // Removed post: show template to author (24h window), staff can always view
  if (post.status === 'removed') {
    if (!isStaff) {
      if (post.author_id !== currentUserId) notFound();
      const removedAt = post.removed_at ? new Date(post.removed_at) : null;
      const hoursAgo = removedAt ? (Date.now() - removedAt.getTime()) / (1000 * 60 * 60) : 999;
      if (hoursAgo > 24) notFound();
    }
    if (!isStaff) {
      return <RemovedPostTemplate reason={post.removal_reason} decisionNumber={post.removal_decision_id} />;
    }
  }

  // NSFW post: only author, staff, or copyright owner can view
  if (post.is_nsfw && post.author_id !== currentUserId && !isStaff) {
    let isCopyrightOwner = false;
    if (currentUserId && post.copyright_match_id) {
      const adminCheck2 = createAdminClient();
      const { data: origPost } = await adminCheck2
        .from('posts')
        .select('author_id')
        .eq('id', post.copyright_match_id)
        .single();
      if (origPost?.author_id === currentUserId) isCopyrightOwner = true;
    }
    if (!isCopyrightOwner) notFound();
  }

  // Private account check — staff bypasses
  const postAuthor = post.profiles;
  if (postAuthor?.account_private && !isStaff) {
    if (currentUserId !== postAuthor.user_id) {
      const adminClient = createAdminClient();
      const { data: follow } = await adminClient
        .from('follows').select('id')
        .eq('follower_id', currentUserId || '').eq('following_id', postAuthor.user_id).single();
      if (!follow) redirect(`/u/${postAuthor.username}`);
    }
  }

  const isVideo = post.content_type === "video" || post.content_type === "moment";
  const isNote = post.content_type === "note";
  const [authorContent, interactions, nextVideos, featuredContent] = await Promise.all([
    getCachedAuthorContent(post.author_id, post.id),
    getUserInteractions(post.id),
    isVideo ? getCachedNextVideos(post.id, post.author_id) : Promise.resolve([]),
    getCachedFeaturedContent(post.id, post.author_id),
  ]);

  const t = await getTranslations("post");
  const tCommon = await getTranslations("common");

  const author = post.profiles;
  const authorName = author?.full_name || [author?.name, author?.surname].filter(Boolean).join(" ") || author?.username || tCommon("anonymous");
  const isOwnPost = currentUserId === author?.user_id;
  const tags = (post.post_tags || []).map((pt: { tags: { id: number; name: string; slug: string } }) => pt.tags).filter(Boolean);
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://feedim.com";

  const sanitizedContent = sanitizeHtml(post.content || "", {
    allowedTags: ['h2', 'h3', 'h4', 'p', 'br', 'strong', 'em', 'a', 'img', 'ul', 'ol', 'li', 'blockquote', 'div', 'span', 'figure', 'figcaption', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'hr', 'code', 'pre', 'sub', 'sup', 'mark', 'del', 's'],
    allowedAttributes: { 'a': ['href', 'target', 'rel'], 'img': ['src', 'alt', 'width', 'height', 'loading'], 'td': ['colspan', 'rowspan'], 'th': ['colspan', 'rowspan'], '*': ['class'] },
    allowedSchemesByTag: { img: ['http', 'https', 'data'] },
  });

  const jsonLd = post.content_type === "video" ? {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    name: post.title,
    description: post.excerpt || "",
    thumbnailUrl: post.video_thumbnail || post.featured_image || undefined,
    contentUrl: post.video_url,
    duration: post.video_duration ? `PT${Math.floor(post.video_duration / 60)}M${post.video_duration % 60}S` : undefined,
    uploadDate: post.published_at,
    author: { "@type": "Person", name: authorName, url: `${baseUrl}/u/${author?.username}` },
    publisher: { "@type": "Organization", name: "Feedim", url: baseUrl, logo: { "@type": "ImageObject", url: `${baseUrl}/favicon.png` } },
  } : {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.excerpt || "",
    image: post.featured_image || undefined,
    datePublished: post.published_at,
    dateModified: post.updated_at,
    wordCount: post.word_count,
    author: { "@type": "Person", name: authorName, url: `${baseUrl}/u/${author?.username}` },
    publisher: { "@type": "Organization", name: "Feedim", url: baseUrl, logo: { "@type": "ImageObject", url: `${baseUrl}/favicon.png` } },
    mainEntityOfPage: { "@type": "WebPage", "@id": `${baseUrl}/${encodeURIComponent(post.slug)}` },
  };

  // ─── Video post: YouTube-like layout ───
  if (isVideo) {
    const nextVideo = nextVideos[0] || null;
    const plainDescription = sanitizedContent ? sanitizedContent.replace(/<[^>]+>/g, '') : '';
    let videoOrigin: string | null = null;
    if (post.video_url) {
      try { videoOrigin = new URL(post.video_url).origin; } catch {}
    }

    return (
      <div suppressHydrationWarning>
        {/* Preload video for faster playback start */}
        {post.video_url && (
          <>
            {videoOrigin && <link rel="preconnect" href={videoOrigin} crossOrigin="anonymous" />}
            {videoOrigin && <link rel="dns-prefetch" href={videoOrigin} />}
          </>
        )}
        <script type="application/ld+json" suppressHydrationWarning dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/<\//g, '<\\/') }} />
        <AmbientLight imageSrc={post.video_thumbnail || post.featured_image || undefined} videoMode />
        <HeaderTitle title={post.content_type === "moment" ? "Moment" : "Video"} />
        <VideoViewTracker postId={post.id} />

        {/* NSFW moderation banner */}
        {post.is_nsfw && (isOwnPost || isStaff) && (
          <Link href={`/${post.slug}/moderation`} className="block mx-3 sm:mx-4 mb-3 bg-[var(--accent-color)]/5 border border-[var(--accent-color)]/20 rounded-xl p-4 hover:bg-[var(--accent-color)]/10 transition">
            <ModerationBadge label={t("moderationBanner")} />
            <p className="text-[var(--accent-color)]/70 text-xs mt-1.5">{t("moderationBannerDesc")} &rarr;</p>
          </Link>
        )}
        <PostHeaderActions
          postId={post.id} postUrl={`/${post.slug}`} postTitle={post.title}
          authorUsername={author?.username} authorUserId={author?.user_id} authorName={authorName}
          isOwnPost={isOwnPost} postSlug={post.slug} portalToHeader
          isVideo contentType={post.content_type}
        />

        {/* Portal: inject VideoSidebar into the existing right sidebar */}
        <VideoSidebarPortal videos={nextVideos} />

        <article className="px-3 sm:px-4" style={{ overflowX: "clip" }}>
          {/* Video Player — edge-to-edge */}
          {post.video_url && (
            <div className="mb-3 -mx-3 sm:-mx-4 sm:mx-0">
              <VideoPlayerClient
                src={post.video_url}
                hlsUrl={post.hls_url || undefined}
                poster={post.video_thumbnail || post.featured_image || undefined}
                slug={post.slug}
                nextVideoSlug={nextVideo?.slug}
                nextVideoTitle={nextVideo?.title}
                nextVideoThumbnail={nextVideo?.video_thumbnail || nextVideo?.featured_image}
                videoDuration={post.video_duration || undefined}
              />
            </div>
          )}

          {/* Title */}
          <h1 className="text-[1.2rem] sm:text-[1.3rem] font-bold leading-[1.5] mb-2">{post.title}</h1>

          {/* Stats row */}
          <div className="flex items-center gap-3 text-[0.78rem] text-text-muted mb-3">
            <span>{t("viewCount", { count: formatCount(post.view_count || 0) })}</span>
            {post.published_at && (
              <>
                <span>{formatRelativeDate(post.published_at)}</span>
              </>
            )}
          </div>

          {/* Channel row — YouTube style */}
          <div className="flex items-center gap-3">
            <Link href={`/u/${author?.username}`} className="shrink-0">
              {author?.avatar_url ? (
                <img src={author.avatar_url} alt={authorName} className="h-10 w-10 rounded-full object-cover" loading="lazy" />
              ) : (
                <img className="default-avatar-auto h-10 w-10 rounded-full object-cover" alt="" loading="lazy" />
              )}
            </Link>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <Link href={`/u/${author?.username}`} className="font-semibold text-[0.9rem] hover:underline truncate">
                  @{author?.username}
                </Link>
                {author?.is_verified && <VerifiedBadge size="sm" variant={getBadgeVariant(author?.premium_plan)} role={author?.role} />}
              </div>
              {author?.follower_count !== undefined && (
                <p className="text-[0.72rem] text-text-muted">{t("followers", { count: formatCount(author.follower_count) })}</p>
              )}
            </div>
            <PostFollowButton authorUsername={author?.username || ""} authorUserId={author?.user_id || ""} />
          </div>

          {/* Description — above interaction bar */}
          {plainDescription && (
            <VideoDescription text={plainDescription} />
          )}

          {/* Copyright protection badge */}
          {post.copyright_protected && (
            <div className="flex items-center gap-1 mt-2 mb-1">
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-text-muted"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/></svg>
              <span className="text-xs text-text-muted">{t("copyrightProtected")}</span>
              <span className="text-text-muted/40 mx-0.5">·</span>
              <Link href="/help/copyright" target="_blank" rel="noopener noreferrer" className="text-xs text-text-muted hover:underline">{t("moreInfo")}</Link>
            </div>
          )}

          {/* Interaction bar — stats → buttons → tags → liked-by */}
          <PostInteractionBar
            postId={post.id}
            initialLiked={interactions.liked}
            initialSaved={interactions.saved}
            likeCount={post.like_count || 0}
            commentCount={post.comment_count || 0}
            saveCount={post.save_count || 0}
            shareCount={post.share_count || 0}
            viewCount={post.view_count || 0}
            hideStats
            isOwnPost={isOwnPost}
            postUrl={`/${post.slug}`}
            postTitle={post.title}
            postSlug={post.slug}
            authorUsername={author?.username}
            likedByBottom
            isVideo
            contentType={post.content_type}
          >
            {/* Tags */}
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2 mb-2">
                {tags.map((tag: { id: number; name: string; slug: string }) => (
                  <Link key={tag.id} href={`/explore/tag/${tag.slug}`}
                    className="bg-bg-secondary text-text-primary text-[0.86rem] font-bold px-4 py-2 rounded-full transition hover:bg-bg-tertiary">
                    #{tag.name}
                  </Link>
                ))}
              </div>
            )}
          </PostInteractionBar>

          {/* Next videos — mobile/tablet (below content, hidden on xl where sidebar shows) */}
          {nextVideos.length > 0 && (
            <div className="xl:hidden mb-6 pt-3.5">
              <h3 className="text-[1.1rem] font-bold mb-4">{t("nextVideos")}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-6">
                {nextVideos.map(video => (
                  <VideoGridCard key={video.id} video={video} />
                ))}
              </div>
            </div>
          )}

          {/* Bottom padding for mobile nav bar */}
          <div className="h-8 md:h-0" />
        </article>
      </div>
    );
  }

  // ─── Note layout (minimal, Twitter-style) ───
  if (isNote) {
    const noteText = sanitizedContent.replace(/<[^>]+>/g, '').trim();
    return (
      <div suppressHydrationWarning style={{ overflowX: "clip" }}>
        <script
          type="application/ld+json"
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/<\//g, '<\\/') }}
        />
        <HeaderTitle title={t("note")} />
        <PostViewTracker postId={post.id} />

        {/* NSFW moderation banner */}
        {post.is_nsfw && (isOwnPost || isStaff) && (
          <Link href={`/${post.slug}/moderation`} className="block mx-4 sm:mx-5 mt-3 bg-[var(--accent-color)]/5 border border-[var(--accent-color)]/20 rounded-xl p-4 hover:bg-[var(--accent-color)]/10 transition">
            <ModerationBadge label={t("moderationBanner")} />
            <p className="text-[var(--accent-color)]/70 text-xs mt-1.5">{t("moderationBannerDesc")} &rarr;</p>
          </Link>
        )}

        <article className="px-4 sm:px-5 py-3 md:py-5">
          <PostHeaderActions
            postId={post.id}
            postUrl={`/${post.slug}`}
            postTitle={post.title}
            authorUsername={author?.username}
            authorUserId={author?.user_id}
            authorName={authorName}
            isOwnPost={isOwnPost}
            postSlug={post.slug}
            portalToHeader
            contentType={post.content_type}
          />

          {/* Author */}
          <div className="flex items-center gap-2 mb-4">
            {author?.avatar_url ? (
              <img src={author.avatar_url} alt={authorName} className="h-10 w-10 rounded-full object-cover" loading="lazy" />
            ) : (
              <img className="default-avatar-auto h-10 w-10 rounded-full object-cover shrink-0" alt="" loading="lazy" />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <Link href={`/u/${author?.username}`} className="font-semibold text-[0.85rem] hover:underline truncate">@{author?.username}</Link>
                {author?.is_verified && <VerifiedBadge size="sm" variant={getBadgeVariant(author?.premium_plan)} role={author?.role} />}
              </div>
              <div className="flex items-center gap-2.5 text-[0.65rem] text-text-muted">
                {post.published_at && <span>{formatRelativeDate(post.published_at)}</span>}
              </div>
            </div>
            <PostFollowButton authorUsername={author?.username || ""} authorUserId={author?.user_id || ""} />
          </div>

          {/* Note content — large font, plain text */}
          <p className="text-[1.15rem] leading-[1.65] text-text-primary whitespace-pre-line mb-3">
            {noteText}
          </p>

          {/* View count — below content */}
          {(post.view_count || 0) > 0 && (
            <p className="text-[0.75rem] text-text-muted mb-5">{t("viewCount", { count: formatCount(post.view_count || 0) })}</p>
          )}

          {/* Interaction bar + tags */}
          <PostInteractionBar
            postId={post.id}
            initialLiked={interactions.liked}
            initialSaved={interactions.saved}
            likeCount={post.like_count || 0}
            commentCount={post.comment_count || 0}
            saveCount={post.save_count || 0}
            shareCount={post.share_count || 0}
            viewCount={post.view_count || 0}
            hideStats
            isOwnPost={isOwnPost}
            postUrl={`/${post.slug}`}
            postTitle={post.title}
            postSlug={post.slug}
            authorUsername={author?.username}
            likedByBottom
            contentType={post.content_type}
          >
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2 mb-2">
                {tags.map((tag: { id: number; name: string; slug: string }) => (
                  <Link key={tag.id} href={`/explore/tag/${tag.slug}`}
                    className="bg-bg-secondary text-text-primary text-[0.86rem] font-bold px-4 py-2 rounded-full transition hover:bg-bg-tertiary">
                    #{tag.name}
                  </Link>
                ))}
              </div>
            )}
          </PostInteractionBar>

          {/* Related content — same as post page */}
          <RelatedPosts
            posts={authorContent}
            featuredPosts={featuredContent}
            authorUsername={author?.username}
          />

        </article>
      </div>
    );
  }

  // ─── Regular post layout (unchanged) ───
  return (
    <div suppressHydrationWarning style={{ overflowX: "clip" }}>
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/<\//g, '<\\/') }}
      />
      {post.featured_image && <AmbientLight imageSrc={post.featured_image} />}
      <HeaderTitle title={t("post")} />
      <PostViewTracker postId={post.id} />

        {/* NSFW moderation banner */}
        {post.is_nsfw && (isOwnPost || isStaff) && (
          <Link href={`/${post.slug}/moderation`} className="block mx-4 sm:mx-5 mt-3 bg-[var(--accent-color)]/5 border border-[var(--accent-color)]/20 rounded-xl p-4 hover:bg-[var(--accent-color)]/10 transition">
            <ModerationBadge label={t("moderationBanner")} />
            <p className="text-[var(--accent-color)]/70 text-xs mt-1.5">{t("moderationBannerDesc")} &rarr;</p>
          </Link>
        )}

        {/* Main content */}
        <article className="px-4 sm:px-5 py-3 md:py-5">
          {/* PostHeaderActions — portals to header */}
          <PostHeaderActions
            postId={post.id}
            postUrl={`/${post.slug}`}
            postTitle={post.title}
            authorUsername={author?.username}
            authorUserId={author?.user_id}
            authorName={authorName}
            isOwnPost={isOwnPost}
            postSlug={post.slug}
            portalToHeader
            contentType={post.content_type}
          />

          {/* Stats — views + likes */}
          <div className="mb-3">
            <PostStats viewCount={post.view_count || 0} likeCount={post.like_count || 0} postId={post.id} />
          </div>

          {/* Title */}
          <h1 className="text-[1.44rem] font-bold leading-[1.36] mb-5">{post.title}</h1>

          {/* Author — PostHead */}
          <div className="flex items-center gap-2 mb-3">
            {author?.avatar_url ? (
              <img
                src={author.avatar_url}
                alt={authorName}
                className="h-10 w-10 rounded-full object-cover"
                loading="lazy"
              />
            ) : (
              <img className="default-avatar-auto h-10 w-10 rounded-full object-cover shrink-0" alt="" loading="lazy" />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <Link href={`/u/${author?.username}`} className="font-semibold text-[0.85rem] hover:underline truncate">@{author?.username}</Link>
                {author?.is_verified && <VerifiedBadge size="sm" variant={getBadgeVariant(author?.premium_plan)} role={author?.role} />}
              </div>
              <div className="flex items-center gap-2.5 text-[0.65rem] text-text-muted">
                {post.published_at && (
                  <span>{formatRelativeDate(post.published_at)}</span>
                )}
              </div>
            </div>
            <PostFollowButton authorUsername={author?.username || ""} authorUserId={author?.user_id || ""} />
          </div>

          {/* Featured Image + Content (for regular posts) */}
          <PostContentClient
            html={sanitizedContent}
            featuredImage={post.featured_image ? { src: post.featured_image, alt: post.title } : undefined}
            className={[
              // Base
              "text-[0.95rem] leading-[1.74] text-text-readable",
              // Headings
              "[&_h2]:text-[1.30rem] [&_h2]:font-bold [&_h2]:leading-[1.36] [&_h2]:mt-8 [&_h2]:mb-3",
              "[&_h3]:text-[1.25rem] [&_h3]:font-bold [&_h3]:leading-[1.38] [&_h3]:mt-6 [&_h3]:mb-2",
              "[&_h4]:text-[1.1rem] [&_h4]:font-semibold [&_h4]:leading-[1.4] [&_h4]:mt-5 [&_h4]:mb-2",
              // Paragraph & links
              "[&_p]:mb-4",
              "[&_a]:text-accent-main [&_a]:underline",
              // Images
              "[&_img]:rounded-[21px] [&_img]:max-w-full [&_img]:my-4 [&_img]:cursor-zoom-in",
              // Blockquote
              "[&_blockquote]:my-5 [&_blockquote]:pl-4 [&_blockquote]:border-l-[3px] [&_blockquote]:border-text-muted/30 [&_blockquote]:text-text-muted [&_blockquote]:italic",
              // Lists
              "[&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-4",
              "[&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:mb-4",
              "[&_li]:mb-1.5 [&_li]:leading-[1.7]",
              // Table (responsive: overflow-x-auto on container, table min-width)
              "overflow-x-auto",
              "[&_table]:w-full [&_table]:my-5 [&_table]:border-collapse [&_table]:text-[0.88rem] [&_table]:border [&_table]:border-border-primary [&_table]:rounded-lg [&_table]:overflow-hidden [&_table]:min-w-[320px]",
              "[&_th]:text-left [&_th]:font-semibold [&_th]:px-3 [&_th]:py-2.5 [&_th]:border [&_th]:border-border-primary [&_th]:bg-bg-secondary",
              "[&_td]:px-3 [&_td]:py-2.5 [&_td]:border [&_td]:border-border-primary",
              // Code
              "[&_code]:text-[0.85em] [&_code]:bg-bg-secondary [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded-md [&_code]:font-mono",
              "[&_pre]:my-5 [&_pre]:bg-bg-secondary [&_pre]:rounded-[15px] [&_pre]:px-5 [&_pre]:py-4 [&_pre]:overflow-x-auto [&_pre]:text-[0.85rem] [&_pre]:leading-[1.6]",
              "[&_pre_code]:bg-transparent [&_pre_code]:px-0 [&_pre_code]:py-0",
              // HR
              "[&_hr]:my-6 [&_hr]:border-border-primary",
              // Figure
              "[&_figure]:my-4",
              "[&_figcaption]:text-sm [&_figcaption]:text-text-muted [&_figcaption]:text-center [&_figcaption]:mt-2 [&_figcaption]:italic",
              // Inline formatting
              "[&_mark]:bg-yellow-200/40 [&_mark]:px-0.5 [&_mark]:rounded-sm",
              "[&_del]:text-text-muted [&_s]:text-text-muted",
              // Iframe
              "[&_iframe]:rounded-[12px] [&_iframe]:max-w-full [&_iframe]:my-4",
            ].join(" ")}
          />

          {/* Copyright protection badge */}
          {post.copyright_protected && (
            <div className="flex items-center gap-1 mt-2 mb-1">
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-text-muted"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/></svg>
              <span className="text-xs text-text-muted">{t("copyrightProtected")}</span>
              <span className="text-text-muted/40 mx-0.5">·</span>
              <Link href="/help/copyright" target="_blank" rel="noopener noreferrer" className="text-xs text-text-muted hover:underline">{t("moreInfo")}</Link>
            </div>
          )}

          {/* PostNavBar — Like, Comment, Save, More */}
          <PostInteractionBar
            postId={post.id}
            initialLiked={interactions.liked}
            initialSaved={interactions.saved}
            likeCount={post.like_count || 0}
            commentCount={post.comment_count || 0}
            saveCount={post.save_count || 0}
            shareCount={post.share_count || 0}
            viewCount={post.view_count || 0}
            hideStats
            isOwnPost={isOwnPost}
            postUrl={`/${post.slug}`}
            postTitle={post.title}
            postSlug={post.slug}
            authorUsername={author?.username}
            contentType={post.content_type}
          >
            {/* Tags — liked-by ile interaction bar arasında */}
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2 mb-2">
                {tags.map((tag: { id: number; name: string; slug: string }) => (
                  <Link
                    key={tag.id}
                    href={`/explore/tag/${tag.slug}`}
                    className="bg-bg-secondary text-text-primary text-[0.86rem] font-bold px-4 py-2 rounded-full transition hover:bg-bg-tertiary"
                  >
                    #{tag.name}
                  </Link>
                ))}
              </div>
            )}
          </PostInteractionBar>

          {/* Related content */}
          <RelatedPosts
            posts={authorContent}
            featuredPosts={featuredContent}
            authorUsername={author?.username}
          />
        </article>

    </div>
  );
}
