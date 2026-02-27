"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import VideoPlayer from "@/components/VideoPlayer";
import AdOverlay from "@/components/AdOverlay";
import { emitNavigationStart } from "@/lib/navigationProgress";
import { AD_POSTROLL_MIN, AD_POSTROLL_MAX } from "@/lib/constants";
import { saveWatchProgress, getWatchProgress, removeWatchProgress } from "@/lib/watchProgress";

interface VideoPlayerClientProps {
  src: string;
  hlsUrl?: string;
  poster?: string;
  slug?: string;
  nextVideoSlug?: string;
  nextVideoTitle?: string;
  nextVideoThumbnail?: string;
  videoDuration?: number;
}

/** Post-roll only: 4–10 dk arası videolarda reklam göster */
function shouldShowPostRoll(duration?: number): boolean {
  if (!duration) return false;
  return duration >= AD_POSTROLL_MIN && duration <= AD_POSTROLL_MAX;
}

export default function VideoPlayerClient({
  src, hlsUrl, poster, slug, nextVideoSlug, nextVideoTitle, nextVideoThumbnail,
  videoDuration,
}: VideoPlayerClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [autoplay, setAutoplay] = useState(true);
  const [ended, setEnded] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval>>(undefined);

  // Post-roll ad state (mid-roll kaldırıldı — sadece 4-10 dk post-roll)
  const [postRollActive, setPostRollActive] = useState(false);
  const showPostRoll = useMemo(() => shouldShowPostRoll(videoDuration), [videoDuration]);

  const autoStart = searchParams.get("autoplay") === "1";

  // Load autoplay preference from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem("feedim-autoplay-next");
      if (stored !== null) setAutoplay(stored === "true");
    } catch {}
  }, []);

  // Restore saved watch position on mount
  useEffect(() => {
    if (!slug) return;
    const entry = getWatchProgress(slug);
    if (!entry) return;
    const v = videoRef.current;
    if (v) {
      const restore = () => {
        if (v.duration && entry.time < v.duration * 0.95) {
          v.currentTime = entry.time;
        }
        v.removeEventListener("loadedmetadata", restore);
      };
      if (v.readyState >= 1) {
        restore();
      } else {
        v.addEventListener("loadedmetadata", restore);
      }
    }
  }, [slug]);

  // Save watch progress every 5 seconds during playback
  useEffect(() => {
    if (!slug) return;
    const v = videoRef.current;
    if (!v) return;

    let lastSave = 0;
    const onTimeUpdate = () => {
      if (postRollActive) return;
      const now = Date.now();
      if (now - lastSave < 5000) return;
      lastSave = now;
      saveWatchProgress(slug, v.currentTime, v.duration || videoDuration || 0);
    };

    v.addEventListener("timeupdate", onTimeUpdate);

    // Sayfa kapatılırken de kaydet
    const onBeforeUnload = () => {
      if (v.currentTime > 3) {
        saveWatchProgress(slug, v.currentTime, v.duration || videoDuration || 0);
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);

    return () => {
      v.removeEventListener("timeupdate", onTimeUpdate);
      window.removeEventListener("beforeunload", onBeforeUnload);
      // Component unmount olurken de kaydet
      if (v.currentTime > 3) {
        saveWatchProgress(slug, v.currentTime, v.duration || videoDuration || 0);
      }
    };
  }, [slug, postRollActive, videoDuration]);

  const toggleAutoplay = useCallback(() => {
    setAutoplay(prev => {
      const next = !prev;
      try { localStorage.setItem("feedim-autoplay-next", String(next)); } catch {}
      return next;
    });
  }, []);

  // Anti-seek: prevent play attempts during post-roll
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !postRollActive) return;

    const onPlay = () => v.pause();
    v.addEventListener("play", onPlay);
    if (!v.paused) v.pause();

    return () => v.removeEventListener("play", onPlay);
  }, [postRollActive]);

  const handleEnded = useCallback(() => {
    if (slug) removeWatchProgress(slug);
    if (showPostRoll) {
      setPostRollActive(true);
    } else {
      setEnded(true);
      if (autoplay && nextVideoSlug) setCountdown(10);
    }
  }, [slug, showPostRoll, autoplay, nextVideoSlug]);

  const handleAdSkip = useCallback(() => {
    if (postRollActive) {
      setPostRollActive(false);
      // Now show the normal end screen
      setEnded(true);
      if (autoplay && nextVideoSlug) {
        setCountdown(10);
      }
    }
  }, [postRollActive, autoplay, nextVideoSlug]);

  // Countdown timer
  useEffect(() => {
    if (countdown === null) return;
    if (countdown <= 0) {
      emitNavigationStart();
      router.push(`/${nextVideoSlug}?autoplay=1`);
      return;
    }
    timerRef.current = setInterval(() => {
      setCountdown(prev => (prev !== null ? prev - 1 : null));
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [countdown, nextVideoSlug, router]);

  const cancelAutoplay = () => {
    setCountdown(null);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const playNow = () => {
    emitNavigationStart();
    router.push(`/${nextVideoSlug}?autoplay=1`);
  };

  const replay = () => {
    setEnded(false);
    setCountdown(null);
    const v = videoRef.current;
    if (v) {
      v.currentTime = 0;
      v.play().catch(() => {});
    }
  };

  // SVG countdown circle params
  const circleR = 20;
  const circleC = 2 * Math.PI * circleR;
  const countdownMax = 10;

  return (
    <div className="relative sm:rounded-lg sm:overflow-hidden">
      <div className={postRollActive ? "pointer-events-none" : ""}>
        <VideoPlayer ref={videoRef} src={src} hlsUrl={hlsUrl} poster={poster} onEnded={handleEnded} autoStart={autoStart} />
      </div>

      {/* Post-roll ad overlay (4-10 dk videolar) */}
      {showPostRoll && (
        <AdOverlay
          active={postRollActive}
          onSkip={handleAdSkip}
          mode="overlay"
        />
      )}

      {/* Autoplay toggle — top right of the player */}
      {!postRollActive && (
        <div className="absolute top-3 right-3 z-30 flex items-center gap-2 bg-black/60 rounded-full px-3 py-1.5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-auto"
          style={{ opacity: ended ? 1 : undefined }}
        >
          <span className="text-white text-[0.72rem] font-medium">Otomatik oynat</span>
          <button
            onClick={(e) => { e.stopPropagation(); toggleAutoplay(); }}
            className={`relative w-9 h-5 rounded-full transition-colors ${autoplay ? "" : "bg-white/20"}`}
            style={autoplay ? { backgroundColor: "var(--accent-color)" } : undefined}
            aria-label="Otomatik oynatmayı aç/kapat"
          >
            <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${autoplay ? "left-[18px]" : "left-0.5"}`} />
          </button>
        </div>
      )}

      {/* End screen — autoplay ON with countdown (compact & responsive) */}
      {ended && countdown !== null && countdown > 0 && (
        <div className="absolute inset-0 bg-black/90 flex items-center justify-center z-20 overflow-hidden pb-2">
          <div className="text-center w-full max-w-[220px] px-3">
            {/* Countdown circle */}
            <div className="relative w-12 h-12 mx-auto mb-2">
              <svg className="w-12 h-12 -rotate-90" viewBox="0 0 48 48">
                <circle cx="24" cy="24" r={circleR} fill="rgba(0,0,0,0.6)" stroke="rgba(255,255,255,0.2)" strokeWidth="3" />
                <circle
                  cx="24" cy="24" r={circleR}
                  fill="none"
                  stroke="var(--accent-color)"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray={circleC}
                  strokeDashoffset={circleC * (1 - countdown / countdownMax)}
                  style={{ transition: "stroke-dashoffset 1s linear" }}
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-white text-sm font-bold tabular-nums">
                {countdown}
              </span>
            </div>
            <p className="text-white/50 text-[0.7rem] mb-0.5">Sonraki video</p>
            {nextVideoTitle && (
              <p className="text-white font-semibold text-xs mb-3 line-clamp-2">{nextVideoTitle}</p>
            )}
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={cancelAutoplay}
                className="px-3.5 py-1 rounded-full bg-white/10 hover:bg-white/20 text-white text-[0.72rem] font-medium transition"
              >
                İptal
              </button>
              <button
                onClick={playNow}
                className="px-3.5 py-1 rounded-full text-white text-[0.72rem] font-medium transition hover:opacity-90"
                style={{ backgroundColor: "var(--accent-color)" }}
              >
                Şimdi Oynat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* End screen — autoplay OFF or no next video */}
      {ended && countdown === null && (
        <div className="absolute inset-0 bg-black/95 flex flex-col items-center justify-center z-20 px-4 pb-2">
          {/* Replay button */}
          <button
            onClick={replay}
            className="w-11 h-11 rounded-full bg-black flex items-center justify-center mb-2.5 transition hover:bg-black/80"
            aria-label="Tekrar oynat"
          >
            <svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="1 4 1 10 7 10" />
              <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
            </svg>
          </button>
          <p className="text-white/50 text-[0.72rem]">Tekrar oynat</p>
        </div>
      )}
    </div>
  );
}
