"use client";

import { useCallback, useEffect, useState } from "react";
import type { MutableRefObject } from "react";
import { fetchWithCache, withCacheScope } from "@/lib/fetchWithCache";
import type { FeedMode, Moment } from "@/components/moments/types";

interface MomentsInteractionHelpers {
  applyStoredInteractions: (items: Moment[]) => Moment[];
  hydrateInteractions: (items: Moment[]) => void;
}

interface UseMomentsFeedOptions {
  locale: string;
  cacheScope: string;
  feedMode: FeedMode;
  startSlug: string | null;
  interactionHelpersRef: MutableRefObject<MomentsInteractionHelpers>;
}

export function useMomentsFeed({
  locale,
  cacheScope,
  feedMode,
  startSlug,
  interactionHelpersRef,
}: UseMomentsFeedOptions) {
  const [moments, setMoments] = useState<Moment[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);

  const loadMoments = useCallback(async (excludeIds?: number[], mode: FeedMode = feedMode) => {
    try {
      const url = withCacheScope(
        `/api/posts/moments?limit=10${excludeIds?.length ? `&exclude=${excludeIds.join(",")}` : ""}&locale=${locale}&tab=${mode}&_t=${Date.now()}`,
        cacheScope,
      );
      const data = await fetchWithCache(url, { ttlSeconds: 0, forceRefresh: true }) as {
        moments?: Moment[];
        hasMore?: boolean;
      };
      return { moments: data.moments || [], hasMore: data.hasMore || false };
    } catch {
      return { moments: [], hasMore: false };
    }
  }, [cacheScope, feedMode, locale]);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setLoading(true);
      const data = await loadMoments(undefined, feedMode);
      let items = data.moments;

      if (startSlug) {
        const exists = items.find((moment) => moment.slug === startSlug);
        if (!exists) {
          try {
            const response = await fetch(`/api/posts/${startSlug}`);
            const postData = await response.json();
            if (response.ok && postData.post && postData.post.content_type === "moment") {
              const post = postData.post;
              const author = Array.isArray(post.profiles) ? post.profiles[0] : post.profiles;
              items = [{ ...post, profiles: author }, ...items.filter((moment) => moment.id !== post.id)];
            }
          } catch {}
        } else {
          items = [exists, ...items.filter((moment) => moment.id !== exists.id)];
        }
      }

      if (cancelled) return;

      const itemsWithOverrides = interactionHelpersRef.current.applyStoredInteractions(items);
      setMoments(itemsWithOverrides);
      setHasMore(data.hasMore);
      setLoading(false);
      interactionHelpersRef.current.hydrateInteractions(itemsWithOverrides);
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [feedMode, interactionHelpersRef, loadMoments, startSlug]);

  return {
    moments,
    setMoments,
    loading,
    hasMore,
    setHasMore,
    loadMoments,
  };
}
