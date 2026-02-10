"use client";

import { useState, useRef, useEffect, useCallback } from "react";

// ─── Constants ───────────────────────────────────────────────
const BRAND_PINK = "lab(49.5493% 79.8381 2.31768)";
const PROGRESS_INTERVAL_MS = 500;
const MINI_SIZE = 62;
const MINI_RING_RADIUS = 28;
const MINI_DISC_SIZE = 48;

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: (() => void) | undefined;
  }
}

// ─── Helpers ─────────────────────────────────────────────────
function extractYouTubeId(url: string): string | null {
  const match = url.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/
  );
  return match ? match[1] : null;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function getThumbnailUrl(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
}

// ─── Icons ───────────────────────────────────────────────────
function VolumeIcon({ size = 22, isMuted, volume }: { size?: number; isMuted: boolean; volume: number }) {
  const base = <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />;
  const props = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

  if (isMuted || volume === 0) {
    return <svg {...props}>{base}<line x1="23" y1="9" x2="17" y2="15" /><line x1="17" y1="9" x2="23" y2="15" /></svg>;
  }
  if (volume < 50) {
    return <svg {...props}>{base}<path d="M15.54 8.46a5 5 0 0 1 0 7.07" /></svg>;
  }
  return <svg {...props}>{base}<path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" /></svg>;
}

