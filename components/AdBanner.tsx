"use client";

import { useEffect, useRef, useState } from "react";
import { useUser } from "@/components/UserContext";
import { getProviderForSlot, type AdSlot } from "@/lib/adProviders";

interface AdBannerProps {
  slot: AdSlot;
  className?: string;
}

declare global {
  interface Window {
    adsbygoogle: Record<string, unknown>[];
    googletag: any;
  }
}

export default function AdBanner({ slot, className = "" }: AdBannerProps) {
  const { user } = useUser();
  const insRef = useRef<HTMLModElement>(null);
  const divRef = useRef<HTMLDivElement>(null);
  const [adsEnabled, setAdsEnabled] = useState<boolean>(false);

  const provider = getProviderForSlot(slot);

  useEffect(() => {
    const enabled = document.documentElement.dataset.adsEnabled === "1";
    setAdsEnabled(enabled);
  }, []);

  // AdSense renderer
  useEffect(() => {
    if (!adsEnabled || provider.id !== "adsense") return;
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

    const hasVideoPlayer = !!document.querySelector("video, .vp-bar, [data-moment-active]");

    if (hasVideoPlayer) {
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

    if ("requestIdleCallback" in window) {
      const id = (window as any).requestIdleCallback(pushAd, { timeout: 2000 });
      return () => (window as any).cancelIdleCallback(id);
    } else {
      const timer = setTimeout(pushAd, 200);
      return () => clearTimeout(timer);
    }
  }, [adsEnabled, provider.id]);

  // Google Ad Manager (GPT) renderer
  useEffect(() => {
    if (!adsEnabled || provider.id !== "gam") return;
    const div = divRef.current;
    if (!div) return;

    const slotId = `feedim-gam-${slot}-${Date.now()}`;
    div.id = slotId;

    const tryDefine = () => {
      if (!window.googletag?.cmd) return;
      window.googletag.cmd.push(() => {
        // GAM slot tanımı — gerçek slot ID'lerinizi SLOT_PROVIDER veya ayrı bir config'den alabilirsiniz
        const gamSlot = window.googletag.defineSlot(
          `/feedim/${slot}`,
          [[300, 250], [728, 90], [320, 50]],
          slotId
        );
        if (gamSlot) {
          gamSlot.addService(window.googletag.pubads());
          window.googletag.enableServices();
          window.googletag.display(slotId);
        }
      });
    };

    if (window.googletag?.apiReady) {
      tryDefine();
    } else {
      const check = setInterval(() => {
        if (window.googletag?.apiReady) {
          clearInterval(check);
          tryDefine();
        }
      }, 200);
      const timeout = setTimeout(() => clearInterval(check), 10_000);
      return () => { clearInterval(check); clearTimeout(timeout); };
    }
  }, [adsEnabled, provider.id, slot]);

  if (user?.isPremium || !adsEnabled || !provider.enabled) return null;

  return (
    <div
      className={`ad-container overflow-hidden ${className}`}
      data-ad-slot-name={slot}
      data-ad-provider={provider.id}
    >
      {provider.id === "adsense" && (
        <ins
          ref={insRef}
          className="adsbygoogle"
          style={{ display: "block", textAlign: "center" }}
          data-ad-client={provider.clientId}
          data-ad-format="auto"
          data-full-width-responsive="true"
        />
      )}
      {provider.id === "gam" && (
        <div ref={divRef} style={{ minHeight: 50, textAlign: "center" }} />
      )}
      {provider.id === "custom" && (
        <div ref={divRef} data-feedim-ad-slot={slot} style={{ minHeight: 50 }} />
      )}
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
