"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useTranslations } from "next-intl";
import { RefreshCw, ChevronRight, Check, ShieldX } from "lucide-react";
import Modal from "@/components/modals/Modal";

interface PuzzleCaptchaProps {
  open: boolean;
  onClose: () => void;
  onVerify: (token: string) => void;
}

interface ChallengeData {
  challengeToken: string;
  bgImage: string;
  pieceImage: string;
  pieceY: number;
  canvasWidth: number;
  canvasHeight: number;
  pieceSize: number;
}

type Status = "loading" | "ready" | "dragging" | "verifying" | "success" | "fail" | "locked";

interface TrailPoint {
  x: number;
  t: number;
}

const HANDLE_SIZE = 40;
const TRACK_HEIGHT = 60;
const TRACK_PAD = 0;
const MIN_SUBMIT_SLIDE = 24; // Ignore micro-drags/clicks to prevent accidental failed attempts

export default function PuzzleCaptcha({ open, onClose, onVerify }: PuzzleCaptchaProps) {
  const t = useTranslations("captcha");
  const [status, setStatus] = useState<Status>("loading");
  const [challenge, setChallenge] = useState<ChallengeData | null>(null);
  const [sliderX, setSliderX] = useState(0);
  const [renderedWidth, setRenderedWidth] = useState(300);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [lockCountdown, setLockCountdown] = useState(0);

  const trailRef = useRef<TrailPoint[]>([]);
  const startTimeRef = useRef(0);
  const startXRef = useRef(0);
  const trackRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const expireTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reloadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lockTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const maxSlide = renderedWidth - HANDLE_SIZE - TRACK_PAD * 2;

  // Observe actual track width
  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setRenderedWidth(entry.contentRect.width);
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [challenge]);

  // Lock countdown
  useEffect(() => {
    if (lockCountdown <= 0) {
      if (lockTimerRef.current) {
        clearInterval(lockTimerRef.current);
        lockTimerRef.current = null;
      }
      return;
    }
    lockTimerRef.current = setInterval(() => {
      setLockCountdown((prev) => {
        if (prev <= 1) {
          setStatus("loading");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (lockTimerRef.current) clearInterval(lockTimerRef.current);
    };
  }, [lockCountdown]);

  // When lock expires, auto-reload challenge
  useEffect(() => {
    if (lockCountdown === 0 && status === "loading" && open) {
      loadChallenge();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lockCountdown, status, open]);

  const startLockout = useCallback((retryAfter: number) => {
    setStatus("locked");
    setLockCountdown(retryAfter);
    setChallenge(null);
    setSliderX(0);
    if (expireTimerRef.current) {
      clearTimeout(expireTimerRef.current);
      expireTimerRef.current = null;
    }
  }, []);

  const loadChallenge = useCallback(async () => {
    // Don't reload during active interaction
    if (isDraggingRef.current) return;

    setStatus("loading");
    setSliderX(0);
    setAccuracy(null);
    trailRef.current = [];

    if (expireTimerRef.current) {
      clearTimeout(expireTimerRef.current);
      expireTimerRef.current = null;
    }
    if (reloadTimerRef.current) {
      clearTimeout(reloadTimerRef.current);
      reloadTimerRef.current = null;
    }

    try {
      const [res] = await Promise.all([
        fetch("/api/captcha/puzzle"),
        new Promise((r) => setTimeout(r, 500)),
      ]);

      if (res.status === 429) {
        const data = await res.json();
        startLockout(data.retryAfter || 600);
        return;
      }

      if (!res.ok) throw new Error("fetch_failed");
      const data: ChallengeData = await res.json();
      setChallenge(data);
      setStatus("ready");

      expireTimerRef.current = setTimeout(() => {
        setStatus("fail");
      }, 120_000);
    } catch {
      setStatus("fail");
    }
  }, [startLockout]);

  useEffect(() => {
    if (open) {
      loadChallenge();
    } else {
      setStatus("loading");
      setChallenge(null);
      setSliderX(0);
      setLockCountdown(0);
      if (expireTimerRef.current) {
        clearTimeout(expireTimerRef.current);
        expireTimerRef.current = null;
      }
      if (reloadTimerRef.current) {
        clearTimeout(reloadTimerRef.current);
        reloadTimerRef.current = null;
      }
    }
    return () => {
      if (expireTimerRef.current) clearTimeout(expireTimerRef.current);
      if (reloadTimerRef.current) clearTimeout(reloadTimerRef.current);
    };
  }, [open, loadChallenge]);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (status !== "ready") return;
      e.preventDefault();
      e.stopPropagation();

      // Cancel any pending reload so the challenge stays stable during drag
      if (reloadTimerRef.current) {
        clearTimeout(reloadTimerRef.current);
        reloadTimerRef.current = null;
      }

      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      isDraggingRef.current = true;
      startTimeRef.current = Date.now();
      trailRef.current = [];
      startXRef.current = e.clientX - sliderX;
      setStatus("dragging");
    },
    [status, sliderX]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDraggingRef.current) return;
      e.preventDefault();
      e.stopPropagation();
      let newX = e.clientX - startXRef.current;
      newX = Math.max(0, Math.min(newX, maxSlide));
      setSliderX(newX);
      trailRef.current.push({ x: newX, t: Date.now() - startTimeRef.current });
    },
    [maxSlide]
  );

  const submitVerification = useCallback(async () => {
    if (!challenge) return;
    const duration = Date.now() - startTimeRef.current;
    const canvasRange = challenge.canvasWidth - challenge.pieceSize;
    const puzzleX = maxSlide > 0 ? (sliderX / maxSlide) * canvasRange : 0;
    setStatus("verifying");

    try {
      const res = await fetch("/api/captcha/puzzle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          challengeToken: challenge.challengeToken,
          userX: puzzleX,
          trail: trailRef.current,
          duration,
        }),
      });

      const data = await res.json();

      if (res.status === 429 || data.error === "rate_limited") {
        startLockout(data.retryAfter || 600);
        return;
      }

      if (data.success && data.token) {
        setAccuracy(data.accuracy ?? 100);
        setStatus("success");
        if (expireTimerRef.current) {
          clearTimeout(expireTimerRef.current);
          expireTimerRef.current = null;
        }
        setTimeout(() => {
          onVerify(data.token);
          onClose();
        }, 1200);
      } else {
        setStatus("fail");
        reloadTimerRef.current = setTimeout(() => { loadChallenge(); }, 800);
      }
    } catch {
      setStatus("fail");
      reloadTimerRef.current = setTimeout(() => { loadChallenge(); }, 800);
    }
  }, [challenge, sliderX, maxSlide, onVerify, onClose, loadChallenge, startLockout]);

  const handlePointerUp = useCallback(
    async (e: React.PointerEvent) => {
      if (!isDraggingRef.current) return;
      e.stopPropagation();
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      isDraggingRef.current = false;

      if (sliderX < MIN_SUBMIT_SLIDE) {
        trailRef.current = [];
        setSliderX(0);
        setStatus("ready");
        return;
      }

      await submitVerification();
    },
    [sliderX, submitVerification]
  );

  // Keyboard navigation for accessibility
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (status !== "ready" && status !== "dragging") return;
      const step = e.shiftKey ? 1 : 5; // Shift for fine control

      if (e.key === "ArrowRight" || e.key === "ArrowUp") {
        e.preventDefault();
        if (status === "ready") {
          startTimeRef.current = Date.now();
          trailRef.current = [];
          setStatus("dragging");
        }
        setSliderX((prev) => {
          const next = Math.min(prev + step, maxSlide);
          trailRef.current.push({ x: next, t: Date.now() - startTimeRef.current });
          return next;
        });
      } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
        e.preventDefault();
        if (status === "ready") {
          startTimeRef.current = Date.now();
          trailRef.current = [];
          setStatus("dragging");
        }
        setSliderX((prev) => {
          const next = Math.max(prev - step, 0);
          trailRef.current.push({ x: next, t: Date.now() - startTimeRef.current });
          return next;
        });
      } else if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        if (status === "dragging" && sliderX >= MIN_SUBMIT_SLIDE) {
          submitVerification();
        } else if (status === "dragging") {
          trailRef.current = [];
          setSliderX(0);
          setStatus("ready");
        }
      }
    },
    [status, maxSlide, sliderX, submitVerification]
  );

  // ─── Derived positions ──────────────────────────────────────────
  const canvasRange = challenge ? challenge.canvasWidth - challenge.pieceSize : 1;
  const fraction = maxSlide > 0 ? sliderX / maxSlide : 0;
  const pieceCanvasX = fraction * canvasRange;
  const pieceLeftPct = (pieceCanvasX / (challenge?.canvasWidth || 300)) * 100;

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t("slideToVerify")}
      size="sm"
      centerOnMobile
      centerOnDesktop
      rightAction={
        status !== "locked" ? (
          <button
            type="button"
            onClick={loadChallenge}
            className="i-btn !w-10 !h-10 text-text-muted hover:text-text-primary"
            aria-label={t("retry")}
          >
            <RefreshCw className="h-[18px] w-[18px]" />
          </button>
        ) : undefined
      }
    >
      <div className="px-4 pb-5 pt-1">
        {/* Canvas */}
        <div
          className="relative w-full overflow-hidden bg-bg-tertiary border border-border-primary"
          style={{ aspectRatio: "300 / 175", borderRadius: "var(--radius-md)" }}
        >
          {status === "loading" ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="loader" />
            </div>
          ) : status === "locked" ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-6">
              <ShieldX className="w-9 h-9" style={{ color: "var(--error-color, #ea4335)" }} />
              <span
                className="text-sm font-semibold text-center"
                style={{ color: "var(--error-color, #ea4335)" }}
              >
                {t("locked")}
              </span>
              <span className="text-xs text-text-muted">
                {t("lockedCountdown", { time: formatTime(lockCountdown) })}
              </span>
            </div>
          ) : status === "success" ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ background: "var(--accent-color)" }}
              >
                <Check className="w-5 h-5 text-white" />
              </div>
              <span className="text-sm font-semibold" style={{ color: "var(--accent-color)" }}>
                {t("success")}
              </span>
              {accuracy !== null && (
                <span className="text-xs text-text-muted">
                  {t("accuracy", { percent: accuracy })}
                </span>
              )}
            </div>
          ) : challenge ? (
            <>
              <img
                src={challenge.bgImage}
                alt=""
                className="block w-full h-full"
                draggable={false}
              />
              <img
                src={challenge.pieceImage}
                alt=""
                className="absolute block"
                style={{
                  left: `${pieceLeftPct}%`,
                  top: `${(challenge.pieceY / challenge.canvasHeight) * 100}%`,
                  width: `${(challenge.pieceSize / challenge.canvasWidth) * 100}%`,
                  height: `${(challenge.pieceSize / challenge.canvasHeight) * 100}%`,
                  filter:
                    status === "verifying"
                      ? "brightness(1.1)"
                      : status === "fail"
                        ? "brightness(0.5) saturate(0.3)"
                        : "drop-shadow(0 2px 4px rgba(0,0,0,0.4))",
                  transition: status === "dragging" ? "none" : "filter 0.3s ease",
                }}
                draggable={false}
              />
            </>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-text-muted text-sm">
              <span>{t("error")}</span>
              <button
                type="button"
                onClick={loadChallenge}
                className="text-sm font-semibold hover:opacity-80 transition-opacity"
                style={{ color: "var(--accent-color)" }}
              >
                {t("retry")}
              </button>
            </div>
          )}
        </div>

        {/* Slider track */}
        {status !== "success" && status !== "locked" && (
          <div
            ref={trackRef}
            className="relative mt-4"
            style={{ height: `${TRACK_HEIGHT}px` }}
            // Üst modal'ın drag handler'ının slider'ı engellemesini önle
            onTouchStart={(e) => e.stopPropagation()}
            onTouchMove={(e) => e.stopPropagation()}
            onTouchEnd={(e) => e.stopPropagation()}
          >
            {/* Rail */}
            <div
              className="absolute left-0 right-0 bg-bg-tertiary border border-border-primary z-0"
              style={{
                top: "50%",
                transform: "translateY(-50%)",
                height: "34px",
                borderRadius: "var(--radius-full)",
              }}
            />

            {/* Fill (progress) */}
            <div
              className="absolute transition-colors duration-200 z-[1]"
              style={{
                top: "50%",
                transform: "translateY(-50%)",
                left: 0,
                width: `${sliderX > 0 ? sliderX + TRACK_PAD + HANDLE_SIZE / 2 : 0}px`,
                height: "34px",
                borderRadius: "var(--radius-full)",
                background: status === "fail"
                  ? "var(--error-color, #ea4335)"
                  : "var(--accent-color)",
                opacity: 0.35,
              }}
            />

            {/* Label */}
            {sliderX === 0 && status !== "verifying" && status !== "fail" && (
              <span
                className="absolute inset-0 z-[2] flex items-center justify-center text-text-muted pointer-events-none select-none text-[0.78rem] font-semibold tracking-wide"
                style={{ paddingLeft: `${HANDLE_SIZE / 2}px` }}
              >
                {t("slideToVerify")}
              </span>
            )}

            {status === "verifying" && (
              <span className="absolute inset-0 z-[2] flex items-center justify-center text-text-muted pointer-events-none text-[0.78rem]">
                {t("verifying")}
              </span>
            )}

            {status === "fail" && (
              <span
                className="absolute inset-0 z-[2] flex items-center justify-center pointer-events-none text-[0.78rem] font-medium"
                style={{ color: "var(--error-color, #ea4335)" }}
              >
                {t("fail")}
              </span>
            )}

            {/* Handle */}
            <div
              className="absolute z-10 flex items-center justify-center cursor-grab active:cursor-grabbing touch-none"
              style={{
                width: `${HANDLE_SIZE}px`,
                height: `${HANDLE_SIZE}px`,
                borderRadius: "var(--radius-full)",
                top: "50%",
                transform: "translateY(-50%)",
                left: `${sliderX + TRACK_PAD}px`,
                transition: status === "dragging" ? "none" : "left 0.3s ease",
                background: status === "fail"
                  ? "var(--error-color, #ea4335)"
                  : "var(--accent-color)",
                opacity: status === "verifying" ? 0.7 : 1,
              }}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onKeyDown={handleKeyDown}
              role="slider"
              aria-label={t("slideToVerify")}
              aria-valuemin={0}
              aria-valuemax={maxSlide}
              aria-valuenow={sliderX}
              tabIndex={0}
            >
              {status === "verifying" ? (
                <span className="loader !w-4 !h-4 !border-2" style={{ borderColor: "transparent", borderTopColor: "white" }} />
              ) : (
                <ChevronRight className="w-5 h-5 text-white" />
              )}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
