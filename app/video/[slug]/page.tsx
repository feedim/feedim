/* eslint-disable @next/next/no-img-element */

import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthUserId } from "@/lib/auth";
import PostInteractionBar from "@/components/PostInteractionBar";
import PostHeaderActions from "@/components/PostHeaderActions";
import AdBanner from "@/components/AdBanner";
import Link from "next/link";

import { formatRelativeDate, formatCount, getPostUrl } from "@/lib/utils";
import VideoPlayerClient from "@/components/VideoPlayerClient";
import VideoSidebarPortal from "@/components/VideoSidebarPortal";
import VideoDescription from "@/components/VideoDescription";
import VideoGridCard from "@/components/VideoGridCard";
import VideoViewTracker from "@/components/VideoViewTracker";
import RemovedPostTemplate from "@/components/RemovedPostTemplate";
import VerifiedBadge from "@/components/VerifiedBadge";
import PostFollowButton from "@/components/PostFollowButton";
import HeaderTitle from "@/components/HeaderTitle";
import AmbientLight from "@/components/AmbientLight";

import { getTranslations, getLocale } from "next-intl/server";
import { getAlternateLanguages } from "@/lib/seo";
import { getCachedPost } from "@/lib/postQueries";
import { stripHtmlToText } from "@/lib/htmlToText";

const OG_LOCALES: Record<string, string> = { tr: "tr_TR", en: "en_US", az: "az_AZ" };
import { headers } from "next/headers";
import LazyAvatar from "@/components/LazyAvatar";
import { getDetailPageAccessContext } from "@/lib/postPageAccess";
import { getCachedNextVideos } from "@/lib/postPageRecommendations";

function getBadgeVariant(premiumPlan?: string | null): "default" | "max" {
  return premiumPlan === "max" || premiumPlan === "business" ? "max" : "default";
}

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
  const postPath = `/video/${encodeURIComponent(post.slug)}`;
  const url = `${baseUrl}${postPath}`;
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
      type: "video.other",
      url,
      images: ogImage ? [{ url: ogImage, width: 1200, height: 630 }] : undefined,
      ...(post.video_url ? { videos: [{ url: post.video_url, type: "video/mp4" }] } : {}),
      siteName: "Feedim",
      locale: OG_LOCALES[locale] || "en_US",
    },
    twitter: {
      card: "player",
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

export default async function VideoPage({ params }: PageProps) {
  const { slug } = await params;
  const post = await getCachedPost(slug);
  if (!post) notFound();

  // Redirect if not a video — send to correct URL
  if (post.content_type !== "video") {
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

  const hdrs = await headers();
  const locale = hdrs.get("x-locale") || "en";
  const ipCountry = (hdrs.get("x-vercel-ip-country") || hdrs.get("cf-ipcountry") || "").toUpperCase();
  const tPromise = getTranslations("post");
  const tCommonPromise = getTranslations("common");
  const tCTPromise = getTranslations("contentTypes");
  const [nextVideos, t, tCommon, tCT] = await Promise.all([
    getCachedNextVideos(post.id, post.author_id, locale, ipCountry, ["video"]),
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

  // Build compact next video list for client-side unwatched filtering
  const nextVideoInfos = nextVideos.map(v => ({
    slug: v.slug,
    title: v.title,
    thumbnail: v.video_thumbnail || v.featured_image || undefined,
    contentType: v.content_type || "video",
  }));
  const plainDescription = (post.content || "").replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '');
  let videoOrigin: string | null = null;
  if (post.video_url) {
    try { videoOrigin = new URL(post.video_url).origin; } catch {}
  }

  // Prefetch first 4 next video URLs for faster navigation
  const prefetchVideos = nextVideos.slice(0, 4).filter(v => v.video_url);

  return (
    <div suppressHydrationWarning>
      {post.video_url && (
        <>
          {videoOrigin && <link rel="preconnect" href={videoOrigin} crossOrigin="anonymous" />}
          {videoOrigin && <link rel="dns-prefetch" href={videoOrigin} />}
        </>
      )}
      {prefetchVideos.map(v => (
        <link key={v.id} rel="prefetch" as="video" href={v.video_url!} />
      ))}
      <script type="application/ld+json" suppressHydrationWarning dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/<\//g, '<\\/') }} />
      <AmbientLight imageSrc={post.video_thumbnail || post.featured_image || undefined} videoMode />
      <HeaderTitle title={tCT("video")} />
      <VideoViewTracker postId={post.id} />

      {post.is_nsfw && (isOwnPost || isStaff) && (
        <div className="mx-3 sm:mx-4 mb-3 inline-flex items-center gap-1.5 px-2.5 py-1 bg-[var(--accent-color)]/10 text-[var(--accent-color)] text-xs font-semibold rounded-full">
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
          {t("moderationBanner")}
        </div>
      )}
      <PostHeaderActions
        postId={post.id} postUrl={`/video/${post.slug}`} postTitle={post.title}
        authorUsername={author?.username} authorUserId={author?.user_id} authorName={authorName}
        authorRole={author?.role} isOwnPost={isOwnPost} postSlug={post.slug} portalToHeader
        isVideo contentType={post.content_type}
        visibility={post.visibility || "public"}
        isBoosted={boostInfo.isBoosted}
      />

      <VideoSidebarPortal videos={nextVideos} />

      <article className="px-4 sm:px-4" style={{ overflowX: "hidden" }}>
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

        <h1 className="text-[1.2rem] sm:text-[1.3rem] font-bold leading-[1.5] mb-1">{post.title}</h1>

        <div className="flex items-center gap-3 text-[0.78rem] text-text-muted mb-3">
          <span>{t("viewCount", { count: formatCount(post.view_count || 0) })}</span>
          {post.published_at && (
            <>
              <span className="text-text-muted/40">·</span>
              <span>{formatRelativeDate(post.published_at)}</span>
            </>
          )}
        </div>

        <div className="flex items-center gap-3 mb-[5px]">
          <Link href={`/u/${author?.username}`} className="shrink-0">
            <LazyAvatar src={author?.avatar_url} alt={authorName} sizeClass="h-10 w-10" />
          </Link>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <Link href={`/u/${author?.username}`} className="font-semibold text-[0.9rem] hover:underline truncate">
                @{author?.username}
              </Link>
              {author?.is_verified && <VerifiedBadge size="sm" variant={getBadgeVariant(author?.premium_plan)} role={author?.role} />}
            </div>
            {author?.follower_count !== undefined && (
              <p className="text-[0.68rem] text-text-muted">{t("followers", { count: formatCount(author.follower_count) })}</p>
            )}
          </div>
          <PostFollowButton authorUsername={author?.username || ""} authorUserId={author?.user_id || ""} initialFollowing={interactions.followingAuthor} initialRequested={interactions.requestedAuthor} initialFollowsMe={interactions.authorFollowsMe} followStateResolved />
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
          postUrl={`/video/${post.slug}`}
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

        <AdBanner slot="post-bottom" className="mt-4 mb-2" />

        <div className="h-8 md:h-0" />
      </article>
    </div>
  );
}
