"use client";

import { useSearchParams } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import { Music } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import AppLayout from "@/components/AppLayout";
import { formatCount } from "@/lib/utils";
import { encodeId } from "@/lib/hashId";
import EmptyState from "@/components/EmptyState";
import LoadMoreTrigger from "@/components/LoadMoreTrigger";
import SoundPreviewButton from "@/components/SoundPreviewButton";
import { cn } from "@/lib/utils";

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
  const [sounds, setSounds] = useState<Sound[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [sort, setSort] = useState<SortTab>("popular");
  const [loadingMore, setLoadingMore] = useState(false);

  const loadSounds = useCallback(async (sortBy: SortTab, cursor?: string) => {
    if (!cursor) setLoading(true); else setLoadingMore(true);
    try {
      const url = `/api/sounds?sort=${sortBy}&limit=10${cursor ? `&cursor=${cursor}` : ""}`;
      const res = await fetch(url);
      const data = await res.json();
      const items = data.sounds || [];
      if (!cursor) {
        setSounds(items);
      } else {
        setSounds(prev => [...prev, ...items]);
      }
      setHasMore(data.hasMore || false);
    } catch {
      // Silent
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    loadSounds(sort);
  }, []);

  const handleSortChange = (newSort: SortTab) => {
    setSort(newSort);
    setSounds([]);
    loadSounds(newSort);
  };

  const handleLoadMore = () => {
    if (!hasMore || sounds.length === 0 || loadingMore) return;
    const last = sounds[sounds.length - 1];
    loadSounds(sort, String(last.id));
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
                "flex-1 py-3 text-[0.88rem] font-bold text-center border-b-[2.5px] transition-colors",
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
          <div className="flex items-center justify-center py-32"><span className="loader" style={{ width: 22, height: 22 }} /></div>
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
                    <img src={sound.cover_image_url} alt="" className="h-12 w-12 rounded-lg object-cover shrink-0" />
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
            icon={<Music className="h-12 w-12" />}
          />
        )}
      </div>
    </AppLayout>
  );
}
