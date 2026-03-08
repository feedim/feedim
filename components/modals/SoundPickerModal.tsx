"use client";

import { useState, useEffect, useLayoutEffect, useCallback, useRef } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Search, TrendingUp, Music } from "lucide-react";
import Modal from "./Modal";
import SoundPreviewButton from "@/components/SoundPreviewButton";
import { formatCount } from "@/lib/utils";
import BlurImage from "@/components/BlurImage";
import { fetchWithCache, readCache, withCacheScope } from "@/lib/fetchWithCache";


export interface SoundItem {
  id: number;
  title: string;
  artist?: string | null;
  audio_url: string;
  duration?: number | null;
  usage_count?: number;
  cover_image_url?: string | null;
  is_original?: boolean;
  status?: string;
}

interface SoundPickerModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (sound: SoundItem) => void;
}

type Tab = "popular" | "search";

export default function SoundPickerModal({ open, onClose, onSelect }: SoundPickerModalProps) {
  const t = useTranslations("modals");
  const locale = useLocale();
  const [tab, setTab] = useState<Tab>("popular");
  const [sounds, setSounds] = useState<SoundItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const listRef = useRef<HTMLDivElement>(null);

  const fetchSounds = useCallback(async (query?: string, cursor?: string) => {
    const params = new URLSearchParams({ limit: "20" });
    if (query?.trim()) params.set("q", query.trim());
    else params.set("sort", "popular");
    if (cursor) params.set("cursor", cursor);
    params.set("locale", locale);
    const url = withCacheScope(`/api/sounds?${params.toString()}`, `locale:${locale}`);

    if (cursor) setLoadingMore(true);
    else setLoading(true);

    if (!cursor) {
      const cached = readCache(url) as { sounds?: SoundItem[]; hasMore?: boolean } | null;
      if (cached?.sounds) {
        setSounds(cached.sounds);
        setHasMore(cached.hasMore || false);
        setLoading(false);
      }
    }

    try {
      const data = await fetchWithCache(url, { ttlSeconds: 30, forceRefresh: !!cursor }) as {
        sounds?: SoundItem[];
        hasMore?: boolean;
      };
      const items: SoundItem[] = data.sounds || [];
      if (cursor) {
        setSounds(prev => {
          const ids = new Set(prev.map(s => s.id));
          return [...prev, ...items.filter(s => !ids.has(s.id))];
        });
      } else {
        setSounds(items);
      }
      setHasMore(data.hasMore || false);
    } catch {
      if (!cursor) setSounds([]);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [locale]);

  useLayoutEffect(() => {
    if (!open || tab !== "popular") return;
    const params = new URLSearchParams({ limit: "20", sort: "popular", locale });
    const url = withCacheScope(`/api/sounds?${params.toString()}`, `locale:${locale}`);
    const cached = readCache(url) as { sounds?: SoundItem[]; hasMore?: boolean } | null;
    if (cached?.sounds) {
      setSounds(cached.sounds);
      setHasMore(cached.hasMore || false);
      setLoading(false);
    }
  }, [locale, open, tab]);

  useEffect(() => {
    if (!open) return;
    if (tab === "popular") fetchSounds();
  }, [open, tab, fetchSounds]);

  useEffect(() => {
    if (tab !== "search") return;
    clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      fetchSounds(searchQuery);
    }, 300);
    return () => clearTimeout(searchTimerRef.current);
  }, [searchQuery, tab, fetchSounds]);

  // Infinite scroll handler
  const handleScroll = useCallback(() => {
    const el = listRef.current;
    if (!el || loadingMore || !hasMore || sounds.length === 0) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 200) {
      const lastId = String(sounds[sounds.length - 1].id);
      fetchSounds(tab === "search" ? searchQuery : undefined, lastId);
    }
  }, [loadingMore, hasMore, sounds, tab, searchQuery, fetchSounds]);

  const fmtDuration = (s?: number | null) => {
    if (!s) return "";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: "popular", label: t("soundPopular"), icon: <TrendingUp className="h-3.5 w-3.5" /> },
    { key: "search", label: t("soundSearch"), icon: <Search className="h-3.5 w-3.5" /> },
  ];

  return (
    <Modal open={open} onClose={onClose} title={t("soundPickerTitle")} size="md" fullHeight infoText={t("soundPickerInfoText")}>
      <div className="flex flex-col h-full">
        {/* Tab bar */}
        <div className="flex border-b border-border-primary px-4 gap-1">
          {tabs.map(tb => (
            <button
              key={tb.key}
              onClick={() => setTab(tb.key)}
              className={`flex items-center gap-1.5 px-3 py-2 text-[0.8rem] font-bold transition border-b-[2.5px] -mb-px ${
                tab === tb.key
                  ? "border-accent-main text-text-primary"
                  : "border-transparent text-text-muted opacity-60 hover:opacity-100 hover:text-text-primary"
              }`}
            >
              {tb.icon}
              {tb.label}
            </button>
          ))}
        </div>

        {/* Search input */}
        {tab === "search" && (
          <div className="px-4 py-2.5">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted pointer-events-none z-10" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={t("soundSearchPlaceholder")}
                className="input-modern w-full !pl-10"
                autoFocus
              />
            </div>
          </div>
        )}

        {/* Sound list */}
        <div ref={listRef} className="flex-1 overflow-y-auto" onScroll={handleScroll}>
          {loading ? (
            <div className="space-y-[2px]">
              {[1,2,3,4,5,6,7,8].map(i => (
                <div key={i} className="flex items-center gap-2.5 px-3.5 py-2.5">
                  <div className="w-9 h-9 rounded-md bg-bg-tertiary shrink-0" />
                  <div className="flex-1 min-w-0 space-y-[6px]">
                    <div className="h-[9px] w-[60%] bg-bg-tertiary rounded-[5px] animate-pulse" />
                    <div className="h-[7px] w-[40%] bg-bg-tertiary rounded-[5px] animate-pulse" />
                  </div>
                  <div className="w-7 h-7 rounded-full bg-bg-tertiary shrink-0" />
                </div>
              ))}
            </div>
          ) : sounds.length === 0 ? (
            <div className="text-center py-12 text-text-muted text-[0.74rem]">
              {tab === "search" && searchQuery ? t("soundNoResults") : t("soundNoSounds")}
            </div>
          ) : (
            <div className="divide-y divide-border-primary">
              {sounds.map(sound => (
                <div
                  key={sound.id}
                  onClick={() => { onSelect(sound); onClose(); }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2.5 hover:bg-bg-tertiary transition text-left cursor-pointer"
                  role="button"
                  tabIndex={0}
                >
                  {/* Cover / icon */}
                  <div className="w-9 h-9 rounded-md bg-bg-tertiary flex items-center justify-center shrink-0 overflow-hidden">
                    {sound.cover_image_url ? (
                      <BlurImage src={sound.cover_image_url} alt={sound.title} className="w-full h-full" />
                    ) : (
                      <Music className="h-4 w-4 text-text-muted" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-[0.8rem] font-medium truncate leading-tight">{sound.title}</p>
                    <div className="flex items-center gap-1.5 text-[0.68rem] text-text-muted mt-0.5">
                      {sound.artist && <span className="truncate">{sound.artist}</span>}
                      {sound.duration ? <span>{fmtDuration(sound.duration)}</span> : null}
                      <span>{t("soundUsageCount", { count: formatCount(sound.usage_count || 0) })}</span>
                    </div>
                  </div>

                  {/* Preview */}
                  <SoundPreviewButton audioUrl={sound.audio_url} size="sm" />
                </div>
              ))}
              {loadingMore && (
                <div className="flex justify-center py-3">
                  <span className="loader" style={{ width: 16, height: 16 }} />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
