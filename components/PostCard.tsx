"use client";

import { memo, useState, useRef, useCallback, useEffect, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Copyright, Clock } from "lucide-react";
import NoImage from "@/components/NoImage";
import BlurImage from "@/components/BlurImage";
import VideoPlayer from "@/components/VideoPlayer";
import WatchProgressBar from "@/components/WatchProgressBar";
import { formatRelativeDate, formatCount, getPostUrl } from "@/lib/utils";
import VerifiedBadge, { getBadgeVariant } from "@/components/VerifiedBadge";
import PostHeaderActions from "@/components/PostHeaderActions";
import PostInteractionBar from "@/components/PostInteractionBar";
import { useUser } from "@/components/UserContext";
import { useAuthModal } from "@/components/AuthModal";
import { useTranslations, useLocale } from "next-intl";
import { renderMentionsAsHTML } from "@/lib/mentionRenderer";
import LazyAvatar from "@/components/LazyAvatar";
import ExpandableText from "@/components/ExpandableText";
import FeedItemViewTracker from "@/components/FeedItemViewTracker";
import { feedPreviewStore } from "@/lib/stores/feedPreviewStore";
import { getFollowStatus, setFollowStatus, deleteFollowStatus, subscribeFollowStore } from "@/lib/stores/followStore";
import { feedimAlert } from "@/components/FeedimAlert";
import { fetchWithCache, withCacheScope, invalidateCache } from "@/lib/fetchWithCache";
import { emitMutation } from "@/lib/mutationEvents";

const NOTE_TRUNCATE_LENGTH = 280;
const NOTE_TRUNCATE_LINES = 5;

function NoteContent({ text, href, onOpen }: { text: string; href: string; onOpen: () => void }) {
  const t = useTranslations("common");
  const normalizedText = (text || "").replace(/\r\n?/g, "\n").trimEnd();
  const isServerPreview = normalizedText.endsWith("…") || normalizedText.endsWith("...");
  const expandedHref = href.includes("?") ? `${href}&expand=1` : `${href}?expand=1`;

  if (isServerPreview) {
    return (
      <div className="relative z-[1] pointer-events-none text-[0.88rem] leading-[1.5] text-text-primary whitespace-pre-line break-words [overflow-wrap:anywhere]">
        <span dangerouslySetInnerHTML={{ __html: renderMentionsAsHTML(normalizedText) }} />
        <Link
          href={expandedHref}
          className="relative z-[2] pointer-events-auto inline ml-1 text-[0.82rem] font-bold text-text-muted hover:underline"
        >
          {t("readMoreShort")}
        </Link>
      </div>
    );
  }

  return (
    <div className="relative z-[1] pointer-events-none">
      <ExpandableText
        text={normalizedText}
        maxChars={NOTE_TRUNCATE_LENGTH}
        maxLines={NOTE_TRUNCATE_LINES}
        className="text-[0.88rem] leading-[1.5] text-text-primary whitespace-pre-line"
        buttonClassName="relative z-[2] pointer-events-auto mt-0.5 inline-flex w-fit text-[0.82rem] font-bold text-text-muted hover:underline"
        htmlRenderer={renderMentionsAsHTML}
        onReadMore={onOpen}
      />
    </div>
  );
}

interface PostCardProps {
  post: {
    id: number;
    title: string;
    slug: string;
    excerpt?: string;
    featured_image?: string;
    reading_time?: number;
    like_count?: number;
    comment_count?: number;
    view_count?: number;
    save_count?: number;
    content_type?: string;
    video_duration?: number;
    video_thumbnail?: string;
    video_url?: string;
    blurhash?: string | null;
    published_at?: string;
    visibility?: string;
    is_nsfw?: boolean;
    moderation_category?: string | null;
    is_sponsored?: boolean;
    is_boosted?: boolean;
    boost_status?: string | null;
    viewer_liked?: boolean;
    viewer_saved?: boolean;
    post_tags?: { tag_id: number; tags: { id: number; name: string; slug: string } }[];
    profiles?: {
      user_id: string;
      name?: string;
      surname?: string;
      full_name?: string;
      username: string;
      avatar_url?: string;
      is_verified?: boolean;
      premium_plan?: string | null;
      role?: string;
    };
  };
  initialLiked?: boolean;
  initialSaved?: boolean;
  onDelete?: (postId: number) => void;
}

