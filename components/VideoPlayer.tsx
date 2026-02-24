"use client";

import { useRef, useState, useCallback, useEffect, memo, forwardRef, useImperativeHandle } from "react";
import { useHlsPlayer, type QualityLevel } from "@/lib/useHlsPlayer";

/* ── Helpers (outside component to avoid re-creation) ── */
const fmt = (s: number) => {
  if (!isFinite(s) || s < 0) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
};
const _hk = (s: string) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return `_p${(h >>> 0).toString(36)}`;
};

interface VideoPlayerProps {
  src: string;
  hlsUrl?: string;
  poster?: string;
  onEnded?: () => void;
  autoStart?: boolean;
  /** When true, video plays muted with no controls (upload preview mode) */
  disabled?: boolean;
  /** Moment mode — minimal render, no controls/chrome */
  moment?: boolean;
  /** External mute control (moment mode) */
  externalMuted?: boolean;
  /** External pause control — true = paused (moment mode) */
  externalPaused?: boolean;
  /** Loop video */
  loop?: boolean;
  /** CSS class for the video element */
  videoClassName?: string;
}

const VideoPlayerInner = forwardRef<HTMLVideoElement, VideoPlayerProps>(function VideoPlayer({ src, hlsUrl, poster, onEnded, autoStart, disabled, moment, externalMuted, externalPaused, loop, videoClassName }, fwdRef) {
  // Compute saved position ONCE on mount — must be stable across re-renders.
  // If recomputed every render, effectiveSrc changes (video.mp4 → video.mp4#t=X)
  // which reloads the <video> element and flashes the poster every few seconds.
  const savedTimeRef = useRef<number | null>(null);
  if (savedTimeRef.current === null) {
    savedTimeRef.current = !disabled && !moment ? (() => {
      try {
        const s = localStorage.getItem(_hk(src));
        if (s) { const t = parseFloat(s); if (isFinite(t) && t > 2) return t; }
      } catch {}
      return 0;
    })() : 0;
  }
  const savedTime = savedTimeRef.current;
  const hasSavedPos = savedTime > 2;
  // Media fragment: browser issues Range request from this offset (skips byte 0)
  const effectiveSrc = savedTime > 0 ? `${src}#t=${Math.floor(savedTime)}` : src;

  const videoRef = useRef<HTMLVideoElement>(null);
  useImperativeHandle(fwdRef, () => videoRef.current!, []);
  const containerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const fillRef = useRef<HTMLDivElement>(null);
  const bufferRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);
  const timeRef = useRef<HTMLSpanElement>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const seekingRef = useRef(false);
  const settingsMenuRef = useRef<HTMLDivElement>(null);
  const settingsOpenRef = useRef(false);
  const rafRef = useRef<number>(0);
  const waitingTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const actionTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const actionCountRef = useRef(0);
  const durationRef = useRef(0);
  const playingRef = useRef(false);
  const controlsVisibleRef = useRef(true);
  const previewRef = useRef<HTMLVideoElement>(null);
  const previewWrapRef = useRef<HTMLDivElement>(null);
  const previewTimeRef = useRef<HTMLDivElement>(null);
  const miniTimeRef = useRef<HTMLSpanElement>(null);
  const doubleTapTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const tapCountRef = useRef(0);
  const touchPreviewRef = useRef<HTMLDivElement>(null);

  const [playing, setPlaying] = useState(false);
  const [controls, setControls] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [settingsMenu, setSettingsMenu] = useState(false);
  const [settingsTab, setSettingsTab] = useState<"main" | "speed" | "quality" | "shortcuts">("main");
  const [speed, setSpeed] = useState(1);
  const [actionIcon, setActionIcon] = useState<"play" | "pause" | null>(null);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(true);
  const [cinemaMode, setCinemaMode] = useState(false);
  const [miniPlayer, setMiniPlayer] = useState(false);
  const [fakeFullscreen, setFakeFullscreen] = useState(false);
  const [seekAnim, setSeekAnim] = useState<{ side: "left" | "right"; key: number } | null>(null);
  const seekAnimKey = useRef(0);
  const [touchSeeking, setTouchSeeking] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  // Detect touch device — skip preview video on mobile to save bandwidth
  useEffect(() => {
    if (moment) return;
    setIsTouchDevice("ontouchstart" in window || navigator.maxTouchPoints > 0);
  }, [moment]);

  // HLS adaptive streaming — manages video source when hlsUrl is provided
  const { isHls, qualities, currentQuality, setQuality } = useHlsPlayer({
    hlsUrl: disabled ? undefined : hlsUrl,
    fallbackSrc: effectiveSrc,
    videoRef,
    startPosition: savedTime > 2 ? savedTime : 0,
  });

  // Stable ref for onEnded to prevent effect re-triggers
  const onEndedRef = useRef(onEnded);
  onEndedRef.current = onEnded;

  const updateProgress = useCallback(() => {
    const v = videoRef.current;
    if (!v || seekingRef.current) return;
    const dur = v.duration;
    if (!isFinite(dur) || dur <= 0) return;
    const pct = (v.currentTime / dur) * 100;
    if (fillRef.current) fillRef.current.style.width = `${pct}%`;
    if (thumbRef.current) thumbRef.current.style.left = `${pct}%`;
    const timeText = `${fmt(v.currentTime)} / ${fmt(dur)}`;
    if (timeRef.current) timeRef.current.textContent = timeText;
    if (miniTimeRef.current) miniTimeRef.current.textContent = timeText;
  }, []);

  const updateBuffer = useCallback(() => {
    const v = videoRef.current;
    if (!v || !isFinite(v.duration) || v.duration <= 0) return;
    if (v.buffered.length > 0) {
      const pct = (v.buffered.end(v.buffered.length - 1) / v.duration) * 100;
      if (bufferRef.current) bufferRef.current.style.width = `${pct}%`;
    }
  }, []);

  const startRAF = useCallback(() => {
    const tick = () => {
      updateProgress();
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [updateProgress]);

  const stopRAF = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    }
  }, []);

  const showControls = useCallback(
    (force?: boolean) => {
      if (!controlsVisibleRef.current) {
        controlsVisibleRef.current = true;
        setControls(true);
      }
      if (hideTimer.current) clearTimeout(hideTimer.current);
      // Don't auto-hide while settings menu is open
      if (force || settingsOpenRef.current) return;
      if (playingRef.current) {
        hideTimer.current = setTimeout(() => {
          if (settingsOpenRef.current) return;
          controlsVisibleRef.current = false;
          setControls(false);
        }, 3000);
      }
    },
    []
  );

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    actionCountRef.current += 1;
    if (v.paused) {
      v.play().catch(() => {});
      setActionIcon("play");
    } else {
      v.pause();
      setActionIcon("pause");
    }
    if (actionTimeoutRef.current) clearTimeout(actionTimeoutRef.current);
    actionTimeoutRef.current = setTimeout(() => setActionIcon(null), 800);
  }, []);

  const startSeek = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const v = videoRef.current;
      const bar = progressRef.current;
      if (!v || !bar || !isFinite(v.duration)) return;
      seekingRef.current = true;
      durationRef.current = v.duration;

      const updateSeekVisual = (clientX: number) => {
        const r = bar.getBoundingClientRect();
        const pct = Math.max(0, Math.min(1, (clientX - r.left) / r.width));
        const t = pct * durationRef.current;
        if (fillRef.current) fillRef.current.style.width = `${pct * 100}%`;
        if (thumbRef.current) thumbRef.current.style.left = `${pct * 100}%`;
        const tText = `${fmt(t)} / ${fmt(durationRef.current)}`;
        if (timeRef.current) timeRef.current.textContent = tText;
        if (miniTimeRef.current) miniTimeRef.current.textContent = tText;
        showSeekPreview(clientX - r.left, r.width, t);
      };

      updateSeekVisual(e.clientX);
      const onMove = (ev: MouseEvent) => updateSeekVisual(ev.clientX);
      const onUp = (ev: MouseEvent) => {
        const barEl = progressRef.current;
        const vid = videoRef.current;
        if (barEl && vid && isFinite(vid.duration)) {
          const r = barEl.getBoundingClientRect();
          const p = Math.max(0, Math.min(1, (ev.clientX - r.left) / r.width));
          vid.currentTime = p * vid.duration;
        }
        seekingRef.current = false;
        hideSeekPreview();
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    []
  );

  const startTouchSeek = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      const v = videoRef.current;
      const bar = progressRef.current;
      if (!v || !bar || !isFinite(v.duration)) return;
      e.preventDefault();
      seekingRef.current = true;
      durationRef.current = v.duration;
      const wasPlaying = !v.paused;
      v.pause();
      stopRAF();
      setTouchSeeking(true);

      const updateSeekVisual = (clientX: number) => {
        const r = bar.getBoundingClientRect();
        const pct = Math.max(0, Math.min(1, (clientX - r.left) / r.width));
        const t = pct * durationRef.current;
        if (fillRef.current) fillRef.current.style.width = `${pct * 100}%`;
        if (thumbRef.current) thumbRef.current.style.left = `${pct * 100}%`;
        const tText = `${fmt(t)} / ${fmt(durationRef.current)}`;
        if (timeRef.current) timeRef.current.textContent = tText;
        if (miniTimeRef.current) miniTimeRef.current.textContent = tText;
        // Touch time tooltip
        const tp = touchPreviewRef.current;
        if (tp) {
          tp.style.display = "block";
          tp.textContent = fmt(t);
          const left = Math.max(24, Math.min(pct * r.width, r.width - 24));
          tp.style.left = `${left}px`;
        }
      };

      updateSeekVisual(e.touches[0].clientX);
      const onMove = (ev: TouchEvent) => { ev.preventDefault(); updateSeekVisual(ev.touches[0].clientX); };
      const onEnd = (ev: TouchEvent) => {
        const barEl = progressRef.current;
        const vid = videoRef.current;
        const touch = ev.changedTouches[0];
        if (barEl && vid && isFinite(vid.duration) && touch) {
          const r = barEl.getBoundingClientRect();
          const p = Math.max(0, Math.min(1, (touch.clientX - r.left) / r.width));
          vid.currentTime = p * vid.duration;
        }
        // Hide touch tooltip
        if (touchPreviewRef.current) touchPreviewRef.current.style.display = "none";
        seekingRef.current = false;
        setTouchSeeking(false);
        if (wasPlaying && vid) vid.play().catch(() => {});
        window.removeEventListener("touchmove", onMove);
        window.removeEventListener("touchend", onEnd);
      };
      window.addEventListener("touchmove", onMove, { passive: false });
      window.addEventListener("touchend", onEnd);
    },
    [stopRAF]
  );

  // Seek preview — show thumbnail at hovered time
  const showSeekPreview = useCallback((x: number, barW: number, time: number) => {
    const wrap = previewWrapRef.current;
    const pv = previewRef.current;
    const pt = previewTimeRef.current;
    if (!wrap || !pv) return;
    // Lazy-load preview video src on first hover (avoids extra network request on page load)
    if (!pv.src && src) { pv.src = src; pv.preload = "metadata"; }
    wrap.style.display = "block";
    wrap.style.left = `${Math.max(85, Math.min(x, barW - 85))}px`;
    if (pv.readyState >= 1) pv.currentTime = time;
    if (pt) pt.textContent = fmt(time);
  }, [src]);

  const hideSeekPreview = useCallback(() => {
    if (previewWrapRef.current) previewWrapRef.current.style.display = "none";
  }, []);

  const toggleMute = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
    try { localStorage.setItem('fdm-video-muted', String(v.muted)); } catch {}
  }, []);

  const changeVolume = useCallback((val: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.volume = val;
    setVolume(val);
    if (val > 0 && v.muted) { v.muted = false; setMuted(false); }
  }, []);

  const toggleFullscreen = useCallback(async () => {
    const c = containerRef.current;
    if (!c) return;

    // Exit real fullscreen if active
    if (document.fullscreenElement || (document as any).webkitFullscreenElement) {
      if (document.exitFullscreen) await document.exitFullscreen();
      else if ((document as any).webkitExitFullscreen) (document as any).webkitExitFullscreen();
      return;
    }

    // Exit fake fullscreen if active
    if (fakeFullscreen) {
      setFakeFullscreen(false);
      return;
    }

    // Check if the browser actually supports fullscreen on arbitrary elements
    // iOS Safari has webkitRequestFullscreen on elements but it silently does nothing
    const fsEnabled = document.fullscreenEnabled || (document as any).webkitFullscreenEnabled;

    if (fsEnabled) {
      try {
        if (c.requestFullscreen) {
          await c.requestFullscreen();
          return;
        }
        if ((c as any).webkitRequestFullscreen) {
          (c as any).webkitRequestFullscreen();
          return;
        }
      } catch {}
    }

    // Fallback: CSS fullscreen (iOS Safari etc.)
    setFakeFullscreen(true);
  }, [fakeFullscreen]);

  const changeSpeed = useCallback((rate: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.playbackRate = rate;
    setSpeed(rate);
  }, []);

  // Cinema mode — hide sidebars + set player to ~100vh
  const toggleCinema = useCallback(() => {
    setCinemaMode(prev => {
      const next = !prev;
      const sidebarTop = document.getElementById("right-sidebar-top");
      const rightAside = sidebarTop?.closest("aside") as HTMLElement | null;
      const content = rightAside?.previousElementSibling as HTMLElement | null;
      const header = content?.querySelector("header") as HTMLElement | null;
      const postShell = document.getElementById("post-shell") || document.getElementById("dashboard-shell");
      const mainEl = postShell?.querySelector(':scope > main') as HTMLElement | null;

      if (next) {
        if (rightAside) rightAside.style.display = "none";
        if (content) content.style.maxWidth = "none";
        if (header) header.style.display = "none";
        document.body.setAttribute("data-cinema-mode", "");
        if (mainEl) mainEl.style.marginLeft = "0";
      } else {
        if (rightAside) rightAside.style.display = "";
        if (content) content.style.maxWidth = "";
        if (header) header.style.display = "";
        document.body.removeAttribute("data-cinema-mode");
        if (mainEl) mainEl.style.marginLeft = "";
      }
      return next;
    });
  }, []);

  // Mini player toggle
  const toggleMini = useCallback(() => {
    setMiniPlayer(prev => !prev);
  }, []);

  // Picture-in-Picture — floats above all windows/tabs
  const togglePiP = useCallback(async () => {
    const v = videoRef.current;
    if (!v) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if (document.pictureInPictureEnabled) {
        await v.requestPictureInPicture();
      }
    } catch {}
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopRAF();
      // Clear video source to prevent residual access
      const v = videoRef.current;
      if (v) { v.pause(); }
      const sidebarTop = document.getElementById("right-sidebar-top");
      const rightAside = sidebarTop?.closest("aside") as HTMLElement | null;
      const content = rightAside?.previousElementSibling as HTMLElement | null;
      const header = content?.querySelector("header") as HTMLElement | null;
      if (rightAside) rightAside.style.display = "";
      if (content) content.style.maxWidth = "";
      if (header) header.style.display = "";
      document.body.removeAttribute("data-cinema-mode");
      const postShell = document.getElementById("post-shell") || document.getElementById("dashboard-shell");
      const mainEl = postShell?.querySelector(':scope > main') as HTMLElement | null;
      if (mainEl) mainEl.style.marginLeft = "";
    };
  }, [stopRAF]);

  // Sync fakeFullscreen with fullscreen state
  useEffect(() => {
    setFullscreen(fakeFullscreen || !!document.fullscreenElement || !!(document as any).webkitFullscreenElement);
  }, [fakeFullscreen]);

  useEffect(() => {
    if (!settingsMenu) return;
    const handleClick = (e: MouseEvent) => {
      if (settingsMenuRef.current && !settingsMenuRef.current.contains(e.target as Node)) { setSettingsMenu(false); settingsOpenRef.current = false; setSettingsTab("main"); }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [settingsMenu]);

  // Disabled mode: pause + mute immediately when disabled becomes true
  useEffect(() => {
    if (!disabled) return;
    const v = videoRef.current;
    if (!v) return;
    v.pause();
    v.muted = true;
  }, [disabled]);

  // Video event listeners (full player mode only)
  useEffect(() => {
    if (moment) return;
    const v = videoRef.current;
    if (!v) return;
    const onPlay = () => { playingRef.current = true; setPlaying(true); startRAF(); showControls(); };
    const onPause = () => { playingRef.current = false; setPlaying(false); stopRAF(); updateProgress(); controlsVisibleRef.current = true; setControls(true); if (waitingTimer.current) clearTimeout(waitingTimer.current); setLoading(false); };
    const onPlaying = () => { if (waitingTimer.current) clearTimeout(waitingTimer.current); setLoading(false); };
    const onDurationChange = () => { durationRef.current = v.duration; const t = `${fmt(v.currentTime)} / ${fmt(v.duration)}`; if (timeRef.current) timeRef.current.textContent = t; if (miniTimeRef.current) miniTimeRef.current.textContent = t; };
    const onProgress = () => updateBuffer();
    // Debounce waiting — Safari fires it aggressively causing spinner flicker
    const onWaiting = () => { if (waitingTimer.current) clearTimeout(waitingTimer.current); waitingTimer.current = setTimeout(() => setLoading(true), 300); };
    const onCanPlay = () => { if (waitingTimer.current) clearTimeout(waitingTimer.current); setLoading(false); };
    const onLoadedData = () => { if (waitingTimer.current) clearTimeout(waitingTimer.current); setLoading(false); };
    const onError = () => setError(true);
    const onFsChange = () => setFullscreen(fakeFullscreen || !!document.fullscreenElement || !!(document as any).webkitFullscreenElement);
    const onVideoEnded = () => { stopRAF(); onEndedRef.current?.(); };

    v.addEventListener("play", onPlay);
    v.addEventListener("pause", onPause);
    v.addEventListener("playing", onPlaying);
    v.addEventListener("durationchange", onDurationChange);
    v.addEventListener("progress", onProgress);
    v.addEventListener("waiting", onWaiting);
    v.addEventListener("canplay", onCanPlay);
    v.addEventListener("loadeddata", onLoadedData);
    v.addEventListener("error", onError);
    v.addEventListener("ended", onVideoEnded);
    document.addEventListener("fullscreenchange", onFsChange);
    document.addEventListener("webkitfullscreenchange", onFsChange);

    // Optimistic play: try immediately, on loadeddata (first frame), and on canplay
    // Skip when disabled — upload preview mode should not auto-play
    if (!disabled) {
      const tryPlay = () => v.play().catch(() => {});
      tryPlay();
      const onLoadedDataStart = () => tryPlay();
      const onCanPlayStart = () => tryPlay();
      v.addEventListener("loadeddata", onLoadedDataStart, { once: true });
      v.addEventListener("canplay", onCanPlayStart, { once: true });

      return () => {
        if (waitingTimer.current) clearTimeout(waitingTimer.current);
        v.removeEventListener("loadeddata", onLoadedDataStart);
        v.removeEventListener("canplay", onCanPlayStart);
        v.removeEventListener("play", onPlay);
        v.removeEventListener("pause", onPause);
        v.removeEventListener("playing", onPlaying);
        v.removeEventListener("durationchange", onDurationChange);
        v.removeEventListener("progress", onProgress);
        v.removeEventListener("waiting", onWaiting);
        v.removeEventListener("canplay", onCanPlay);
        v.removeEventListener("loadeddata", onLoadedData);
        v.removeEventListener("error", onError);
        v.removeEventListener("ended", onVideoEnded);
        document.removeEventListener("fullscreenchange", onFsChange);
        document.removeEventListener("webkitfullscreenchange", onFsChange);
      };
    }

    return () => {
      if (waitingTimer.current) clearTimeout(waitingTimer.current);
      v.removeEventListener("play", onPlay);
      v.removeEventListener("pause", onPause);
      v.removeEventListener("playing", onPlaying);
      v.removeEventListener("durationchange", onDurationChange);
      v.removeEventListener("progress", onProgress);
      v.removeEventListener("waiting", onWaiting);
      v.removeEventListener("canplay", onCanPlay);
      v.removeEventListener("loadeddata", onLoadedData);
      v.removeEventListener("error", onError);
      v.removeEventListener("ended", onVideoEnded);
      document.removeEventListener("fullscreenchange", onFsChange);
      document.removeEventListener("webkitfullscreenchange", onFsChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showControls, startRAF, stopRAF, updateProgress, updateBuffer, disabled, fakeFullscreen]);

  // Restore user's mute preference from localStorage
  useEffect(() => {
    if (disabled || moment) return;
    const v = videoRef.current;
    if (!v) return;
    try {
      const saved = localStorage.getItem('fdm-video-muted');
      if (saved === 'false') {
        v.muted = false;
        setMuted(false);
      }
    } catch {}
  }, [disabled]);

  // Auto-start from countdown — unmute since user already interacted
  useEffect(() => {
    if (disabled || moment || !autoStart) return;
    const v = videoRef.current;
    if (!v) return;
    v.muted = false;
    setMuted(false);
    try { localStorage.setItem('fdm-video-muted', 'false'); } catch {}
  }, [autoStart]);

  // Position memory — resume from where the user left off
  useEffect(() => {
    if (disabled || moment) return;
    const v = videoRef.current;
    if (!v) return;
    const key = _hk(src);

    // Restore saved position (skip when HLS manages startPosition)
    if (!isHls) {
      try {
        const saved = localStorage.getItem(key);
        if (saved) {
          const t = parseFloat(saved);
          if (isFinite(t) && t > 2) {
            const restore = () => {
              if (v.duration && t < v.duration - 2) {
                if (typeof (v as any).fastSeek === "function") {
                  (v as any).fastSeek(t);
                } else {
                  v.currentTime = t;
                }
              }
              v.removeEventListener("loadedmetadata", restore);
            };
            if (v.duration) restore();
            else v.addEventListener("loadedmetadata", restore);
          }
        }
      } catch {}
    }

    // Save position periodically
    const save = () => {
      try {
        if (v.currentTime > 2 && v.duration && v.currentTime < v.duration - 2) {
          localStorage.setItem(key, String(v.currentTime));
        } else if (v.duration && v.currentTime >= v.duration - 2) {
          localStorage.removeItem(key);
        }
      } catch {}
    };

    const interval = setInterval(save, 3000);
    const onBeforeUnload = () => save();
    window.addEventListener("beforeunload", onBeforeUnload);

    return () => {
      save();
      clearInterval(interval);
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, [src, isHls]);

  // Auto mini player on scroll away — only when playing, not in fullscreen/cinema
  useEffect(() => {
    if (disabled || moment) return;
    const w = wrapperRef.current;
    if (!w) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (fullscreen || cinemaMode) return;
        if (!entry.isIntersecting && playingRef.current) {
          setMiniPlayer(true);
        } else if (entry.isIntersecting) {
          setMiniPlayer(false);
        }
      },
      { threshold: 0.5 }
    );

    observer.observe(w);
    return () => observer.disconnect();
  }, [fullscreen, cinemaMode]);

  // Keyboard shortcuts (full player mode only)
  useEffect(() => {
    if (disabled || moment) return;
    const handle = (e: KeyboardEvent) => {
      const c = containerRef.current;
      if (!c) return;
      const active = document.activeElement as HTMLElement | null;
      if (active) {
        const tag = active.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || active.isContentEditable) return;
      }
      if (!c.offsetParent) return;
      const v = videoRef.current;
      if (!v) return;
      // Escape exits fake fullscreen
      if (e.key === "Escape" && fakeFullscreen) { setFakeFullscreen(false); e.preventDefault(); return; }
      // Block save / view-source shortcuts inside player
      if ((e.ctrlKey || e.metaKey) && (e.key === "s" || e.key === "u")) { e.preventDefault(); return; }
      const dur = v.duration || 0;
      switch (e.key) {
        case " ": case "k": e.preventDefault(); togglePlay(); break;
        case "ArrowLeft": e.preventDefault(); v.currentTime = Math.max(0, v.currentTime - 5); updateProgress(); showControls(); break;
        case "ArrowRight": e.preventDefault(); v.currentTime = Math.min(dur, v.currentTime + 5); updateProgress(); showControls(); break;
        case "j": e.preventDefault(); v.currentTime = Math.max(0, v.currentTime - 10); updateProgress(); showControls(); break;
        case "l": e.preventDefault(); v.currentTime = Math.min(dur, v.currentTime + 10); updateProgress(); showControls(); break;
        case "ArrowUp": e.preventDefault(); changeVolume(Math.min(1, v.volume + 0.05)); showControls(); break;
        case "ArrowDown": e.preventDefault(); changeVolume(Math.max(0, v.volume - 0.05)); showControls(); break;
        case "f": e.preventDefault(); toggleFullscreen(); break;
        case "m": e.preventDefault(); toggleMute(); break;
        case "t": e.preventDefault(); toggleCinema(); break;
        case "p": e.preventDefault(); togglePiP(); break;
        case "Home": e.preventDefault(); v.currentTime = 0; updateProgress(); showControls(); break;
        case "End": e.preventDefault(); v.currentTime = dur; updateProgress(); showControls(); break;
        case "0": case "1": case "2": case "3": case "4":
        case "5": case "6": case "7": case "8": case "9":
          e.preventDefault(); v.currentTime = dur * (Number(e.key) / 10); updateProgress(); showControls(); break;
        case ">": e.preventDefault(); changeSpeed(Math.min(2, (v.playbackRate || 1) + 0.25)); break;
        case "<": e.preventDefault(); changeSpeed(Math.max(0.25, (v.playbackRate || 1) - 0.25)); break;
      }
    };
    window.addEventListener("keydown", handle, { capture: true });
    return () => window.removeEventListener("keydown", handle, { capture: true } as AddEventListenerOptions);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [togglePlay, toggleMute, toggleFullscreen, changeVolume, showControls, toggleCinema, updateProgress, changeSpeed, fakeFullscreen]);

  // ── Moment mode: external play/pause control ──
  useEffect(() => {
    if (!moment) return;
    const v = videoRef.current;
    if (!v) return;
    if (externalPaused) {
      v.pause();
    } else {
      v.play().catch(() => {});
    }
  }, [moment, externalPaused]);

  // ── Moment mode: external mute control ──
  useEffect(() => {
    if (!moment) return;
    const v = videoRef.current;
    if (!v) return;
    v.muted = !!externalMuted;
  }, [moment, externalMuted]);

  // ── Moment mode: loading spinner ──
  useEffect(() => {
    if (!moment) return;
    const v = videoRef.current;
    if (!v) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const onWaiting = () => { timer = setTimeout(() => setLoading(true), 300); };
    const onPlaying = () => { clearTimeout(timer); setLoading(false); };
    const onCanPlay = () => { clearTimeout(timer); setLoading(false); };
    v.addEventListener("waiting", onWaiting);
    v.addEventListener("playing", onPlaying);
    v.addEventListener("canplay", onCanPlay);
    return () => {
      clearTimeout(timer);
      v.removeEventListener("waiting", onWaiting);
      v.removeEventListener("playing", onPlaying);
      v.removeEventListener("canplay", onCanPlay);
    };
  }, [moment]);

  const lastMoveRef = useRef(0);
  const handleMouseMove = useCallback(() => {
    const now = Date.now();
    if (now - lastMoveRef.current < 300) return;
    lastMoveRef.current = now;
    showControls();
  }, [showControls]);

  // Double-tap to seek (mobile) / Mini player click to expand
  const handleVideoAreaClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest(".vp-bar")) return;
    if ((e.target as HTMLElement).closest(".vp-mini-close")) return;

    // Mini player: click anywhere to scroll back to full view
    if (miniPlayer) {
      setMiniPlayer(false);
      wrapperRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const isLeftHalf = x < rect.width / 2;

    tapCountRef.current += 1;
    if (tapCountRef.current === 1) {
      doubleTapTimer.current = setTimeout(() => {
        if (tapCountRef.current === 1) { togglePlay(); showControls(); }
        tapCountRef.current = 0;
      }, 300);
    } else if (tapCountRef.current === 2) {
      if (doubleTapTimer.current) clearTimeout(doubleTapTimer.current);
      tapCountRef.current = 0;
      const v = videoRef.current;
      if (!v) return;
      const dur = v.duration || 0;
      if (isLeftHalf) {
        v.currentTime = Math.max(0, v.currentTime - 10);
        seekAnimKey.current += 1;
        setSeekAnim({ side: "left", key: seekAnimKey.current });
      } else {
        v.currentTime = Math.min(dur, v.currentTime + 10);
        seekAnimKey.current += 1;
        setSeekAnim({ side: "right", key: seekAnimKey.current });
      }
      updateProgress(); showControls();
      setTimeout(() => setSeekAnim(null), 600);
    }
  }, [miniPlayer, togglePlay, showControls, updateProgress]);

  // Cinema mode: set video height to fill viewport
  const cinemaStyle = cinemaMode ? { height: "calc(100vh - 8px)" } : undefined;

  // Preconnect to video host for faster initial load
  const videoOrigin = (() => { try { return new URL(src).origin; } catch { return null; } })();

  // ── Moment mode: minimal render (video + optional spinner) ──
  if (moment) {
    return (
      <>
        <video
          ref={videoRef}
          {...(hlsUrl ? {} : src ? { src } : {})}
          poster={poster}
          preload="auto"
          playsInline
          muted={externalMuted}
          loop={loop}
          className={videoClassName}
          suppressHydrationWarning
          controlsList="nodownload noremoteplayback"
          draggable={false}
          style={{ WebkitTouchCallout: "none" } as React.CSSProperties}
          onContextMenu={(e) => e.preventDefault()}
          onDragStart={(e) => e.preventDefault()}
        />
        {loading && !externalPaused && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
            <div className="w-10 h-10 rounded-full border-[3px] border-white/20 animate-spin" style={{ borderTopColor: "#fff" }} />
          </div>
        )}
      </>
    );
  }

  return (
    <>
      {videoOrigin && (
        <link rel="preconnect" href={videoOrigin} crossOrigin="anonymous" />
      )}
    <div ref={wrapperRef} className="relative overflow-visible">
      {/* Placeholder to keep layout space when mini player is active */}
      {miniPlayer && <div className="w-full aspect-video bg-black/20 rounded-xl" />}

      <div
        ref={containerRef}
        className={`relative overflow-visible select-none group/vp ${
          miniPlayer
            ? "vp-mini fixed bottom-4 right-4 w-[360px] max-w-[45vw] rounded-lg shadow-2xl z-[9999] bg-black"
            : "sm:rounded-lg z-10"
        } ${fakeFullscreen ? "!fixed !inset-0 !w-screen !h-[100dvh] !z-[99999] !rounded-none !overflow-hidden bg-black" : ""}`}
        style={!miniPlayer && !fakeFullscreen ? cinemaStyle : fakeFullscreen ? { paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)", paddingLeft: "env(safe-area-inset-left)", paddingRight: "env(safe-area-inset-right)" } : undefined}
        tabIndex={0}
        onMouseMove={disabled ? undefined : handleMouseMove}
        onMouseLeave={disabled ? undefined : () => { if (playingRef.current && !settingsOpenRef.current) { controlsVisibleRef.current = false; setControls(false); } }}
        onClick={disabled ? undefined : handleVideoAreaClick}
        onContextMenu={(e) => e.preventDefault()}
      >
        {/* Video — pointer-events disabled; all interaction via container */}
        {/* When HLS is active, hls.js/Safari manages the source — no src attribute */}
        <video
          ref={videoRef}
          {...(hlsUrl ? {} : { src: effectiveSrc })}
          poster={poster}
          preload={hlsUrl || hasSavedPos ? "metadata" : "auto"}
          playsInline
          autoPlay={!disabled}
          muted
          loop={loop || !!disabled}
          suppressHydrationWarning
          controlsList="nodownload noremoteplayback"
          draggable={false}
          className={`w-full pointer-events-none select-none overflow-hidden ${fakeFullscreen ? "!rounded-none" : "sm:rounded-lg"} ${(cinemaMode && !miniPlayer) || fakeFullscreen ? "h-full object-contain" : "aspect-video"}`}
          style={{ WebkitTouchCallout: "none" } as React.CSSProperties}
          onContextMenu={(e) => e.preventDefault()}
          onDragStart={(e) => e.preventDefault()}
        />

        {/* Mini player close button — pauses and closes */}
        {miniPlayer && !disabled && (
          <button
            className="vp-mini-close absolute top-2 right-2 z-30 w-7 h-7 rounded-full bg-black/60 flex items-center justify-center hover:bg-black/80 transition"
            onClick={(e) => { e.stopPropagation(); setMiniPlayer(false); const v = videoRef.current; if (v) v.pause(); }}
          >
            <svg className="h-4 w-4" fill="white" viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" /></svg>
          </button>
        )}

        {/* Loading spinner — only while playing */}
        {loading && playing && !error && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className={`rounded-full border-[3px] border-white/20 animate-spin ${miniPlayer ? "w-8 h-8" : "w-12 h-12"}`} style={{ borderTopColor: "var(--accent-color)" }} />
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="text-center">
              <svg className="h-10 w-10 text-white/40 mx-auto mb-2" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" /></svg>
              <p className="text-white/60 text-sm">Video oynatılamadı</p>
            </div>
          </div>
        )}

        {/* Unmute overlay — shows when video is auto-playing muted */}
        {playing && muted && !miniPlayer && !error && !disabled && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              const v = videoRef.current;
              if (v) { v.muted = false; setMuted(false); try { localStorage.setItem('fdm-video-muted', 'false'); } catch {} }
            }}
            className="absolute bottom-20 left-3 z-30 flex items-center gap-2 bg-black/70 hover:bg-black/80 text-white rounded-full px-3.5 py-2 text-[0.78rem] font-medium transition-all cursor-pointer"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="white"><path d="M3.63 3.63a.996.996 0 000 1.41L7.29 8.7 7 9H4c-.55 0-1 .45-1 1v4c0 .55.45 1 1 1h3l3.29 3.29c.63.63 1.71.18 1.71-.71v-4.17l4.18 4.18c-.49.37-1.02.68-1.6.91-.36.15-.58.53-.58.92 0 .72.73 1.18 1.39.91.8-.33 1.55-.77 2.22-1.31l1.34 1.34a.996.996 0 101.41-1.41L5.05 3.63c-.39-.39-1.02-.39-1.42 0zM19 12c0 .82-.15 1.61-.41 2.34l1.53 1.53c.56-1.17.88-2.48.88-3.87 0-3.83-2.4-7.11-5.78-8.4-.59-.23-1.22.23-1.22.86v.19c0 .38.25.71.61.85C17.18 6.54 19 9.06 19 12zm-8.71-6.29l-.17.17L12 7.76V6.41c0-.89-1.08-1.33-1.71-.7zM16.5 12A4.5 4.5 0 0014 7.97v1.79l2.48 2.48c.01-.08.02-.16.02-.24z" /></svg>
            Sesi Aç
          </button>
        )}

        {/* Action indicator */}
        {actionIcon && !miniPlayer && !disabled && (
          <div key={actionCountRef.current} className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
            <div className="w-14 h-14 rounded-full bg-black/50 flex items-center justify-center" style={{ animation: "vpActionFade 800ms ease forwards" }}>
              {actionIcon === "play" ? (
                <svg className="h-7 w-7 text-white ml-0.5" fill="white" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
              ) : (
                <svg className="h-7 w-7" fill="white" viewBox="0 0 24 24"><path d="M6 4h4v16H6zM14 4h4v16h-4z" /></svg>
              )}
            </div>
          </div>
        )}

        {/* Double-tap seek animation */}
        {seekAnim && !miniPlayer && !disabled && (
          <div key={seekAnim.key} className={`absolute top-0 bottom-0 flex items-center justify-center pointer-events-none z-20 ${seekAnim.side === "left" ? "left-0 w-1/3" : "right-0 w-1/3"}`}>
            <div className="flex flex-col items-center" style={{ animation: "vpSeekAnim 600ms ease forwards" }}>
              <svg className="h-8 w-8 text-white" fill="white" viewBox="0 0 24 24">
                {seekAnim.side === "left" ? <path d="M11 18V6l-8.5 6 8.5 6zm.5-6l8.5 6V6l-8.5 6z" /> : <path d="M4 18l8.5-6L4 6v12zm9-12v12l8.5-6L13 6z" />}
              </svg>
              <span className="text-white text-xs font-bold mt-1">{seekAnim.side === "left" ? "-10s" : "+10s"}</span>
            </div>
          </div>
        )}

        {/* Controls overlay — simplified in mini mode */}
        <div
          className={`vp-bar absolute bottom-0 left-0 right-0 transition-opacity duration-300 ${disabled ? "!hidden" : controls || !playing ? "opacity-100" : "opacity-0 pointer-events-none"}`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent pointer-events-none" />

          <div className={`relative mx-auto ${miniPlayer ? "px-2 pb-1.5 pt-6" : "max-w-[calc(100%-32px)] pb-2.5 pt-10"}`}>
            {/* Progress bar */}
            <div
              ref={progressRef}
              className={`vp-progress-touch w-full transition-[height] rounded-full cursor-pointer relative ${miniPlayer ? "h-[3px] mb-1.5" : touchSeeking ? "h-[12px] mb-2.5" : "h-[4px] group-hover/vp:h-[6px] mb-2.5"}`}
              style={{ backgroundColor: "rgba(255,255,255,0.2)" }}
              onMouseDown={startSeek}
              onTouchStart={startTouchSeek}
              onMouseMove={(e) => {
                if (seekingRef.current || miniPlayer) return;
                const rect = progressRef.current?.getBoundingClientRect();
                if (!rect || !durationRef.current) return;
                const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                showSeekPreview(e.clientX - rect.left, rect.width, pct * durationRef.current);
              }}
              onMouseLeave={() => { if (!seekingRef.current) hideSeekPreview(); }}
            >
              {/* Seek preview tooltip — video thumbnail on desktop, time label on touch */}
              {!miniPlayer && !isTouchDevice && (
                <div ref={previewWrapRef} className="absolute bottom-full mb-4 pointer-events-none z-30 w-[160px]" style={{ display: "none", transform: "translateX(-50%)" }}>
                  <div className="rounded-lg overflow-hidden shadow-xl border border-white/20 bg-black w-[160px]">
                    <video ref={previewRef} preload="none" muted controlsList="nodownload" disablePictureInPicture className="w-[160px] h-[90px] object-cover pointer-events-none" onContextMenu={(e) => e.preventDefault()} />
                  </div>
                  <div ref={previewTimeRef} className="text-white text-[0.75rem] text-center mt-1.5 font-medium tabular-nums bg-black/80 rounded px-2 py-0.5 mx-auto w-fit" />
                </div>
              )}
              {/* Touch seek time tooltip — mobile only */}
              {!miniPlayer && isTouchDevice && (
                <div ref={touchPreviewRef} className="absolute bottom-full mb-3 pointer-events-none z-30 text-white text-[0.8rem] font-semibold tabular-nums bg-black/80 rounded-md px-2.5 py-1 -translate-x-1/2 shadow-lg" style={{ display: "none" }} />
              )}

              <div ref={bufferRef} className="absolute h-full rounded-full top-0 left-0" style={{ width: "0%", backgroundColor: "rgba(255,255,255,0.3)" }} />
              <div ref={fillRef} className="absolute h-full rounded-full top-0 left-0" style={{ width: "0%", backgroundColor: "var(--accent-color)" }} />
              {!miniPlayer && (
                <div ref={thumbRef} className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-[13px] h-[13px] rounded-full scale-0 group-hover/vp:scale-100 transition-transform z-10" style={{ left: "0%", backgroundColor: "var(--accent-color)", boxShadow: "0 0 2px rgba(0,0,0,0.2)" }} />
              )}
            </div>

            {/* Buttons row — mini mode: play/pause + time + mute + expand */}
            {miniPlayer ? (
              <div className="flex items-center gap-1 text-white">
                <button onClick={togglePlay} className="p-1 hover:bg-white/10 rounded-full transition-colors">
                  {playing ? (
                    <svg className="h-4 w-4" fill="white" viewBox="0 0 24 24"><path d="M6 4h4v16H6zM14 4h4v16h-4z" /></svg>
                  ) : (
                    <svg className="h-4 w-4" fill="white" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                  )}
                </button>
                <span ref={miniTimeRef} className="text-[0.6rem] tabular-nums text-white/70 font-medium" />
                <div className="flex-1" />
                <button onClick={(e) => { e.stopPropagation(); toggleMute(); }} className="p-1 hover:bg-white/10 rounded-full transition-colors">
                  {muted ? (
                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="white"><path d="M3.63 3.63a.996.996 0 000 1.41L7.29 8.7 7 9H4c-.55 0-1 .45-1 1v4c0 .55.45 1 1 1h3l3.29 3.29c.63.63 1.71.18 1.71-.71v-4.17l4.18 4.18c-.49.37-1.02.68-1.6.91-.36.15-.58.53-.58.92 0 .72.73 1.18 1.39.91.8-.33 1.55-.77 2.22-1.31l1.34 1.34a.996.996 0 101.41-1.41L5.05 3.63c-.39-.39-1.02-.39-1.42 0z" /></svg>
                  ) : (
                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="white"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0014 7.97v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" /></svg>
                  )}
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); togglePiP(); }}
                  className="p-1 hover:bg-white/10 rounded-full transition-colors"
                  title="Pencerede oynat"
                >
                  <svg className="h-3.5 w-3.5" fill="none" stroke="white" strokeWidth={2} viewBox="0 0 24 24"><rect x="2" y="3" width="20" height="14" rx="2" /><rect x="11" y="9" width="9" height="6" rx="1" fill="white" fillOpacity={0.3} /></svg>
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setMiniPlayer(false); wrapperRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }); }}
                  className="p-1 hover:bg-white/10 rounded-full transition-colors"
                  title="Genişlet"
                >
                  <svg className="h-3.5 w-3.5" fill="none" stroke="white" strokeWidth={2.5} viewBox="0 0 24 24"><path d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3m0 18h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3" /></svg>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-white">
                {/* Play/Pause */}
                <button onClick={togglePlay} className="p-2 hover:bg-white/10 rounded-full transition-colors" aria-label={playing ? "Duraklat (k)" : "Oynat (k)"} title={playing ? "Duraklat (k)" : "Oynat (k)"}>
                  {playing ? (
                    <svg className="h-6 w-6" fill="white" viewBox="0 0 24 24"><path d="M6 4h4v16H6zM14 4h4v16h-4z" /></svg>
                  ) : (
                    <svg className="h-6 w-6" fill="white" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                  )}
                </button>

                {/* Volume */}
                <div className="flex items-center gap-0.5 group/vol">
                  <button onClick={toggleMute} aria-label={muted ? "Sesi aç (m)" : "Sesi kapat (m)"} title={muted ? "Sesi aç (m)" : "Sesi kapat (m)"} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                    {muted || volume === 0 ? (
                      <svg className="h-6 w-6" viewBox="0 0 24 24" fill="white"><path d="M3.63 3.63a.996.996 0 000 1.41L7.29 8.7 7 9H4c-.55 0-1 .45-1 1v4c0 .55.45 1 1 1h3l3.29 3.29c.63.63 1.71.18 1.71-.71v-4.17l4.18 4.18c-.49.37-1.02.68-1.6.91-.36.15-.58.53-.58.92 0 .72.73 1.18 1.39.91.8-.33 1.55-.77 2.22-1.31l1.34 1.34a.996.996 0 101.41-1.41L5.05 3.63c-.39-.39-1.02-.39-1.42 0zM19 12c0 .82-.15 1.61-.41 2.34l1.53 1.53c.56-1.17.88-2.48.88-3.87 0-3.83-2.4-7.11-5.78-8.4-.59-.23-1.22.23-1.22.86v.19c0 .38.25.71.61.85C17.18 6.54 19 9.06 19 12zm-8.71-6.29l-.17.17L12 7.76V6.41c0-.89-1.08-1.33-1.71-.7zM16.5 12A4.5 4.5 0 0014 7.97v1.79l2.48 2.48c.01-.08.02-.16.02-.24z" /></svg>
                    ) : volume < 0.5 ? (
                      <svg className="h-6 w-6" viewBox="0 0 24 24" fill="white"><path d="M18.5 12A4.5 4.5 0 0016 7.97v8.05c1.48-.73 2.5-2.25 2.5-4.02zM5 9v6h4l5 5V4L9 9H5z" /></svg>
                    ) : (
                      <svg className="h-6 w-6" viewBox="0 0 24 24" fill="white"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0014 7.97v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" /></svg>
                    )}
                  </button>
                  <input type="range" min={0} max={1} step={0.05} value={muted ? 0 : volume} onChange={(e) => changeVolume(Number(e.target.value))} className="vp-volume-slider w-0 group-hover/vol:w-20 transition-all opacity-0 group-hover/vol:opacity-100" aria-label="Ses seviyesi" />
                </div>

                <span ref={timeRef} className="text-[0.8rem] tabular-nums ml-1 text-white/90 font-medium">0:00 / 0:00</span>
                <div className="flex-1" />

                {/* Settings (speed + cinema mode) */}
                <div className="relative" ref={settingsMenuRef}>
                  <button onClick={() => { const next = !settingsMenu; setSettingsMenu(next); settingsOpenRef.current = next; setSettingsTab("main"); if (next) showControls(true); }} className="p-2 hover:bg-white/10 rounded-full transition-colors" title="Ayarlar">
                    {speed !== 1 ? (
                      <span className="text-[0.8rem] font-semibold min-w-[36px]">{speed}x</span>
                    ) : (
                      <svg className="h-5 w-5" fill="none" stroke="white" strokeWidth={2} viewBox="0 0 24 24"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" /></svg>
                    )}
                  </button>
                  {settingsMenu && (
                    <>
                    {/* Backdrop — dismiss on tap outside */}
                    <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setSettingsMenu(false); settingsOpenRef.current = false; setSettingsTab("main"); }} />
                    <div className="absolute right-0 top-full mt-1 sm:top-auto sm:bottom-full sm:mt-0 sm:mb-2 rounded-xl max-h-[50vh] overflow-y-auto z-50 bg-neutral-900/95 backdrop-blur-md min-w-[200px] max-w-[min(280px,calc(100vw-32px))] shadow-xl border border-white/10">
                      {settingsTab === "main" ? (
                        <>
                          {/* Cinema mode toggle — hidden on mobile */}
                          <div className="hidden sm:flex px-3.5 py-2.5 items-center justify-between border-b border-white/10">
                            <span className="text-[0.82rem] text-white font-medium">Sinema Modu</span>
                            <button
                              onClick={toggleCinema}
                              className="relative w-9 h-5 rounded-full transition-colors"
                              style={cinemaMode ? { backgroundColor: "var(--accent-color)" } : { backgroundColor: "rgba(255,255,255,0.2)" }}
                            >
                              <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${cinemaMode ? "left-[18px]" : "left-0.5"}`} />
                            </button>
                          </div>
                          {/* Speed — navigate to sub-tab */}
                          <button onClick={() => setSettingsTab("speed")} className="w-full px-3.5 py-2.5 flex items-center justify-between hover:bg-white/10 transition-colors border-b border-white/10">
                            <span className="text-[0.82rem] text-white font-medium">Hız</span>
                            <span className="text-[0.78rem] text-white/50 flex items-center gap-1">
                              {speed === 1 ? "Normal" : `${speed}x`}
                              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" /></svg>
                            </span>
                          </button>
                          {/* Quality — navigate to sub-tab (only when HLS streams available) */}
                          {qualities.length > 0 && (
                            <button onClick={() => setSettingsTab("quality")} className="w-full px-3.5 py-2.5 flex items-center justify-between hover:bg-white/10 transition-colors border-b border-white/10">
                              <span className="text-[0.82rem] text-white font-medium">Kalite</span>
                              <span className="text-[0.78rem] text-white/50 flex items-center gap-1">
                                {currentQuality === -1 ? "Otomatik" : qualities[currentQuality]?.name || "Otomatik"}
                                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" /></svg>
                              </span>
                            </button>
                          )}
                          {/* Shortcuts — navigate to sub-tab (hidden on mobile) */}
                          <button onClick={() => setSettingsTab("shortcuts")} className="hidden sm:flex w-full px-3.5 py-2.5 items-center justify-between hover:bg-white/10 transition-colors">
                            <span className="text-[0.82rem] text-white font-medium">Kısayollar</span>
                            <svg className="h-3.5 w-3.5 text-white/50" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" /></svg>
                          </button>
                        </>
                      ) : settingsTab === "speed" ? (
                        <>
                          {/* Speed sub-tab — back + options */}
                          <button onClick={() => setSettingsTab("main")} className="w-full px-3.5 py-2 flex items-center gap-2 hover:bg-white/10 transition-colors border-b border-white/10">
                            <svg className="h-3.5 w-3.5 text-white/70" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7" /></svg>
                            <span className="text-[0.82rem] text-white font-medium">Hız</span>
                          </button>
                          <div className="py-1">
                            {[0.5, 0.75, 1, 1.25, 1.5, 2].map((rate) => (
                              <button key={rate} onClick={() => { changeSpeed(rate); setSettingsTab("main"); }} className={`w-full px-3.5 py-1.5 text-[0.78rem] text-left hover:bg-white/10 transition-colors ${speed === rate ? "font-semibold" : "text-white/70"}`} style={speed === rate ? { color: "var(--accent-color)" } : undefined}>
                                {rate === 1 ? "Normal" : `${rate}x`}
                              </button>
                            ))}
                          </div>
                        </>
                      ) : settingsTab === "quality" ? (
                        <>
                          {/* Quality sub-tab — back + auto + levels */}
                          <button onClick={() => setSettingsTab("main")} className="w-full px-3.5 py-2 flex items-center gap-2 hover:bg-white/10 transition-colors border-b border-white/10">
                            <svg className="h-3.5 w-3.5 text-white/70" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7" /></svg>
                            <span className="text-[0.82rem] text-white font-medium">Kalite</span>
                          </button>
                          <div className="py-1">
                            <button onClick={() => { setQuality(-1); setSettingsTab("main"); }} className={`w-full px-3.5 py-1.5 text-[0.78rem] text-left hover:bg-white/10 transition-colors ${currentQuality === -1 ? "font-semibold" : "text-white/70"}`} style={currentQuality === -1 ? { color: "var(--accent-color)" } : undefined}>
                              Otomatik
                            </button>
                            {qualities.map((q, i) => (
                              <button key={i} onClick={() => { setQuality(i); setSettingsTab("main"); }} className={`w-full px-3.5 py-1.5 text-[0.78rem] text-left hover:bg-white/10 transition-colors ${currentQuality === i ? "font-semibold" : "text-white/70"}`} style={currentQuality === i ? { color: "var(--accent-color)" } : undefined}>
                                {q.name}
                              </button>
                            ))}
                          </div>
                        </>
                      ) : (
                        <>
                          {/* Shortcuts sub-tab */}
                          <button onClick={() => setSettingsTab("main")} className="w-full px-3.5 py-2 flex items-center gap-2 hover:bg-white/10 transition-colors border-b border-white/10">
                            <svg className="h-3.5 w-3.5 text-white/70" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7" /></svg>
                            <span className="text-[0.82rem] text-white font-medium">Kısayollar</span>
                          </button>
                          <div className="py-1.5 max-h-[200px] sm:max-h-[260px] overflow-y-auto vp-shortcuts-scroll">
                            {[
                              ["Boşluk / K", "Oynat / Duraklat"],
                              ["J", "10 sn geri"],
                              ["L", "10 sn ileri"],
                              ["\u2190", "5 sn geri"],
                              ["\u2192", "5 sn ileri"],
                              ["\u2191 / \u2193", "Ses seviyesi"],
                              ["M", "Sesi kapat/aç"],
                              ["F", "Tam ekran"],
                              ["T", "Sinema modu"],
                              ["P", "Pencerede oynat"],
                              ["0\u20139", "Videoda atla (%)"],
                              ["< / >", "Hızı azalt/artır"],
                              ["Home", "Başa dön"],
                              ["End", "Sona git"],
                            ].map(([key, desc]) => (
                              <div key={key} className="flex items-center justify-between gap-2 px-3.5 py-[5px]">
                                <span className="text-[0.75rem] text-white/50 shrink-0">{desc}</span>
                                <kbd className="text-[0.7rem] text-white/80 bg-white/10 rounded px-1.5 py-0.5 font-mono min-w-[28px] text-center shrink-0">{key}</kbd>
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                    </>
                  )}
                </div>

                {/* PiP — float above all windows */}
                <button onClick={togglePiP} className="hidden sm:flex p-2 hover:bg-white/10 rounded-full transition-colors items-center justify-center" title="Pencerede oynat (p)">
                  <svg className="h-5 w-5" fill="none" stroke="white" strokeWidth={2} viewBox="0 0 24 24">
                    <rect x="2" y="3" width="20" height="14" rx="2" />
                    <rect x="11" y="9" width="9" height="6" rx="1" fill="white" fillOpacity={0.2} />
                  </svg>
                </button>

                {/* Fullscreen — h-5 w-5 */}
                <button onClick={toggleFullscreen} className="p-2 hover:bg-white/10 rounded-full transition-colors" aria-label={fullscreen ? "Tam ekrandan çık (f)" : "Tam ekran (f)"} title={fullscreen ? "Tam ekrandan çık (f)" : "Tam ekran (f)"}>
                  {fullscreen ? (
                    <svg className="h-5 w-5" fill="none" stroke="white" strokeWidth={2} viewBox="0 0 24 24"><path d="M8 3v3a2 2 0 01-2 2H3m18 0h-3a2 2 0 01-2-2V3m0 18v-3a2 2 0 012-2h3M3 16h3a2 2 0 012 2v3" /></svg>
                  ) : (
                    <svg className="h-5 w-5" fill="none" stroke="white" strokeWidth={2} viewBox="0 0 24 24"><path d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3m0 18h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3" /></svg>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
    </>
  );
});

export default memo(VideoPlayerInner);
