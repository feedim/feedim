"use client";

import { useEffect, useRef } from "react";
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

  useEffect(() => {
    const ins = insRef.current;
    if (!ins) return;
    // Skip if this ins already has an ad loaded
    if (ins.getAttribute("data-adsbygoogle-status")) return;
    // Small delay to ensure DOM is ready and script is loaded
    const timer = setTimeout(() => {
      try {
        if (!ins.getAttribute("data-adsbygoogle-status")) {
          (window.adsbygoogle = window.adsbygoogle || []).push({});
        }
      } catch {}
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // Premium subscribers see no ads
  if (user?.isPremium) return null;

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