export default memo(function PostCard({ post, initialLiked, initialSaved, onDelete }: PostCardProps) {
  const t = useTranslations();
  const tProfile = useTranslations("profile");
  const locale = useLocale();
  const author = post.profiles;
  const hasThumbnail = !!(post.video_thumbnail || post.featured_image);
  const isMoment = post.content_type === "moment";
  const isVideo = post.content_type === "video" || isMoment;
  const isNote = post.content_type === "note";
  const canPreview = isVideo && !!post.video_url;
  const router = useRouter();
  const postHref = getPostUrl(post.slug, post.content_type);
  const noteExpandedHref = postHref.includes("?") ? `${postHref}&expand=1` : `${postHref}?expand=1`;
  const { user: ctxUser } = useUser();
  const { requireAuth } = useAuthModal();
  const [isDeleted, setIsDeleted] = useState(false);
  const authorUsername = author?.username;
  const resolvedInitialLiked = initialLiked ?? post.viewer_liked ?? false;
  const resolvedInitialSaved = initialSaved ?? post.viewer_saved ?? false;

  const [inView, setInView] = useState(false);
  const [showCTA, setShowCTA] = useState(false);
  const [muted, setMuted] = useState(true);

  // Active preview store — React 18 concurrent-safe
  const activePreview = useSyncExternalStore(
    feedPreviewStore.subscribe,
    feedPreviewStore.getSnapshot,
    feedPreviewStore.getServerSnapshot,
  );

  // Follow status from shared store — React 18 concurrent-safe
  const isSelf = ctxUser?.username === author?.username;
  const cachedFollow = useSyncExternalStore(
    subscribeFollowStore,
    () => author?.username ? getFollowStatus(author.username) : undefined,
    () => undefined,
  );
  const isFollowing = cachedFollow === true ? true : cachedFollow === false ? false : null;

  useEffect(() => {
    if (!authorUsername || !ctxUser?.id || isSelf) return;
    const cached = getFollowStatus(authorUsername);
    if (cached === true || cached === false) return;
    if (cached === "loading") return;
    setFollowStatus(authorUsername, "loading");
    fetchWithCache(
      withCacheScope(`/api/users/${authorUsername}`, `viewer:${ctxUser.id}`),
      { ttlSeconds: 45 }
    )
      .then((d) => d as { profile?: { is_following?: boolean } })
      .then(d => setFollowStatus(authorUsername, d.profile?.is_following === true))
      .catch(() => deleteFollowStatus(authorUsername));
  }, [authorUsername, ctxUser?.id, isSelf]);

  const handleFollow = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const user = await requireAuth();
    if (!user || !authorUsername) return;
    setFollowStatus(authorUsername, true);
    try {
      const res = await fetch(`/api/users/${authorUsername}/follow`, { method: "POST", keepalive: true });
      if (!res.ok) {
        setFollowStatus(authorUsername, false);
        if (res.status === 403 || res.status === 429) {
          const data = await res.json().catch(() => ({}));
          feedimAlert("error", data.error || tProfile("followLimitReached"));
        }
      } else {
        invalidateCache(`/api/users/${authorUsername}`);
        emitMutation({ type: "follow-changed", username: authorUsername });
      }
    } catch {
      setFollowStatus(authorUsername, false);
    }
  }, [authorUsername, requireAuth, tProfile]);
  const thumbRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Feed-level view tracking for video/moment/note (not post — post requires entering detail page)
  const trackFeedView = (isVideo || isNote) && !!post.id;
  const MAX_PREVIEW_DURATION = 240; // 4 dakika

  // Pause preview when another card becomes active (reactive via useSyncExternalStore)
  useEffect(() => {
    if (!canPreview || !inView) return;
    if (activePreview !== null && activePreview !== post.id) {
      const frame = requestAnimationFrame(() => {
        setInView(false);
        setShowCTA(false);
        setMuted(true);
      });
      if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
      return () => cancelAnimationFrame(frame);
    }
  }, [activePreview, canPreview, post.id, inView]);

  // IntersectionObserver — start preview when thumbnail enters viewport
  useEffect(() => {
    if (!canPreview) return;
    const el = thumbRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          // Delay preview start by 1.1s — don't auto-play on quick scrolls
          timerRef.current = setTimeout(() => {
            feedPreviewStore.setActive(post.id);
            setInView(true);
            // Stop any sound previews
            window.dispatchEvent(new Event("feedim:audio-claim"));
            setShowCTA(false);
            // Stop preview after 4 minutes
            timerRef.current = setTimeout(() => {
              setShowCTA(true);
            }, MAX_PREVIEW_DURATION * 1000);
          }, 1100);
        } else {
          if (feedPreviewStore.getSnapshot() === post.id) feedPreviewStore.setActive(null);
          setInView(false);
          setShowCTA(false);
          setMuted(true);
          if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
          }
        }
      },
      { threshold: 0.45 }
    );

    observer.observe(el);
    return () => {
      observer.disconnect();
      if (feedPreviewStore.getSnapshot() === post.id) feedPreviewStore.setActive(null);
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [canPreview, post.id]);

  const handleVideoEnded = useCallback(() => {
    setShowCTA(true);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const thumbnail = post.video_thumbnail || post.featured_image;

  if (isDeleted) return null;

  return (
    <div className="border-b border-border-primary/60">
    {trackFeedView && (
      <FeedItemViewTracker
        postId={post.id}
        contentType={post.content_type as "video" | "moment" | "note"}
        containerRef={cardRef}
      />
    )}
    <article ref={cardRef} className="pt-[4px] pb-[9px] px-[12px] rounded-[24px] overflow-hidden">
      <div className="flex gap-2.5 items-stretch">
        {/* Avatar — fixed left column with timeline line */}
          <div className="shrink-0 w-[42px] pt-[11px] pb-0 flex flex-col items-center">
            <Link href={`/u/${author?.username}`} className="relative z-[2]">
              <LazyAvatar src={author?.avatar_url} alt={author?.username || ""} sizeClass="h-[42px] w-[42px]" />
            </Link>
          </div>

        {/* Content — right side, clickable */}
        <div className="flex-1 min-w-0 relative flex flex-col gap-0 rounded-[21px] p-[5px]">
          <Link href={postHref} className="absolute inset-0 z-0 rounded-[21px]" />
          {/* NSFW moderation badge — above name */}
          {post.is_nsfw && (
            <div className="relative z-[1] mb-0.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[0.7rem] font-semibold bg-[var(--accent-color)]/10 text-[var(--accent-color)] w-fit">
              <Clock size={11} />
              <span>{t('post.underReview')}</span>
            </div>
          )}
          {/* Name row */}
          <div className="flex items-center justify-between relative z-[1] pointer-events-none select-none">
            <div className="flex items-center gap-1 min-w-0">
              <span className="text-[0.89rem] font-semibold truncate">@{author?.username || t('common.anonymous')}</span>
              {(author?.is_verified || author?.role === "admin") && <VerifiedBadge className="h-[13px] w-[13px] min-w-[13px]" variant={getBadgeVariant(author?.premium_plan)} role={author?.role} />}
              {!isSelf && ((!ctxUser && !!authorUsername) || isFollowing === false) && (
                <>
                  <span className="text-text-muted/40 text-xs">·</span>
                  <button
                    onClick={handleFollow}
                    aria-label={t('common.follow')}
                    className="text-[0.75rem] font-semibold text-accent-main pointer-events-auto shrink-0"
                  >
                    {t('common.follow')}
                  </button>
                </>
              )}
              {post.published_at && (
                <>
                  <span className="text-text-muted/40 text-xs">·</span>
                  <span className="text-[0.66rem] text-text-muted shrink-0">{formatRelativeDate(post.published_at, locale)}</span>
                </>
              )}
              <span className="text-text-muted/40 text-xs">·</span>
              <span className="text-[0.66rem] text-text-muted shrink-0">{post.content_type === "moment" ? t('contentTypes.moment') : post.content_type === "video" ? t('contentTypes.video') : post.content_type === "note" ? t('contentTypes.note') : t('contentTypes.post')}</span>
              {(post.is_sponsored || (post.is_boosted && post.boost_status === 'active')) && (
                <>
                  <span className="text-text-muted/40 text-xs">·</span>
                  <span className="text-[0.65rem] text-accent-main font-semibold shrink-0">{t('boost.sponsored')}</span>
                </>
              )}
            </div>
            <div className="pointer-events-auto shrink-0 flex items-center -mr-2">
              <div className="[&_button]:!w-7 [&_button]:!h-7 [&_svg]:!h-4 [&_svg]:!w-4">
                <PostHeaderActions
                  postId={post.id}
                  postUrl={`${typeof window !== "undefined" ? window.location.origin : ""}${getPostUrl(post.slug, post.content_type)}`}
                  postTitle={post.title}
                  authorUsername={author?.username}
                  authorUserId={author?.user_id}
                  authorName={author?.full_name || author?.username}
                  authorRole={author?.role}
                  postSlug={post.slug}
                  contentType={post.content_type as "post" | "note" | "video" | "moment" | undefined}
                  onDeleteSuccess={() => { if (onDelete) onDelete(post.id); else setIsDeleted(true); }}
                  isSponsored={post.is_sponsored || (post.is_boosted && post.boost_status === 'active')}
                  isBoosted={post.is_boosted}
                />
              </div>
            </div>
          </div>

          {isNote ? (
            <NoteContent text={post.excerpt || post.title} href={postHref} onOpen={() => router.push(noteExpandedHref)} />
          ) : (
            <>
              {/* Title */}
              <h3 className="pointer-events-none text-[1.12rem] font-semibold leading-snug text-text-primary line-clamp-2">
                {post.title}
              </h3>

              {/* Excerpt */}
              {post.excerpt && (
                <p className="pointer-events-none text-[0.78rem] text-text-muted leading-snug line-clamp-2 mt-[3px]">
                  {post.excerpt}
                </p>
              )}

              {/* Thumbnail */}
              <div
                ref={thumbRef}
                className="mt-2 rounded-[12px] sm:rounded-[21px] overflow-hidden bg-bg-tertiary cursor-pointer relative z-[1] border border-border-primary"
                onClick={() => router.push(postHref)}
              >
                <div className={`relative w-full ${isVideo ? "min-h-[180px] sm:min-h-[160px] aspect-[3/4] sm:aspect-video" : "min-h-[120px] sm:min-h-[140px] aspect-[4/3] sm:aspect-[3/2]"}`}>
                  {hasThumbnail ? (
                    <BlurImage
                      src={(post.video_thumbnail || post.featured_image)!}
                      alt={post.title}
                      className="w-full h-full"
                      blurhash={post.blurhash}
                    />
                  ) : (
                    <NoImage className="w-full h-full" iconSize={28} />
                  )}

                  {/* Video preview — plays when card scrolls into view */}
                  {inView && canPreview && (
                    <div className="absolute inset-0 z-[2]">
                      <VideoPlayer
                        src={post.video_url!}
                        poster={thumbnail}
                        moment
                        externalPaused={showCTA}
                        externalMuted={muted}
                        onEnded={handleVideoEnded}
                        videoClassName="w-full h-full object-cover"
                      />
                      {/* Unmute button — bottom left */}
                      {!showCTA && (
                        <button
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setMuted(m => !m); }}
                          aria-label={muted ? t('tooltip.unmute') : t('tooltip.mute')}
                          data-tooltip={muted ? t('tooltip.unmute') : t('tooltip.mute')}
                          className="absolute bottom-2.5 left-2.5 z-[4] flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-sm text-white text-[0.7rem] font-medium pointer-events-auto"
                        >
                          {muted ? (
                            <>
                              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="white"><path d="M3.63 3.63a.996.996 0 000 1.41L7.29 8.7 7 9H4c-.55 0-1 .45-1 1v4c0 .55.45 1 1 1h3l3.29 3.29c.63.63 1.71.18 1.71-.71v-4.17l4.18 4.18c-.49.37-1.02.68-1.6.91-.36.15-.58.53-.58.92 0 .72.73 1.18 1.39.91.8-.33 1.55-.77 2.22-1.31l1.34 1.34a.996.996 0 101.41-1.41L5.05 3.63c-.39-.39-1.02-.39-1.42 0zM19 12c0 .82-.15 1.61-.41 2.34l1.53 1.53c.56-1.17.88-2.48.88-3.87 0-3.83-2.4-7.11-5.78-8.4-.59-.23-1.22.23-1.22.86v.19c0 .38.25.71.61.85C17.18 6.54 19 9.06 19 12zm-8.71-6.29l-.17.17L12 7.76V6.41c0-.89-1.08-1.33-1.71-.7zM16.5 12A4.5 4.5 0 0014 7.97v1.79l2.48 2.48c.01-.08.02-.16.02-.24z" /></svg>
                              <span>{t('post.unmute')}</span>
                            </>
                          ) : (
                            <>
                              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="white"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0014 7.97v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" /></svg>
                              <span>{t('post.mute')}</span>
                            </>
                          )}
                        </button>
                      )}
                      {/* CTA overlay */}
                      {showCTA && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-[3]">
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              router.push(postHref);
                            }}
                            className="px-4 py-2 bg-white text-black text-sm font-semibold rounded-full relative z-[4] pointer-events-auto"
                          >
                            {t('post.continueWatching')}
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Play icon (show when not previewing) */}
                  {isVideo && hasThumbnail && !inView && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-12 h-12 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center">
                        <svg className="h-6 w-6 text-white ml-0.5" fill="white" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                      </div>
                    </div>
                  )}
                  {/* İzle button — always visible on video thumbnails */}
                  {isVideo && hasThumbnail && !showCTA && (
                    <button
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); router.push(postHref); }}
                      className="absolute bottom-2.5 right-2.5 z-[4] flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-sm text-white text-[0.7rem] font-medium pointer-events-auto"
                    >
                      <svg className="h-3.5 w-3.5" fill="white" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                      <span>{t('post.watch')}</span>
                    </button>
                  )}
                  {/* Duration badge */}
                  {isVideo && !inView && (
                    <div className="absolute top-2 right-2 bg-black/70 text-white text-[0.6rem] font-medium px-1.5 py-0.5 rounded-md">
                      {post.video_duration ? `${Math.floor(post.video_duration / 60)}:${(post.video_duration % 60).toString().padStart(2, "0")}` : (post.content_type === "moment" ? t('contentTypes.moment') : t('contentTypes.video'))}
                    </div>
                  )}
                  {/* Watch progress bar */}
                  {isVideo && <WatchProgressBar slug={post.slug} />}
                </div>
              </div>
            </>
          )}

          {/* View count + visibility */}
          <div className="relative z-[1] pointer-events-none flex items-center gap-1.5 mt-[4px] ml-[1px]">
            {(post.view_count ?? 0) > 0 && (
              <span className="text-[0.7rem] text-text-muted">{formatCount(post.view_count!, locale)} {t('common.views')}</span>
            )}
            {post.visibility && (
              <span className="text-[0.7rem] text-text-muted">
                {(post.view_count ?? 0) > 0 ? "· " : ""}
                {post.visibility === 'followers' ? t('post.visibilityFollowers') :
                 post.visibility === 'only_me' ? t('post.visibilityOnlyMe') :
                 t('post.visibilityPublic')}
              </span>
            )}
          </div>

          {/* Copyright badge */}
          {!post.is_nsfw && (post.moderation_category === 'copyright' || post.moderation_category === 'kopya_icerik') && (
            <div className="relative z-[1] flex items-center gap-1 text-warning text-xs mt-1">
              <Copyright size={12} />
              <span>{post.moderation_category === 'kopya_icerik' ? t('post.duplicateContent') : t('post.copyrightNotice')}</span>
            </div>
          )}

          {/* Actions — inside content column */}
          <div className="relative z-[1] mt-0.5 mx-1">
            <PostInteractionBar
              postId={post.id}
              postUrl={postHref}
              postTitle={post.title}
              postSlug={post.slug}
              likeCount={post.like_count || 0}
              commentCount={post.comment_count || 0}
              saveCount={post.save_count || 0}
              initialLiked={resolvedInitialLiked}
              initialSaved={resolvedInitialSaved}
              isVideo={isVideo}
              contentType={post.content_type}
              compact={isVideo || isNote ? "full" : "no-like"}
            />
          </div>
        </div>
      </div>

    </article>
    </div>
  );
});
