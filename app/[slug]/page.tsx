/* eslint-disable @next/next/no-img-element */

import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthUserId } from "@/lib/auth";
import PostInteractionBar from "@/components/PostInteractionBar";
import PostHeaderActions from "@/components/PostHeaderActions";
import RelatedPosts from "@/components/RelatedPosts";
import AdBanner from "@/components/AdBanner";
import Link from "next/link";

import { formatRelativeDate, formatCount, getPostUrl } from "@/lib/utils";
import PostStats from "@/components/PostStats";
import sanitizeHtml from "sanitize-html";
import PostContentClient from "@/components/PostContentClient";
import VideoPlayerClient from "@/components/VideoPlayerClient";
import VideoSidebarPortal from "@/components/VideoSidebarPortal";
import VideoDescription from "@/components/VideoDescription";
import NextVideosGrid from "@/components/NextVideosGrid";
import PostViewTracker from "@/components/PostViewTracker";
import VideoViewTracker from "@/components/VideoViewTracker";
import RemovedPostTemplate from "@/components/RemovedPostTemplate";
import VerifiedBadge from "@/components/VerifiedBadge";

function getBadgeVariantServer(premiumPlan?: string | null): "default" | "max" {
  return premiumPlan === "max" || premiumPlan === "business" ? "max" : "default";
}
import PostFollowButton from "@/components/PostFollowButton";
import HeaderTitle from "@/components/HeaderTitle";
import AmbientLight from "@/components/AmbientLight";

import { getTranslations, getLocale } from "next-intl/server";
import { getAlternateLanguages } from "@/lib/seo";
import { getCachedPost } from "@/lib/postQueries";
import { getCachedAuthorContent, getCachedFeaturedContent, getCachedNextVideos } from "@/lib/postPageRecommendations";

