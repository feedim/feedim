"use client";

import { useSearchParams } from "next/navigation";
import { useState, useEffect, useLayoutEffect, useCallback } from "react";
import { Music } from "lucide-react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import AppLayout from "@/components/AppLayout";
import { formatCount } from "@/lib/utils";
import { encodeId } from "@/lib/hashId";
import EmptyState from "@/components/EmptyState";
import LoadMoreTrigger from "@/components/LoadMoreTrigger";
import SoundPreviewButton from "@/components/SoundPreviewButton";
import BlurImage from "@/components/BlurImage";
import { cn } from "@/lib/utils";
import { useAuthModal } from "@/components/AuthModal";
import { fetchWithCache, readCache, withCacheScope } from "@/lib/fetchWithCache";

interface Sound {
  id: number;
  title: string;
  artist?: string | null;
  audio_url: string;
  duration?: number | null;
  usage_count: number;
  cover_image_url?: string | null;
  is_original?: boolean;
}

type SortTab = "popular" | "newest";

export default function SoundsPage() {
  useSearchParams();
  const t = useTranslations("sounds");
  const locale = useLocale();
  const [sounds, setSounds] = useState<Sound[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [sort, setSort] = useState<SortTab>("popular");
  const [loadingMore, setLoadingMore] = useState(false);
  const { requireAuth } = useAuthModal();

  const getSoundsUrl = useCallback((sortBy: SortTab, cursor?: string) => {
    const base = `/api/sounds?sort=${sortBy}&limit=10${cursor ? `&cursor=${cursor}` : ""}`;
    return withCacheScope(base, `locale:${locale}`);
  }, [locale]);

  useLayoutEffect(() => {
    const cached = readCache(getSoundsUrl(sort)) as any;
    if (!cached?.sounds) return;
    setSounds(cached.sounds || []);
    setHasMore(cached.hasMore || false);
    setLoading(false);
  }, [getSoundsUrl, sort]);

  const loadSounds = useCallback(async (sortBy: SortTab, cursor?: string) => {
    const url = getSoundsUrl(sortBy, cursor);
    if (!cursor) {
    } else {
      setLoadingMore(true);
    }
    try {
      const data = await fetchWithCache(url, { ttlSeconds: 30, forceRefresh: !!cursor }) as any;
      const items = data.sounds || [];
      if (!cursor) {
        setSounds(items);
      } else {
        setSounds(prev => {
          const existingIds = new Set(prev.map(s => s.id));
          return [...prev, ...items.filter((s: Sound) => !existingIds.has(s.id))];
        });
      }
      setHasMore(data.hasMore || false);
    } catch {
      // Silent
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [getSoundsUrl]);

  useEffect(() => {
    loadSounds("popular");
  }, [loadSounds]);

  const handleSortChange = (newSort: SortTab) => {
    setSort(newSort);
    loadSounds(newSort);
  };

  const handleLoadMore = async () => {
    if (!hasMore || sounds.length === 0 || loadingMore) return;
    const user = await requireAuth();
    if (!user) return;
    const last = sounds[sounds.length - 1];
    await loadSounds(sort, String(last.id));
  };

  const formatDuration = (seconds?: number | null) => {
    if (!seconds) return "";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <AppLayout headerTitle={t("title")} hideRightSidebar>
      {/* Sort tabs */}
      <div className="z-20 border-b border-border-primary">
        <div className="flex">
          {([
            { id: "popular" as const, label: t("popular") },
            { id: "newest" as const, label: t("newest") },
          ]).map(tab => (
            <button
              key={tab.id}
              onClick={() => handleSortChange(tab.id)}
              className={cn(
                "flex-1 py-3 text-[0.94rem] font-bold text-center border-b-[2.5px] transition-colors",
                sort === tab.id
                  ? "border-accent-main text-text-primary"
                  : "border-transparent text-text-muted"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-3 sm:px-4 py-2">
        {loading && sounds.length === 0 ? (
          <div className="space-y-0">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="flex items-center gap-3 py-3 px-3">
                <div className="h-11 w-11 rounded-lg bg-bg-secondary shrink-0 animate-pulse" />
                <div className="flex-1 min-w-0 space-y-[6px]">
                  <div className="h-[9px] w-28 bg-bg-secondary rounded-[5px] animate-pulse" />
                  <div className="h-[9px] w-20 bg-bg-secondary rounded-[5px] animate-pulse" />
                </div>
                <div className="h-8 w-8 rounded-full bg-bg-secondary shrink-0 animate-pulse" />
              </div>
            ))}
          </div>
        ) : sounds.length > 0 ? (
          <>
            <div>
              {sounds.map(sound => (
                <Link
                  key={sound.id}
                  href={`/sounds/${encodeId(sound.id)}`}
                  className="flex items-center gap-3 py-3 hover:bg-bg-secondary -mx-3 px-3 rounded-[10px] transition"
                >
                  {sound.cover_image_url ? (
                    <BlurImage src={sound.cover_image_url} alt={sound.title || ""} className="h-12 w-12 rounded-lg shrink-0" />
                  ) : (
                    <div className="h-12 w-12 rounded-lg bg-bg-tertiary flex items-center justify-center shrink-0">
                      <Music className="h-5 w-5 text-text-muted" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-[0.9rem] font-semibold truncate">{sound.title}</p>
                    <p className="text-xs text-text-muted truncate">
                      {sound.artist || t("originalSound")}
                      {sound.duration ? ` · ${formatDuration(sound.duration)}` : ""}
                      {sound.usage_count ? ` · ${formatCount(sound.usage_count)} ${t("usage")}` : ""}
                    </p>
                  </div>
                  <SoundPreviewButton audioUrl={sound.audio_url} />
                </Link>
              ))}
            </div>
            <LoadMoreTrigger
              onLoadMore={handleLoadMore}
              loading={loadingMore}
              hasMore={hasMore}
            />
          </>
        ) : (
          <EmptyState
            title={t("emptyTitle")}
            description={t("emptyDescription")}
          />
        )}
      </div>
    </AppLayout>
  );
}
