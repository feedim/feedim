"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {useParams, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Music, Play, Pause, Plus } from "lucide-react";
import Link from "next/link";
import AppLayout from "@/components/AppLayout";
import MomentGridCard from "@/components/MomentGridCard";
import { formatCount } from "@/lib/utils";
import { decodeId } from "@/lib/hashId";
import { useAuthModal } from "@/components/AuthModal";

interface Sound {
  id: number;
  title: string;
  artist?: string | null;
  audio_url: string;
  duration?: number | null;
  usage_count: number;
  cover_image_url?: string | null;
  is_original?: boolean;
  status: string;
  created_at: string;
}

interface SoundMoment {
  id: number;
  title: string;
  slug: string;
  video_thumbnail?: string;
  featured_image?: string;
  video_duration?: number;
  view_count?: number;
}

export default function SoundDetailPage() {
  const t = useTranslations("sounds");
  useSearchParams();
  const params = useParams();
  const router = useRouter();
  const rawId = params.id as string;
  const decoded = decodeId(rawId);
  const id = decoded !== null ? String(decoded) : null;

  const [sound, setSound] = useState<Sound | null>(null);
  const [moments, setMoments] = useState<SoundMoment[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(typeof window !== "undefined" ? new Audio() : null);
  const { requireAuth } = useAuthModal();
  const loading = !!id && !sound;

  const loadData = useCallback(async (cursor?: string) => {
    try {
      const url = `/api/sounds/${id}?limit=10${cursor ? `&cursor=${cursor}` : ""}`;
      const res = await fetch(url);
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  }, [id]);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const data = await loadData();
      if (data) {
        setSound(data.sound);
        setMoments(data.moments || []);
        setHasMore(data.hasMore || false);
      }
    })();
  }, [id, loadData]);

  useEffect(() => {
    return () => {
      const audio = audioRef.current;
      if (audio) {
        audio.pause();
        audio.src = "";
      }
    };
  }, []);

  const togglePlay = () => {
    if (!sound) return;
    if (playing) {
      const audio = audioRef.current;
      if (!audio) return;
      audio.pause();
      setPlaying(false);
    } else {
      const existingAudio = audioRef.current;
      if (existingAudio) {
        existingAudio.pause();
      }
      const nextAudio = new Audio(sound.audio_url);
      audioRef.current = nextAudio;
      nextAudio.play().catch(() => {});
      setPlaying(true);
      nextAudio.onended = () => setPlaying(false);
    }
  };

  const loadMore = async () => {
    if (!hasMore || moments.length === 0) return;
    const user = await requireAuth();
    if (!user) return;
    const last = moments[moments.length - 1];
    const data = await loadData(String(last.id));
    if (data) {
      setMoments(prev => {
        const existingIds = new Set(prev.map(m => m.id));
        return [...prev, ...(data.moments || []).filter((m: SoundMoment) => !existingIds.has(m.id))];
      });
      setHasMore(data.hasMore || false);
    }
  };

  const fmtDuration = (s?: number | null) => {
    if (!s) return "";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  // Build a thumbnail: cover image, or a 2x2 grid of moment thumbnails, or icon
  const renderCover = () => {
    if (sound?.cover_image_url) {
      return <img suppressHydrationWarning data-src={sound.cover_image_url} alt="" className="lazyload w-full h-full object-cover bg-bg-tertiary" />;
    }
    const thumbs = moments.slice(0, 4).map(m => m.video_thumbnail || m.featured_image).filter(Boolean);
    if (thumbs.length >= 4) {
      return (
        <div className="grid grid-cols-2 w-full h-full">
          {thumbs.slice(0, 4).map((src) => (
            <img suppressHydrationWarning key={src} data-src={src!} alt="" className="lazyload w-full h-full object-cover bg-bg-tertiary" />
          ))}
        </div>
      );
    }
    if (thumbs.length > 0) {
      return <img suppressHydrationWarning data-src={thumbs[0]!} alt="" className="lazyload w-full h-full object-cover bg-bg-tertiary" />;
    }
    return <Music className="h-8 w-8 text-text-muted" />;
  };

  if (loading) {
    return (
      <AppLayout hideRightSidebar headerTitle={t("detailTitle")}>
        <div className="px-4 py-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-20 h-20 rounded-2xl bg-bg-secondary shrink-0 animate-pulse" />
            <div className="flex-1 min-w-0 space-y-[8px]">
              <div className="h-[13px] w-32 bg-bg-secondary rounded-[5px] animate-pulse" />
              <div className="h-[9px] w-20 bg-bg-secondary rounded-[5px] animate-pulse" />
              <div className="h-[9px] w-24 bg-bg-secondary rounded-[5px] animate-pulse" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-1">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="aspect-[9/16] bg-bg-secondary rounded-sm animate-pulse" />
            ))}
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!sound) {
    return (
      <AppLayout hideRightSidebar headerTitle={t("detailTitle")}>
        <div className="text-center py-16 text-text-muted">{t("notFound")}</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout hideRightSidebar headerTitle={t("detailTitle")}>
      <div className="px-4 py-6">
        {/* Sound info */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={togglePlay}
            className="relative w-20 h-20 rounded-2xl bg-bg-tertiary flex items-center justify-center shrink-0 overflow-hidden group"
          >
            {renderCover()}
            <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
              {playing ? (
                <Pause className="h-6 w-6 text-white" fill="white" />
              ) : (
                <Play className="h-6 w-6 text-white" fill="white" />
              )}
            </div>
            {playing && (
              <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                <Pause className="h-6 w-6 text-white" fill="white" />
              </div>
            )}
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold truncate">{sound.title}</h1>
            {sound.artist && <p className="text-sm text-text-muted truncate">{sound.artist}</p>}
            <div className="flex items-center gap-3 mt-1.5 text-xs text-text-muted">
              {sound.duration ? <span>{fmtDuration(sound.duration)}</span> : null}
              <span>{formatCount(sound.usage_count)} {t("usageCount")}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 mb-6">
          <button
            onClick={togglePlay}
            className="t-btn cancel !h-10 !px-5 !text-sm flex items-center gap-2"
          >
            {playing ? (
              <Pause className="h-4 w-4" fill="currentColor" />
            ) : (
              <Play className="h-4 w-4" fill="currentColor" />
            )}
            {playing ? t("pauseButton") : t("listenButton")}
          </button>
          <Link
            href={`/create/moment?sound=${sound.id}`}
            className="t-btn accept !h-10 !px-5 !text-sm flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            {t("createMomentWithSound")}
          </Link>
        </div>

        {/* Moments grid */}
        {moments.length > 0 && (
          <>
            <h2 className="text-sm font-semibold mb-3">
              {t("momentsUsingSound")}
            </h2>
            <div className="grid grid-cols-3 gap-1">
              {moments.map(m => (
                <MomentGridCard key={m.id} moment={m} />
              ))}
            </div>
            {hasMore && (
              <div className="flex justify-center mt-4">
                <button onClick={loadMore} className="t-btn cancel !h-9 !px-4 !text-sm">
                  {t("loadMore")}
                </button>
              </div>
            )}
          </>
        )}

        {moments.length === 0 && (
          <div className="text-center py-12 text-text-muted text-sm">
            {t("emptyMoments")}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
