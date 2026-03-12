"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { MutableRefObject, RefObject } from "react";

interface UseMomentsViewportOptions {
  containerRef: RefObject<HTMLDivElement | null>;
  suppressIntersectionUntilRef: MutableRefObject<number>;
}

export function useMomentsViewport({
  containerRef,
  suppressIntersectionUntilRef,
}: UseMomentsViewportOptions) {
  const [activeDisplayIndex, setActiveDisplayIndex] = useState(0);
  const [settledIndex, setSettledIndex] = useState(0);
  const [scrollIdleTick, setScrollIdleTick] = useState(0);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const pendingActiveRef = useRef<number | null>(null);
  const scrollSettledRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const scrollIdleTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const slotRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const slotRefCallbacks = useRef<Map<number, (element: HTMLDivElement | null) => void>>(new Map());

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (Date.now() < suppressIntersectionUntilRef.current) return;

        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;

          const index = Number(entry.target.getAttribute("data-index"));
          if (Number.isNaN(index)) return;

          setActiveDisplayIndex((prev) => (prev === index ? prev : index));
          pendingActiveRef.current = index;
          clearTimeout(scrollSettledRef.current);
          scrollSettledRef.current = setTimeout(() => {
            if (pendingActiveRef.current !== null) {
              setSettledIndex(pendingActiveRef.current);
              pendingActiveRef.current = null;
            }
          }, 80);
        });
      },
      { threshold: 0.45 },
    );

    return () => {
      observerRef.current?.disconnect();
      clearTimeout(scrollSettledRef.current);
      clearTimeout(scrollIdleTimeoutRef.current);
    };
  }, [suppressIntersectionUntilRef]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      clearTimeout(scrollIdleTimeoutRef.current);
      scrollIdleTimeoutRef.current = setTimeout(() => {
        setScrollIdleTick((prev) => prev + 1);
      }, 220);
    };

    handleScroll();
    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      clearTimeout(scrollIdleTimeoutRef.current);
      container.removeEventListener("scroll", handleScroll);
    };
  }, [containerRef]);

  const makeSlotRef = useCallback((index: number) => {
    let callback = slotRefCallbacks.current.get(index);
    if (!callback) {
      callback = (element: HTMLDivElement | null) => {
        const previous = slotRefs.current.get(index);
        if (previous && previous !== element) {
          observerRef.current?.unobserve(previous);
          slotRefs.current.delete(index);
        }
        if (element) {
          slotRefs.current.set(index, element);
          observerRef.current?.observe(element);
        }
      };
      slotRefCallbacks.current.set(index, callback);
    }
    return callback;
  }, []);

  const resetViewportTracking = useCallback(() => {
    clearTimeout(scrollSettledRef.current);
    clearTimeout(scrollIdleTimeoutRef.current);
    pendingActiveRef.current = null;
    setActiveDisplayIndex(0);
    setSettledIndex(0);
    setScrollIdleTick(0);
  }, []);

  return {
    activeDisplayIndex,
    setActiveDisplayIndex,
    settledIndex,
    setSettledIndex,
    scrollIdleTick,
    makeSlotRef,
    resetViewportTracking,
  };
}
