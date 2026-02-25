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
import sanitizeHtml from "sanitize-html";
import PostViewTracker from "@/components/PostViewTracker";
import RemovedPostTemplate from "@/components/RemovedPostTemplate";
import VerifiedBadge, { getBadgeVariant } from "@/components/VerifiedBadge";
import PostFollowButton from "@/components/PostFollowButton";
import HeaderTitle from "@/components/HeaderTitle";
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

async function getAuthorContent(authorId: string, currentPostId: number) {
  const admin = createAdminClient();

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

const getCachedPost = unstable_cache(getPost, ["post-by-slug"], { revalidate: 60, tags: ["posts"] });
const getCachedAuthorContent = unstable_cache(getAuthorContent, ["author-content"], { revalidate: 300, tags: ["posts"] });
const getCachedFeaturedContent = unstable_cache(getFeaturedContent, ["featured-content"], { revalidate: 300, tags: ["posts"] });

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
  const url = `${baseUrl}/note/${encodeURIComponent(post.slug)}`;
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
      siteName: "Feedim",
      locale: "tr_TR",
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
    alternates: {
      canonical: url,
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

  const [authorContent, interactions, featuredContent] = await Promise.all([
    getCachedAuthorContent(post.author_id, post.id),
    getUserInteractions(post.id),
    getCachedFeaturedContent(post.id, post.author_id),
  ]);

  const t = await getTranslations("post");
  const tCommon = await getTranslations("common");

  const author = post.profiles;
  const authorName = author?.full_name || [author?.name, author?.surname].filter(Boolean).join(" ") || author?.username || tCommon("anonymous");
  const isOwnPost = currentUserId === author?.user_id;
  const tags = (post.post_tags || []).map((pt: { tags: { id: number; name: string; slug: string } }) => pt.tags).filter(Boolean);

  const sanitizedContent = sanitizeHtml(post.content || "", {
    allowedTags: ['h2', 'h3', 'h4', 'p', 'br', 'strong', 'em', 'a', 'img', 'ul', 'ol', 'li', 'blockquote', 'div', 'span', 'figure', 'figcaption', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'hr', 'code', 'pre', 'sub', 'sup', 'mark', 'del', 's'],
    allowedAttributes: { 'a': ['href', 'target', 'rel'], 'img': ['src', 'alt', 'width', 'height', 'loading'], 'td': ['colspan', 'rowspan'], 'th': ['colspan', 'rowspan'], '*': ['class'] },
    allowedSchemesByTag: { img: ['http', 'https', 'data'] },
  });

  const noteText = sanitizedContent.replace(/<[^>]+>/g, '').trim();

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
    <div suppressHydrationWarning style={{ overflowX: "clip" }}>
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/<\//g, '<\\/') }}
      />
      <HeaderTitle title={t("note")} />
      <PostViewTracker postId={post.id} />

      {post.is_nsfw && isOwnPost && (
        <Link href={`/${post.slug}/moderation`} className="block mx-4 sm:mx-5 mt-3 bg-[var(--accent-color)]/5 border border-[var(--accent-color)]/20 rounded-xl p-4 hover:bg-[var(--accent-color)]/10 transition">
          <ModerationBadge label={t("moderationBanner")} />
          <p className="text-[var(--accent-color)]/70 text-xs mt-1.5">{t("moderationBannerDesc")} &rarr;</p>
        </Link>
      )}

      <article className="px-4 sm:px-5 py-3 md:py-5">
        <PostHeaderActions
          postId={post.id}
          postUrl={`/note/${post.slug}`}
          postTitle={post.title}
          authorUsername={author?.username}
          authorUserId={author?.user_id}
          authorName={authorName}
          isOwnPost={isOwnPost}
          postSlug={post.slug}
          portalToHeader
          contentType={post.content_type}
        />

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

        <p className="text-[1.15rem] leading-[1.65] text-text-primary whitespace-pre-line mb-3">
          {noteText}
        </p>

        {(post.view_count || 0) > 0 && (
          <p className="text-[0.75rem] text-text-muted mb-5">{t("viewCount", { count: formatCount(post.view_count || 0) })}</p>
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

        <RelatedPosts
          posts={authorContent}
          featuredPosts={featuredContent}
          authorUsername={author?.username}
        />

      </article>
    </div>
  );
}
