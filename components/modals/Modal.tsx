"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, Info } from "lucide-react";
import { feedimAlert } from "@/components/FeedimAlert";
import { lockScroll, unlockScroll } from "@/lib/scrollLock";

export type ModalSize = "sm" | "md" | "lg" | "full";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  size?: ModalSize;
  leftAction?: React.ReactNode;
  rightAction?: React.ReactNode;
  infoText?: string;
  children: React.ReactNode;
  /** Sabit alt alan */
  footer?: React.ReactNode;
  hideHeader?: boolean;
  centerOnDesktop?: boolean;
  /** Modal min-h-[90dvh] olur (yorumlar gibi tam ekran modaller için) */
  fullHeight?: boolean;
  /** Özel z-index sınıfı (varsayılan: "z-[9999]") */
  zIndex?: string;
  /** Animasyon tipi: 1=bottom sheet, 2=sağdan panel, 3=center scale */
  animationType?: 1 | 2 | 3;
}

const sizeClasses: Record<ModalSize, string> = {
  sm: "max-w-[400px]",
  md: "max-w-[500px]",
  lg: "max-w-[640px]",
  full: "max-w-full",
};

const EASING = "cubic-bezier(0.22, 1, 0.36, 1)";
const SPRING = "cubic-bezier(0.32, 0.72, 0, 1)";

const ANIMATION_CONFIG = {
  1: {
    in: `slideInBottom_0.4s_${EASING}`,
    out: `slideOutBottom_0.28s_${EASING}_forwards`,
    closeDelay: 280,
  },
  2: {
    in: `slideInRight_0.4s_${EASING}`,
    out: `slideOutRight_0.28s_${EASING}_forwards`,
    closeDelay: 280,
  },
  3: {
    in: `modalScaleIn_0.3s_${EASING}`,
    out: `modalScaleOut_0.25s_${EASING}_forwards`,
    closeDelay: 250,
  },
} as const;

