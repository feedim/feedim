"use client";

import { useEffect, useState, useCallback } from "react";
import {useParams, useRouter, useSearchParams } from "next/navigation";
import { Music, Play, Pause, Plus } from "lucide-react";
import Link from "next/link";
import AppLayout from "@/components/AppLayout";
import MomentGridCard from "@/components/MomentGridCard";
import { formatCount, decodeId } from "@/lib/utils";

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
  useSearchParams();
  const params = useParams();
  const router = useRouter();
  const rawId = params.id as string;
  const id = String(decodeId(rawId));

  const [sound, setSound] = useState<Sound | null>(null);
  const [moments, setMoments] = useState<SoundMoment[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [audio] = useState(() => typeof window !== "undefined" ? new Audio() : null);

  const loadData = useCallback(async (cursor?: string) => {
    try {
      const url = `/api/sounds/${id}?limit=20${cursor ? `&cursor=${cursor}` : ""}`;
      const res = await fetch(url);
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  }, [id]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const data = await loadData();
      if (data) {
        setSound(data.sound);
        setMoments(data.moments || []);
        setHasMore(data.hasMore || false);
      }
      setLoading(false);
    })();
  }, [loadData]);

  useEffect(() => {
    return () => {
      if (audio) {
        audio.pause();
        audio.src = "";
      }
    };
  }, [audio]);

  const togglePlay = () => {
    if (!audio || !sound) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      audio.src = sound.audio_url;
      audio.play().catch(() => {});
      setPlaying(true);
      audio.onended = () => setPlaying(false);
    }
  };

  const loadMore = async () => {
    if (!hasMore || moments.length === 0) return;
    const last = moments[moments.length - 1];
    const data = await loadData(String(last.id));
    if (data) {
      setMoments(prev => [...prev, ...(data.moments || [])]);
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
      return <img src={sound.cover_image_url} alt="" className="w-full h-full object-cover" />;
    }
    const thumbs = moments.slice(0, 4).map(m => m.video_thumbnail || m.featured_image).filter(Boolean);
    if (thumbs.length >= 4) {
      return (
        <div className="grid grid-cols-2 w-full h-full">
          {thumbs.slice(0, 4).map((src, i) => (
            <img key={i} src={src!} alt="" className="w-full h-full object-cover" />
          ))}
        </div>
      );
    }
    if (thumbs.length > 0) {
      return <img src={thumbs[0]!} alt="" className="w-full h-full object-cover" />;
    }
    return <Music className="h-8 w-8 text-text-muted" />;
  };

  if (loading) {
    return (
      <AppLayout hideRightSidebar headerTitle="Ses" headerOnBack={() => router.back()}>
        <div className="flex justify-center py-16">
          <span className="loader" style={{ width: 28, height: 28 }} />
        </div>
      </AppLayout>
    );
  }

  if (!sound) {
    return (
      <AppLayout hideRightSidebar headerTitle="Ses" headerOnBack={() => router.back()}>
        <div className="text-center py-16 text-text-muted">Ses bulunamadı</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout hideRightSidebar headerTitle="Ses" headerOnBack={() => router.back()}>
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
              <span>{formatCount(sound.usage_count)} kullanım</span>
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
            {playing ? "Durdur" : "Dinle"}
          </button>
          <Link
            href={`/create/moment?sound=${sound.id}`}
            className="t-btn accept !h-10 !px-5 !text-sm flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Bu sesle Moment oluştur
          </Link>
        </div>

        {/* Moments grid */}
        {moments.length > 0 && (
          <>
            <h2 className="text-sm font-semibold mb-3">
              Bu sesi kullanan Moment&apos;ler
            </h2>
            <div className="grid grid-cols-3 gap-1">
              {moments.map(m => (
                <MomentGridCard key={m.id} moment={m} />
              ))}
            </div>
            {hasMore && (
              <div className="flex justify-center mt-4">
                <button onClick={loadMore} className="t-btn cancel !h-9 !px-4 !text-sm">
                  Daha fazla
                </button>
              </div>
            )}
          </>
        )}

        {moments.length === 0 && (
          <div className="text-center py-12 text-text-muted text-sm">
            Henüz bu sesi kullanan moment yok
          </div>
        )}
      </div>
    </AppLayout>
  );
}
