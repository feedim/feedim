"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { ChevronRight } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Step definitions                                                   */
/* ------------------------------------------------------------------ */

interface TourStep {
  target: string | null;
  targetMobile: string | null;
  iframeSelector?: string;
  title: string;
  description: string;
  optional?: boolean;
  /** Display order: [desktop, mobile] — lower = earlier */
  order: [number, number];
}

const STEPS: TourStep[] = [
  {
    target: null,
    targetMobile: null,
    iframeSelector:
      '[data-editable]:not([data-type="image"]):not([data-type="background-image"]):not([data-type="color"]):not([data-type="list"])',
    title: "Metni Düzenle",
    description:
      "Herhangi bir metne dokunarak düzenle. Açılan pencereden yaz ve kaydet.",
    order: [0, 0],
  },
  {
    target: null,
    targetMobile: null,
    iframeSelector:
      '[data-editable][data-type="image"], [data-editable][data-type="background-image"]',
    title: "Görseli Değiştir",
    description:
      "Bir görsele dokunarak değiştir. Galerinden veya kamerandan yeni bir fotoğraf yükle.",
    optional: true,
    order: [1, 1],
  },
  {
    target: "undo-redo",
    targetMobile: "undo-redo-mobile",
    title: "Geri Al / Yinele",
    description:
      "Yaptığın değişiklikleri geri alabilir veya tekrar uygulayabilirsin.",
    order: [2, 2],
  },
  {
    target: "ai-fill",
    targetMobile: "ai-fill-mobile",
    title: "AI ile Doldur",
    description:
      "Tek cümleyle tüm alanları yapay zeka ile otomatik doldur.",
    order: [3, 3],
  },
  {
    // Desktop: AI → Bölümler → Müzik  |  Mobile: AI → Müzik → Bölümler
    target: "sections",
    targetMobile: "sections-mobile",
    title: "Bölümler",
    description:
      "İstemediğin bölümleri gizleyerek sayfanı özelleştir.",
    optional: true,
    order: [4, 6],
  },
  {
    target: "music",
    targetMobile: "music-mobile",
    title: "Müzik Ekle",
    description: "Sayfana arka plan müziği ekle.",
    order: [5, 5],
  },
  {
    target: "preview-btn",
    targetMobile: "preview-btn-mobile",
    title: "Önizleme",
    description: "Sayfanın son halini tam ekran görüntüle.",
    order: [7, 7],
  },
  {
    target: "publish",
    targetMobile: "publish-mobile",
    title: "Yayınla",
    description: "Sayfanı yayınla ve sevdiklerinle paylaş!",
    order: [8, 8],
  },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/** Clamp a DOMRect so it stays within the visible viewport */
function clampRect(r: DOMRect, vw: number, vh: number): DOMRect {
  const left = Math.max(0, r.left);
  const top = Math.max(0, r.top);
  const right = Math.min(vw, r.right);
  const bottom = Math.min(vh, r.bottom);
  return new DOMRect(left, top, Math.max(0, right - left), Math.max(0, bottom - top));
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

interface EditorTourProps {
  onComplete: () => void;
}

export default function EditorTour({ onComplete }: EditorTourProps) {
  const [activeSteps, setActiveSteps] = useState<TourStep[]>([]);
  const [current, setCurrent] = useState(0);
  const [rawRect, setRawRect] = useState<DOMRect | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  /* ---- filter optional steps + sort by platform order ---- */
  useEffect(() => {
    const mobile = window.innerWidth < 768;
    const available = STEPS.filter((s) => {
      if (!s.optional) return true;
      if (s.iframeSelector) {
        const iframe = document.querySelector("iframe") as HTMLIFrameElement | null;
        try { return !!iframe?.contentDocument?.querySelector(s.iframeSelector); }
        catch { return false; }
      }
      const attr = mobile ? s.targetMobile : s.target;
      return attr ? !!document.querySelector(`[data-tour="${attr}"]`) : false;
    });
    // Sort by platform-specific order
    available.sort((a, b) => {
      const orderIdx = mobile ? 1 : 0;
      return a.order[orderIdx] - b.order[orderIdx];
    });
    setActiveSteps(available);
  }, []);

  const step = activeSteps[current];
  const totalSteps = activeSteps.length;

  /* ---- measurement ---- */

  const getIframe = useCallback(
    () => document.querySelector("iframe") as HTMLIFrameElement | null,
    []
  );

  const measureStep = useCallback(
    (s: TourStep): DOMRect | null => {
      if (s.iframeSelector) {
        const iframe = getIframe();
        if (!iframe) return null;
        try {
          const iDoc = iframe.contentDocument;
          if (!iDoc) return null;
          const el = iDoc.querySelector(s.iframeSelector) as HTMLElement | null;
          if (!el) return null;
          const iRect = iframe.getBoundingClientRect();
          const eRect = el.getBoundingClientRect();
          return new DOMRect(
            iRect.left + eRect.left,
            iRect.top + eRect.top,
            eRect.width,
            eRect.height
          );
        } catch { return null; }
      }
      const attr = isMobile ? s.targetMobile : s.target;
      if (!attr) return null;
      const el = document.querySelector(`[data-tour="${attr}"]`) as HTMLElement | null;
      return el ? el.getBoundingClientRect() : null;
    },
    [isMobile, getIframe]
  );

  const measure = useCallback(() => {
    if (!step) return;
    setRawRect(measureStep(step));
  }, [step, measureStep]);

  const scrollTargetIntoView = useCallback(
    (s: TourStep) => {
      if (s.iframeSelector) {
        const iframe = getIframe();
        try {
          const el = iframe?.contentDocument?.querySelector(s.iframeSelector) as HTMLElement | null;
          el?.scrollIntoView({ behavior: "smooth", block: "center" });
        } catch {}
        return;
      }
      const attr = isMobile ? s.targetMobile : s.target;
      if (!attr) return;
      const el = document.querySelector(`[data-tour="${attr}"]`) as HTMLElement | null;
      el?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    },
    [isMobile, getIframe]
  );

  /* ---- effects ---- */

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    if (!step) return;
    scrollTargetIntoView(step);
    measure();
    const t1 = setTimeout(measure, 300);
    const t2 = setTimeout(measure, 600);
    const t3 = setTimeout(measure, 900);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [step, scrollTargetIntoView, measure]);

  useEffect(() => {
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    const iframe = getIframe();
    let iDoc: Document | null = null;
    try { iDoc = iframe?.contentDocument ?? null; } catch {}
    iDoc?.addEventListener("scroll", measure, true);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
      iDoc?.removeEventListener("scroll", measure, true);
    };
  }, [measure, getIframe]);

  /* ---- actions ---- */

  const next = () => {
    if (current < totalSteps - 1) setCurrent((c) => c + 1);
    else onComplete();
  };
  const skip = () => onComplete();

  /* ---- render ---- */

  if (!step || totalSteps === 0) return null;

  const PAD = 8;
  const vw = typeof window !== "undefined" ? window.innerWidth : 400;
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;
  const ACCENT = "lab(49.5493% 79.8381 2.31768)";

  // Clamp rect to viewport — prevents spotlight & tooltip from going off-screen
  const rect = rawRect ? clampRect(rawRect, vw, vh) : null;

  // Clip-path
  const clipPath = rect
    ? (() => {
        const x = Math.max(0, rect.left - PAD);
        const y = Math.max(0, rect.top - PAD);
        const x2 = Math.min(vw, rect.right + PAD);
        const y2 = Math.min(vh, rect.bottom + PAD);
        return `polygon(0% 0%, 0% 100%, ${x}px 100%, ${x}px ${y}px, ${x2}px ${y}px, ${x2}px ${y2}px, ${x}px ${y2}px, ${x}px 100%, 100% 100%, 100% 0%)`;
      })()
    : undefined;

  // ---- Tooltip positioning ----
  const tooltipW = isMobile ? Math.min(vw - 24, 280) : 300;
  const GAP = 12;
  const EST_H = 148;
  const EDGE = 12; // minimum distance from viewport edge

  const tooltipStyle: React.CSSProperties = { width: tooltipW };

  if (rect && rect.width > 0 && rect.height > 0) {
    // Horizontal: center on the visible portion of the target, clamp to viewport
    let left = rect.left + rect.width / 2 - tooltipW / 2;
    left = Math.max(EDGE, Math.min(left, vw - tooltipW - EDGE));
    tooltipStyle.left = left;

    // Vertical: try below → try above → fallback overlay on target center
    const anchorBottom = rect.bottom + PAD + GAP;
    const anchorTop = rect.top - PAD - GAP - EST_H;
    const spaceBelow = vh - anchorBottom;
    const spaceAbove = rect.top - PAD - GAP;

    if (spaceBelow >= EST_H) {
      // Fits below
      tooltipStyle.top = anchorBottom;
    } else if (spaceAbove >= EST_H) {
      // Fits above
      tooltipStyle.top = anchorTop;
    } else {
      // Neither fits — place overlapping the target, vertically centered in viewport
      const centerY = Math.max(EDGE, Math.min(vh / 2 - EST_H / 2, vh - EST_H - EDGE));
      tooltipStyle.top = centerY;
    }

    // Final safety clamp: never exceed viewport
    if (typeof tooltipStyle.top === "number") {
      tooltipStyle.top = Math.max(EDGE, Math.min(tooltipStyle.top as number, vh - EST_H - EDGE));
    }
  } else {
    // No rect — center
    tooltipStyle.top = "50%";
    tooltipStyle.left = "50%";
    tooltipStyle.transform = "translate(-50%, -50%)";
  }

  const overlay = (
    <div
      ref={overlayRef}
      className="fixed inset-0"
      style={{ zIndex: 99999 }}
      onClick={(e) => { if (e.target === overlayRef.current) next(); }}
    >
      {/* Dark overlay */}
      <div
        className="absolute inset-0 bg-black/70"
        style={{ clipPath, transition: "clip-path 0.3s ease", pointerEvents: "none" }}
      />

      {/* Pink spotlight border */}
      {rect && rect.width > 0 && rect.height > 0 && (
        <div
          className="absolute pointer-events-none"
          style={{
            left: rect.left - PAD,
            top: rect.top - PAD,
            width: rect.width + PAD * 2,
            height: rect.height + PAD * 2,
            borderRadius: 12,
            border: `2px solid ${ACCENT}`,
            boxShadow: `0 0 0 1px rgba(227,0,118,0.25), 0 0 24px rgba(227,0,118,0.2)`,
            transition: "all 0.3s ease",
          }}
        />
      )}

      {/* Clickable area over spotlight */}
      {rect && rect.width > 0 && rect.height > 0 && (
        <div
          className="absolute cursor-pointer"
          style={{
            left: rect.left - PAD,
            top: rect.top - PAD,
            width: rect.width + PAD * 2,
            height: rect.height + PAD * 2,
          }}
          onClick={next}
        />
      )}

      {/* Tooltip */}
      <div
        className="absolute bg-[#161616]/95 backdrop-blur-xl rounded-2xl p-4"
        style={{
          ...tooltipStyle,
          border: "1px solid rgba(255,255,255,0.08)",
          animation: "scaleIn 0.2s ease-out",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h4 className="text-white font-bold text-[15px] mb-1">{step.title}</h4>
        <p className="text-zinc-400 text-sm leading-relaxed mb-4">{step.description}</p>

        <div className="flex items-center justify-between">
          <span className="text-zinc-500 text-xs font-medium">
            {current + 1}/{totalSteps}
          </span>
          <div className="flex items-center gap-3">
            <button onClick={skip} className="text-zinc-500 hover:text-zinc-300 text-sm transition-colors">
              Atla
            </button>
            <button onClick={next} className="btn-primary px-4 py-2 text-sm flex items-center gap-1.5">
              {current === totalSteps - 1 ? "Bitir" : "İleri"}
              {current < totalSteps - 1 && <ChevronRight className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(overlay, document.body);
}