const OG_LOCALES: Record<string, string> = { tr: "tr_TR", en: "en_US", az: "az_AZ" };
import { renderMentionsAsHTML, renderMentionsInHTML } from "@/lib/mentionRenderer";
import { headers } from "next/headers";
import { getDetailPageAccessContext } from "@/lib/postPageAccess";
import LazyAvatar from "@/components/LazyAvatar";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getCachedPost(slug);
  const tp = await getTranslations("post");
  if (!post) return { title: tp("postNotFound") };

  const locale = await getLocale();
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://feedim.com";
  const title = post.meta_title || post.title;
  const description = post.meta_description || post.excerpt || "";
  const postPath = getPostUrl(encodeURIComponent(post.slug), post.content_type);
  const url = `${baseUrl}${postPath}`;
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
      locale: OG_LOCALES[locale] || "en_US",
    },
    twitter: {
      card: isVideo ? "player" : "summary_large_image",
      title,
      description,
      images: ogImage ? [ogImage] : undefined,
    },
    alternates: {
      canonical: url,
      languages: getAlternateLanguages(postPath),
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
  const admin = createAdminClient();
  const { access, viewerState } = await getDetailPageAccessContext(admin, post, currentUserId);
  if (access.kind === "not-found") notFound();
  if (access.kind === "redirect") redirect(access.path);
  if (access.kind === "removed") {
    return <RemovedPostTemplate reason={access.reason} decisionCode={access.decisionCode} />;
  }
  const isStaff = access.isStaff;

  const isVideo = post.content_type === "video" || post.content_type === "moment";
  const isNote = post.content_type === "note";
  const hdrs = await headers();
  const locale = hdrs.get("x-locale") || "en";
  const ipCountry = (hdrs.get("x-vercel-ip-country") || hdrs.get("cf-ipcountry") || "").toUpperCase();
  const tPromise = getTranslations("post");
  const tCommonPromise = getTranslations("common");
  const tCTPromise = getTranslations("contentTypes");
  const [authorContent, nextVideos, featuredContent, t, tCommon, tCT] = await Promise.all([
    getCachedAuthorContent(post.author_id, post.id, locale, ipCountry),
    isVideo ? getCachedNextVideos(post.id, post.author_id, locale, ipCountry, post.content_type === "moment" ? ["video", "moment"] : ["video"], currentUserId) : Promise.resolve([]),
    getCachedFeaturedContent(post.id, post.author_id, locale, ipCountry),
    tPromise,
    tCommonPromise,
    tCTPromise,
  ]);
  const { interactions, boostInfo } = viewerState;

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
    const nextVideoInfos = nextVideos.map(v => ({
      slug: v.slug,
      title: v.title,
      thumbnail: v.video_thumbnail || v.featured_image || undefined,
      contentType: v.content_type || "video",
    }));
    const plainDescription = sanitizedContent ? sanitizedContent.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '') : '';
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
        <HeaderTitle title={post.content_type === "moment" ? tCT("moment") : tCT("video")} />
        <VideoViewTracker postId={post.id} />

        {/* NSFW moderation badge */}
        {post.is_nsfw && (isOwnPost || isStaff) && (
          <div className="mx-3 sm:mx-4 mb-3 inline-flex items-center gap-1.5 px-2.5 py-1 bg-[var(--accent-color)]/10 text-[var(--accent-color)] text-xs font-semibold rounded-full">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
            {t("moderationBanner")}
          </div>
        )}
        <PostHeaderActions
          postId={post.id} postUrl={`/${post.slug}`} postTitle={post.title}
          authorUsername={author?.username} authorUserId={author?.user_id} authorName={authorName}
          authorRole={author?.role} isOwnPost={isOwnPost} postSlug={post.slug} portalToHeader
          isVideo contentType={post.content_type}
          visibility={post.visibility || "public"}
          isBoosted={boostInfo.isBoosted}
        />

        {/* Portal: inject VideoSidebar into the existing right sidebar */}
        <VideoSidebarPortal videos={nextVideos} />

        <article className="px-3 sm:px-4" style={{ overflowX: "hidden" }}>
          {/* Video Player — edge-to-edge */}
          {post.video_url && (
            <div className="mb-3 -mx-3 sm:-mx-4 sm:mx-0">
              <VideoPlayerClient
                src={post.video_url}
                hlsUrl={post.hls_url || undefined}
                poster={post.video_thumbnail || post.featured_image || undefined}
                slug={post.slug}
                nextVideos={nextVideoInfos}
                videoDuration={post.video_duration || undefined}
              />
            </div>
          )}

          {/* Title */}
          <h1 className="text-[1.2rem] sm:text-[1.3rem] font-bold leading-[1.5] mb-1">{post.title}</h1>

          {/* Stats row */}
          <div className="flex items-center gap-3 text-[0.78rem] text-text-muted mb-3">
            <span>{t("viewCount", { count: formatCount(post.view_count || 0) })}</span>
            {post.published_at && (
              <>
                <span className="text-text-muted/40">·</span>
                <span>{formatRelativeDate(post.published_at)}</span>
              </>
            )}
          </div>

          {/* Channel row — YouTube style */}
          <div className="flex items-center gap-3">
            <Link href={`/u/${author?.username}`} className="shrink-0">
              <LazyAvatar src={author?.avatar_url} alt={authorName} sizeClass="h-10 w-10" />
            </Link>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <Link href={`/u/${author?.username}`} className="font-semibold text-[0.9rem] hover:underline truncate">
                  @{author?.username}
                </Link>
                {author?.is_verified && <VerifiedBadge size="sm" variant={getBadgeVariantServer(author?.premium_plan)} role={author?.role} />}
                {post.visibility && (
                  <span className="text-[0.7rem] text-text-muted">{post.visibility === 'followers' ? t("visibilityFollowers") : post.visibility === 'only_me' ? t("visibilityOnlyMe") : t("visibilityPublic")}</span>
                )}
              </div>
              {author?.follower_count !== undefined && (
                <p className="text-[0.72rem] text-text-muted">{t("followers", { count: formatCount(author.follower_count) })}</p>
              )}
            </div>
            <PostFollowButton authorUsername={author?.username || ""} authorUserId={author?.user_id || ""} initialFollowing={interactions.followingAuthor} initialRequested={interactions.requestedAuthor} initialFollowsMe={interactions.authorFollowsMe} followStateResolved />
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

          {/* Tags */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2 mb-2">
              {tags.map((tag: { id: number; name: string; slug: string }) => (
                <Link key={tag.id} href={`/explore/tag/${tag.slug}`}
                  className="bg-bg-secondary text-text-primary text-[0.86rem] font-bold px-4 py-1.5 rounded-full transition hover:bg-bg-tertiary">
                  #{tag.name}
                </Link>
              ))}
            </div>
          )}

          {/* Interaction bar */}
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
            isBoosted={boostInfo.isBoosted}
            boostStats={boostInfo.boostStats}
            boostStatus={boostInfo.boostStatus}
            visibility={post.visibility || "public"}
            isModeration={!!post.is_nsfw || post.status === 'moderation'}
            allowComments={post.allow_comments !== false}
          />

          {/* Next videos — mobile/tablet (below content, hidden on xl where sidebar shows) */}
          <NextVideosGrid videos={nextVideos} />

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
      <div suppressHydrationWarning style={{ overflowX: "hidden" }}>
        <script
          type="application/ld+json"
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/<\//g, '<\\/') }}
        />
        <HeaderTitle title={t("note")} />
        <PostViewTracker postId={post.id} />

        {/* NSFW moderation badge */}
        {post.is_nsfw && (isOwnPost || isStaff) && (
          <div className="mx-4 sm:mx-5 mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 bg-[var(--accent-color)]/10 text-[var(--accent-color)] text-xs font-semibold rounded-full">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
            {t("moderationBanner")}
          </div>
        )}

        <article>
          <div className="px-4 sm:px-4 py-3 md:py-5">
            <PostHeaderActions
              postId={post.id}
              postUrl={`/${post.slug}`}
              postTitle={post.title}
              authorUsername={author?.username}
              authorUserId={author?.user_id}
              authorName={authorName}
              authorRole={author?.role}
              isOwnPost={isOwnPost}
              postSlug={post.slug}
              portalToHeader
              contentType={post.content_type}
              visibility={post.visibility || "public"}
              isBoosted={boostInfo.isBoosted}
            />

            {/* Author */}
            <div className="flex items-center gap-2 mb-1">
              <Link href={`/u/${author?.username}`} className="shrink-0">
                <LazyAvatar src={author?.avatar_url} alt={authorName} sizeClass="h-10 w-10" />
              </Link>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <Link href={`/u/${author?.username}`} className="font-semibold text-[0.92rem] hover:underline truncate">@{author?.username}</Link>
                  {author?.is_verified && <VerifiedBadge size="sm" variant={getBadgeVariantServer(author?.premium_plan)} role={author?.role} />}
                </div>
                <div className="flex items-center gap-2.5 text-[0.65rem] text-text-muted">
                  {post.published_at && <span>{formatRelativeDate(post.published_at)}</span>}
                  {post.visibility && (
                    <span>{post.visibility === 'followers' ? t("visibilityFollowers") : post.visibility === 'only_me' ? t("visibilityOnlyMe") : t("visibilityPublic")}</span>
                  )}
                </div>
              </div>
              <PostFollowButton authorUsername={author?.username || ""} authorUserId={author?.user_id || ""} initialFollowing={interactions.followingAuthor} initialRequested={interactions.requestedAuthor} initialFollowsMe={interactions.authorFollowsMe} followStateResolved />
            </div>

            {/* Note content — large font, plain text */}
            <p
              className="text-[1.15rem] leading-[1.65] text-text-primary whitespace-pre-line"
              dangerouslySetInnerHTML={{ __html: renderMentionsAsHTML(noteText) }}
            />

            {/* View count — below content */}
            {(post.view_count || 0) > 0 && (
              <p className="text-[0.75rem] text-text-muted">{t("viewCount", { count: formatCount(post.view_count || 0) })}</p>
            )}

            {/* Tags */}
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2 mb-2">
                {tags.map((tag: { id: number; name: string; slug: string }) => (
                  <Link key={tag.id} href={`/explore/tag/${tag.slug}`}
                    className="bg-bg-secondary text-text-primary text-[0.86rem] font-bold px-4 py-1.5 rounded-full transition hover:bg-bg-tertiary">
                    #{tag.name}
                  </Link>
                ))}
              </div>
            )}

            {/* Interaction bar */}
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
              isBoosted={boostInfo.isBoosted}
              boostStats={boostInfo.boostStats}
              boostStatus={boostInfo.boostStatus}
              visibility={post.visibility || "public"}
              isModeration={!!post.is_nsfw || post.status === 'moderation'}
              allowComments={post.allow_comments !== false}
            />
          </div>

          <RelatedPosts
            posts={authorContent}
            featuredPosts={featuredContent}
            authorUsername={author?.username}
          />

          <AdBanner slot="post-bottom" className="mt-4 mb-2" />

        </article>
      </div>
    );
  }

  // ─── Regular post layout (unchanged) ───
  return (
    <div suppressHydrationWarning style={{ overflowX: "hidden" }}>
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/<\//g, '<\\/') }}
      />
      {post.featured_image && <AmbientLight imageSrc={post.featured_image} />}
      <HeaderTitle title={t("post")} />
      <PostViewTracker postId={post.id} />

        {/* NSFW moderation badge */}
        {post.is_nsfw && (isOwnPost || isStaff) && (
          <div className="mx-4 sm:mx-5 mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 bg-[var(--accent-color)]/10 text-[var(--accent-color)] text-xs font-semibold rounded-full">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
            {t("moderationBanner")}
          </div>
        )}

        {/* Main content */}
        <article className="px-4 sm:px-4 py-3 md:py-5">
          {/* PostHeaderActions — portals to header */}
          <PostHeaderActions
            postId={post.id}
            postUrl={`/${post.slug}`}
            postTitle={post.title}
            authorUsername={author?.username}
            authorUserId={author?.user_id}
            authorName={authorName}
            authorRole={author?.role}
            isOwnPost={isOwnPost}
            postSlug={post.slug}
            portalToHeader
            contentType={post.content_type}
            visibility={post.visibility || "public"}
            isBoosted={boostInfo.isBoosted}
          />

          {/* Stats — views + likes */}
          <div className="mb-3">
            <PostStats viewCount={post.view_count || 0} likeCount={post.like_count || 0} postId={post.id} />
          </div>

          {/* Title */}
          <h1 className="text-[1.44rem] font-bold leading-[1.36] mb-5">{post.title}</h1>

          {/* Author — PostHead */}
          <div className="flex items-center gap-2 mb-3">
            <Link href={`/u/${author?.username}`} className="shrink-0">
              <LazyAvatar src={author?.avatar_url} alt={authorName} sizeClass="h-10 w-10" />
            </Link>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <Link href={`/u/${author?.username}`} className="font-semibold text-[0.92rem] hover:underline truncate">@{author?.username}</Link>
                {author?.is_verified && <VerifiedBadge size="sm" variant={getBadgeVariantServer(author?.premium_plan)} role={author?.role} />}
              </div>
              <div className="flex items-center gap-2.5 text-[0.65rem] text-text-muted">
                {post.published_at && (
                  <span>{formatRelativeDate(post.published_at)}</span>
                )}
                {post.visibility && (
                  <span>{post.visibility === 'followers' ? t("visibilityFollowers") : post.visibility === 'only_me' ? t("visibilityOnlyMe") : t("visibilityPublic")}</span>
                )}
              </div>
            </div>
            <PostFollowButton authorUsername={author?.username || ""} authorUserId={author?.user_id || ""} initialFollowing={interactions.followingAuthor} initialRequested={interactions.requestedAuthor} initialFollowsMe={interactions.authorFollowsMe} followStateResolved />
          </div>

          {/* Featured Image + Content (for regular posts) */}
          <PostContentClient
            html={renderMentionsInHTML(sanitizedContent)}
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

          {/* Tags — right after content, before interaction bar */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2 mb-2">
              {tags.map((tag: { id: number; name: string; slug: string }) => (
                <Link
                  key={tag.id}
                  href={`/explore/tag/${tag.slug}`}
                  className="bg-bg-secondary text-text-primary text-[0.86rem] font-bold px-4 py-1.5 rounded-full transition hover:bg-bg-tertiary"
                >
                  #{tag.name}
                </Link>
              ))}
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
            isBoosted={boostInfo.isBoosted}
            boostStats={boostInfo.boostStats}
            boostStatus={boostInfo.boostStatus}
            visibility={post.visibility || "public"}
            isModeration={!!post.is_nsfw || post.status === 'moderation'}
            allowComments={post.allow_comments !== false}
          />

        </article>

        {/* Related content — outside article to avoid double padding */}
        <RelatedPosts
          posts={authorContent}
          featuredPosts={featuredContent}
          authorUsername={author?.username}
        />

        <AdBanner slot="post-bottom" className="mt-4 mb-2 px-4" />

    </div>
  );
}
