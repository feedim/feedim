"use client";

import { useEffect, useRef, useCallback } from "react";

/**
 * Smart Read Tracker — YouTube-like
 *
 * - Tracks maximum scroll position (not just exit snapshot)
 * - Only counts "active" time (user scrolling, mouse moving, keys pressed)
 * - Idle detection: stops counting after 60s of no interaction
 * - Bot prevention: requires minimum interaction events before qualifying
 * - Sends beacon on exit with accurate read_percentage + read_duration
 * - Tab visibility: pauses when tab is hidden
 */
const MAX_SESSION = 1800; // 30 minutes max session cap

export default function PostViewTracker({ postId }: { postId: number }) {
  const sent = useRef(false);
  const activeTime = useRef(0);           // Seconds of active reading
  const maxScrollPct = useRef(0);         // Max scroll % reached
  const lastActivityTs = useRef(Date.now());
  const lastInteractionTs = useRef(0);    // Throttle: last interaction timestamp
  const isActive = useRef(true);          // Is user currently active?
  const isVisible = useRef(true);         // Is tab visible?
  const interactionCount = useRef(0);     // Bot gate: need ≥3 interactions
  const tickInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const contentEl = useRef<HTMLElement | null>(null);

  // Get scroll percentage relative to post content (not full page)
  const getScrollPct = useCallback(() => {
    const el = contentEl.current;
    if (!el) {
      // Fallback: full page scroll
      const scrollH = document.documentElement.scrollHeight - window.innerHeight;
      return scrollH > 0 ? Math.min(100, Math.round((window.scrollY / scrollH) * 100)) : 100;
    }
    const rect = el.getBoundingClientRect();
    const viewportH = window.innerHeight;
    const elTop = window.scrollY + rect.top;
    const elBottom = elTop + el.offsetHeight;
    const scrolledPast = window.scrollY + viewportH - elTop;
    const totalScrollable = elBottom - elTop;
    if (totalScrollable <= 0) return 100;
    return Math.min(100, Math.max(0, Math.round((scrolledPast / totalScrollable) * 100)));
  }, []);

  // Mark user as active (throttled: 2s between interaction increments)
  const markActive = useCallback(() => {
    const now = Date.now();
    lastActivityTs.current = now;
    if (!isActive.current) isActive.current = true;
    if (now - lastInteractionTs.current >= 2000) {
      interactionCount.current++;
      lastInteractionTs.current = now;
    }
  }, []);

  // Send the beacon
  const sendView = useCallback(() => {
    if (sent.current) return;
    sent.current = true;

    // Update scroll one last time
    const finalPct = Math.max(maxScrollPct.current, getScrollPct());

    // Bot gate: require at least 3 interactions and 5s of active time
    const isBotLikely = interactionCount.current < 3 || activeTime.current < 5;

    const blob = new Blob(
      [JSON.stringify({
        read_duration: Math.round(activeTime.current),
        read_percentage: finalPct,
        is_bot_likely: isBotLikely,
      })],
      { type: "application/json" }
    );
    navigator.sendBeacon(`/api/posts/${postId}/view`, blob);
  }, [postId, getScrollPct]);

  useEffect(() => {
    // Try to find the post content element
    contentEl.current =
      document.querySelector("[data-post-content]") ||
      document.querySelector("article") ||
      null;

    // Reset state
    sent.current = false;
    activeTime.current = 0;
    maxScrollPct.current = 0;
    lastActivityTs.current = Date.now();
    lastInteractionTs.current = 0;
    isActive.current = true;
    isVisible.current = true;
    interactionCount.current = 0;

    const IDLE_THRESHOLD = 60_000; // 60s idle → stop counting

    // Tick every second: accumulate active time
    tickInterval.current = setInterval(() => {
      if (!isVisible.current) return;

      // Max session cap: auto-send beacon after 30 minutes
      if (activeTime.current >= MAX_SESSION) {
        sendView();
        return;
      }

      const idleMs = Date.now() - lastActivityTs.current;
      if (idleMs > IDLE_THRESHOLD) {
        isActive.current = false;
        return;
      }

      if (isActive.current) {
        activeTime.current += 1;
      }
    }, 1000);

    // Scroll handler: update max scroll
    const handleScroll = () => {
      markActive();
      const pct = getScrollPct();
      if (pct > maxScrollPct.current) maxScrollPct.current = pct;
    };

    // Activity handlers
    const handleMouseMove = () => markActive();
    const handleKeyDown = () => markActive();
    const handleTouchStart = () => markActive();

    // Visibility handler
    const handleVisibility = () => {
      if (document.visibilityState === "hidden") {
        isVisible.current = false;
        sendView();
      } else {
        isVisible.current = true;
        // Resume — but don't reset sent if already sent
      }
    };

    const handleBeforeUnload = () => sendView();

    // Attach listeners
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    window.addEventListener("keydown", handleKeyDown, { passive: true });
    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("beforeunload", handleBeforeUnload);

    // Initial scroll check
    handleScroll();

    return () => {
      if (tickInterval.current) clearInterval(tickInterval.current);
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      sendView();
    };
  }, [postId, getScrollPct, markActive, sendView]);

  return null;
}
