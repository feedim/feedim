"use client";

import { useState, useEffect, useRef, useCallback, Suspense, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import MomentCard from "@/components/MomentCard";
import { useDashboardShell } from "@/components/DashboardShell";

import { useUser } from "@/components/UserContext";
import { useTranslations, useLocale } from "next-intl";
import { isBlockedContent } from "@/lib/blockedWords";
import { redirectToLogin } from "@/lib/loginNext";
import MomentAdCard from "@/components/MomentAdCard";
import type { DisplayItem, FeedMode, Moment, MomentsPerfHints } from "@/components/moments/types";
import { getMomentsPerfHints } from "@/components/moments/perf";
import { useMomentsIdlePause } from "@/components/moments/useMomentsIdlePause";
import { useMomentsLayoutLock } from "@/components/moments/useMomentsLayoutLock";
import { useMomentsInteractions } from "@/components/moments/useMomentsInteractions";
import { useMomentsFeed } from "@/components/moments/useMomentsFeed";
import { useMomentsLoadMore } from "@/components/moments/useMomentsLoadMore";
import { useMomentsViewport } from "@/components/moments/useMomentsViewport";
import { useMomentsUrlSync } from "@/components/moments/useMomentsUrlSync";
import { useMomentsAdCadence } from "@/components/moments/useMomentsAdCadence";
import { useMomentsVideoWarmup } from "@/components/moments/useMomentsVideoWarmup";
import { useMomentsModalController } from "@/components/moments/useMomentsModalController";
import MomentsTopBar from "@/components/moments/MomentsTopBar";
import MomentsOverlayStack from "@/components/moments/MomentsOverlayStack";

const preloadMomentsModals = () => {
  import("@/components/modals/CommentsModal");
  import("@/components/modals/ShareModal");
  import("@/components/modals/PostMoreModal");
  import("@/components/modals/LikesModal");
};

const AD_DISMISS_DELAY_MS = 400;

type IdleWindow = Window & {
  requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number;
  cancelIdleCallback?: (handle: number) => void;
};

export default function MomentsPage() {
  return (
    <Suspense fallback={
      <div className="fixed inset-0 z-[70] flex justify-center overflow-hidden bg-transparent md:relative md:inset-auto md:z-auto md:h-screen" style={{ height: "100dvh", minHeight: "100dvh", maxHeight: "100dvh" }}>
        <div className="w-full h-full bg-bg-tertiary/50 animate-pulse" style={{ maxWidth: "min(62dvh, 480px)" }} />
      </div>
    }>
      <MomentsContent />
    </Suspense>
  );
}

function MomentsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { setMobileNavVisible } = useDashboardShell();
  const { isLoggedIn, user: ctxUser } = useUser();
  const locale = useLocale();
  const t = useTranslations("moments");
  const tExplore = useTranslations("explore");
  const tFeed = useTranslations("feed");
  const tModals = useTranslations("modals");
  const tErrors = useTranslations("errors");
  const tTooltip = useTranslations("tooltip");
  const momentsCacheScope = `${locale}:${ctxUser?.id || "guest"}:pi2`;
  const [feedMode, setFeedMode] = useState<FeedMode>("for-you");
  const [loadingMore, setLoadingMore] = useState(false);
  const suppressIntersectionUntilRef = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const perfHintsRef = useRef<MomentsPerfHints>(getMomentsPerfHints());
  const filterOptions = [
    { id: "for-you", label: tFeed("forYou") },
    { id: "following", label: tModals("followings") },
  ];

  const {
    commentModal,
    setCommentModal,
    shareModal,
    setShareModal,
    optionsModal,
    setOptionsModal,
    likesModalPostId,
    setLikesModalPostId,
    globalMuted,
    handleComment,
    handleLikesOpen,
    handleShare,
    handleOptions,
    handleToggleMute,
  } = useMomentsModalController();
  const { idlePaused, handleContinueWatching, handleStopWatching } = useMomentsIdlePause({ router });

  const viewportHeightStyle = useMemo(
    () => ({ height: "100dvh", minHeight: "100dvh", maxHeight: "100dvh" } as const),
    []
  );

  // Capture initial slug only on mount — ignore subsequent URL changes
  const [startSlug] = useState<string | null>(() => searchParams.get("s"));
  const interactionHelpersRef = useRef<{
    applyStoredInteractions: (items: Moment[]) => Moment[];
    hydrateInteractions: (items: Moment[]) => void;
  }>({
    applyStoredInteractions: (items) => items,
    hydrateInteractions: () => {},
  });
  const {
    moments,
    setMoments,
    loading,
    hasMore,
    setHasMore,
    loadMoments,
  } = useMomentsFeed({
    locale,
    cacheScope: momentsCacheScope,
    feedMode,
    startSlug,
    interactionHelpersRef,
  });
  const {
    activeDisplayIndex,
    setActiveDisplayIndex,
    settledIndex,
    setSettledIndex,
    scrollIdleTick,
    makeSlotRef,
    resetViewportTracking,
  } = useMomentsViewport({
    containerRef,
    suppressIntersectionUntilRef,
  });

  // Build display list — inject ad item every 7 moments (skip for premium/admin users)
  // Ads marked as dismissed keep their slot (stable indices) but render as collapsed divs
  const [dismissedAdKeys, setDismissedAdKeys] = useState<Set<number>>(new Set());
  const skipAds = ctxUser?.role === "admin" || (!!ctxUser?.premiumPlan && ["pro", "max", "business"].includes(ctxUser.premiumPlan));
  const displayItems = useMemo(() => {
    const filtered = moments.filter(m => !isBlockedContent(`${m.title || ""} ${m.excerpt || ""}`, m.profiles?.user_id, ctxUser?.id));
    const items: DisplayItem[] = [];
    filtered.forEach((m, i) => {
      items.push({ type: "moment" as const, moment: m, realIndex: i });
      if (!skipAds && (i + 1) % 7 === 0) {
        items.push({ type: "ad" as const, adKey: i, dismissed: dismissedAdKeys.has(i) });
      }
    });
    return items;
  }, [moments, ctxUser?.id, dismissedAdKeys, skipAds]);

  // DOM virtualization — only render full content for items near active index
  const BUFFER_BEHIND = 2;
  const BUFFER_AHEAD = 3;
  const THUMBNAIL_ZONE = 10;

  const requireAuth = useCallback(() => {
    if (isLoggedIn) return true;
    redirectToLogin();
    return false;
  }, [isLoggedIn]);
  const {
    applyStoredInteractions,
    hydrateInteractions,
    isMomentLiked,
    isMomentSaved,
    handleLike,
    handleSave,
  } = useMomentsInteractions({
    isLoggedIn,
    viewerId: ctxUser?.id,
    moments,
    setMoments,
    requireAuth,
    errors: {
      likeLimitReached: tErrors("likeLimitReached"),
      saveLimitReached: tErrors("saveLimitReached"),
    },
  });
  interactionHelpersRef.current = {
    applyStoredInteractions,
    hydrateInteractions,
  };

  useMomentsLoadMore({
    hasMore,
    loadingMore,
    setLoadingMore,
    settledIndex,
    displayItems,
    moments,
    isLoggedIn,
    feedMode,
    loadMoments,
    interactionHelpersRef,
    setMoments,
    setHasMore,
  });
  useMomentsUrlSync({
    settledIndex,
    displayItems,
  });
  useMomentsVideoWarmup({
    moments,
    settledIndex,
    displayItems,
    perfHintsRef,
  });
  const { clearAdCadence } = useMomentsAdCadence({
    delayMs: AD_DISMISS_DELAY_MS,
    containerRef,
    settledIndex,
    scrollIdleTick,
    displayItems,
    dismissedAdKeys,
    setDismissedAdKeys,
    suppressIntersectionUntilRef,
    setActiveDisplayIndex,
    setSettledIndex,
  });

  useMomentsLayoutLock({
    setMobileNavVisible,
    hasOpenModal: Boolean(commentModal || shareModal || optionsModal || likesModalPostId),
  });

  // Preload modals early to avoid first-open lag
  useEffect(() => {
    if (typeof window === "undefined") return;
    const idleWindow = window as IdleWindow;
    let idleId: number | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;
    if (idleWindow.requestIdleCallback && !perfHintsRef.current.constrained) {
      idleId = idleWindow.requestIdleCallback(preloadMomentsModals, {
        timeout: perfHintsRef.current.warmupDelayMs,
      });
    } else {
      timer = setTimeout(preloadMomentsModals, perfHintsRef.current.warmupDelayMs);
    }
    return () => {
      if (idleId !== null && idleWindow.cancelIdleCallback) {
        idleWindow.cancelIdleCallback(idleId);
      }
      if (timer) clearTimeout(timer);
    };
  }, []);
  const handleFeedModeChange = useCallback((nextValue: string) => {
    const nextMode = nextValue as FeedMode;
    if (nextMode === "following" && !isLoggedIn) {
      redirectToLogin();
      return;
    }
    clearAdCadence();
    setDismissedAdKeys(new Set());
    setMoments([]);
    setHasMore(false);
    setLoadingMore(false);
    resetViewportTracking();
    if (containerRef.current) containerRef.current.scrollTop = 0;
    setFeedMode(nextMode);
  }, [clearAdCadence, isLoggedIn, resetViewportTracking, setHasMore]);


  if (loading) {
    return (
      <div className="fixed inset-0 z-[70] flex justify-center overflow-hidden bg-transparent md:relative md:inset-auto md:z-auto md:h-screen" style={viewportHeightStyle}>
        <div className="w-full h-full bg-bg-tertiary/50 animate-pulse" style={{ maxWidth: "min(62dvh, 480px)" }} />
      </div>
    );
  }

  if (moments.length === 0) {
    return (
      <div className="fixed inset-0 z-[70] flex flex-col items-center justify-center bg-transparent text-text-primary md:relative md:inset-auto md:z-auto md:h-screen" style={viewportHeightStyle}>
        <p className="text-lg font-semibold mb-2">{t("noMoments")}</p>
        <p className="text-sm text-text-muted">{t("createFirst")}</p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[70] flex justify-center overflow-hidden bg-transparent md:relative md:inset-auto md:z-auto md:h-screen" style={viewportHeightStyle}>
      {/* Centered Reels column */}
      <div
        className="relative w-full h-full"
        style={{ maxWidth: "min(62dvh, 480px)" }}
      >
        <MomentsTopBar
          feedMode={feedMode}
          filterOptions={filterOptions}
          onFeedModeChange={handleFeedModeChange}
          title={t("title")}
          filterTitle={tExplore("filter")}
          globalMuted={globalMuted}
          onToggleMute={handleToggleMute}
          muteLabel={tTooltip("mute")}
          unmuteLabel={tTooltip("unmute")}
        />

        {/* Scroll container */}
        <div
          ref={containerRef}
          className="h-full snap-y snap-mandatory scrollbar-hide overscroll-contain overflow-y-auto touch-pan-y"
          style={{ backgroundColor: "transparent" }}
        >
      {displayItems.map((item, displayIndex) => {
        // Dismissed ads — fully collapsed, removed from flow
        if (item.type === "ad" && item.dismissed) {
          return null;
        }

        const distance = Math.abs(displayIndex - activeDisplayIndex);
        const inWindow = displayIndex >= activeDisplayIndex - BUFFER_BEHIND && displayIndex <= activeDisplayIndex + BUFFER_AHEAD;

        if (item.type === "ad") {
          // Ad outside window — lightweight spacer
          if (!inWindow) {
            return (
              <div key={`ad-${item.adKey}`} ref={makeSlotRef(displayIndex)} data-index={displayIndex} className="snap-start snap-always" style={{ ...viewportHeightStyle, backgroundColor: "transparent" }} />
            );
          }
          return (
            <div key={`ad-${item.adKey}`} ref={makeSlotRef(displayIndex)} data-index={displayIndex} className="snap-start snap-always" style={viewportHeightStyle}>
              <MomentAdCard
                isActive={displayIndex === activeDisplayIndex}
                onSkip={() => {
                  const nextEl = containerRef.current?.querySelector(`[data-index="${displayIndex + 1}"]`);
                  if (nextEl) nextEl.scrollIntoView({ behavior: "smooth" });
                }}
              />
            </div>
          );
        }

        // Tier 3 (Collapsed): far from viewport — minimal black div
        if (!inWindow && distance > THUMBNAIL_ZONE) {
          return (
            <div
              key={`m-${item.moment.slug}`}
              ref={makeSlotRef(displayIndex)}
              data-index={displayIndex}
              data-slug={item.moment.slug}
              className="snap-start snap-always"
              style={{ ...viewportHeightStyle, backgroundColor: "transparent" }}
            />
          );
        }

        // Tier 2 (Thumbnail): nearby but outside buffer — spacer with thumbnail bg
        if (!inWindow) {
          return (
            <div
              key={`m-${item.moment.slug}`}
              ref={makeSlotRef(displayIndex)}
              data-index={displayIndex}
              className="snap-start snap-always"
              style={{
                ...viewportHeightStyle,
                backgroundColor: "transparent",
                backgroundImage: item.moment.video_thumbnail ? `url(${item.moment.video_thumbnail})` : undefined,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            />
          );
        }

        // Tier 1 (Full): within buffer — full MomentCard
        const settledDistance = Math.abs(displayIndex - settledIndex);
        const preloadHint: "auto" | "metadata" = settledDistance <= 1 ? "auto" : "metadata";
        return (
          <div key={`m-${item.moment.slug}`} ref={makeSlotRef(displayIndex)} data-index={displayIndex} className="snap-start snap-always" style={viewportHeightStyle}>
            <MomentCard
              moment={item.moment}
              isActive={displayIndex === activeDisplayIndex && !idlePaused}
              loadVideo
              liked={isMomentLiked(item.moment)}
              saved={isMomentSaved(item.moment)}
              muted={globalMuted}
              onToggleMute={handleToggleMute}
              onLike={() => handleLike(item.moment.id)}
              onLikesClick={() => handleLikesOpen(item.moment.id)}
              onComment={() => handleComment(item.moment)}
              onShare={() => handleShare(item.moment)}
              onSave={() => handleSave(item.moment.id)}
              onOptions={() => handleOptions(item.moment)}
              preloadHint={preloadHint}
            />
          </div>
        );
      })}

          {loadingMore && (
            <div className="snap-start flex items-center justify-center bg-transparent" style={viewportHeightStyle}>
              <span className="loader" style={{ width: 24, height: 24, borderTopColor: "white" }} />
            </div>
          )}
        </div>
      </div>

      <MomentsOverlayStack
        commentModal={commentModal}
        setCommentModal={setCommentModal}
        shareModal={shareModal}
        setShareModal={setShareModal}
        optionsModal={optionsModal}
        setOptionsModal={setOptionsModal}
        likesModalPostId={likesModalPostId}
        setLikesModalPostId={setLikesModalPostId}
        setMoments={setMoments}
        idlePaused={idlePaused}
        idleTitle={t("stillWatching")}
        idleDescription={t("stillWatchingDesc")}
        continueLabel={t("continueWatching")}
        stopLabel={t("stopWatching")}
        onContinueWatching={handleContinueWatching}
        onStopWatching={handleStopWatching}
      />
    </div>
  );
}
