"use client";

import { useEffect, useRef } from "react";
import { flushSync } from "react-dom";
import type { Dispatch, MutableRefObject, RefObject, SetStateAction } from "react";
import type { DisplayItem } from "@/components/moments/types";

interface UseMomentsAdCadenceOptions {
  delayMs: number;
  containerRef: RefObject<HTMLDivElement | null>;
  settledIndex: number;
  scrollIdleTick: number;
  displayItems: DisplayItem[];
  dismissedAdKeys: Set<number>;
  setDismissedAdKeys: Dispatch<SetStateAction<Set<number>>>;
  suppressIntersectionUntilRef: MutableRefObject<number>;
  setActiveDisplayIndex: Dispatch<SetStateAction<number>>;
  setSettledIndex: Dispatch<SetStateAction<number>>;
}

export function useMomentsAdCadence({
  delayMs,
  containerRef,
  settledIndex,
  scrollIdleTick,
  displayItems,
  dismissedAdKeys,
  setDismissedAdKeys,
  suppressIntersectionUntilRef,
  setActiveDisplayIndex,
  setSettledIndex,
}: UseMomentsAdCadenceOptions) {
  const dismissTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    clearTimeout(dismissTimeoutRef.current);
    const item = displayItems[settledIndex];
    if (!item || item.type === "ad") return;
    if (scrollIdleTick === 0) return;

    const adKeysToDismiss: number[] = [];
    for (let i = 0; i < settledIndex; i++) {
      const displayItem = displayItems[i];
      if (displayItem.type === "ad" && !displayItem.dismissed && !dismissedAdKeys.has(displayItem.adKey)) {
        adKeysToDismiss.push(displayItem.adKey);
      }
    }
    if (adKeysToDismiss.length === 0) return;

    dismissTimeoutRef.current = setTimeout(() => {
      const container = containerRef.current;
      const anchoredDisplayIndex = settledIndex;
      suppressIntersectionUntilRef.current = Date.now() + 320;

      flushSync(() => {
        setActiveDisplayIndex(anchoredDisplayIndex);
        setSettledIndex(anchoredDisplayIndex);
        setDismissedAdKeys((prev) => {
          const next = new Set(prev);
          adKeysToDismiss.forEach((key) => next.add(key));
          return next;
        });
      });

      if (!container) return;

      requestAnimationFrame(() => {
        const anchorElement = container.querySelector<HTMLElement>(`[data-index="${anchoredDisplayIndex}"]`);
        if (!anchorElement) return;
        container.scrollTop = anchorElement.offsetTop;
      });
    }, delayMs);

    return () => clearTimeout(dismissTimeoutRef.current);
  }, [
    containerRef,
    delayMs,
    dismissedAdKeys,
    displayItems,
    scrollIdleTick,
    setActiveDisplayIndex,
    setDismissedAdKeys,
    setSettledIndex,
    settledIndex,
    suppressIntersectionUntilRef,
  ]);

  const clearAdCadence = () => {
    clearTimeout(dismissTimeoutRef.current);
  };

  return {
    clearAdCadence,
  };
}
