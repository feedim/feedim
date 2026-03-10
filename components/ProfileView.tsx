"use client";

import { useState, useEffect, useRef, lazy, useCallback } from "react";
import Link from "next/link";
import { Menu, Calendar, Link as LinkIcon, MoreHorizontal, Lock, Briefcase, Phone, Clock, UserRoundPlus } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import BackButton from "@/components/BackButton";
import { formatCount } from "@/lib/utils";
import EditableAvatar from "@/components/EditableAvatar";
import PostListSection from "@/components/PostListSection";
import VerifiedBadge, { getBadgeVariant } from "@/components/VerifiedBadge";
import { useAuthModal } from "@/components/AuthModal";
import { useUser } from "@/components/UserContext";
import { feedimAlert } from "@/components/FeedimAlert";
import FollowButton from "@/components/FollowButton";
import { getCategoryLabelKey, isProfessional } from "@/lib/professional";
import SuggestionCarousel from "@/components/SuggestionCarousel";
import SimilarAccountsCarousel from "@/components/SimilarAccountsCarousel";
import ShareIcon from "@/components/ShareIcon";
import MomentGridCard from "@/components/MomentGridCard";
import { fetchWithCache, readCache, withCacheScope, invalidateCache } from "@/lib/fetchWithCache";
import { emitMutation } from "@/lib/mutationEvents";
import { FRESHNESS_WINDOWS } from "@/lib/freshnessPolicy";
import type { Profile, ProfileInteractions, ProfilePostItem, ProfileTabId } from "@/components/profile/types";
import { usePaginatedProfileFeed } from "@/components/profile/usePaginatedProfileFeed";
import LazyAvatar from "@/components/LazyAvatar";

const EditProfileModal = lazy(() => import("@/components/modals/EditProfileModal"));
const FollowersModal = lazy(() => import("@/components/modals/FollowersModal"));
const FollowingModal = lazy(() => import("@/components/modals/FollowingModal"));
const AvatarViewModal = lazy(() => import("@/components/modals/AvatarViewModal"));
const ProfileMoreModal = lazy(() => import("@/components/modals/ProfileMoreModal"));
const ShareModal = lazy(() => import("@/components/modals/ShareModal"));
const ProfileVisitorsModal = lazy(() => import("@/components/modals/ProfileVisitorsModal"));
const MutualFollowersModal = lazy(() => import("@/components/modals/MutualFollowersModal"));
const ProfileLinksModal = lazy(() => import("@/components/modals/ProfileLinksModal"));

function BioText({ text }: { text: string }) {
  const t = useTranslations("common");
  const [expanded, setExpanded] = useState(false);
  const [clamped, setClamped] = useState(false);
  const ref = useCallback((node: HTMLParagraphElement | null) => {
    if (node) setClamped(node.scrollHeight > node.clientHeight + 1);
  }, []);

  return (
    <div>
      <p
        ref={ref}
        className={`text-[0.84rem] text-text-secondary leading-snug whitespace-pre-line break-words ${!expanded ? "line-clamp-3" : ""}`}
      >
        {text}
      </p>
      {clamped && !expanded && (
        <button
          onClick={() => setExpanded(true)}
          className="text-[0.8rem] font-semibold text-text-muted hover:text-text-primary transition hover:underline mt-0.5"
        >
          {t("more")}
        </button>
      )}
    </div>
  );
}

