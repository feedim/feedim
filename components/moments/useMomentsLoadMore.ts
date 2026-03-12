"use client";

import { useEffect } from "react";
import { redirectToLogin } from "@/lib/loginNext";
import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import type { DisplayItem, FeedMode, Moment } from "@/components/moments/types";

interface MomentsInteractionHelpers {
  applyStoredInteractions: (items: Moment[]) => Moment[];
  hydrateInteractions: (items: Moment[]) => void;
}

interface UseMomentsLoadMoreOptions {
  hasMore: boolean;
  loadingMore: boolean;
  setLoadingMore: Dispatch<SetStateAction<boolean>>;
  settledIndex: number;
  displayItems: DisplayItem[];
  moments: Moment[];
  isLoggedIn: boolean;
  feedMode: FeedMode;
  loadMoments: (excludeIds?: number[], mode?: FeedMode) => Promise<{ moments: Moment[]; hasMore: boolean }>;
  interactionHelpersRef: MutableRefObject<MomentsInteractionHelpers>;
  setMoments: Dispatch<SetStateAction<Moment[]>>;
  setHasMore: Dispatch<SetStateAction<boolean>>;
}

export function useMomentsLoadMore({
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
}: UseMomentsLoadMoreOptions) {
  useEffect(() => {
    if (!hasMore || loadingMore) return;

    const activeItem = displayItems[settledIndex];
    const realIndex = activeItem?.type === "moment"
      ? activeItem.realIndex
      : (() => {
          for (let i = settledIndex - 1; i >= 0; i--) {
            const item = displayItems[i];
            if (item?.type === "moment") return item.realIndex;
          }
          return moments.length - 1;
        })();

    if (realIndex < moments.length - 2) return;

    let cancelled = false;
    const run = async () => {
      if (!isLoggedIn) {
        redirectToLogin();
        return;
      }

      setLoadingMore(true);
      const data = await loadMoments(moments.map((moment) => moment.id), feedMode);
      if (cancelled) return;

      const newMoments = interactionHelpersRef.current.applyStoredInteractions(data.moments as Moment[]);
      setMoments((prev) => {
        const existingIds = new Set(prev.map((moment) => moment.id));
        return [...prev, ...newMoments.filter((moment) => !existingIds.has(moment.id))];
      });
      setHasMore(data.hasMore);
      setLoadingMore(false);
      interactionHelpersRef.current.hydrateInteractions(newMoments);
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [
    displayItems,
    feedMode,
    hasMore,
    interactionHelpersRef,
    isLoggedIn,
    loadMoments,
    loadingMore,
    moments,
    setHasMore,
    setLoadingMore,
    setMoments,
    settledIndex,
  ]);
}
