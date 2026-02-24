"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useUser } from "@/components/UserContext";
import { AD_SKIP_DELAY } from "@/lib/constants";
import { getProviderForSlot, type AdProviderConfig } from "@/lib/adProviders";

interface AdOverlayProps {
  active: boolean;
  onSkip: () => void;
  mode: "overlay" | "fullscreen";
  className?: string;
}

declare global {
  interface Window {
    adsbygoogle: Record<string, unknown>[];
  }
}

export default function AdOverlay({ active, onSkip, mode, className = "" }: AdOverlayProps) {
  const { user } = useUser();
  const provider = getProviderForSlot("overlay");
  const [countdown, setCountdown] = useState(AD_SKIP_DELAY);
  const [adLoaded, setAdLoaded] = useState(false);
  const [adKey, setAdKey] = useState(0);
  const insRef = useRef<HTMLModElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval>>(undefined);
  const observerRef = useRef<MutationObserver | null>(null);
  const skipCalledRef = useRef(false);
  const countdownRef = useRef(AD_SKIP_DELAY);
  const pausedAtRef = useRef<number | null>(null); // timestamp when tab was hidden

  // Premium users: skip immediately (no overlay)
  useEffect(() => {
    if (!active) return;
    if (user?.isPremium) {
      onSkip();
    }
  }, [active, user?.isPremium, onSkip]);

  // Reset state on each activation
  useEffect(() => {
    if (!active) {
      setCountdown(AD_SKIP_DELAY);
      setAdLoaded(false);
      skipCalledRef.current = false;
      countdownRef.current = AD_SKIP_DELAY;
      pausedAtRef.current = null;
      if (timerRef.current) clearInterval(timerRef.current);
      if (observerRef.current) observerRef.current.disconnect();
      return;
    }

    setAdKey(prev => prev + 1);
    setCountdown(AD_SKIP_DELAY);
    setAdLoaded(false);
    skipCalledRef.current = false;
    countdownRef.current = AD_SKIP_DELAY;
    pausedAtRef.current = null;
  }, [active]);

  // Countdown timer — pauses when tab is hidden (prevents tab-switch bypass)
  useEffect(() => {
    if (!active || user?.isPremium) return;

    timerRef.current = setInterval(() => {
      // Don't count down while tab is hidden
      if (document.hidden) return;

      countdownRef.current -= 1;
      const val = countdownRef.current;
      setCountdown(val);
      if (val <= 0) {
        clearInterval(timerRef.current);
      }
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [active, adKey, user?.isPremium]);

  // Pause countdown when tab is hidden (visibilitychange)
  useEffect(() => {
    if (!active || user?.isPremium) return;

    const onVisChange = () => {
      if (document.hidden) {
        // Tab hidden — pause countdown
        pausedAtRef.current = Date.now();
      } else {
        // Tab visible again — countdown resumes on next interval tick
        pausedAtRef.current = null;
      }
    };

    document.addEventListener("visibilitychange", onVisChange);
    return () => document.removeEventListener("visibilitychange", onVisChange);
  }, [active, user?.isPremium]);

  // Block ALL keyboard events during ad (space, arrows, escape, etc.)
  useEffect(() => {
    if (!active || user?.isPremium) return;

    const blockKeys = (e: KeyboardEvent) => {
      // Allow browser devtools shortcuts (F12, Ctrl+Shift+I)
      if (e.key === "F12") return;
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === "I" || e.key === "i")) return;

      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
    };

    // Capture phase — intercepts before any other listener
    window.addEventListener("keydown", blockKeys, { capture: true });
    window.addEventListener("keyup", blockKeys, { capture: true });

    return () => {
      window.removeEventListener("keydown", blockKeys, { capture: true } as EventListenerOptions);
      window.removeEventListener("keyup", blockKeys, { capture: true } as EventListenerOptions);
    };
  }, [active, user?.isPremium]);

  // Prevent fullscreen exit (Escape) and PiP during ad
  useEffect(() => {
    if (!active || user?.isPremium) return;

    // If user somehow exits fullscreen during ad, re-enter
    const onFsChange = () => {
      if (!document.fullscreenElement) {
        // Try to re-enter fullscreen on the closest video container
        const container = document.querySelector("[data-ad-protected]") as HTMLElement;
        if (container) container.requestFullscreen?.().catch(() => {});
      }
    };

    // Block PiP — exit if entered during ad
    const onPiP = () => {
      if (document.pictureInPictureElement) {
        document.exitPictureInPicture().catch(() => {});
      }
    };

    document.addEventListener("fullscreenchange", onFsChange);
    document.addEventListener("enterpictureinpicture", onPiP, { capture: true });

    return () => {
      document.removeEventListener("fullscreenchange", onFsChange);
      document.removeEventListener("enterpictureinpicture", onPiP, { capture: true } as EventListenerOptions);
    };
  }, [active, user?.isPremium]);

  // Push ad based on active provider + MutationObserver
  useEffect(() => {
    if (!active || user?.isPremium) return;

    if (provider.id === "adsense") {
      const pushTimer = setTimeout(() => {
        const ins = insRef.current;
        if (!ins) return;

        try {
          (window.adsbygoogle = window.adsbygoogle || []).push({});
        } catch {}

        observerRef.current = new MutationObserver((mutations) => {
          for (const m of mutations) {
            if (m.attributeName === "data-ad-status") {
              const status = ins.getAttribute("data-ad-status");
              if (status === "filled") {
                setAdLoaded(true);
                observerRef.current?.disconnect();
              }
            }
          }
        });
        observerRef.current.observe(ins, { attributes: true });
      }, 100);

      return () => {
        clearTimeout(pushTimer);
        observerRef.current?.disconnect();
      };
    }

    // GAM / Custom — ad yüklenmiş kabul et (kendi entegrasyonlarında kontrol edilir)
    if (provider.id === "gam" || provider.id === "custom") {
      setAdLoaded(true);
    }
  }, [active, adKey, user?.isPremium, provider.id]);

  const handleSkip = useCallback(() => {
    if (skipCalledRef.current) return;
    if (countdownRef.current > 0) return; // extra guard — don't skip before countdown
    skipCalledRef.current = true;
    onSkip();
  }, [onSkip]);

  // Auto-skip after 60 seconds if user doesn't manually skip
  const autoSkipRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => {
    if (!active || user?.isPremium) return;
    if (countdown > 0) return; // wait until skip button appears

    autoSkipRef.current = setTimeout(() => {
      if (!skipCalledRef.current) {
        skipCalledRef.current = true;
        onSkip();
      }
    }, 60_000);

    return () => {
      if (autoSkipRef.current) clearTimeout(autoSkipRef.current);
    };
  }, [active, countdown <= 0, user?.isPremium, onSkip]);

  if (!active || user?.isPremium) return null;

  const canSkip = countdown <= 0;

  // SVG countdown circle
  const circleR = 18;
  const circleC = 2 * Math.PI * circleR;

  return (
    <div
      className={`ad-overlay-enter absolute inset-0 z-50 flex flex-col items-center justify-center select-none ${
        mode === "fullscreen" ? "bg-black" : "bg-black/90"
      } ${className}`}
      // Block all pointer events from reaching video
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
      onDoubleClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
      onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
      onTouchStart={(e) => { e.stopPropagation(); }}
      onTouchMove={(e) => { e.stopPropagation(); }}
      onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); }}
      onWheel={(e) => { e.stopPropagation(); }}
      style={{ touchAction: "none", userSelect: "none", WebkitUserSelect: "none" }}
      data-ad-protected=""
    >
      {/* Top-left: "Feedim Ads" label */}
      <span className="absolute top-3 left-3 text-white/60 text-xs font-medium pointer-events-none tracking-wide">
        Feedim Ads
      </span>

      {/* Center: Loader or ad */}
      <div className="flex-1 flex items-center justify-center w-full max-w-[400px] px-3 sm:px-4 overflow-hidden max-h-[60%]">
        {!adLoaded && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div
              className="w-8 h-8 rounded-full border-[3px] border-white/10 animate-spin"
              style={{ borderTopColor: "rgba(255,255,255,0.5)" }}
            />
          </div>
        )}
        <div className={`w-full transition-opacity duration-300 ${adLoaded ? "opacity-100" : "opacity-0"}`}>
          {provider.id === "adsense" && (
            <ins
              key={adKey}
              ref={insRef}
              className="adsbygoogle"
              style={{ display: "block", textAlign: "center" }}
              data-ad-client={provider.clientId}
              data-ad-format="auto"
              data-full-width-responsive="true"
            />
          )}
          {provider.id === "gam" && (
            <div key={adKey} ref={insRef as any} data-gam-overlay style={{ minHeight: 250, textAlign: "center" }} />
          )}
          {provider.id === "custom" && (
            <div key={adKey} ref={insRef as any} data-feedim-ad-slot="overlay" style={{ minHeight: 250, textAlign: "center" }} />
          )}
        </div>
      </div>

      {/* Bottom-right: Countdown circle + skip button */}
      <div className="absolute bottom-4 right-4 flex items-center gap-3 z-[60]">
        {!canSkip && (
          <div className="flex items-center gap-2.5 bg-black/40 backdrop-blur-sm rounded-full pl-3 pr-3.5 py-1.5">
            <div className="relative w-9 h-9">
              <svg className="w-9 h-9 -rotate-90" viewBox="0 0 44 44">
                <circle
                  cx="22" cy="22" r={circleR}
                  fill="none"
                  stroke="rgba(255,255,255,0.15)"
                  strokeWidth="2.5"
                />
                <circle
                  cx="22" cy="22" r={circleR}
                  fill="none"
                  stroke="white"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeDasharray={circleC}
                  strokeDashoffset={circleC * (countdown / AD_SKIP_DELAY)}
                  style={{ transition: "stroke-dashoffset 1s linear" }}
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-white text-[0.7rem] font-bold tabular-nums">
                {countdown}
              </span>
            </div>
            <span className="text-white/50 text-[0.72rem] font-medium hidden sm:inline">
              Reklam
            </span>
          </div>
        )}
        {canSkip && (
          <button
            onClick={handleSkip}
            className="flex items-center gap-1.5 bg-white/15 hover:bg-white/25 active:bg-white/30 text-white rounded-full pl-4 pr-3 py-2.5 text-[0.82rem] font-semibold backdrop-blur-sm transition cursor-pointer"
          >
            Reklamı Geç
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
