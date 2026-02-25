"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useTranslations } from "next-intl";
import { useUser } from "@/components/UserContext";
import { AD_SKIP_DELAY } from "@/lib/constants";
import { parseVast, firePixels, type VastAd } from "@/lib/vastParser";

interface VastPreRollProps {
  active: boolean;
  onComplete: () => void;
}

export default function VastPreRoll({ active, onComplete }: VastPreRollProps) {
  const t = useTranslations("ad");
  const { user } = useUser();
  const [adData, setAdData] = useState<VastAd | null>(null);
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState(AD_SKIP_DELAY);
  const [adPlaying, setAdPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval>>(undefined);
  const skipCalledRef = useRef(false);
  const countdownRef = useRef(AD_SKIP_DELAY);
  const firedRef = useRef<Set<string>>(new Set());
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  // Premium → skip
  useEffect(() => {
    if (active && user?.isPremium) onCompleteRef.current();
  }, [active, user?.isPremium]);

  // Ads disabled → skip
  useEffect(() => {
    if (!active) return;
    if (document.documentElement.dataset.adsEnabled !== "1") {
      onCompleteRef.current();
    }
  }, [active]);

  // Fetch VAST
  useEffect(() => {
    if (!active || user?.isPremium) return;
    if (typeof document !== "undefined" && document.documentElement.dataset.adsEnabled !== "1") return;

    skipCalledRef.current = false;
    countdownRef.current = AD_SKIP_DELAY;
    setCountdown(AD_SKIP_DELAY);
    setLoading(true);
    setAdData(null);
    setAdPlaying(false);
    firedRef.current.clear();

    let cancelled = false;

    // Timeout — if VAST takes > 4s, skip
    const timeout = setTimeout(() => {
      if (!cancelled && !skipCalledRef.current) {
        skipCalledRef.current = true;
        onCompleteRef.current();
      }
    }, 8000);

    parseVast("/api/vast").then(data => {
      clearTimeout(timeout);
      if (cancelled) return;
      if (!data) {
        if (!skipCalledRef.current) { skipCalledRef.current = true; onCompleteRef.current(); }
        return;
      }
      setAdData(data);
      setLoading(false);
    });

    return () => { cancelled = true; clearTimeout(timeout); };
  }, [active, user?.isPremium]);

  // Play video ad
  // Play video ad — with robust fallback if autoplay fails
  useEffect(() => {
    if (!adData || !active) return;
    const v = videoRef.current;
    if (!v) return;

    // Safety net: if ad doesn't start playing within 6 seconds, skip it
    const playbackGuard = setTimeout(() => {
      if (!skipCalledRef.current) {
        skipCalledRef.current = true;
        onCompleteRef.current();
      }
    }, 6000);

    const clearGuard = () => clearTimeout(playbackGuard);

    let playAttempted = false;
    const tryPlay = () => {
      if (playAttempted) return;
      playAttempted = true;
      // Always try muted first — browsers reliably allow muted autoplay
      v.muted = true;
      v.play().then(clearGuard).catch(() => {
        // Even muted play failed — skip ad entirely
        clearGuard();
        if (!skipCalledRef.current) { skipCalledRef.current = true; onCompleteRef.current(); }
      });
    };
    const onPlaying = () => {
      clearGuard();
      setAdPlaying(true);
      if (!firedRef.current.has("impression")) {
        firedRef.current.add("impression");
        firePixels(adData.impressionUrls);
        firePixels(adData.trackingEvents.start);
      }
    };
    const onEnded = () => {
      firePixels(adData.trackingEvents.complete);
      if (!skipCalledRef.current) { skipCalledRef.current = true; onCompleteRef.current(); }
    };
    const onError = () => {
      clearGuard();
      if (!skipCalledRef.current) { skipCalledRef.current = true; onCompleteRef.current(); }
    };
    const onTimeUpdate = () => {
      if (!v.duration) return;
      const pct = v.currentTime / v.duration;
      if (pct >= 0.25 && !firedRef.current.has("firstQuartile")) { firedRef.current.add("firstQuartile"); firePixels(adData.trackingEvents.firstQuartile); }
      if (pct >= 0.5 && !firedRef.current.has("midpoint")) { firedRef.current.add("midpoint"); firePixels(adData.trackingEvents.midpoint); }
      if (pct >= 0.75 && !firedRef.current.has("thirdQuartile")) { firedRef.current.add("thirdQuartile"); firePixels(adData.trackingEvents.thirdQuartile); }
    };

    v.addEventListener("canplay", tryPlay);
    v.addEventListener("loadeddata", tryPlay);
    v.addEventListener("playing", onPlaying);
    v.addEventListener("ended", onEnded);
    v.addEventListener("error", onError);
    v.addEventListener("timeupdate", onTimeUpdate);
    v.load();

    return () => {
      clearGuard();
      v.removeEventListener("canplay", tryPlay);
      v.removeEventListener("loadeddata", tryPlay);
      v.removeEventListener("playing", onPlaying);
      v.removeEventListener("ended", onEnded);
      v.removeEventListener("error", onError);
      v.removeEventListener("timeupdate", onTimeUpdate);
    };
  }, [adData, active]);

  // Countdown
  useEffect(() => {
    if (!active || !adPlaying || user?.isPremium) return;
    timerRef.current = setInterval(() => {
      if (document.hidden) return;
      countdownRef.current -= 1;
      setCountdown(countdownRef.current);
      if (countdownRef.current <= 0) clearInterval(timerRef.current);
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [active, adPlaying, user?.isPremium]);

  // Block keyboard during VAST ad
  useEffect(() => {
    if (!active || user?.isPremium) return;
    const block = (e: KeyboardEvent) => {
      if (e.key === "F12") return;
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === "I" || e.key === "i")) return;
      e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
    };
    window.addEventListener("keydown", block, { capture: true });
    window.addEventListener("keyup", block, { capture: true });
    return () => {
      window.removeEventListener("keydown", block, { capture: true } as EventListenerOptions);
      window.removeEventListener("keyup", block, { capture: true } as EventListenerOptions);
    };
  }, [active, user?.isPremium]);

  // Auto-skip after 60 seconds
  useEffect(() => {
    if (!active || !adPlaying || user?.isPremium) return;
    const t = setTimeout(() => {
      if (!skipCalledRef.current) { skipCalledRef.current = true; onCompleteRef.current(); }
    }, 60_000);
    return () => clearTimeout(t);
  }, [active, adPlaying, user?.isPremium]);

  const handleSkip = useCallback(() => {
    if (skipCalledRef.current || countdownRef.current > 0) return;
    skipCalledRef.current = true;
    firePixels(adData?.trackingEvents.skip);
    videoRef.current?.pause();
    onCompleteRef.current();
  }, [adData]);

  const handleClick = useCallback(() => {
    if (!adData?.clickUrl) return;
    firePixels(adData.trackingEvents.click);
    window.open(adData.clickUrl, "_blank", "noopener,noreferrer");
  }, [adData]);

  if (!active || user?.isPremium) return null;

  const canSkip = countdown <= 0;
  const circleR = 18;
  const circleC = 2 * Math.PI * circleR;

  return (
    <div
      className="absolute inset-0 z-50 flex flex-col items-center justify-center select-none bg-black"
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
      onDoubleClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
      onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
      onTouchStart={(e) => e.stopPropagation()}
      onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); }}
      style={{ touchAction: "none", userSelect: "none" }}
      data-ad-protected=""
    >
      {/* Top-left: "Feedim Ads" label */}
      <span className="absolute top-3 left-3 text-white/60 text-xs font-medium pointer-events-none tracking-wide z-10">
        Feedim Ads
      </span>

      {/* Loading spinner */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-8 h-8 rounded-full border-[3px] border-white/10 animate-spin" style={{ borderTopColor: "rgba(255,255,255,0.5)" }} />
        </div>
      )}

      {/* VAST Video Ad */}
      {adData && (
        <video
          ref={videoRef}
          src={adData.videoUrl}
          muted
          playsInline
          preload="auto"
          crossOrigin="anonymous"
          className="w-full h-full object-contain"
          onClick={(e) => { e.stopPropagation(); handleClick(); }}
          onContextMenu={(e) => e.preventDefault()}
          controlsList="nodownload noremoteplayback"
          style={{ pointerEvents: adData.clickUrl ? "auto" : "none", cursor: adData.clickUrl ? "pointer" : "default" }}
        />
      )}

      {/* Bottom-right: Countdown + skip button */}
      <div className="absolute bottom-4 right-4 flex items-center gap-3 z-[60]">
        {adPlaying && !canSkip && (
          <div className="flex items-center gap-2.5 bg-black/40 backdrop-blur-sm rounded-full pl-3 pr-3.5 py-1.5">
            <div className="relative w-9 h-9">
              <svg className="w-9 h-9 -rotate-90" viewBox="0 0 44 44">
                <circle cx="22" cy="22" r={circleR} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="2.5" />
                <circle cx="22" cy="22" r={circleR} fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeDasharray={circleC} strokeDashoffset={circleC * (countdown / AD_SKIP_DELAY)} style={{ transition: "stroke-dashoffset 1s linear" }} />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-white text-[0.7rem] font-bold tabular-nums">{countdown}</span>
            </div>
            <span className="text-white/50 text-[0.72rem] font-medium hidden sm:inline">{t("label")}</span>
          </div>
        )}
        {adPlaying && canSkip && (
          <button
            onClick={(e) => { e.stopPropagation(); handleSkip(); }}
            className="flex items-center gap-1.5 bg-black/60 hover:bg-black/70 active:bg-black/80 text-white rounded-full pl-4 pr-3 py-2.5 text-[0.82rem] font-semibold backdrop-blur-sm transition cursor-pointer border border-white/10"
          >
            {t("skipAd")}
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
