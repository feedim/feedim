"use client";

import { useEffect, useRef, useCallback } from "react";

/**
 * Feed-level View Tracker for video, moment, and note content types.
 *
 * These content types are consumable directly in the feed (Twitter-like):
 * - Note: read in feed, track visibility duration
 * - Moment: view in feed, track visibility duration
 * - Video: track video play time from PostCard's embedded player
 *
 * Post (gönderi) type is NOT tracked here — requires entering the detail page.
 *
 * Uses IntersectionObserver to detect when the PostCard enters viewport,
 * tracks active visibility time, and sends beacon on exit.
 */

interface FeedItemViewTrackerProps {
  postId: number;
  contentType: "video" | "moment" | "note";
  containerRef: React.RefObject<HTMLElement | null>;
}

const MIN_VISIBILITY_MS = 2000; // Minimum 2s visible to count

export default function FeedItemViewTracker({ postId, contentType, containerRef }: FeedItemViewTrackerProps) {
  const sent = useRef(false);
  const visibleTime = useRef(0);        // Seconds visible/playing
  const isVisible = useRef(false);
  const isTabVisible = useRef(true);
  const tickInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const maxScrollPct = useRef(0);
  const videoWatchTime = useRef(0);      // For video: actual play time
  const videoMaxProgress = useRef(0);
  const videoDuration = useRef(0);
  const videoCompleted = useRef(false);

  const sendView = useCallback(() => {
    if (sent.current) return;
    if (visibleTime.current < MIN_VISIBILITY_MS / 1000) return; // Too short
    sent.current = true;

    let readDuration = Math.round(visibleTime.current);
    let readPercentage = 0;
    let videoAnalytics = null;

    if (contentType === "video" || contentType === "moment") {
      // For video/moment: use video play time if available, else visibility time
      const actualWatchTime = videoWatchTime.current > 0 ? videoWatchTime.current : visibleTime.current;
      readDuration = Math.round(actualWatchTime);
      const dur = videoDuration.current;
      readPercentage = dur > 0 ? Math.min(100, Math.round((videoMaxProgress.current / dur) * 100)) : 0;

      if (videoWatchTime.current > 0) {
        videoAnalytics = {
          exit_time: Math.round(videoMaxProgress.current),
          video_duration: Math.round(dur),
          completed: videoCompleted.current,
          watch_percentage: readPercentage,
        };
      }
    } else {
      // Note: use visibility time, percentage = 100 (fully visible in feed)
      readPercentage = Math.min(100, maxScrollPct.current || 100);
    }

    const payload: Record<string, unknown> = {
      read_duration: readDuration,
      read_percentage: readPercentage,
      is_bot_likely: false,
      source: "feed", // Mark as feed-level view
    };
    if (videoAnalytics) payload.video_analytics = videoAnalytics;

    const blob = new Blob([JSON.stringify(payload)], { type: "application/json" });
    navigator.sendBeacon(`/api/posts/${postId}/view`, blob);
  }, [postId, contentType]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    sent.current = false;
    visibleTime.current = 0;
    isVisible.current = false;
    isTabVisible.current = true;
    videoWatchTime.current = 0;
    videoMaxProgress.current = 0;
    videoDuration.current = 0;
    videoCompleted.current = false;
    maxScrollPct.current = 0;

    // IntersectionObserver: detect when card is in viewport (50%+ visible)
    const observer = new IntersectionObserver(
      ([entry]) => {
        isVisible.current = entry.isIntersecting;
        if (!entry.isIntersecting && visibleTime.current >= MIN_VISIBILITY_MS / 1000) {
          sendView();
        }
      },
      { threshold: 0.5 }
    );
    observer.observe(el);

    // Tick every second: accumulate visible time
    tickInterval.current = setInterval(() => {
      if (!isVisible.current || !isTabVisible.current) return;
      visibleTime.current += 1;

      // For video: check if there's a playing video element inside the card
      if (contentType === "video" || contentType === "moment") {
        const video = el.querySelector("video") as HTMLVideoElement | null;
        if (video) {
          if (!video.paused && !video.ended) {
            videoWatchTime.current += 1;
          }
          if (video.currentTime > videoMaxProgress.current) {
            videoMaxProgress.current = video.currentTime;
          }
          if (video.duration && isFinite(video.duration)) {
            videoDuration.current = video.duration;
          }
          if (video.ended) {
            videoCompleted.current = true;
          }
        }
      }
    }, 1000);

    // Tab visibility
    const handleVisibility = () => {
      isTabVisible.current = document.visibilityState === "visible";
      if (document.visibilityState === "hidden") {
        sendView();
      }
    };

    const handleBeforeUnload = () => sendView();

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      observer.disconnect();
      if (tickInterval.current) clearInterval(tickInterval.current);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      sendView();
    };
  }, [postId, contentType, containerRef, sendView]);

  return null;
}
