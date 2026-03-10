/* eslint-disable @next/next/no-img-element */

import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthUserId } from "@/lib/auth";
import PostInteractionBar from "@/components/PostInteractionBar";
import PostHeaderActions from "@/components/PostHeaderActions";
import RelatedPosts from "@/components/RelatedPosts";
import Link from "next/link";

import { formatDisplayTagLabel, formatRelativeDate, formatCount, getPostUrl } from "@/lib/utils";
import PostViewTracker from "@/components/PostViewTracker";
import RemovedPostTemplate from "@/components/RemovedPostTemplate";
import VerifiedBadge from "@/components/VerifiedBadge";
import { headers } from "next/headers";

function getBadgeVariantServer(premiumPlan?: string | null): "default" | "max" {
  return premiumPlan === "max" || premiumPlan === "business" ? "max" : "default";
}
import PostFollowButton from "@/components/PostFollowButton";
import HeaderTitle from "@/components/HeaderTitle";
import ExpandableMentionText from "@/components/ExpandableMentionText";

import { getTranslations, getLocale } from "next-intl/server";
import { getAlternateLanguages } from "@/lib/seo";
import { getCachedPost } from "@/lib/postQueries";
import LazyAvatar from "@/components/LazyAvatar";
import { stripHtmlToText } from "@/lib/htmlToText";
import { getDetailPageAccessContext } from "@/lib/postPageAccess";
import { getCachedAuthorContent, getCachedFeaturedContent } from "@/lib/postPageRecommendations";

const OG_LOCALES: Record<string, string> = { tr: "tr_TR", en: "en_US", az: "az_AZ" };
import AdBanner from "@/components/AdBanner";

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
  const postPath = `/note/${encodeURIComponent(post.slug)}`;
  const url = `${baseUrl}${postPath}`;
  const authorName = post.profiles?.full_name || post.profiles?.username || "Feedim";

  const keywords = post.meta_keywords
    ? post.meta_keywords.split(",").map((k: string) => k.trim()).filter(Boolean)
    : undefined;

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
      images: post.featured_image ? [{ url: post.featured_image, width: 1200, height: 630 }] : undefined,
      siteName: "Feedim",
      locale: OG_LOCALES[locale] || "en_US",
    },
    twitter: {
      card: post.featured_image ? "summary_large_image" : "summary",
      title,
      description,
      images: post.featured_image ? [post.featured_image] : undefined,
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

export default async function NotePage({ params }: PageProps) {
  const { slug } = await params;
  const post = await getCachedPost(slug);
  if (!post) notFound();

  // Redirect if not a note — send to correct URL
  if (post.content_type !== "note") {
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

  const noteText = stripHtmlToText(post.content || "");

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.excerpt || "",
    datePublished: post.published_at,
    dateModified: post.updated_at,
    wordCount: post.word_count,
    author: { "@type": "Person", name: authorName, url: `${process.env.NEXT_PUBLIC_SITE_URL || "https://feedim.com"}/u/${author?.username}` },
    publisher: { "@type": "Organization", name: "Feedim", url: process.env.NEXT_PUBLIC_SITE_URL || "https://feedim.com", logo: { "@type": "ImageObject", url: `${process.env.NEXT_PUBLIC_SITE_URL || "https://feedim.com"}/favicon.png` } },
    mainEntityOfPage: { "@type": "WebPage", "@id": `${process.env.NEXT_PUBLIC_SITE_URL || "https://feedim.com"}/note/${encodeURIComponent(post.slug)}` },
  };

  return (
    <div suppressHydrationWarning style={{ overflowX: "hidden" }}>
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/<\//g, '<\\/') }}
      />
      <HeaderTitle title={t("note")} />
      <PostViewTracker postId={post.id} />

      {post.is_nsfw && (isOwnPost || isStaff) && (
        <div className="mx-4 sm:mx-5 mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 bg-[var(--accent-color)]/10 text-[var(--accent-color)] text-xs font-semibold rounded-full">
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
          {t("moderationBanner")}
        </div>
      )}

      <article>
        <div className="px-3 sm:px-3 py-3 md:py-5">
          <PostHeaderActions
            postId={post.id}
            postUrl={`/note/${post.slug}`}
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

          <div className="flex items-center gap-2 mb-2.5">
            <Link href={`/u/${author?.username}`} className="shrink-0">
              <LazyAvatar src={author?.avatar_url} alt={authorName} sizeClass="h-10 w-10" />
            </Link>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1">
                <Link href={`/u/${author?.username}`} className="font-semibold text-[0.88rem] hover:underline truncate">@{author?.username}</Link>
                {author?.is_verified && <VerifiedBadge size="sm" variant={getBadgeVariantServer(author?.premium_plan)} role={author?.role} />}
              </div>
              <div className="flex items-center gap-2.5 text-[0.65rem] text-text-muted">
                {post.published_at && <span>{formatRelativeDate(post.published_at)}</span>}
                {post.visibility && (
                  <span>{post.visibility === 'followers' ? t("visibilityFollowers") : post.visibility === 'only_me' ? t("visibilityOnlyMe") : t("visibilityPublic")}</span>
                )}
              </div>
            </div>
            <PostFollowButton authorUsername={author?.username || ""} authorUserId={author?.user_id || ""} initialFollowing={interactions.followingAuthor} initialRequested={interactions.requestedAuthor} initialFollowsMe={interactions.authorFollowsMe} followStateResolved compact />
          </div>

          <ExpandableMentionText
            text={noteText}
            maxChars={240}
            maxLines={8}
            className="text-[1rem] leading-[1.55] text-text-primary whitespace-pre-line"
            buttonClassName="mt-0.5 inline-flex w-fit text-[0.84rem] font-bold text-text-muted hover:underline"
          />

          {(post.view_count || 0) > 0 && (
            <p className="text-[0.75rem] text-text-muted mt-[4px]">{t("viewCount", { count: formatCount(post.view_count || 0) })}</p>
          )}

          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-[7px] mb-[6px]">
              {tags.map((tag: { id: number; name: string; slug: string }) => (
                <Link key={tag.id} href={`/explore/tag/${tag.slug}`}
                  title={`#${tag.name}`}
                  className="bg-bg-secondary text-text-primary text-[0.8rem] font-bold px-4 py-1 rounded-full transition hover:bg-bg-tertiary">
                  {formatDisplayTagLabel(tag.name)}
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
            postUrl={`/note/${post.slug}`}
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
