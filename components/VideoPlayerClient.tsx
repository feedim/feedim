"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useCallback, useEffect, useRef } from "react";
import VideoPlayer from "@/components/VideoPlayer";

interface VideoPlayerClientProps {
  src: string;
  poster?: string;
  nextVideoSlug?: string;
  nextVideoTitle?: string;
  nextVideoThumbnail?: string;
}

export default function VideoPlayerClient({
  src, poster, nextVideoSlug, nextVideoTitle, nextVideoThumbnail,
}: VideoPlayerClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [autoplay, setAutoplay] = useState(true);
  const [ended, setEnded] = useState(false);
  const [replayKey, setReplayKey] = useState(0);
  const [countdown, setCountdown] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval>>(undefined);

  const autoStart = searchParams.get("autoplay") === "1";

  // Load autoplay preference from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem("feedim-autoplay-next");
      if (stored !== null) setAutoplay(stored === "true");
    } catch {}
  }, []);

  const toggleAutoplay = useCallback(() => {
    setAutoplay(prev => {
      const next = !prev;
      try { localStorage.setItem("feedim-autoplay-next", String(next)); } catch {}
      return next;
    });
  }, []);

  const handleEnded = useCallback(() => {
    setEnded(true);
    if (autoplay && nextVideoSlug) {
      setCountdown(10);
    }
  }, [autoplay, nextVideoSlug]);

  // Countdown timer
  useEffect(() => {
    if (countdown === null) return;
    if (countdown <= 0) {
      router.push(`/post/${nextVideoSlug}?autoplay=1`);
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
    router.push(`/post/${nextVideoSlug}?autoplay=1`);
  };

  const replay = () => {
    setEnded(false);
    setCountdown(null);
    setReplayKey(prev => prev + 1);
  };

  // SVG countdown circle params
  const circleR = 20;
  const circleC = 2 * Math.PI * circleR;
  const countdownMax = 10;

  return (
    <div className="relative">
      <VideoPlayer key={replayKey} src={src} poster={poster} onEnded={handleEnded} autoStart={autoStart} />

      {/* Autoplay toggle — top right of the player */}
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

      {/* End screen — autoplay ON with countdown (compact & responsive) */}
      {ended && countdown !== null && countdown > 0 && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-20 overflow-hidden">
          <div className="text-center w-full max-w-[220px] sm:max-w-[260px] px-3">
            {/* Circular countdown with thumbnail */}
            <div className="relative w-36 sm:w-44 mx-auto mb-3">
              {nextVideoThumbnail && (
                <div className="rounded-lg overflow-hidden shadow-lg">
                  <img src={nextVideoThumbnail} alt="" className="w-full aspect-video object-cover" />
                </div>
              )}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="relative w-11 h-11 sm:w-12 sm:h-12">
                  <svg className="w-11 h-11 sm:w-12 sm:h-12 -rotate-90" viewBox="0 0 48 48">
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
                  <span className="absolute inset-0 flex items-center justify-center text-white text-base font-bold tabular-nums">
                    {countdown}
                  </span>
                </div>
              </div>
            </div>
            <p className="text-white/50 text-[0.72rem] mb-0.5">Sonraki video</p>
            {nextVideoTitle && (
              <p className="text-white font-semibold text-[0.85rem] sm:text-[0.9rem] mb-3 line-clamp-2">{nextVideoTitle}</p>
            )}
            <div className="flex items-center justify-center gap-2.5">
              <button
                onClick={cancelAutoplay}
                className="px-4 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-[0.78rem] font-medium transition"
              >
                İptal
              </button>
              <button
                onClick={playNow}
                className="px-4 py-1.5 rounded-full text-white text-[0.78rem] font-medium transition hover:opacity-90"
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
        <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center z-20 px-4">
          {/* Replay button */}
          <button
            onClick={replay}
            className="w-14 h-14 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center mb-4 transition"
            aria-label="Tekrar oynat"
          >
            <svg className="h-7 w-7 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 12a9 9 0 1 1 9 9M3 12V3m0 9h9" />
            </svg>
          </button>
          <p className="text-white/50 text-[0.78rem] mb-4">Tekrar oynat</p>
        </div>
      )}
    </div>
  );
}
