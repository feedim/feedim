"use client";

import { useEffect, useRef, useState } from "react";
import { useUser } from "@/components/UserContext";

type AdSlot = "feed" | "post-top" | "post-detail" | "post-bottom" | "explore" | "sidebar";

const AD_CLIENT = "ca-pub-1411343179923275";

interface AdBannerProps {
  slot: AdSlot;
  className?: string;
}

declare global {
  interface Window {
    adsbygoogle: Record<string, unknown>[];
  }
}

export default function AdBanner({ slot, className = "" }: AdBannerProps) {
  const { user } = useUser();
  const insRef = useRef<HTMLModElement>(null);
  const [adsEnabled, setAdsEnabled] = useState<boolean>(false);

  useEffect(() => {
    const enabled = document.documentElement.dataset.adsEnabled === "1";
    setAdsEnabled(enabled);
  }, []);

  useEffect(() => {
    if (!adsEnabled) return;
    const ins = insRef.current;
    if (!ins) return;
    if (ins.getAttribute("data-adsbygoogle-status")) return;

    const pushAd = () => {
      try {
        if (!ins.getAttribute("data-adsbygoogle-status")) {
          (window.adsbygoogle = window.adsbygoogle || []).push({});
        }
      } catch {}
    };

    // Defer ad loading when video player is on page (avoid video + adsense jank)
    const hasVideoPlayer = !!document.querySelector("video, .vp-bar, [data-moment-active]");

    if (hasVideoPlayer) {
      // Use IntersectionObserver — only load ad when slot enters viewport
      const observer = new IntersectionObserver(
        (entries) => {
          if (entries[0]?.isIntersecting) {
            observer.disconnect();
            if ("requestIdleCallback" in window) {
              (window as any).requestIdleCallback(pushAd, { timeout: 2000 });
            } else {
              setTimeout(pushAd, 200);
            }
          }
        },
        { rootMargin: "200px" }
      );
      observer.observe(ins);
      return () => observer.disconnect();
    }

    // Normal pages: use requestIdleCallback instead of setTimeout
    if ("requestIdleCallback" in window) {
      const id = (window as any).requestIdleCallback(pushAd, { timeout: 2000 });
      return () => (window as any).cancelIdleCallback(id);
    } else {
      const timer = setTimeout(pushAd, 200);
      return () => clearTimeout(timer);
    }
  }, [adsEnabled]);

  // Premium subscribers see no ads
  if (user?.isPremium || !adsEnabled) return null;

  return (
    <div
      className={`ad-container overflow-hidden ${className}`}
      data-ad-slot-name={slot}
    >
      <ins
        ref={insRef}
        className="adsbygoogle"
        style={{ display: "block", textAlign: "center" }}
        data-ad-client={AD_CLIENT}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
}

interface FeedAdProps {
  index: number;
}

export function FeedAdSlot({ index }: FeedAdProps) {
  const { user, isLoggedIn } = useUser();

  if (user?.isPremium) return null;

  const interval = isLoggedIn ? 5 : 3;
  if ((index + 1) % interval !== 0) return null;

  return <AdBanner slot="feed" className="my-3 px-3" />;
}
