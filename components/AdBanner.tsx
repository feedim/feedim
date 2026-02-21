"use client";

import { useEffect, useRef } from "react";
import { useUser } from "@/components/UserContext";

type AdSlot = "feed" | "post-top" | "post-detail" | "post-bottom" | "explore" | "sidebar";

// Ad slot IDs from AdSense panel — fill these after creating ad units
const SLOT_IDS: Partial<Record<AdSlot, string>> = {
  // "feed": "1234567890",
  // "post-top": "1234567891",
  // "post-detail": "1234567892",
  // "post-bottom": "1234567893",
  // "explore": "1234567894",
  // "sidebar": "1234567895",
};

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
  const pushed = useRef(false);

  const slotId = SLOT_IDS[slot];

  useEffect(() => {
    // Only push if we have a real slot ID and haven't pushed yet
    if (!slotId || pushed.current) return;
    const ins = insRef.current;
    if (!ins || ins.getAttribute("data-adsbygoogle-status")) return;
    pushed.current = true;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {}
  }, [slotId]);

  // Premium subscribers see no ads
  if (user?.isPremium) return null;

  // No slot ID configured → Auto Ads handles placement, skip manual ins
  if (!slotId) return null;

  return (
    <div
      className={`ad-container overflow-hidden ${className}`}
      data-ad-slot={slot}
    >
      <ins
        ref={insRef}
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client={AD_CLIENT}
        data-ad-slot={slotId}
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