function PlayIcon({ size = 20 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="white" style={{ marginLeft: 2 }}><polygon points="5,3 19,12 5,21" /></svg>;
}

function PauseIcon({ size = 20 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="white"><rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" /></svg>;
}

function ReplayIcon({ size = 20 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" /></svg>;
}

function MusicNoteIcon({ size = 16 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></svg>;
}

function MinimizeIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 14 10 14 10 20" /><polyline points="20 10 14 10 14 4" /><line x1="14" y1="10" x2="21" y2="3" /><line x1="3" y1="21" x2="10" y2="14" /></svg>;
}

// ─── Sub-components ──────────────────────────────────────────

/** Thumbnail with fallback music note icon */
function Thumbnail({ videoId, thumbError, onError, size = "md" }: {
  videoId: string | null;
  thumbError: boolean;
  onError?: () => void;
  size?: "sm" | "md";
}) {
  const iconSize = size === "sm" ? 16 : 18;
  if (videoId && !thumbError) {
    return <img src={getThumbnailUrl(videoId)} alt="" className="w-full h-full object-cover" onError={onError} />;
  }
  return <div className="w-full h-full flex items-center justify-center"><MusicNoteIcon size={iconSize} /></div>;
}

/** Floating music notes around mini player */
function FloatingNotes() {
  const notes = [
    { char: "♫", top: -6, left: -4, size: 14, opacity: 0.7, anim: "floatNote1 2.5s ease-in-out infinite" },
    { char: "♪", top: -10, right: -2, size: 12, opacity: 0.5, anim: "floatNote2 3s ease-in-out infinite 0.8s" },
    { char: "♩", bottom: 2, left: -8, size: 11, opacity: 0.6, anim: "floatNote3 2.8s ease-in-out infinite 1.5s" },
  ];
  return (
    <div className="absolute" style={{ width: MINI_SIZE, height: MINI_SIZE, top: 0, left: 0, pointerEvents: "none" }}>
      {notes.map((n, i) => (
        <span key={i} style={{ position: "absolute", top: n.top, bottom: n.bottom, left: n.left, right: n.right, fontSize: n.size, opacity: n.opacity, color: BRAND_PINK, animation: n.anim } as React.CSSProperties}>
          {n.char}
        </span>
      ))}
    </div>
  );
}

/** Circular progress ring for mini player */
function ProgressRing({ progress }: { progress: number }) {
  const circumference = 2 * Math.PI * MINI_RING_RADIUS;
  return (
    <svg width={MINI_SIZE} height={MINI_SIZE} viewBox={`0 0 ${MINI_SIZE} ${MINI_SIZE}`} className="absolute inset-0 -rotate-90">
      <circle cx={MINI_SIZE / 2} cy={MINI_SIZE / 2} r={MINI_RING_RADIUS} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3" />
      <circle
        cx={MINI_SIZE / 2} cy={MINI_SIZE / 2} r={MINI_RING_RADIUS} fill="none" strokeWidth="3" strokeLinecap="round"
        style={{ stroke: BRAND_PINK, strokeDasharray: `${circumference}`, strokeDashoffset: `${circumference * (1 - progress / 100)}`, transition: "stroke-dashoffset 0.3s" }}
      />
    </svg>
  );
}

/** Equalizer animation bars */
function Equalizer() {
  const bars = [
    { h: 8, delay: "" },
    { h: 14, delay: "_0.15s" },
    { h: 10, delay: "_0.3s" },
    { h: 6, delay: "_0.1s" },
  ];
  return (
    <div className="flex items-end h-4" style={{ gap: "3px" }}>
      {bars.map((b, i) => (
        <span key={i} className={`bg-white/30 rounded-full animate-[bounce_0.5s_ease-in-out_infinite${b.delay}]`} style={{ width: 3, height: b.h }} />
      ))}
    </div>
  );
}

/** Progress bar with hover preview and seek — expands on hover/drag like YouTube */
function ProgressBar({ progress, hoverProgress, onSeekAt, onHover, onLeave }: {
  progress: number;
  hoverProgress: number | null;
  onSeekAt: (percent: number) => void;
  onHover: (e: React.MouseEvent<HTMLDivElement>) => void;
  onLeave: () => void;
}) {
  const [active, setActive] = useState(false);
  const [dragging, setDragging] = useState(false);
  const barRef = useRef<HTMLDivElement>(null);

  const getPercent = useCallback((clientX: number) => {
    if (!barRef.current) return 0;
    const rect = barRef.current.getBoundingClientRect();
    return Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
  }, []);

  // Mouse drag
  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: MouseEvent) => {
      onSeekAt(getPercent(e.clientX));
    };
    const onUp = () => {
      setDragging(false);
      setActive(false);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [dragging, getPercent, onSeekAt]);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    setActive(true);
    setDragging(true);
    onSeekAt(getPercent(e.clientX));
  }, [getPercent, onSeekAt]);

  // Touch drag
  const handleTouchStart = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    setActive(true);
    onSeekAt(getPercent(e.touches[0].clientX));
  }, [getPercent, onSeekAt]);

  const handleTouchMove = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    onSeekAt(getPercent(e.touches[0].clientX));
  }, [getPercent, onSeekAt]);

  const handleTouchEnd = useCallback(() => {
    setActive(false);
  }, []);

  return (
    <div
      ref={barRef}
      className="w-full cursor-pointer group relative transition-[height] duration-150"
      style={{ height: active ? 6 : 3 }}
      onMouseDown={handleMouseDown}
      onMouseEnter={() => setActive(true)}
      onMouseLeave={() => { if (!dragging) { setActive(false); onLeave(); } }}
      onMouseMove={onHover}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div className="absolute inset-0 bg-white/[0.06] rounded-full" />
      {hoverProgress !== null && (
        <div className="absolute inset-y-0 left-0 z-[5] rounded-full" style={{ width: `${hoverProgress}%`, background: "rgba(255,255,255,0.1)" }} />
      )}
      <div className="h-full relative z-10 rounded-full" style={{ width: `${progress}%`, background: BRAND_PINK }}>
        <div
          className="absolute right-0 top-1/2 -translate-y-1/2 rounded-full transition-opacity duration-150"
          style={{ width: active ? 12 : 0, height: active ? 12 : 0, background: BRAND_PINK, opacity: active ? 1 : 0 }}
        />
      </div>
      <div className="absolute inset-0 -top-8 -bottom-8 sm:-top-4 sm:-bottom-4 z-20" />
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────
export default function MusicPlayer({ musicUrl }: { musicUrl: string }) {
  // State
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [hoverProgress, setHoverProgress] = useState<number | null>(null);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [volume, setVolume] = useState(80);
  const [isMuted, setIsMuted] = useState(false);
  const [thumbError, setThumbError] = useState(false);
  const [songTitle, setSongTitle] = useState("Arka Plan Müziği");
  const [hasEnded, setHasEnded] = useState(false);
  const [minimized, setMinimized] = useState(false);

  // Refs
  const playerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const destroyedRef = useRef(false);
  const hasInteractedRef = useRef(false);

  const videoId = extractYouTubeId(musicUrl);

  // ─── YouTube Setup ───────────────────────────────────────
  useEffect(() => {
    if (!videoId) return;
    const controller = new AbortController();
    fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`, { signal: controller.signal })
      .then(res => res.ok ? res.json() : null)
      .then(data => { if (data?.title) setSongTitle(data.title); })
      .catch(() => {});
    return () => controller.abort();
  }, [videoId]);

  useEffect(() => {
    if (!videoId || !containerRef.current) return;
    destroyedRef.current = false;

    // CRITICAL for iOS Safari: Create an <iframe> element with allow="autoplay"
    // BEFORE it loads any YouTube content. Setting this attribute after load has
    // no effect — Safari's permissions policy is locked at navigation time.
    const iframe = document.createElement("iframe");
    const iframeId = `yt-music-${videoId}`;
    iframe.id = iframeId;
    iframe.allow = "autoplay; encrypted-media";
    iframe.setAttribute("allowfullscreen", "");
    iframe.setAttribute("playsinline", "");
    iframe.style.cssText = "border:none;position:absolute;inset:0;width:100%;height:100%;";
    containerRef.current.appendChild(iframe);

    if (!window.YT) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      document.body.appendChild(tag);
    }

    const initPlayer = () => {
      if (destroyedRef.current) return;
      // YT.Player reuses existing <iframe> elements (by ID) instead of replacing them,
      // so our pre-set allow="autoplay" attribute is preserved.
      playerRef.current = new window.YT.Player(iframeId, {
        videoId,
        playerVars: {
          autoplay: 0,
          controls: 1, // Required for iOS Safari — native play button must exist
          disablekb: 1,
          fs: 0,
          modestbranding: 1,
          playsinline: 1,
          rel: 0,
          origin: typeof window !== "undefined" ? window.location.origin : "",
        },
        events: {
          onReady: () => {
            if (destroyedRef.current) return;
            setIsReady(true);
            setDuration(playerRef.current?.getDuration?.() || 0);
            playerRef.current?.setVolume?.(80);
          },
          onStateChange: (event: any) => {
            if (destroyedRef.current) return;
            if (event.data === 1) {
              setIsPlaying(true);
              setHasEnded(false);
              // iOS Safari: first play came from native iframe tap
              if (!hasInteractedRef.current) {
                hasInteractedRef.current = true;
                setHasInteracted(true);
                try {
                  playerRef.current?.unMute?.();
                  playerRef.current?.setVolume?.(80);
                } catch {}
              }
              setDuration(playerRef.current?.getDuration?.() || 0);
              startTracking();
            } else if (event.data === 2) {
              setIsPlaying(false);
              stopTracking();
            } else if (event.data === 0) {
              setIsPlaying(false);
              setHasEnded(true);
              setProgress(100);
              stopTracking();
            }
          },
          onError: () => {
            if (destroyedRef.current) return;
            setIsReady(true);
          },
        },
      });
    };

    if (window.YT?.Player) initPlayer();
    else window.onYouTubeIframeAPIReady = initPlayer;

    return () => {
      destroyedRef.current = true;
      stopTracking();
      if (window.onYouTubeIframeAPIReady === initPlayer) {
        window.onYouTubeIframeAPIReady = undefined;
      }
      try { playerRef.current?.destroy?.(); } catch {}
      playerRef.current = null;
      if (iframe.parentNode) {
        iframe.parentNode.removeChild(iframe);
      }
    };
  }, [videoId]);

  // ─── Playback Controls ──────────────────────────────────
  const startTracking = () => {
    stopTracking();
    intervalRef.current = setInterval(() => {
      if (destroyedRef.current) return;
      const ct = playerRef.current?.getCurrentTime?.();
      const dur = playerRef.current?.getDuration?.();
      if (ct != null && dur) {
        setCurrentTime(ct);
        setDuration(dur);
        setProgress(dur > 0 ? (ct / dur) * 100 : 0);
      }
    }, PROGRESS_INTERVAL_MS);
  };

  const stopTracking = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const togglePlay = useCallback(() => {
    if (!playerRef.current) return;

    if (isPlaying) {
      playerRef.current.pauseVideo();
      return;
    }

    // All calls below happen synchronously in the user gesture call stack.
    if (!hasInteracted) {
      hasInteractedRef.current = true;
      setHasInteracted(true);
    }

    try {
      playerRef.current.unMute?.();
      playerRef.current.setVolume?.(volume);
    } catch {}

    if (hasEnded) {
      setHasEnded(false);
      playerRef.current.seekTo(0, true);
    }

    playerRef.current.playVideo();
  }, [isPlaying, hasEnded, hasInteracted, volume]);

  const handleSeekAt = useCallback((pct: number) => {
    if (!playerRef.current || !duration) return;
    const percent = Math.max(0, Math.min(100, pct)) / 100;
    const seekTime = percent * duration;
    playerRef.current.seekTo(seekTime, true);
    setProgress(percent * 100);
    setCurrentTime(seekTime);
    if (hasEnded) setHasEnded(false);
  }, [duration, hasEnded]);

  const handleHover = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setHoverProgress(Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100)));
  };

  const handleVolume = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setVolume(val);
    setIsMuted(val === 0);
    playerRef.current?.setVolume?.(val);
  };

  const toggleMute = () => {
    if (isMuted) {
      playerRef.current?.setVolume?.(volume || 80);
      playerRef.current?.unMute?.();
      setIsMuted(false);
    } else {
      playerRef.current?.setVolume?.(0);
      playerRef.current?.mute?.();
      setIsMuted(true);
    }
  };

  // ─── Render ─────────────────────────────────────────────
  if (!videoId) return null;

  const playButtonIcon = hasEnded ? <ReplayIcon /> : isPlaying ? <PauseIcon /> : <PlayIcon />;

  return (
    <>
      {/* ── Mini Player ──────────────────────────────────── */}
      {minimized && (
        <button onClick={() => setMinimized(false)} className="fixed z-[9999] left-1/2" style={{ bottom: 20, transform: "translateX(-50%)" }} aria-label="Müzik çalarını aç">
          {isPlaying && <FloatingNotes />}
          <div className="relative" style={{ width: MINI_SIZE, height: MINI_SIZE }}>
            <ProgressRing progress={progress} />
            {isPlaying && (
              <div className="absolute inset-0 rounded-full" style={{ background: "radial-gradient(circle, rgba(230,62,122,0.15) 0%, transparent 70%)", filter: "blur(6px)", transform: "scale(1.3)" }} />
            )}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="rounded-full overflow-hidden" style={{ width: MINI_DISC_SIZE, height: MINI_DISC_SIZE, background: "#181818", animation: isPlaying ? "spin 4s linear infinite" : "none", border: "2px solid rgba(255,255,255,0.12)" }}>
                <Thumbnail videoId={videoId} thumbError={thumbError} size="md" />
              </div>
            </div>
          </div>
        </button>
      )}

      {/* ── Full Player ──────────────────────────────────── */}
      {!minimized && (
        <div className="fixed bottom-0 left-0 right-0 z-[9999]" suppressHydrationWarning>
          <div className="bg-[#181818]">
            <ProgressBar
              progress={progress}
              hoverProgress={hoverProgress}
              onSeekAt={handleSeekAt}
              onHover={handleHover}
              onLeave={() => setHoverProgress(null)}
            />

            {/* Controls grid */}
            <div className="grid grid-cols-[1fr_auto_1fr] items-center h-[72px] sm:h-[64px]" style={{ padding: "0 16px", gap: "12px" }}>
              {/* Left: Thumbnail + Song info */}
              <div className="flex items-center min-w-0" style={{ gap: "10px" }}>
                <div className="w-11 h-11 sm:w-10 sm:h-10 rounded-md overflow-hidden shrink-0" style={{ background: "rgba(255,255,255,0.04)" }}>
                  <Thumbnail videoId={videoId} thumbError={thumbError} onError={() => setThumbError(true)} size="sm" />
                </div>
                <div style={{ minWidth: 0, overflow: "hidden", flex: 1 }}>
                  <p className="text-white text-sm font-medium leading-tight" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "calc(40vw - 60px)" }}>
                    {songTitle}
                  </p>
                  <p className="text-white/40 text-[11px] leading-tight" style={{ marginTop: "3px" }}>
                    {formatTime(currentTime)}<span className="mx-1 text-white/20">/</span>{formatTime(duration)}
                  </p>
                </div>
              </div>

              {/* Center: Play button with YouTube iframe overlay for iOS Safari */}
              <div className="relative">
                {!hasInteracted && isReady ? (
                  <button onClick={togglePlay} className="h-12 w-12 sm:h-11 sm:w-11 rounded-full flex items-center justify-center hover:scale-110 active:scale-95 transition-transform animate-pulse" style={{ background: BRAND_PINK }} aria-label="Oynat">
                    <PlayIcon />
                  </button>
                ) : (
                  <button onClick={togglePlay} disabled={!isReady} className="w-11 h-11 sm:w-11 sm:h-11 rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-transform disabled:opacity-30" style={{ background: BRAND_PINK }} aria-label={hasEnded ? "Yeniden oynat" : isPlaying ? "Duraklat" : "Oynat"}>
                    {playButtonIcon}
                  </button>
                )}
                {/* YouTube iframe — overlaid on play button, nearly invisible.
                    On iOS Safari the user's tap hits this iframe directly which counts
                    as a native user gesture inside the iframe, allowing audio playback.
                    After first play, pointer-events disabled so taps reach our button. */}
                <div
                  ref={containerRef}
                  style={{
                    position: "absolute",
                    left: "50%",
                    top: "50%",
                    transform: "translate(-50%, -50%)",
                    width: 200,
                    height: 200,
                    overflow: "hidden",
                    opacity: hasInteracted ? 0 : 0.01,
                    pointerEvents: hasInteracted ? "none" : "auto",
                    zIndex: 10,
                  }}
                />
              </div>

              {/* Right: Equalizer + Volume + Minimize */}
              <div className="flex items-center justify-end" style={{ gap: "8px" }}>
                {isPlaying && <Equalizer />}

                {/* Desktop volume */}
                <div className="hidden sm:flex items-center" style={{ gap: "6px" }}>
                  <button onClick={toggleMute} className="text-white/40 hover:text-white/70 transition-colors" style={{ padding: "6px" }} aria-label={isMuted ? "Sesi aç" : "Sesi kapat"}>
                    <VolumeIcon size={20} isMuted={isMuted} volume={volume} />
                  </button>
                  <input
                    type="range" min="0" max="100"
                    value={isMuted ? 0 : volume}
                    onChange={handleVolume}
                    className="w-20 h-1 appearance-none rounded-full cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:cursor-pointer"
                    style={{ background: `linear-gradient(to right, lab(49.5493% 79.8381 2.31768) ${isMuted ? 0 : volume}%, rgba(255,255,255,0.1) ${isMuted ? 0 : volume}%)` }}
                  />
                </div>

                {/* Mobile volume */}
                <button onClick={toggleMute} className="sm:hidden text-white/40 hover:text-white/70 transition-colors" style={{ padding: "6px" }} aria-label={isMuted ? "Sesi aç" : "Sesi kapat"}>
                  <VolumeIcon size={23} isMuted={isMuted} volume={volume} />
                </button>

                {/* Minimize */}
                <button onClick={() => setMinimized(true)} className="text-white/30 hover:text-white/60 transition-colors" style={{ padding: "6px" }} aria-label="Küçült">
                  <MinimizeIcon />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
