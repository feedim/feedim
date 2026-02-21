"use client";

import { useEffect, useRef } from "react";
import { useUser } from "@/components/UserContext";

type AdSlot = "feed" | "post-top" | "post-detail" | "post-bottom" | "explore" | "sidebar";

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
  const adRef = useRef<HTMLModElement>(null);
  const pushed = useRef(false);

  useEffect(() => {
    if (pushed.current) return;
    pushed.current = true;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {}
  }, []);

  // Premium subscribers see no ads
  if (user?.isPremium) return null;

  return (
    <div
      className={`ad-container overflow-hidden ${className}`}
      data-ad-slot={slot}
    >
      <ins
        ref={adRef}
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client="ca-pub-1411343179923275"
        data-ad-slot=""
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
}

interface FeedAdProps {
  index: number;
}

/**
 * Use between feed posts. Shows ads at different intervals:
 * - Guests: every 3rd post
 * - Free users: every 5th post
 * - Premium: never
 */
export function FeedAdSlot({ index }: FeedAdProps) {
  const { user, isLoggedIn } = useUser();

  if (user?.isPremium) return null;

  const interval = isLoggedIn ? 5 : 3;
  if ((index + 1) % interval !== 0) return null;

  return <AdBanner slot="feed" className="my-3 px-3" />;
}
