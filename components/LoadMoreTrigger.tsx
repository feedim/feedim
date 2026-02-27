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
  callbackRef.current = onLoadMore;
  const loadStartRef = useRef<number>(0);
  const [showSpinner, setShowSpinner] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // When loading starts, record timestamp and show spinner
  useEffect(() => {
    if (loading) {
      loadStartRef.current = Date.now();
      setShowSpinner(true);
      if (timerRef.current) clearTimeout(timerRef.current);
    }
  }, [loading]);

  // When loading ends, keep spinner visible for remaining minimum time
  useEffect(() => {
    if (!loading && showSpinner) {
      const elapsed = Date.now() - loadStartRef.current;
      const remaining = Math.max(0, minLoadingMs - elapsed);

      if (remaining === 0) {
        setShowSpinner(false);
      } else {
        timerRef.current = setTimeout(() => setShowSpinner(false), remaining);
      }
    }

    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
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
