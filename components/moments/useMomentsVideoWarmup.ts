"use client";

import { useEffect } from "react";
import type { MutableRefObject } from "react";
import type { DisplayItem, Moment, MomentsPerfHints } from "@/components/moments/types";

interface UseMomentsVideoWarmupOptions {
  moments: Moment[];
  settledIndex: number;
  displayItems: DisplayItem[];
  perfHintsRef: MutableRefObject<MomentsPerfHints>;
}

export function useMomentsVideoWarmup({
  moments,
  settledIndex,
  displayItems,
  perfHintsRef,
}: UseMomentsVideoWarmupOptions) {
  useEffect(() => {
    const first = moments[0];
    if (!first?.video_url) return;

    let preconnect: HTMLLinkElement | null = null;
    let dnsPrefetch: HTMLLinkElement | null = null;

    try {
      const origin = new URL(first.video_url).origin;
      preconnect = document.createElement("link");
      preconnect.rel = "preconnect";
      preconnect.href = origin;
      preconnect.crossOrigin = "anonymous";
      dnsPrefetch = document.createElement("link");
      dnsPrefetch.rel = "dns-prefetch";
      dnsPrefetch.href = origin;
      document.head.appendChild(preconnect);
      document.head.appendChild(dnsPrefetch);
    } catch {}

    return () => {
      try {
        if (preconnect) document.head.removeChild(preconnect);
      } catch {}
      try {
        if (dnsPrefetch) document.head.removeChild(dnsPrefetch);
      } catch {}
    };
  }, [moments]);

  useEffect(() => {
    if (!perfHintsRef.current.allowVideoPrefetch) return;

    const links: HTMLLinkElement[] = [];
    for (let offset = 1; offset <= 2; offset++) {
      const index = settledIndex + offset;
      const item = displayItems[index];
      if (item?.type !== "moment" || !item.moment.video_url) continue;

      const link = document.createElement("link");
      link.rel = "prefetch";
      link.as = "video";
      link.href = item.moment.video_url;
      document.head.appendChild(link);
      links.push(link);
    }

    return () => {
      links.forEach((link) => {
        try {
          document.head.removeChild(link);
        } catch {}
      });
    };
  }, [displayItems, perfHintsRef, settledIndex]);
}
