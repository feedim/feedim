/* eslint-disable @next/next/no-img-element */

import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthUserId } from "@/lib/auth";
import PostInteractionBar from "@/components/PostInteractionBar";
import PostHeaderActions from "@/components/PostHeaderActions";

import { formatRelativeDate, formatCount, getPostUrl } from "@/lib/utils";
import VideoPlayerClient from "@/components/VideoPlayerClient";
import VideoSidebarPortal from "@/components/VideoSidebarPortal";
import VideoDescription from "@/components/VideoDescription";
import NextVideosGrid from "@/components/NextVideosGrid";
import VideoViewTracker from "@/components/VideoViewTracker";
import RemovedPostTemplate from "@/components/RemovedPostTemplate";
import HeaderTitle from "@/components/HeaderTitle";
import AmbientLight from "@/components/AmbientLight";
import GuestJoinPrompt from "@/components/GuestJoinPrompt";
import { decodeId } from "@/lib/hashId";

import { getTranslations, getLocale } from "next-intl/server";
import { getCachedPost } from "@/lib/postQueries";
import { stripHtmlToText } from "@/lib/htmlToText";
import { renderMentionsAsHTML } from "@/lib/mentionRenderer";
import { headers } from "next/headers";
import { getDetailPageAccessContext } from "@/lib/postPageAccess";
import { getCachedNextVideos } from "@/lib/postPageRecommendations";
import { buildContentMetadata } from "@/lib/socialMetadata";
import { getShareablePostUrl } from "@/lib/utils";
import DetailAuthorRow from "@/components/detail/DetailAuthorRow";
import DetailTagList from "@/components/detail/DetailTagList";
import DetailCopyrightNotice from "@/components/detail/DetailCopyrightNotice";

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ comment?: string | string[] }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getCachedPost(slug);
  const tp = await getTranslations("post");
  if (!post) return { title: tp("postNotFound") };

  const locale = await getLocale();
  const title = post.meta_title || post.title;
  const description = post.meta_description || post.excerpt || stripHtmlToText(post.content || "");
  const postPath = getShareablePostUrl(encodeURIComponent(post.slug), post.content_type);
  const authorName = post.profiles?.full_name || post.profiles?.username || "Feedim";

  const keywords = post.meta_keywords
    ? post.meta_keywords.split(",").map((k: string) => k.trim()).filter(Boolean)
    : undefined;

  const ogImage = post.video_thumbnail || post.featured_image || post.profiles?.avatar_url || null;

  return buildContentMetadata({
    title,
    description,
    locale,
    path: postPath,
    authorName,
    imageUrl: ogImage,
    keywords,
    videoUrl: post.video_url,
    kind: "video",
  });
}

export default async function MomentPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const commentParam = Array.isArray(resolvedSearchParams?.comment) ? resolvedSearchParams?.comment[0] : resolvedSearchParams?.comment;
  const initialTargetCommentId = commentParam ? decodeId(commentParam) : null;
  const post = await getCachedPost(slug);
  if (!post) notFound();

  // Redirect if not a moment — send to correct URL
  if (post.content_type !== "moment") {
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
    getCachedNextVideos(post.id, post.author_id, locale, ipCountry, undefined, currentUserId),
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
      <HeaderTitle title={tCT("moment")} />
      <VideoViewTracker postId={post.id} />

      {post.is_nsfw && (isOwnPost || isStaff) && (
        <div className="mx-3 sm:mx-4 mb-3 inline-flex items-center gap-1.5 px-2.5 py-1 bg-[var(--accent-color)]/10 text-[var(--accent-color)] text-xs font-semibold rounded-full">
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
          {t("moderationBanner")}
        </div>
      )}
      <PostHeaderActions
        postId={post.id} postUrl={`/moments?s=${post.slug}`} postTitle={post.title}
        authorUsername={author?.username} authorUserId={author?.user_id} authorName={authorName}
        authorRole={author?.role} isOwnPost={isOwnPost} postSlug={post.slug} portalToHeader
        isVideo contentType={post.content_type}
        visibility={post.visibility || "public"}
        isBoosted={boostInfo.isBoosted}
      />

      <VideoSidebarPortal videos={nextVideos} />

      <article className="px-3 sm:px-4" style={{ overflowX: "hidden" }}>
        {post.video_url && (
          <div className="mb-3 -mx-3 sm:-mx-4 sm:mx-0">
            <VideoPlayerClient
              src={post.video_url}
              hlsUrl={post.hls_url || undefined}
              poster={post.video_thumbnail || post.featured_image || undefined}
              slug={post.slug}
              nextVideos={nextVideoInfos}
              videoDuration={post.video_duration || undefined}
              soundUrl={post.sounds && post.sounds.status === "active" && post.sounds.audio_url !== post.video_url ? post.sounds.audio_url : undefined}
            />
          </div>
        )}

        <h1 className="text-[1.2rem] sm:text-[1.3rem] font-bold leading-[1.5] mb-1" dangerouslySetInnerHTML={{ __html: renderMentionsAsHTML(post.title) }} />

        <div className="flex items-center gap-3 text-[0.78rem] text-text-muted mb-3">
          <span>{t("viewCount", { count: formatCount(post.view_count || 0) })}</span>
          {post.published_at && (
            <>
              <span className="text-text-muted/40">·</span>
              <span>{formatRelativeDate(post.published_at)}</span>
            </>
          )}
        </div>

        <DetailAuthorRow
          authorUsername={author?.username}
          authorUserId={author?.user_id}
          authorName={authorName}
          avatarUrl={author?.avatar_url}
          isVerified={author?.is_verified}
          premiumPlan={author?.premium_plan}
          role={author?.role}
          initialFollowing={interactions.followingAuthor}
          initialRequested={interactions.requestedAuthor}
          initialFollowsMe={interactions.authorFollowsMe}
          followStateResolved
          className="flex items-center gap-2.5"
          secondaryLine={
            author?.follower_count !== undefined ? (
              <p className="text-[0.72rem] leading-none text-text-muted -mt-[0.5px]">{t("followers", { count: formatCount(author.follower_count) })}</p>
            ) : null
          }
        />

        {plainDescription && (
          <VideoDescription text={plainDescription} />
        )}

        {post.copyright_protected ? <DetailCopyrightNotice label={t("copyrightProtected")} moreInfoLabel={t("moreInfo")} /> : null}

        <DetailTagList tags={tags} />

        {!currentUserId && (
          <GuestJoinPrompt
            title={tCommon("guestJoinTitle")}
            body={tCommon("guestJoinBody")}
            signupLabel={tCommon("signup")}
            loginLabel={tCommon("login")}
            closeLabel={tCommon("close")}
            storageKey="moment-detail"
          />
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
          postUrl={`/moments?s=${post.slug}`}
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
          initialTargetCommentId={initialTargetCommentId}
        />

        <NextVideosGrid videos={nextVideos} />

        <div className="h-8 md:h-0" />
      </article>
    </div>
  );
}
