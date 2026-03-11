"use client";

import { useEffect, useMemo, useRef } from "react";
import { useUser } from "@/components/UserContext";
import { getProviderForSlot, getAdSlotId, type AdSlot } from "@/lib/adProviders";
import { useHydrated } from "@/lib/useHydrated";

interface AdBannerProps {
  slot: AdSlot;
  className?: string;
}

interface GoogletagSlot {
  addService: (service: unknown) => void;
}

interface GoogletagApi {
  cmd?: { push: (callback: () => void) => void };
  apiReady?: boolean;
  defineSlot: (path: string, sizes: number[][], id: string) => GoogletagSlot | null;
  pubads: () => unknown;
  enableServices: () => void;
  display: (id: string) => void;
}

type IdleWindow = Window & {
  requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number;
  cancelIdleCallback?: (handle: number) => void;
};

declare global {
  interface Window {
    adsbygoogle: Record<string, unknown>[];
    googletag: GoogletagApi;
  }
}

export default function AdBanner({ slot, className = "" }: AdBannerProps) {
  const { user } = useUser();
  const hydrated = useHydrated();
  const insRef = useRef<HTMLModElement>(null);
  const divRef = useRef<HTMLDivElement>(null);

  const provider = getProviderForSlot(slot);
  const slotId = getAdSlotId(slot);
  const isLocalDev = useMemo(() => {
    if (!hydrated) return false;
    const host = window.location.hostname;
    return host === "localhost" || host === "127.0.0.1" || host === "[::1]";
  }, [hydrated]);
  const adsEnabled = useMemo(() => {
    if (!hydrated) return false;
    if (isLocalDev) return false;
    const ds = document.documentElement.dataset;
    const globalEnabled = ds.adsEnabled === "1";
    if (!globalEnabled) return false;
    if (slot === "feed" && ds.adsFeed !== "1") return false;
    if (slot === "moment" && ds.adsMoments !== "1") return false;
    if (slot === "overlay" && ds.adsVideo !== "1") return false;
    if ((slot === "post-bottom" || slot === "post-detail" || slot === "post-top") && ds.adsPostDetail !== "1") return false;
    return true;
  }, [hydrated, slot, isLocalDev]);

  // AdSense renderer — push ad when element is visible
  const pushedRef = useRef(false);
  useEffect(() => {
    pushedRef.current = false;
  }, [slot]);

  useEffect(() => {
    if (!adsEnabled || provider.id !== "adsense") return;
    const ins = insRef.current;
    if (!ins) return;
    if (ins.getAttribute("data-adsbygoogle-status")) return;
    if (pushedRef.current) return;

    const pushAd = () => {
      if (pushedRef.current) return;
      try {
        if (!ins.getAttribute("data-adsbygoogle-status")) {
          pushedRef.current = true;
          (window.adsbygoogle = window.adsbygoogle || []).push({});
        }
      } catch {}
    };

    // For moment slots inside snap-scroll containers, use a simpler approach:
    // observe with the nearest scrollable ancestor as root, or just push after a short delay
    const isMomentSlot = slot === "moment";

    if (isMomentSlot) {
      // Moments use snap-scroll — IntersectionObserver with viewport root may miss.
      // Use a scroll-ancestor-aware observer or push when component mounts (it's only
      // rendered when the ad slide is within a few slides of the active one).
      const scrollParent = ins.closest("[class*='snap-y']") as HTMLElement | null;
      const observer = new IntersectionObserver(
        (entries) => {
          if (entries[0]?.isIntersecting) {
            observer.disconnect();
            setTimeout(pushAd, 100);
          }
        },
        { root: scrollParent, rootMargin: "100%", threshold: 0.01 }
      );
      observer.observe(ins);
      // Fallback: push after 3s even if observer didn't fire
      const fallback = setTimeout(pushAd, 3000);
      return () => { observer.disconnect(); clearTimeout(fallback); };
    }

    const idleWindow = window as IdleWindow;
    const hasVideoPlayer = !!document.querySelector("video, .vp-bar");

    if (hasVideoPlayer) {
      const observer = new IntersectionObserver(
        (entries) => {
          if (entries[0]?.isIntersecting) {
            observer.disconnect();
            if (idleWindow.requestIdleCallback) {
              idleWindow.requestIdleCallback(pushAd, { timeout: 2000 });
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

    if (idleWindow.requestIdleCallback) {
      const id = idleWindow.requestIdleCallback(pushAd, { timeout: 2000 });
      return () => idleWindow.cancelIdleCallback?.(id);
    } else {
      const timer = setTimeout(pushAd, 200);
      return () => clearTimeout(timer);
    }
  }, [adsEnabled, provider.id, slot]);

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

  const debugAds = hydrated && (() => { try { return localStorage.getItem("feedim-debug-ads") === "1"; } catch { return false; } })();
  if (user && !debugAds && (user.role === "admin" || (user.premiumPlan && ['pro', 'max', 'business'].includes(user.premiumPlan)))) return null;

  // Show placeholder area even when ads are disabled/not loaded
  if (!adsEnabled || !provider.enabled) {
    return (
      <div
        className={`ad-container overflow-hidden ${className}`}
        data-ad-slot-name={slot}
        data-ad-placeholder="true"
      >
        <div style={{ minHeight: 50 }} />
      </div>
    );
  }

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
          data-ad-slot={slotId}
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
  const feedDebug = (() => { try { return localStorage.getItem("feedim-debug-ads") === "1"; } catch { return false; } })();

  if (user && !feedDebug && (user?.role === "admin" || (user?.premiumPlan && ['pro', 'max', 'business'].includes(user.premiumPlan)))) return null;

  const interval = 5;
  if ((index + 1) % interval !== 0) return null;

  return <AdBanner slot="feed" className="my-3 px-3" />;
}
