"use client";

import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { fetchWithCache, readCache } from "@/lib/fetchWithCache";
import type { ProfilePostItem } from "@/components/profile/types";

interface PaginatedFeedResponse<T> {
  posts?: T[];
  hasMore?: boolean;
}

interface UsePaginatedProfileFeedOptions {
  getUrl: (pageNum: number) => string;
  ttlSeconds: number;
  authGate?: (pageNum: number) => Promise<boolean>;
  enabled?: boolean;
  primeFromCache?: boolean;
  autoLoad?: boolean;
}

function mergeUniqueById<T extends ProfilePostItem>(prev: T[], next: T[]) {
  const existingIds = new Set(prev.map((item) => item.id));
  return [...prev, ...next.filter((item) => !existingIds.has(item.id))];
}

export function usePaginatedProfileFeed<T extends ProfilePostItem>({
  getUrl,
  ttlSeconds,
  authGate,
  enabled = true,
  primeFromCache = false,
  autoLoad = false,
}: UsePaginatedProfileFeedOptions) {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(Boolean(autoLoad));
  const [loaded, setLoaded] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);

  const hydrateFromCache = useCallback(() => {
    const cached = readCache(getUrl(1)) as PaginatedFeedResponse<T> | null;
    if (!cached?.posts) return false;
    setItems(cached.posts);
    setHasMore(cached.hasMore || false);
    setLoaded(true);
    setLoading(false);
    return true;
  }, [getUrl]);

  useLayoutEffect(() => {
    if (!enabled || !primeFromCache) return;
    hydrateFromCache();
  }, [enabled, hydrateFromCache, primeFromCache]);

  const loadPage = useCallback(async (pageNum: number) => {
    if (!enabled) return false;
    if (authGate && !(await authGate(pageNum))) return false;

    const url = getUrl(pageNum);
    if (pageNum === 1) {
      const usedCache = hydrateFromCache();
      if (!usedCache) setLoading(true);
    } else {
      setLoading(true);
    }

    try {
      const data = await fetchWithCache(url, {
        ttlSeconds,
        forceRefresh: pageNum > 1,
      }) as PaginatedFeedResponse<T>;
      const nextItems = data.posts || [];
      setItems((prev) => (pageNum === 1 ? nextItems : mergeUniqueById(prev, nextItems)));
      setHasMore(data.hasMore || false);
      setPage(pageNum);
      return true;
    } catch {
      return false;
    } finally {
      setLoaded(true);
      setLoading(false);
    }
  }, [authGate, enabled, getUrl, hydrateFromCache, ttlSeconds]);

  const loadMore = useCallback(() => {
    const nextPage = page + 1;
    void loadPage(nextPage);
  }, [loadPage, page]);

  useEffect(() => {
    if (!enabled || !autoLoad) return;
    void loadPage(1);
  }, [autoLoad, enabled, loadPage]);

  return {
    items,
    setItems,
    loading,
    loaded,
    hasMore,
    page,
    loadPage,
    loadMore,
  };
}
