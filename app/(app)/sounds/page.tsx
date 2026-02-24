"use client";

import { useSearchParams } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import { Music } from "lucide-react";
import Link from "next/link";
import AppLayout from "@/components/AppLayout";
import { formatCount } from "@/lib/utils";
import { encodeId } from "@/lib/hashId";
import EmptyState from "@/components/EmptyState";
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
  const [sounds, setSounds] = useState<Sound[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [sort, setSort] = useState<SortTab>("popular");
  const [loadingMore, setLoadingMore] = useState(false);

  const loadSounds = useCallback(async (sortBy: SortTab, cursor?: string) => {
    if (!cursor) setLoading(true); else setLoadingMore(true);
    try {
      const url = `/api/sounds?sort=${sortBy}&limit=20${cursor ? `&cursor=${cursor}` : ""}`;
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
    <AppLayout headerTitle="Sesler" hideRightSidebar>
      {/* Sort tabs */}
      <div className="sticky top-[53px] z-20 bg-bg-primary sticky-ambient border-b border-border-primary">
        <div className="flex">
          {([
            { id: "popular" as const, label: "Popüler" },
            { id: "newest" as const, label: "Yeni" },
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
          <div className="space-y-3 py-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="skeleton h-12 w-12 rounded-lg shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="skeleton h-3.5 w-2/3 rounded" />
                  <div className="skeleton h-3 w-1/2 rounded" />
                </div>
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
                    <img src={sound.cover_image_url} alt="" className="h-12 w-12 rounded-lg object-cover shrink-0" />
                  ) : (
                    <div className="h-12 w-12 rounded-lg bg-bg-tertiary flex items-center justify-center shrink-0">
                      <Music className="h-5 w-5 text-text-muted" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-[0.9rem] font-semibold truncate">{sound.title}</p>
                    <p className="text-xs text-text-muted truncate">
                      {sound.artist || "Orijinal ses"}
                      {sound.duration ? ` · ${formatDuration(sound.duration)}` : ""}
                      {sound.usage_count ? ` · ${formatCount(sound.usage_count)} kullanım` : ""}
                    </p>
                  </div>
                  <SoundPreviewButton audioUrl={sound.audio_url} />
                </Link>
              ))}
            </div>
            {hasMore && (
              <div className="flex justify-center py-4">
                <button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="t-btn cancel !h-9 !px-4 !text-sm"
                >
                  {loadingMore ? "Yükleniyor..." : "Daha fazla"}
                </button>
              </div>
            )}
          </>
        ) : (
          <EmptyState
            title="Henüz ses yok"
            description="Moment oluştururken kullanılabilecek sesler burada görünecek."
            icon={<Music className="h-12 w-12" />}
          />
        )}
      </div>
    </AppLayout>
  );
}
