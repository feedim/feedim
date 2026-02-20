"use client";

import { useEffect, useRef, useCallback } from "react";

/**
 * Video View Tracker — YouTube-like analytics
 *
 * Finds the <video> element on the page and tracks:
 * - watch_duration: total seconds of actual video playback
 * - watch_percentage: max progress reached (furthest point / duration * 100)
 * - exit_time: video currentTime when the user leaves
 * - completed: whether the video ended naturally
 *
 * Sends beacon to /api/posts/{id}/view on exit (same endpoint as read tracker).
 * Maps: read_duration → watch_duration, read_percentage → watch_percentage
 */
export default function VideoViewTracker({ postId }: { postId: number }) {
  const sent = useRef(false);
  const watchTime = useRef(0);           // Total seconds played
  const maxProgress = useRef(0);         // Furthest point reached (seconds)
  const exitTime = useRef(0);            // Current video time on exit
  const videoDuration = useRef(0);       // Total video duration
  const completed = useRef(false);       // Video ended naturally
  const isPlaying = useRef(false);       // Is video currently playing
  const tickInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const videoEl = useRef<HTMLVideoElement | null>(null);
  const interactionCount = useRef(0);

  const findVideo = useCallback((): HTMLVideoElement | null => {
    if (videoEl.current && document.contains(videoEl.current)) return videoEl.current;
    const el = document.querySelector("video[src]") as HTMLVideoElement | null;
    videoEl.current = el;
    return el;
  }, []);

  const sendView = useCallback(() => {
    if (sent.current) return;
    sent.current = true;

    const v = findVideo();
    if (v) {
      exitTime.current = v.currentTime;
      if (v.duration && isFinite(v.duration)) videoDuration.current = v.duration;
    }

    const dur = videoDuration.current;
    const watchPct = dur > 0 ? Math.min(100, Math.round((maxProgress.current / dur) * 100)) : 0;

    // Bot gate: need at least some watch time and interactions
    const isBotLikely = interactionCount.current < 2 || watchTime.current < 3;

    const blob = new Blob(
      [JSON.stringify({
        read_duration: Math.round(watchTime.current),
        read_percentage: watchPct,
        is_bot_likely: isBotLikely,
        // Video-specific extras (stored in analytics_events by the API)
        video_analytics: {
          exit_time: Math.round(exitTime.current),
          video_duration: Math.round(dur),
          completed: completed.current,
          watch_percentage: watchPct,
        },
      })],
      { type: "application/json" }
    );
    navigator.sendBeacon(`/api/posts/${postId}/view`, blob);
  }, [postId, findVideo]);

  useEffect(() => {
    sent.current = false;
    watchTime.current = 0;
    maxProgress.current = 0;
    exitTime.current = 0;
    videoDuration.current = 0;
    completed.current = false;
    isPlaying.current = false;
    interactionCount.current = 0;

    // Try to find video element (might load async via dynamic import)
    const tryFind = () => {
      const v = findVideo();
      if (v) {
        attachListeners(v);
        return true;
      }
      return false;
    };

    // Retry until video element appears
    if (!tryFind()) {
      const retryInterval = setInterval(() => {
        if (tryFind()) clearInterval(retryInterval);
      }, 500);
      setTimeout(() => clearInterval(retryInterval), 10_000);
    }

    // Tick every second: accumulate watch time while playing
    tickInterval.current = setInterval(() => {
      if (isPlaying.current) {
        watchTime.current += 1;
      }
    }, 1000);

    function attachListeners(v: HTMLVideoElement) {
      if (v.duration && isFinite(v.duration)) videoDuration.current = v.duration;

      const onPlay = () => {
        isPlaying.current = true;
        interactionCount.current++;
      };
      const onPause = () => {
        isPlaying.current = false;
        exitTime.current = v.currentTime;
      };
      const onTimeUpdate = () => {
        if (v.currentTime > maxProgress.current) {
          maxProgress.current = v.currentTime;
        }
        exitTime.current = v.currentTime;
      };
      const onDurationChange = () => {
        if (v.duration && isFinite(v.duration)) videoDuration.current = v.duration;
      };
      const onEnded = () => {
        completed.current = true;
        isPlaying.current = false;
        maxProgress.current = v.duration || maxProgress.current;
      };
      const onSeeked = () => {
        interactionCount.current++;
      };

      v.addEventListener("play", onPlay);
      v.addEventListener("pause", onPause);
      v.addEventListener("timeupdate", onTimeUpdate);
      v.addEventListener("durationchange", onDurationChange);
      v.addEventListener("ended", onEnded);
      v.addEventListener("seeked", onSeeked);

      // Store cleanup
      (v as any).__vvtCleanup = () => {
        v.removeEventListener("play", onPlay);
        v.removeEventListener("pause", onPause);
        v.removeEventListener("timeupdate", onTimeUpdate);
        v.removeEventListener("durationchange", onDurationChange);
        v.removeEventListener("ended", onEnded);
        v.removeEventListener("seeked", onSeeked);
      };
    }

    // Activity tracking for bot detection
    const markActive = () => { interactionCount.current++; };
    window.addEventListener("click", markActive, { passive: true });
    window.addEventListener("touchstart", markActive, { passive: true });

    // Visibility + unload
    const handleVisibility = () => {
      if (document.visibilityState === "hidden") sendView();
    };
    const handleBeforeUnload = () => sendView();

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      if (tickInterval.current) clearInterval(tickInterval.current);
      window.removeEventListener("click", markActive);
      window.removeEventListener("touchstart", markActive);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      const v = videoEl.current;
      if (v && (v as any).__vvtCleanup) (v as any).__vvtCleanup();
      sendView();
    };
  }, [postId, findVideo, sendView]);

  return null;
}