export default function ProfileView({ profile: initialProfile }: { profile: Profile }) {
  const t = useTranslations("profile");
  const tc = useTranslations("common");
  const tProf = useTranslations("professional");
  const locale = useLocale();
  const [profile, setProfile] = useState(initialProfile);
  const [following, setFollowing] = useState(initialProfile.is_following || false);
  const [requested, setRequested] = useState(initialProfile.has_follow_request || false);
  const [followerCount, setFollowerCount] = useState(initialProfile.follower_count || 0);
  const [followingCount, setFollowingCount] = useState(initialProfile.following_count || 0);
  const [followPending, setFollowPending] = useState(false);
  const [isBlocked, setIsBlocked] = useState(initialProfile.is_blocked || false);
  const [isBlockedBy] = useState(initialProfile.is_blocked_by || false);
  const [followsMe, setFollowsMe] = useState(initialProfile.follows_me || false);
  const [activeTab, setActiveTab] = useState<ProfileTabId>("all");
  // Modals
  const [editOpen, setEditOpen] = useState(false);
  const [editAvatarOnOpen, setEditAvatarOnOpen] = useState(false);
  const [followersOpen, setFollowersOpen] = useState(false);
  const [followingOpen, setFollowingOpen] = useState(false);
  const [avatarViewOpen, setAvatarViewOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [visitorsOpen, setVisitorsOpen] = useState(false);
  const [mutualFollowersOpen, setMutualFollowersOpen] = useState(false);
  const [profileLinksOpen, setProfileLinksOpen] = useState(false);
  const [similarOpen, setSimilarOpen] = useState(false);
  const [totalViews, setTotalViews] = useState<number | null>(null);
  // Batch interaction state (like/save)
  const [interactions, setInteractions] = useState<ProfileInteractions>({});
  const fetchedInteractionIds = useRef(new Set<number>());

  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const { requireAuth } = useAuthModal();
  const { user: currentUser } = useUser();
  const profileCacheScope = currentUser?.id ? `viewer:${currentUser.id}:pi2` : "guest:pi2";

  const getProfileListUrl = useCallback((pageNum: number, contentType?: string) => (
    withCacheScope(
      `/api/users/${profile.username}/posts?page=${pageNum}${contentType ? `&content_type=${contentType}` : ""}`,
      profileCacheScope,
    )
  ), [profile.username, profileCacheScope]);

  const getProfileLikesUrl = useCallback((pageNum: number) => (
    withCacheScope(`/api/users/${profile.username}/likes?page=${pageNum}`, profileCacheScope)
  ), [profile.username, profileCacheScope]);

  const getProfileCommentsUrl = useCallback((pageNum: number) => (
    withCacheScope(`/api/users/${profile.username}/comments?page=${pageNum}`, profileCacheScope)
  ), [profile.username, profileCacheScope]);

  const getArticleListUrl = useCallback((pageNum: number) => getProfileListUrl(pageNum, "post"), [getProfileListUrl]);
  const getNoteListUrl = useCallback((pageNum: number) => getProfileListUrl(pageNum, "note"), [getProfileListUrl]);
  const getMomentListUrl = useCallback((pageNum: number) => getProfileListUrl(pageNum, "moment"), [getProfileListUrl]);
  const getVideoListUrl = useCallback((pageNum: number) => getProfileListUrl(pageNum, "video"), [getProfileListUrl]);

  // Auth gate for load more (page 2+)
  const authGate = useCallback(async (pageNum: number): Promise<boolean> => {
    if (pageNum > 1 && !currentUser) {
      const user = await requireAuth();
      return !!user;
    }
    return true;
  }, [currentUser, requireAuth]);

  const isAnyBlocked = isBlocked || isBlockedBy;
  const statsDisabled = isAnyBlocked || (profile.account_private && !profile.is_own && !following);
  const displayName = isAnyBlocked ? t("blockedUser") : (profile.full_name || [profile.name, profile.surname].filter(Boolean).join(" ") || profile.username);

  const allFeed = usePaginatedProfileFeed<ProfilePostItem>({
    getUrl: getProfileListUrl,
    ttlSeconds: 30,
    authGate,
    enabled: !isAnyBlocked,
    primeFromCache: !isAnyBlocked,
    autoLoad: !isAnyBlocked,
  });

  const articleFeed = usePaginatedProfileFeed<ProfilePostItem>({
    getUrl: getArticleListUrl,
    ttlSeconds: 30,
    authGate,
    enabled: !isAnyBlocked,
  });

  const noteFeed = usePaginatedProfileFeed<ProfilePostItem>({
    getUrl: getNoteListUrl,
    ttlSeconds: 30,
    authGate,
    enabled: !isAnyBlocked,
  });

  const momentFeed = usePaginatedProfileFeed<ProfilePostItem>({
    getUrl: getMomentListUrl,
    ttlSeconds: 30,
    authGate,
    enabled: !isAnyBlocked,
  });

  const videoFeed = usePaginatedProfileFeed<ProfilePostItem>({
    getUrl: getVideoListUrl,
    ttlSeconds: 30,
    authGate,
    enabled: !isAnyBlocked,
  });

  const likesFeed = usePaginatedProfileFeed<ProfilePostItem>({
    getUrl: getProfileLikesUrl,
    ttlSeconds: 20,
    authGate,
    enabled: !isAnyBlocked,
  });

  const commentsFeed = usePaginatedProfileFeed<ProfilePostItem>({
    getUrl: getProfileCommentsUrl,
    ttlSeconds: 20,
    authGate,
    enabled: !isAnyBlocked,
  });

  const articleFeedLoaded = articleFeed.loaded;
  const loadArticleFeedPage = articleFeed.loadPage;
  const videoFeedLoaded = videoFeed.loaded;
  const loadVideoFeedPage = videoFeed.loadPage;
  const likesFeedLoaded = likesFeed.loaded;
  const loadLikesFeedPage = likesFeed.loadPage;
  const commentsFeedLoaded = commentsFeed.loaded;
  const loadCommentsFeedPage = commentsFeed.loadPage;
  const momentFeedLoaded = momentFeed.loaded;
  const loadMomentFeedPage = momentFeed.loadPage;
  const noteFeedLoaded = noteFeed.loaded;
  const loadNoteFeedPage = noteFeed.loadPage;
  const allFeedItems = allFeed.items;
  const setAllFeedItems = allFeed.setItems;
  const likedFeedItems = likesFeed.items;
  const setLikedFeedItems = likesFeed.setItems;

  // Fetch batch interactions for all loaded posts
  useEffect(() => {
    if (!currentUser) return;
    const allIds = [
      ...allFeed.items,
      ...articleFeed.items,
      ...videoFeed.items,
      ...noteFeed.items,
      ...likesFeed.items,
      ...commentsFeed.items,
    ]
      .filter((post) => (
        typeof post.viewer_liked !== "boolean" ||
        typeof post.viewer_saved !== "boolean"
      ))
      .map((post) => post.id)
      .filter((id) => id && !fetchedInteractionIds.current.has(id));
    const unique = [...new Set(allIds)];
    if (unique.length === 0) return;
    const toFetch = unique.slice(0, 50);
    toFetch.forEach((id) => fetchedInteractionIds.current.add(id));
    fetch(`/api/posts/batch-interactions?ids=${toFetch.join(",")}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.interactions) setInteractions((prev) => ({ ...prev, ...data.interactions }));
      })
      .catch(() => {});
  }, [allFeed.items, articleFeed.items, videoFeed.items, noteFeed.items, likesFeed.items, commentsFeed.items, currentUser]);

  // Track profile visit
  useEffect(() => {
    if (!currentUser?.id || profile.is_own || isAnyBlocked) return;
    const visitKey = `fdm-profile-visit:${currentUser.id}:${profile.username}`;
    try {
      const lastVisit = Number(sessionStorage.getItem(visitKey) || "0");
      if (lastVisit && Date.now() - lastVisit < 30 * 60 * 1000) return;
      sessionStorage.setItem(visitKey, String(Date.now()));
    } catch {}

    fetch(`/api/users/${profile.username}/visit`, { method: "POST", keepalive: true }).catch(() => {});
  }, [currentUser?.id, profile.username, profile.is_own, isAnyBlocked]);

  useEffect(() => {
    if (!profile.is_own) return;
    const analyticsUrl = withCacheScope("/api/analytics?period=30d", currentUser?.id ? `viewer:${currentUser.id}` : "guest");
    const cached = readCache(analyticsUrl) as { overview?: { totalViews?: number } } | null;
    if (cached?.overview) {
      setTotalViews(cached.overview.totalViews || 0);
    }
  }, [currentUser?.id, profile.is_own]);

  useEffect(() => {
    if (profile.is_own) {
      const analyticsUrl = withCacheScope("/api/analytics?period=30d", currentUser?.id ? `viewer:${currentUser.id}` : "guest");
      fetchWithCache(analyticsUrl, { ttlSeconds: FRESHNESS_WINDOWS.profileSummaryAnalytics })
        .then((d) => d as { overview?: { totalViews?: number } })
        .then(d => setTotalViews(d.overview?.totalViews || 0))
        .catch(() => {});
    }
  }, [currentUser?.id, profile.is_own]);

  // Load data when tab switches for the first time
  useEffect(() => {
    if (activeTab === "posts" && !articleFeedLoaded) {
      void loadArticleFeedPage(1);
    }
    if (activeTab === "video" && !videoFeedLoaded) {
      void loadVideoFeedPage(1);
    }
    if (activeTab === "likes" && !likesFeedLoaded) {
      void loadLikesFeedPage(1);
    }
    if (activeTab === "comments" && !commentsFeedLoaded) {
      void loadCommentsFeedPage(1);
    }
    if (activeTab === "moments" && !momentFeedLoaded) {
      void loadMomentFeedPage(1);
    }
    if (activeTab === "notes" && !noteFeedLoaded) {
      void loadNoteFeedPage(1);
    }
  }, [
    activeTab,
    articleFeedLoaded,
    commentsFeedLoaded,
    likesFeedLoaded,
    loadArticleFeedPage,
    loadCommentsFeedPage,
    loadLikesFeedPage,
    loadMomentFeedPage,
    loadNoteFeedPage,
    loadVideoFeedPage,
    momentFeedLoaded,
    noteFeedLoaded,
    videoFeedLoaded,
  ]);

  const isAdminOrMod = currentUser?.role === "admin" || currentUser?.role === "moderator";

  const doUnfollow = useCallback(async () => {
    if (followPending) return;
    // Optimistic update for instant feedback
    const prevFollowing = following;
    const prevRequested = requested;
    const prevFollowerCount = followerCount;
    setFollowPending(true);
    if (requested) {
      setRequested(false);
    } else {
      setFollowing(false);
      setFollowerCount(c => Math.max(0, c - 1));
    }
    try {
      const res = await fetch(`/api/users/${profile.username}/follow`, { method: "POST", keepalive: true });
      if (!res.ok) {
        setFollowing(prevFollowing);
        setRequested(prevRequested);
        setFollowerCount(prevFollowerCount);
        if (res.status === 403 || res.status === 429) {
          const data = await res.json().catch(() => ({}));
          feedimAlert("error", data.error || t("followLimitReached"));
        }
      }
    } catch {
      setFollowing(prevFollowing);
      setRequested(prevRequested);
      setFollowerCount(prevFollowerCount);
    } finally {
      setFollowPending(false);
    }
  }, [followPending, following, requested, followerCount, profile.username, t]);

  const handleFollow = useCallback(async () => {
    if (followPending) return;
    if (!currentUser) {
      const user = await requireAuth();
      if (!user) return;
    }

    if (following || requested) {
      feedimAlert("question", t("unfollowConfirm"), { showYesNo: true, onYes: () => { void doUnfollow(); } });
      return;
    }

    // Follow or send request — optimistic update
    setFollowPending(true);
    try {
      if (profile.account_private) {
        setRequested(true);
      } else {
        setFollowing(true);
        setFollowerCount(c => c + 1);
      }
      const res = await fetch(`/api/users/${profile.username}/follow`, { method: "POST", keepalive: true });
      if (res.ok) {
        const data = await res.json();
        invalidateCache(`/api/users/${profile.username}`);
        emitMutation({ type: "follow-changed", username: profile.username });
        if (data.requested && !profile.account_private) {
          setFollowing(false);
          setFollowerCount(c => Math.max(0, c - 1));
          setRequested(true);
        } else if (!data.requested) {
          // Successfully followed — show similar accounts carousel
          setSimilarOpen(true);
        }
      } else {
        if (profile.account_private) {
          setRequested(false);
        } else {
          setFollowing(false);
          setFollowerCount(c => Math.max(0, c - 1));
        }
        if (res.status === 429 || res.status === 403) {
          const data = await res.json().catch(() => ({}));
          feedimAlert("error", data.error || t("followLimitReached"));
        }
      }
    } catch {
      if (profile.account_private) {
        setRequested(false);
      } else {
        setFollowing(false);
        setFollowerCount(c => Math.max(0, c - 1));
      }
    } finally {
      setFollowPending(false);
    }
  }, [profile.username, profile.account_private, following, requested, followPending, currentUser, requireAuth, doUnfollow, t]);

  const handleBlock = useCallback(() => {
    if (!isBlocked) {
      feedimAlert("warning", t("blockConfirm", { username: profile.username }), {
        showYesNo: true,
        onYes: () => {
          const prevFollowing = following;
          const prevRequested = requested;
          const prevFollowerCount = followerCount;
          const prevPosts = allFeedItems;
          const prevLikedPosts = likedFeedItems;
          setIsBlocked(true);
          setFollowing(false);
          setRequested(false);
          setFollowerCount(0);
          setAllFeedItems([]);
          setLikedFeedItems([]);

          fetch(`/api/users/${profile.username}/block`, { method: "POST", keepalive: true }).then(res => {
            if (!res.ok) {
              setIsBlocked(false);
              setFollowing(prevFollowing);
              setRequested(prevRequested);
              setFollowerCount(prevFollowerCount);
              setAllFeedItems(prevPosts);
              setLikedFeedItems(prevLikedPosts);
            }
          }).catch(() => {
            setIsBlocked(false);
            setFollowing(prevFollowing);
            setRequested(prevRequested);
            setFollowerCount(prevFollowerCount);
            setAllFeedItems(prevPosts);
            setLikedFeedItems(prevLikedPosts);
          });
        },
      });
    } else {
      feedimAlert("question", t("unblockConfirm", { username: profile.username }), {
        showYesNo: true,
        onYes: () => {
          setIsBlocked(false);
          fetch(`/api/users/${profile.username}/block`, { method: "POST", keepalive: true }).then(res => {
            if (!res.ok) setIsBlocked(true);
          }).catch(() => setIsBlocked(true));
        },
      });
    }
  }, [
    profile.username,
    isBlocked,
    following,
    requested,
    followerCount,
    allFeedItems,
    likedFeedItems,
    setAllFeedItems,
    setLikedFeedItems,
    t,
  ]);

  const handleAvatarClick = useCallback(() => {
    if (!isAnyBlocked) setAvatarViewOpen(true);
  }, [isAnyBlocked]);

  return (
    <div>
      {/* Header */}
      <header className="z-30">
        <nav className="px-4 flex items-center justify-between h-[53px]">
          <div className="flex items-center gap-2">
            <BackButton />
            <span className="text-[1.1rem] font-semibold">{isBlockedBy ? t("blockedUser") : `@${profile.username}`}</span>
          </div>
          <div className="flex items-center gap-1">
            {profile.is_own ? (
              <Link href="/settings" className="i-btn !w-9 !h-9 text-text-muted flex items-center justify-center" aria-label={t("settings")}>
                <Menu className="h-5 w-5" />
              </Link>
            ) : (
              <button
                onClick={() => setMoreOpen(true)}
                className="i-btn !w-9 !h-9 text-text-muted"
                aria-label={t("moreOptions")}
              >
                <MoreHorizontal className="h-5 w-5" />
              </button>
            )}
          </div>
        </nav>
      </header>

      <main className="px-3.5 py-6">
        {(isAdminOrMod || profile.is_own) && profile.status && profile.status !== "active" && (
          <div className={`mb-3 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[0.7rem] font-semibold w-fit ${
            profile.status === "moderation" ? "bg-[var(--accent-color)]/10 text-[var(--accent-color)]" :
            profile.status === "frozen" ? "bg-info/10 text-info" :
            "bg-error/10 text-error"
          }`}>
            <Clock size={11} />
            <span>
              {profile.status === "moderation" ? tc("profileUnderReview") :
               profile.status === "blocked" ? tc("profileClosed") :
               profile.status === "frozen" ? tc("profileFrozen") :
               profile.status === "deleted" ? tc("profileDeleted") : profile.status}
            </span>
          </div>
        )}
        {/* Profile header */}
        <div className="flex items-start gap-4 mb-4">
          {/* Avatar */}
          <div className="relative shrink-0 z-[2]">
            <EditableAvatar
              src={isAnyBlocked ? null : profile.avatar_url}
              alt={displayName}
              sizeClass="w-24 h-24"
              editable={false}
              loading={false}
              onClick={isAnyBlocked ? undefined : handleAvatarClick}
            />
          </div>

          {/* Stats */}
          <div className="flex-1 flex items-center justify-around pt-2 select-none">
            <div className="text-center">
              <p className="text-[1.1rem] font-bold">{isAnyBlocked ? "0" : formatCount(profile.post_count || 0)}</p>
              <p className="text-[0.78rem] text-text-muted">{t("posts")}</p>
            </div>
            <button onClick={statsDisabled ? undefined : () => setFollowersOpen(true)} aria-label={t("followers")} className={`text-center ${statsDisabled ? "cursor-default" : ""}`}>
              <p className="text-[1.1rem] font-bold">{isAnyBlocked ? "0" : formatCount(followerCount)}</p>
              <p className="text-[0.78rem] text-text-muted">{t("followers")}</p>
            </button>
            <button onClick={statsDisabled ? undefined : () => setFollowingOpen(true)} aria-label={t("following")} className={`text-center ${statsDisabled ? "cursor-default" : ""}`}>
              <p className="text-[1.1rem] font-bold">{isAnyBlocked ? "0" : formatCount(followingCount)}</p>
              <p className="text-[0.78rem] text-text-muted">{t("following")}</p>
            </button>
          </div>
        </div>

        {/* Name & Bio */}
        <div className="mb-[14px]">
          <div className="flex items-center gap-1.5">
            <h1 className="text-[1.1rem] font-bold truncate">{displayName}</h1>
            {!isAnyBlocked && (profile.role === "admin" || profile.is_verified) && (
              <VerifiedBadge
                size="md"
                variant={getBadgeVariant(profile.premium_plan || undefined)}
                role={profile.role || undefined}
              />
            )}
            {!isAnyBlocked && profile.role === "admin" ? (
              <span className="text-[10px] font-bold bg-[#ff6200]/15 text-[#ff6200] px-1.5 py-0.5 rounded-full">ADMIN</span>
            ) : !isAnyBlocked && profile.is_premium && profile.premium_plan && !["basic"].includes(profile.premium_plan) ? (
              <span className="text-[10px] font-bold bg-accent-main/15 text-accent-main px-1.5 py-0.5 rounded-full">
                {profile.premium_plan === "business" ? "BUSINESS" : profile.premium_plan === "max" ? "MAX" : profile.premium_plan === "super" ? "SUPER" : "PRO"}
              </span>
            ) : null}
          </div>
          {!isAnyBlocked && isProfessional(profile.account_type || undefined) && profile.professional_category && (
            <div className="flex items-center gap-1.5 flex-wrap mt-0.5 mb-0.5">
              <span className="inline-flex items-center gap-1 text-[0.7rem] font-medium text-text-muted bg-bg-secondary px-2 py-0.5 rounded-full">
                <Briefcase className="h-3 w-3" />
                {tProf(getCategoryLabelKey(profile.account_type || "business", profile.professional_category))}
              </span>
              {profile.contact_email && (
                <a
                  href={`mailto:${profile.contact_email}`}
                  className="inline-flex items-center gap-1 text-[0.7rem] font-medium text-text-muted bg-bg-secondary px-2 py-0.5 rounded-full hover:bg-bg-tertiary transition"
                >
                  {t("email")}
                </a>
              )}
              {profile.contact_phone && (
                <a
                  href={`tel:${profile.contact_phone}`}
                  className="inline-flex items-center gap-1 text-[0.7rem] font-medium text-text-muted bg-bg-secondary px-2 py-0.5 rounded-full hover:bg-bg-tertiary transition"
                >
                  <Phone className="h-3 w-3" /> {t("call")}
                </a>
              )}
            </div>
          )}
          {!isAnyBlocked && (
            <div className="mt-1 space-y-1">
              {profile.bio && <BioText text={profile.bio} />}
              {(() => {
                const resolvedLinks = (Array.isArray(profile.links) && profile.links.length > 0)
                  ? profile.links
                  : profile.website ? [{ title: "", url: profile.website }] : [];
                if (resolvedLinks.length === 0) return null;
                const firstUrl = resolvedLinks[0].url;
                // Show domain + short path instead of raw URL
                let displayUrl = firstUrl;
                try {
                  const u = new URL(firstUrl.startsWith("http") ? firstUrl : `https://${firstUrl}`);
                  const host = u.hostname;
                  const path = u.pathname === "/" ? "" : u.pathname;
                  const short = host + path;
                  displayUrl = short.length > 30 ? short.slice(0, 28) + "…" : short;
                } catch {
                  displayUrl = firstUrl.length > 30 ? firstUrl.slice(0, 28) + "…" : firstUrl;
                }
                const extraCount = resolvedLinks.length - 1;
                return (
                  <button onClick={() => setProfileLinksOpen(true)} className="flex items-center gap-1 text-[0.8rem] text-accent-main hover:underline">
                    <LinkIcon className="h-3.5 w-3.5" />
                    {displayUrl}
                    {extraCount > 0 && <span> {t("otherLinks", { count: extraCount })}</span>}
                  </button>
                );
              })()}
              {profile.created_at && (
                <span className="flex items-center gap-1 text-[0.78rem] text-text-muted">
                  <Calendar className="h-3 w-3" /> {t("joinedAt", { date: new Date(profile.created_at).toLocaleDateString(locale, { month: "long", year: "numeric" }) })}
                </span>
              )}
            </div>
          )}

          {/* Mutual followers */}
          {!isAnyBlocked && !profile.is_own && profile.mutual_followers && profile.mutual_followers.length > 0 && (
            <button onClick={() => setMutualFollowersOpen(true)} className="group flex items-center gap-1.5 mt-2.5 w-full text-left hover:underline hover:opacity-80 transition">
              <div className="flex -space-x-2">
                {profile.mutual_followers.slice(0, 3).map((m) => (
                  <LazyAvatar key={m.username} src={m.avatar_url} alt="" sizeClass="h-[22px] w-[22px]" borderClass="border border-border-primary" />
                ))}
              </div>
              <span className="text-[0.82rem] text-text-muted min-w-0 flex-1 truncate group-hover:underline">
                {profile.mutual_followers.length === 1
                  ? <><span className="font-semibold text-text-primary inline-block max-w-[14ch] truncate align-bottom group-hover:underline">@{profile.mutual_followers[0].username}</span> {t("mutualFollowsVerb")}</>
                  : profile.mutual_followers.length === 2
                    ? <><span className="font-semibold text-text-primary inline-block max-w-[12ch] truncate align-bottom group-hover:underline">@{profile.mutual_followers[0].username}</span> {t("and")} <span className="font-semibold text-text-primary inline-block max-w-[12ch] truncate align-bottom group-hover:underline">@{profile.mutual_followers[1].username}</span> {t("mutualFollowsVerb")}</>
                    : <><span className="font-semibold text-text-primary inline-block max-w-[12ch] truncate align-bottom group-hover:underline">@{profile.mutual_followers[0].username}</span>, <span className="font-semibold text-text-primary inline-block max-w-[12ch] truncate align-bottom group-hover:underline">@{profile.mutual_followers[1].username}</span> {t("and")} <span className="font-semibold text-text-primary group-hover:underline">{t("others")}</span> {t("mutualFollowsVerb")}</>
                }
              </span>
            </button>
          )}
        </div>

        {/* Analytics button (own profile, premium only) */}
        {profile.is_own && (profile.is_premium || currentUser?.role === "admin") && (
          <Link
            href="/analytics"
            className="flex flex-col w-full mb-3 py-3 px-4 rounded-[15px] bg-bg-secondary hover:bg-bg-tertiary transition"
          >
            <span className="text-[0.88rem] font-bold">{t("statistics")}</span>
            {totalViews === null ? (
              <span className="flex items-center gap-1 mt-1.5">
                <div className="h-[9px] w-36 bg-bg-tertiary rounded-[5px] animate-pulse" />
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[0.78rem] text-text-muted mt-0.5">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-text-primary"><path d="M21 21H6.2C5.08 21 4.52 21 4.09 20.782C3.72 20.59 3.41 20.284 3.22 19.908C3 19.48 3 18.92 3 17.8V3" /><path d="M7 15l4-6 4 4 6-8" /></svg>
                {t("last30DaysViews", { count: formatCount(totalViews) })}
              </span>
            )}
          </Link>
        )}


        {/* Action buttons */}
        <div className="flex gap-2 mb-3">
          {profile.is_own ? (
            <>
              <button onClick={() => setEditOpen(true)} data-hotkey="edit-profile" data-tooltip={t("editProfile")} aria-label={t("editProfile")} className="flex-1 t-btn cancel" style={{ padding: "0 14px", fontSize: "0.82rem" }}>
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4Z" />
                </svg>
                {t("editProfile")}
              </button>
              <button onClick={() => setShareOpen(true)} data-hotkey="share" aria-label={t("shareProfile")} className="flex-1 t-btn cancel" style={{ padding: "0 14px", fontSize: "0.82rem" }}>
                <ShareIcon className="h-4 w-4" /> {t("shareProfile")}
              </button>
            </>
          ) : isBlockedBy ? (
            <div className="flex-1" />
          ) : isBlocked ? (
            <>
              <button
                onClick={handleBlock}
                className="flex-1 t-btn cancel text-error"
              >
                {t("unblockUser")}
              </button>
              <button onClick={() => setShareOpen(true)} data-hotkey="share" className="flex-1 t-btn cancel">
                <ShareIcon className="h-4 w-4" /> {t("share")}
              </button>
            </>
          ) : requested ? (
            <>
              <button
                onClick={handleFollow}
                className="flex-1 t-btn cancel"
                disabled={followPending}
              >
                <Clock className="h-4 w-4" /> {t("requestSent")}
              </button>
              <button onClick={() => setShareOpen(true)} data-hotkey="share" className="flex-1 t-btn cancel">
                <ShareIcon className="h-4 w-4" /> {t("share")}
              </button>
            </>
          ) : (
            <>
              <FollowButton following={following} followsMe={followsMe && !following} onClick={handleFollow} variant="profile" className="flex-1" disabled={followPending} />
              <button onClick={() => setShareOpen(true)} data-hotkey="share" className="flex-1 t-btn cancel">
                <ShareIcon className="h-4 w-4" /> {t("share")}
              </button>
              <button onClick={() => setSimilarOpen(o => !o)} aria-label={t("similarAccountsSuggestions")} className="t-btn cancel !min-w-[47px] !w-[47px] !px-0 shrink-0">
                <UserRoundPlus className="h-4 w-4" />
              </button>
            </>
          )}
        </div>

        {/* Similar accounts carousel — shown after follow or via button */}
        {!profile.is_own && !isAnyBlocked && (
          <div className={`-mx-4 mb-3 ${similarOpen ? "" : "hidden"}`}>
            <SimilarAccountsCarousel userId={profile.user_id} username={profile.username} onClose={() => setSimilarOpen(false)} visible={similarOpen} />
          </div>
        )}

        {/* Suggestion carousel for 0-follower profiles */}
        {!profile.is_own && !isAnyBlocked && followerCount === 0 && !similarOpen && (
          <div className="-mx-4 mb-3">
            <SuggestionCarousel excludeUserId={profile.user_id} />
          </div>
        )}

        {/* Private account guard */}
        {!profile.is_own && profile.account_private && !following && !isAnyBlocked && (
          <div className="border-t border-border-primary py-10 text-center">
            <Lock className="h-10 w-10 text-text-muted mx-auto mb-3" />
            <p className="font-semibold text-[1rem] mb-1">{t("privateAccount")}</p>
            <p className="text-[0.74rem] text-text-muted">{t("privateAccountFollow")}</p>
          </div>
        )}

        {/* Premium promotion banner — shown to non-premium logged-in users on own profile */}
        {profile.is_own && currentUser && !currentUser.isPremium && currentUser.role !== "admin" && (
          <Link
            href="/premium"
            className="flex items-center gap-3 px-4 py-3 mb-3 rounded-[13px] bg-accent-main/[0.06] hover:bg-accent-main/[0.10] transition-colors"
          >
            <VerifiedBadge size="md" className="shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[0.82rem] font-semibold text-text-primary leading-snug">{t("premiumPromoTitle")}</p>
              <p className="text-[0.78rem] text-accent-main font-medium">{t("premiumPromoDesc")}</p>
            </div>
            <svg className="h-4 w-4 text-text-muted shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
          </Link>
        )}


        {/* Tabs */}
        {!isAnyBlocked && (!profile.account_private || profile.is_own || following) && (
          <>
            <div className="flex gap-[10px] border-b border-border-primary overflow-x-auto scrollbar-hide select-none">
              {([
                { id: "all", label: t("tabAll") },
                { id: "notes", label: t("tabNotes") },
                { id: "moments", label: t("tabMoments") },
                { id: "posts", label: t("tabPosts") },
                { id: "video", label: t("tabVideo") },
                { id: "likes", label: t("tabLikes") },
                { id: "comments", label: t("tabComments") },
              ] as const).map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`shrink-0 px-3 py-3 text-[0.95rem] font-semibold border-b-[2.5px] transition whitespace-nowrap ${
                    activeTab === tab.id
                      ? "border-accent-main text-text-primary"
                      : "border-transparent text-text-muted"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* All Tab */}
            {activeTab === "all" && (
              <div className="pt-2 -mx-4">
                {mounted ? (
                  <PostListSection
                    posts={allFeed.items}
                    loading={allFeed.loading}
                    hasMore={allFeed.hasMore}
                    onLoadMore={allFeed.loadMore}
                    emptyTitle={t("noPostsYet")}
                    emptyDescription={profile.is_own ? t("emptyPostsOwn") : t("emptyPostsOther")}
                    interactions={interactions}
                  />
                ) : null}
              </div>
            )}

            {/* Posts (Articles) Tab */}
            {activeTab === "posts" && (
              <div className="pt-2 -mx-4">
                {mounted ? (
                  <PostListSection
                    posts={articleFeed.items}
                    loading={articleFeed.loading || !articleFeed.loaded}
                    hasMore={articleFeed.hasMore}
                    onLoadMore={articleFeed.loadMore}
                    emptyTitle={t("noPostsYet")}
                    emptyDescription={profile.is_own ? t("emptyPostsOwn") : t("emptyPostsOther")}
                    interactions={interactions}
                    skeletonVariant="post"
                  />
                ) : null}
              </div>
            )}

            {/* Notes Tab */}
            {activeTab === "notes" && (
              <div className="pt-2 -mx-4">
                {mounted ? (
                  <PostListSection
                    posts={noteFeed.items}
                    loading={noteFeed.loading || !noteFeed.loaded}
                    hasMore={noteFeed.hasMore}
                    onLoadMore={noteFeed.loadMore}
                    emptyTitle={t("noNotesYet")}
                    emptyDescription={profile.is_own ? t("emptyNotesOwn") : t("emptyNotesOther")}
                    interactions={interactions}
                    skeletonVariant="note"
                  />
                ) : null}
              </div>
            )}

            {/* Moments Tab */}
            {activeTab === "moments" && (
              <div className="-mx-4 sm:mx-0">
                {!momentFeed.loaded || (momentFeed.loading && !momentFeed.items.length) ? (
                  <div className="grid grid-cols-3 gap-0.5">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(i => (
                      <div key={i} className="aspect-[9/16] bg-bg-secondary rounded-sm animate-pulse" />
                    ))}
                  </div>
                ) : momentFeed.items.length === 0 ? (
                  <div className="text-center py-12 sm:py-20">
                    <h2 className="text-lg sm:text-xl font-bold mb-2">{t("noMomentsYet")}</h2>
                    <p className="text-[12px] text-text-muted leading-snug mb-5 sm:mb-6 px-4 max-w-[300px] mx-auto">
                      {profile.is_own ? t("emptyMomentsOwn") : t("emptyMomentsOther")}
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-3 gap-0.5">
                      {momentFeed.items.map((m) => (
                        <MomentGridCard key={m.id} moment={m} />
                      ))}
                    </div>
                    {momentFeed.hasMore && (
                      <div className="flex justify-center py-4">
                        <button
                          onClick={momentFeed.loadMore}
                          disabled={momentFeed.loading}
                          className="text-sm text-accent-main font-medium hover:underline disabled:opacity-50"
                        >
                          {momentFeed.loading ? t("loading") : t("loadMore")}
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Video Tab */}
            {activeTab === "video" && (
              <div className="pt-2 -mx-4">
                {mounted ? (
                  <PostListSection
                    posts={videoFeed.items}
                    loading={videoFeed.loading || !videoFeed.loaded}
                    hasMore={videoFeed.hasMore}
                    onLoadMore={videoFeed.loadMore}
                    emptyTitle={t("noVideosYet")}
                    emptyDescription={profile.is_own ? t("emptyVideosOwn") : t("emptyVideosOther")}
                    interactions={interactions}
                    skeletonVariant="video"
                  />
                ) : null}
              </div>
            )}

            {/* Likes Tab */}
            {activeTab === "likes" && (
              <div className="pt-2 -mx-4">
                {mounted ? (
                  <PostListSection
                    posts={likesFeed.items}
                    loading={likesFeed.loading || !likesFeed.loaded}
                    hasMore={likesFeed.hasMore}
                    onLoadMore={likesFeed.loadMore}
                    emptyTitle={t("noLikesYet")}
                    emptyDescription={profile.is_own ? t("emptyLikesOwn") : t("emptyLikesOther")}
                    interactions={interactions}
                  />
                ) : null}
              </div>
            )}

            {/* Comments Tab */}
            {activeTab === "comments" && (
              <div className="pt-2 -mx-4">
                {mounted ? (
                  <PostListSection
                    posts={commentsFeed.items}
                    loading={commentsFeed.loading || !commentsFeed.loaded}
                    hasMore={commentsFeed.hasMore}
                    onLoadMore={commentsFeed.loadMore}
                    emptyTitle={t("noCommentsYet")}
                    emptyDescription={profile.is_own ? t("emptyCommentsOwn") : t("emptyCommentsOther")}
                    interactions={interactions}
                  />
                ) : null}
              </div>
            )}

          </>
        )}

        {isAnyBlocked && !profile.is_own && (
          <div className="border-t border-border-primary pt-8 text-center">
            <Lock className="h-10 w-10 text-text-muted mx-auto mb-3" />
            {isBlockedBy ? (
              <>
                <p className="font-semibold text-[0.95rem] mb-1">{t("contentUnavailable")}</p>
                <p className="text-sm text-text-muted">{t("cannotViewProfile")}</p>
              </>
            ) : (
              <>
                <p className="font-semibold text-[0.95rem] mb-1">{t("userBlocked")}</p>
                <p className="text-sm text-text-muted">{t("userBlockedDesc")}</p>
              </>
            )}
          </div>
        )}
      </main>

      {/* Modals */}
      <EditProfileModal
        open={editOpen}
        onClose={() => {
          setEditOpen(false);
          setEditAvatarOnOpen(false);
        }}
        onReopen={() => setEditOpen(true)}
        onLinksChange={(links) => setProfile(prev => ({ ...prev, links }))}
        openAvatarPicker={editAvatarOnOpen}
        onSave={(updated) => { setProfile({ ...profile, ...updated }); setEditOpen(false); }}
      />
      <FollowersModal open={followersOpen} onClose={() => setFollowersOpen(false)} username={profile.username} onTotalCount={setFollowerCount} />
      <FollowingModal open={followingOpen} onClose={() => setFollowingOpen(false)} username={profile.username} onTotalCount={setFollowingCount} />

      <AvatarViewModal
        open={avatarViewOpen}
        onClose={() => setAvatarViewOpen(false)}
        avatarUrl={profile.avatar_url || null}
        name={displayName}
        isOwn={!!profile.is_own}
        onEdit={() => {
          setAvatarViewOpen(false);
          setTimeout(() => {
            setEditAvatarOnOpen(true);
            setEditOpen(true);
          }, 1000);
        }}
      />

      <ProfileMoreModal
        open={moreOpen}
        onClose={() => setMoreOpen(false)}
        username={profile.username}
        userId={profile.user_id}
        isBlocked={isBlocked}
        onBlock={handleBlock}
        onShare={() => setShareOpen(true)}
        onVisitors={() => setVisitorsOpen(true)}
        isOwn={profile.is_own || false}
        targetRole={profile.role || undefined}
        targetStatus={profile.status || undefined}
        followsMe={followsMe}
        onRemoveFollower={async () => {
          try {
            await fetch(`/api/users/${profile.username}/follow?action=remove-follower`, { method: "DELETE" });
            setFollowsMe(false);
            setFollowerCount(c => Math.max(0, c - 1));
          } catch {}
        }}
      />

      <ShareModal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        url={`/u/${profile.username}`}
        title={`${displayName} (@${profile.username})`}
      />

      {profile.is_own && (
        <ProfileVisitorsModal
          open={visitorsOpen}
          onClose={() => setVisitorsOpen(false)}
          username={profile.username}
        />
      )}

      <MutualFollowersModal
        open={mutualFollowersOpen}
        onClose={() => setMutualFollowersOpen(false)}
        username={profile.username}
      />

      <ProfileLinksModal
        open={profileLinksOpen}
        onClose={() => setProfileLinksOpen(false)}
        links={
          (Array.isArray(profile.links) && profile.links.length > 0)
            ? profile.links
            : profile.website ? [{ title: "", url: profile.website }] : []
        }
        displayName={displayName}
      />

    </div>
  );
}
