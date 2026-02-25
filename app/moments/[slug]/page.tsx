import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthUserId } from "@/lib/auth";
import { unstable_cache } from "next/cache";
import PostInteractionBar from "@/components/PostInteractionBar";
import PostHeaderActions from "@/components/PostHeaderActions";
import Link from "next/link";

import { formatRelativeDate, formatCount, getPostUrl } from "@/lib/utils";
import sanitizeHtml from "sanitize-html";
import VideoPlayerClient from "@/components/VideoPlayerClient";
import VideoSidebar from "@/components/VideoSidebar";
import VideoSidebarPortal from "@/components/VideoSidebarPortal";
import VideoDescription from "@/components/VideoDescription";
import VideoGridCard from "@/components/VideoGridCard";
import type { VideoItem } from "@/components/VideoSidebar";
import VideoViewTracker from "@/components/VideoViewTracker";
import RemovedPostTemplate from "@/components/RemovedPostTemplate";
import VerifiedBadge, { getBadgeVariant } from "@/components/VerifiedBadge";
import PostFollowButton from "@/components/PostFollowButton";
import HeaderTitle from "@/components/HeaderTitle";
import AmbientLight from "@/components/AmbientLight";
import ModerationBadge from "@/components/ModerationBadge";
import { getTranslations } from "next-intl/server";

interface PageProps {
  params: Promise<{ slug: string }>;
}

async function getPost(rawSlug: string) {
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

async function getNextVideos(currentPostId: number, authorId: string): Promise<VideoItem[]> {
  const admin = createAdminClient();

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
  const url = `${baseUrl}/moments/${encodeURIComponent(post.slug)}`;
  const authorName = post.profiles?.full_name || post.profiles?.username || "Feedim";

  const keywords = post.meta_keywords
    ? post.meta_keywords.split(",").map((k: string) => k.trim()).filter(Boolean)
    : undefined;

  const ogImage = post.video_thumbnail || post.featured_image;

  return {
    title: `${title} | Feedim`,
    description,
    keywords,
    authors: [{ name: authorName }],
    openGraph: {
      title,
      description,
      type: "article",
      url,
      publishedTime: post.published_at,
      modifiedTime: post.updated_at,
      authors: [authorName],
      images: ogImage ? [{ url: ogImage, width: 1200, height: 630 }] : undefined,
      ...(post.video_url ? { videos: [{ url: post.video_url, type: "video/mp4" }] } : {}),
      siteName: "Feedim",
      locale: "tr_TR",
    },
    twitter: {
      card: "player",
      title,
      description,
      images: ogImage ? [ogImage] : undefined,
    },
    alternates: {
      canonical: url,
      types: {
        'application/json+oembed': `${baseUrl}/api/oembed?url=${encodeURIComponent(url)}&format=json`,
      },
    },
  };
}

export default async function MomentPage({ params }: PageProps) {
  const { slug } = await params;
  const post = await getCachedPost(slug);
  if (!post) notFound();

  // Redirect if not a moment — send to correct URL
  if (post.content_type !== "moment") {
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

  // Author status check
  const postAuthorData = post.profiles;
  if (!isStaff && postAuthorData?.status && postAuthorData.status !== 'active') notFound();

  // Moderation status
  if (post.status === 'moderation') {
    let canViewModeration = isStaff || post.author_id === currentUserId;
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

  // Removed post
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

  // NSFW post
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

  // Private account check
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

  const [interactions, nextVideos] = await Promise.all([
    getUserInteractions(post.id),
    getCachedNextVideos(post.id, post.author_id),
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

  const jsonLd = {
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
  };

  const nextVideo = nextVideos[0] || null;
  const plainDescription = sanitizedContent ? sanitizedContent.replace(/<[^>]+>/g, '') : '';
  let videoOrigin: string | null = null;
  if (post.video_url) {
    try { videoOrigin = new URL(post.video_url).origin; } catch {}
  }

  return (
    <div suppressHydrationWarning>
      {post.video_url && (
        <>
          {videoOrigin && <link rel="preconnect" href={videoOrigin} crossOrigin="anonymous" />}
          {videoOrigin && <link rel="dns-prefetch" href={videoOrigin} />}
        </>
      )}
      <script type="application/ld+json" suppressHydrationWarning dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/<\//g, '<\\/') }} />
      <AmbientLight imageSrc={post.video_thumbnail || post.featured_image || undefined} videoMode />
      <HeaderTitle title="Moment" />
      <VideoViewTracker postId={post.id} />

      {post.is_nsfw && isOwnPost && (
        <Link href={`/${post.slug}/moderation`} className="block mx-3 sm:mx-4 mb-3 bg-[var(--accent-color)]/5 border border-[var(--accent-color)]/20 rounded-xl p-4 hover:bg-[var(--accent-color)]/10 transition">
          <ModerationBadge label={t("moderationBanner")} />
          <p className="text-[var(--accent-color)]/70 text-xs mt-1.5">{t("moderationBannerDesc")} &rarr;</p>
        </Link>
      )}
      <PostHeaderActions
        postId={post.id} postUrl={`/moments/${post.slug}`} postTitle={post.title}
        authorUsername={author?.username} authorUserId={author?.user_id} authorName={authorName}
        isOwnPost={isOwnPost} postSlug={post.slug} portalToHeader
        isVideo contentType={post.content_type}
      />

      <VideoSidebarPortal videos={nextVideos} />

      <article className="px-3 sm:px-4" style={{ overflowX: "clip" }}>
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

        <h1 className="text-[1.2rem] sm:text-[1.3rem] font-bold leading-[1.5] mb-2">{post.title}</h1>

        <div className="flex items-center gap-3 text-[0.78rem] text-text-muted mb-3">
          <span>{t("viewCount", { count: formatCount(post.view_count || 0) })}</span>
          {post.published_at && (
            <span>{formatRelativeDate(post.published_at)}</span>
          )}
        </div>

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

        {plainDescription && (
          <VideoDescription text={plainDescription} />
        )}

        {post.copyright_protected && (
          <div className="flex items-center gap-1 mt-2 mb-1">
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-text-muted"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/></svg>
            <span className="text-xs text-text-muted">{t("copyrightProtected")}</span>
            <span className="text-text-muted/40 mx-0.5">·</span>
            <Link href="/help/copyright" target="_blank" rel="noopener noreferrer" className="text-xs text-text-muted hover:underline">{t("moreInfo")}</Link>
          </div>
        )}

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
          postUrl={`/moments/${post.slug}`}
          postTitle={post.title}
          postSlug={post.slug}
          authorUsername={author?.username}
          likedByBottom
          isVideo
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

        <div className="h-8 md:h-0" />
      </article>
    </div>
  );
}
