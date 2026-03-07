"use client";

import { useEffect, useRef, useState } from "react";

interface LoadMoreTriggerProps {
  onLoadMore: () => void;
  loading: boolean;
  hasMore: boolean;
  minLoadingMs?: number;
}

export default function LoadMoreTrigger({ onLoadMore, loading, hasMore, minLoadingMs = 1500 }: LoadMoreTriggerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const callbackRef = useRef(onLoadMore);
  const loadStartRef = useRef<number>(0);
  const holdPendingRef = useRef(false);
  const [showSpinner, setShowSpinner] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    callbackRef.current = onLoadMore;
  }, [onLoadMore]);

  // When loading starts, record timestamp and show spinner
  useEffect(() => {
    let frame = 0;
    if (loading) {
      loadStartRef.current = Date.now();
      holdPendingRef.current = true;
      if (timerRef.current) clearTimeout(timerRef.current);
      frame = requestAnimationFrame(() => setShowSpinner(false));
    }
    return () => {
      if (frame) cancelAnimationFrame(frame);
    };
  }, [loading]);

  // When loading ends, keep spinner visible for remaining minimum time
  useEffect(() => {
    let frame = 0;
    if (!loading && holdPendingRef.current && !showSpinner) {
      const elapsed = Date.now() - loadStartRef.current;
      const remaining = Math.max(0, minLoadingMs - elapsed);
      holdPendingRef.current = false;
      if (remaining > 0) {
        frame = requestAnimationFrame(() => setShowSpinner(true));
        timerRef.current = setTimeout(() => {
          loadStartRef.current = 0;
          setShowSpinner(false);
        }, remaining);
      } else {
        loadStartRef.current = 0;
      }
    }

    return () => {
      if (frame) cancelAnimationFrame(frame);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [loading, showSpinner, minLoadingMs]);

  // Intersection observer — only trigger when not loading and spinner is not showing
  useEffect(() => {
    if (!hasMore || loading || showSpinner) return;
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) callbackRef.current();
      },
      { rootMargin: "0px 0px 200px 0px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loading, showSpinner]);

  if (!hasMore) return null;

  return (
    <div ref={ref} className="flex justify-center py-4">
      {(loading || showSpinner) && <span className="loader" style={{ width: 20, height: 20 }} />}
    </div>
  );
}