export default function Modal({
  open,
  onClose,
  title,
  size = "md",
  leftAction,
  rightAction,
  infoText,
  children,
  footer,
  hideHeader = false,
  centerOnDesktop = false,
  fullHeight = false,
  zIndex = "z-[9999]",
  animationType,
}: ModalProps) {
  const [closing, setClosing] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const dragStartY = useRef<number | null>(null);
  const dragStartTime = useRef(0);
  const dragCurrentY = useRef(0);
  const isDragging = useRef(false);
  const contentRef = useRef<HTMLDivElement>(null);


  useEffect(() => {
    setMounted(true);
    const check = () => setIsDesktop(window.innerWidth >= 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);


  // Resolved animation type
  const resolvedType: 1 | 2 | 3 = animationType
    ? animationType
    : centerOnDesktop && isDesktop
      ? 3
      : 1;

  const anim = ANIMATION_CONFIG[resolvedType];
  const isBottomSheet = resolvedType === 1 || (resolvedType === 3 && !isDesktop);
  const showDragHandle = isBottomSheet;
  const enableHeaderDrag = isBottomSheet;

  useEffect(() => {
    if (open) {
      lockScroll();
      setClosing(false);
    }
    return () => { if (open) unlockScroll(); };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleEsc = (e: KeyboardEvent) => { if (e.key === "Escape") handleClose(); };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [open]);

  const handleClose = useCallback(() => {
    setClosing(true);
    setTimeout(() => { setClosing(false); onClose(); }, anim.closeDelay);
  }, [onClose, anim.closeDelay]);

  // --- Drag ---
  const startDrag = useCallback((clientY: number) => {
    if (sheetRef.current) { sheetRef.current.style.transform = ""; }
    if (backdropRef.current) { backdropRef.current.style.opacity = ""; }

    dragStartY.current = clientY;
    dragStartTime.current = Date.now();
    dragCurrentY.current = 0;
    isDragging.current = false;

    if (sheetRef.current) sheetRef.current.style.transition = "none";
    if (backdropRef.current) backdropRef.current.style.transition = "none";
  }, []);

  const moveDrag = useCallback((clientY: number) => {
    if (dragStartY.current === null) return;
    const delta = clientY - dragStartY.current;
    dragCurrentY.current = delta;
    if (Math.abs(delta) > 8) isDragging.current = true;
    if (!isDragging.current) return;

    if (delta > 0) {
      const h = sheetRef.current?.offsetHeight || 400;
      const ratio = delta / h;
      const dampened = delta * (1 - ratio * 0.4);
      if (sheetRef.current) sheetRef.current.style.transform = `translateY(${dampened}px)`;
      if (backdropRef.current) backdropRef.current.style.opacity = `${Math.max(0, 1 - ratio * 1.2)}`;
    }
  }, []);

  const resetDragState = useCallback(() => {
    dragStartY.current = null;
    dragCurrentY.current = 0;
    isDragging.current = false;
  }, []);

  const endDrag = useCallback(() => {
    const sheet = sheetRef.current;
    const backdrop = backdropRef.current;
    const dy = dragCurrentY.current;
    const dt = Date.now() - dragStartTime.current;
    const velocity = Math.abs(dy) / Math.max(dt, 1) * 1000;
    const h = sheet?.offsetHeight || 400;

    if (!isDragging.current || Math.abs(dy) < 4) {
      if (sheet) { sheet.style.transition = ""; sheet.style.transform = ""; }
      if (backdrop) { backdrop.style.transition = ""; backdrop.style.opacity = ""; }
      resetDragState();
      return;
    }

    const spring = `0.36s ${SPRING}`;
    if (sheet) sheet.style.transition = `transform ${spring}`;
    if (backdrop) backdrop.style.transition = `opacity ${spring}`;

    if (dy > 0) {
      const shouldClose = dy > h * 0.3 || velocity > 800;
      if (shouldClose) {
        if (sheet) sheet.style.transform = `translateY(${h + 50}px)`;
        if (backdrop) backdrop.style.opacity = "0";
        resetDragState();
        setTimeout(() => {
          if (sheet) { sheet.style.transition = ""; sheet.style.transform = ""; }
          if (backdrop) { backdrop.style.transition = ""; backdrop.style.opacity = ""; }
          onClose();
        }, 360);
        return;
      } else {
        if (sheet) sheet.style.transform = "";
        if (backdrop) backdrop.style.opacity = "";
      }
    }

    resetDragState();

    setTimeout(() => {
      if (sheet) sheet.style.transition = "";
      if (backdrop) backdrop.style.transition = "";
    }, 380);
  }, [onClose, resetDragState]);

  // --- Touch: Handle/header ---
  const handleDragStart = useCallback((e: React.TouchEvent) => { startDrag(e.touches[0].clientY); }, [startDrag]);
  const handleDragMove = useCallback((e: React.TouchEvent) => {
    if (dragStartY.current === null) return;
    if (isDragging.current) e.preventDefault();
    moveDrag(e.touches[0].clientY);
  }, [moveDrag]);
  const handleDragEnd = useCallback(() => { endDrag(); }, [endDrag]);

  // --- Mouse: Handle/header (desktop) ---
  const mouseMoveCb = useRef<((e: MouseEvent) => void) | null>(null);
  const mouseUpCb = useRef<((e: MouseEvent) => void) | null>(null);

  const cleanupMouseListeners = useCallback(() => {
    if (mouseMoveCb.current) window.removeEventListener("mousemove", mouseMoveCb.current);
    if (mouseUpCb.current) window.removeEventListener("mouseup", mouseUpCb.current);
    mouseMoveCb.current = null;
    mouseUpCb.current = null;
  }, []);

  // Cleanup on unmount / close
  useEffect(() => {
    if (!open) cleanupMouseListeners();
    return () => cleanupMouseListeners();
  }, [open, cleanupMouseListeners]);

  const handleMouseDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    startDrag(e.clientY);

    const onMove = (ev: MouseEvent) => {
      ev.preventDefault();
      moveDrag(ev.clientY);
    };
    const onUp = () => {
      endDrag();
      cleanupMouseListeners();
    };

    mouseMoveCb.current = onMove;
    mouseUpCb.current = onUp;
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [startDrag, moveDrag, endDrag, cleanupMouseListeners]);

  // Content alanında drag yok — sadece handle ve header'dan sürüklenebilir

  if (!open || !mounted) return null;

  // Sheet layout classes based on animation type
  const sheetLayoutClasses = resolvedType === 2
    ? `relative h-full ${sizeClasses[size]} bg-bg-secondary rounded-l-[20px] overflow-hidden flex flex-col will-change-transform`
    : `relative w-full ${sizeClasses[size]} bg-bg-secondary rounded-t-[20px] ${centerOnDesktop ? "sm:rounded-[20px] sm:!max-h-[85vh]" : ""} max-h-[90dvh] sm:max-h-[95dvh] ${fullHeight ? "min-h-[90dvh] sm:min-h-[95dvh]" : ""} overflow-hidden flex flex-col will-change-transform`;

  const containerAlignClasses = resolvedType === 2
    ? `fixed inset-0 ${zIndex} flex items-stretch justify-end`
    : `fixed inset-0 ${zIndex} flex items-end ${centerOnDesktop ? "sm:items-center" : ""} justify-center`;

  // Drag props — only for bottom sheet types
  const dragHandleProps = showDragHandle ? {
    onTouchStart: handleDragStart,
    onTouchMove: handleDragMove,
    onTouchEnd: handleDragEnd,
    onMouseDown: handleMouseDragStart,
  } : {};

  const headerDragProps = enableHeaderDrag ? {
    onTouchStart: handleDragStart,
    onTouchMove: handleDragMove,
    onTouchEnd: handleDragEnd,
    onMouseDown: handleMouseDragStart,
  } : {};

  return createPortal(
    <div
      className={`${containerAlignClasses} transition-opacity duration-250 ${
        closing ? "opacity-0" : "opacity-100"
      }`}
    >
      <div
        ref={backdropRef}
        className="absolute inset-0 bg-black/50"
        onClick={handleClose}
      />

      <div
        ref={sheetRef}
        data-modal
        className={`${sheetLayoutClasses} ${
          closing
            ? `animate-[${anim.out}]`
            : `animate-[${anim.in}]`
        }`}
      >
        {/* Handle — sadece bottom sheet tiplerinde göster */}
        {showDragHandle && (
          <div
            className="flex justify-center cursor-grab active:cursor-grabbing touch-none select-none"
            {...dragHandleProps}
          >
            <div className="w-[72px] h-1 mt-3.5 -mb-1.5 rounded-full bg-text-muted/40" />
          </div>
        )}

        {/* Header */}
        {!hideHeader && (
          <div
            className={`flex items-center justify-between px-4 py-3 shrink-0 ${enableHeaderDrag ? "touch-none select-none" : ""}`}
            {...headerDragProps}
          >
            <div className="w-16 flex items-center">
              {leftAction || (
                <button onClick={handleClose} className="i-btn !w-10 !h-10 text-text-muted hover:text-text-primary" aria-label="Kapat">
                  <ArrowLeft className="h-6 w-6" />
                </button>
              )}
            </div>
            <h2 className="text-[1.1rem] font-bold text-center flex-1 truncate">{title}</h2>
            <div className="w-16 flex items-center justify-end">
              {rightAction || (infoText && (
                <button onClick={() => feedimAlert("info", infoText)} className="i-btn !w-10 !h-10 text-text-muted hover:text-text-primary" aria-label="Bilgi">
                  <Info className="h-[22px] w-[22px]" />
                </button>
              ))}
            </div>
          </div>
        )}

        <div
          ref={contentRef}
          className="overflow-y-auto overscroll-contain modal-scroll-content flex-1"
        >
          {children}
        </div>

        {/* Footer — klavye açıkken fixed olur, modal hareket etmez */}
        {footer && (
          <>
            <div className="shrink-0 bg-bg-secondary">{footer}</div>
          </>
        )}
      </div>
    </div>,
    document.body
  );
}
