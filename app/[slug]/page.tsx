/* eslint-disable @next/next/no-img-element */

import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthUserId } from "@/lib/auth";
import PostInteractionBar from "@/components/PostInteractionBar";
import PostHeaderActions from "@/components/PostHeaderActions";
import RelatedPosts from "@/components/RelatedPosts";
import AdBanner from "@/components/AdBanner";

import { formatRelativeDate, formatCount, getPostUrl } from "@/lib/utils";
import PostStats from "@/components/PostStats";
import sanitizeHtml from "sanitize-html";
import PostContentClient from "@/components/PostContentClient";
import PostViewTracker from "@/components/PostViewTracker";
import RemovedPostTemplate from "@/components/RemovedPostTemplate";
import { decodeId } from "@/lib/hashId";
import HeaderTitle from "@/components/HeaderTitle";
import AmbientLight from "@/components/AmbientLight";
import GuestJoinPrompt from "@/components/GuestJoinPrompt";

import { getTranslations, getLocale } from "next-intl/server";
import { getCachedPost } from "@/lib/postQueries";
import { getCachedAuthorContent, getCachedFeaturedContent } from "@/lib/postPageRecommendations";
import { renderMentionsInHTML } from "@/lib/mentionRenderer";
import { headers } from "next/headers";
import { getDetailPageAccessContext } from "@/lib/postPageAccess";
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
  const description = post.meta_description || post.excerpt || sanitizeHtml(post.content || "", { allowedTags: [], allowedAttributes: {} });
  const postPath = getShareablePostUrl(encodeURIComponent(post.slug), post.content_type);
  const authorName = post.profiles?.full_name || post.profiles?.username || "Feedim";

  const keywords = post.meta_keywords
    ? post.meta_keywords.split(",").map((k: string) => k.trim()).filter(Boolean)
    : undefined;

  const isVideo = post.content_type === "video" || post.content_type === "moment";
  const ogImage = post.video_thumbnail || post.featured_image || post.profiles?.avatar_url || null;

  return buildContentMetadata({
    title,
    description,
    locale,
    path: postPath,
    authorName,
    publishedTime: post.published_at,
    modifiedTime: post.updated_at,
    imageUrl: ogImage,
    keywords,
    videoUrl: isVideo ? post.video_url : null,
    kind: isVideo ? "video" : "article",
  });
}

export default async function PostPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const commentParam = Array.isArray(resolvedSearchParams?.comment) ? resolvedSearchParams?.comment[0] : resolvedSearchParams?.comment;
  const initialTargetCommentId = commentParam ? decodeId(commentParam) : null;
  const commentQuery = commentParam ? `?comment=${encodeURIComponent(commentParam)}` : "";
  const post = await getCachedPost(slug);
  if (!post) notFound();

  // Redirect typed content to their canonical URLs
  if (post.content_type === "video" || post.content_type === "note" || post.content_type === "moment") {
    redirect(`${getPostUrl(post.slug, post.content_type)}${commentQuery}`);
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
  const [authorContent, featuredContent, t, tCommon] = await Promise.all([
    getCachedAuthorContent(post.author_id, post.id, locale, ipCountry),
    getCachedFeaturedContent(post.id, post.author_id, locale, ipCountry),
    tPromise,
    tCommonPromise,
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

  const jsonLd = {
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
            className="flex items-center gap-2 mb-3"
            secondaryLine={
              <div className="flex items-center gap-2.5 text-[0.65rem] text-text-muted">
                {post.published_at ? <span>{formatRelativeDate(post.published_at)}</span> : null}
                {post.visibility ? (
                  <span>{post.visibility === "followers" ? t("visibilityFollowers") : post.visibility === "only_me" ? t("visibilityOnlyMe") : t("visibilityPublic")}</span>
                ) : null}
              </div>
            }
          />

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
              "[&_table]:w-full [&_table]:my-5 [&_table]:table-fixed [&_table]:border-collapse [&_table]:text-[0.88rem] [&_table]:border [&_table]:border-border-primary [&_table]:rounded-lg [&_table]:overflow-hidden [&_table]:min-w-[320px]",
              "[&_th]:text-left [&_th]:font-semibold [&_th]:px-3 [&_th]:py-2.5 [&_th]:border [&_th]:border-border-primary [&_th]:bg-bg-secondary [&_th]:whitespace-normal [&_th]:break-words [&_th]:[overflow-wrap:anywhere]",
              "[&_td]:px-3 [&_td]:py-2.5 [&_td]:border [&_td]:border-border-primary [&_td]:whitespace-normal [&_td]:break-words [&_td]:[overflow-wrap:anywhere]",
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
          {post.copyright_protected ? <DetailCopyrightNotice label={t("copyrightProtected")} moreInfoLabel={t("moreInfo")} /> : null}

          {/* Tags — right after content, before interaction bar */}
          <DetailTagList tags={tags} />

          {!currentUserId && (
            <GuestJoinPrompt
              title={tCommon("guestJoinTitle")}
              body={tCommon("guestJoinBody")}
              signupLabel={tCommon("signup")}
              loginLabel={tCommon("login")}
              closeLabel={tCommon("close")}
              storageKey="post-detail"
            />
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
            initialTargetCommentId={initialTargetCommentId}
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
