"use client";

import { useEffect, useRef, useCallback, useState, useLayoutEffect } from "react";
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
  md: "max-w-[450px]",
  lg: "max-w-[640px]",
  full: "max-w-full",
};

const EASING = "cubic-bezier(0.22, 1, 0.36, 1)";
const SPRING = "cubic-bezier(0.32, 0.72, 0, 1)";

const ANIMATION_CONFIG = {
  1: {
    in: `slideInBottom_0.28s_${EASING}`,
    out: `slideOutBottom_0.25s_${EASING}_forwards`,
    closeDelay: 250,
  },
  2: {
    in: `slideInRight_0.28s_${EASING}`,
    out: `slideOutRight_0.25s_${EASING}_forwards`,
    closeDelay: 250,
  },
  3: {
    in: `slideIn_0.22s_${EASING}`,
    out: `slideOut_0.2s_${EASING}_forwards`,
    closeDelay: 200,
  },
} as const;

/** Walk up from target to find the first scrollable parent inside popup */
function getScrollParent(target: EventTarget | null, popup: HTMLElement): HTMLElement | null {
  let el = target as HTMLElement | null;
  while (el && el !== popup) {
    if (el.nodeType === 1) {
      const style = window.getComputedStyle(el);
      if ((style.overflowY === "scroll" || style.overflowY === "auto") && el.scrollHeight > el.clientHeight) {
        return el;
      }
    }
    el = el.parentElement;
  }
  return null;
}

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
  const [rendered, setRendered] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Drag state refs
  const dragStartY = useRef<number | null>(null);
  const dragStartX = useRef<number | null>(null);
  const dragStartTime = useRef(0);
  const dragCurrentY = useRef(0);
  const isDragging = useRef(false);
  const hasMoved = useRef(false);
  const canDrag = useRef(false);
  const scrollParentRef = useRef<HTMLElement | null>(null);
  const scrollDisabled = useRef(false);
  const minDragDistance = 30;

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

  const clearInlineStyles = useCallback(() => {
    if (sheetRef.current) {
      sheetRef.current.style.transform = "";
      sheetRef.current.style.transition = "";
      sheetRef.current.style.animation = "";
    }
    if (backdropRef.current) {
      backdropRef.current.style.opacity = "";
      backdropRef.current.style.transition = "";
    }
  }, []);

  const hasLockRef = useRef(false);

  useEffect(() => {
    if (open) {
      lockScroll();
      hasLockRef.current = true;
      setRendered(true);
      setClosing(false);
      // Clear any drag inline styles so CSS animations can run
      requestAnimationFrame(() => clearInlineStyles());
      return;
    }
    if (rendered) {
      setClosing(true);
      const t = setTimeout(() => {
        setClosing(false);
        setRendered(false);
        if (hasLockRef.current) {
          unlockScroll();
          hasLockRef.current = false;
        }
      }, anim.closeDelay);
      return () => {
        clearTimeout(t);
        // Timeout iptal edildi — kilidi hemen bırak
        if (hasLockRef.current) {
          unlockScroll();
          hasLockRef.current = false;
        }
      };
    }
    if (hasLockRef.current) {
      unlockScroll();
      hasLockRef.current = false;
    }
  }, [open, rendered, anim.closeDelay, clearInlineStyles]);

  // Unmount güvenliği: bileşen yok edilirse kilidi bırak
  useEffect(() => {
    return () => {
      if (hasLockRef.current) {
        unlockScroll();
        hasLockRef.current = false;
      }
    };
  }, []);

  useLayoutEffect(() => {
    if (open) clearInlineStyles();
  }, [open, clearInlineStyles]);

  useEffect(() => {
    if (!open) return;
    const handleEsc = (e: KeyboardEvent) => { if (e.key === "Escape") handleClose(); };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [open]);

  const handleClose = useCallback(() => {
    if (closing) return;
    clearInlineStyles();
    onClose();
  }, [onClose, closing, clearInlineStyles]);

  // --- Drag (WordPress-style: handle, header, AND content area when scrolled to top) ---
  const resetDragState = useCallback(() => {
    dragStartY.current = null;
    dragStartX.current = null;
    dragCurrentY.current = 0;
    isDragging.current = false;
    hasMoved.current = false;
    canDrag.current = false;
    scrollDisabled.current = false;
    scrollParentRef.current = null;
  }, []);

  const startDrag = useCallback((clientY: number, clientX: number, target: EventTarget | null) => {
    const sheet = sheetRef.current;
    if (!sheet) return;

    // Find scrollable parent from touch target
    const sp = getScrollParent(target, sheet);
    scrollParentRef.current = sp;

    // Can only drag if no scroll parent or scroll parent is at top
    canDrag.current = !sp || sp.scrollTop === 0;

    dragStartY.current = clientY;
    dragStartX.current = clientX;
    dragStartTime.current = Date.now();
    dragCurrentY.current = 0;
    isDragging.current = false;
    hasMoved.current = false;
    scrollDisabled.current = false;

    // Don't kill CSS animation here — wait until drag gesture is confirmed
    // This prevents taps from interfering with modal animations
  }, []);

  const moveDrag = useCallback((clientY: number, clientX: number) => {
    if (dragStartY.current === null || dragStartX.current === null) return;

    let deltaY = clientY - dragStartY.current;
    const deltaX = clientX - dragStartX.current;
    const totalDistance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    // Minimum distance before deciding gesture direction
    if (!hasMoved.current && totalDistance < minDragDistance) return;

    if (!hasMoved.current && totalDistance >= minDragDistance) {
      hasMoved.current = true;
      const absX = Math.abs(deltaX);
      const absY = Math.abs(deltaY);

      // Must be a downward vertical gesture
      const isDragGesture = canDrag.current && absY > absX * 1.5 && deltaY > 10;

      if (isDragGesture) {
        isDragging.current = true;
        // NOW kill CSS animation so inline transform can take priority
        const s = sheetRef.current;
        if (s) { s.style.animation = "none"; s.style.transition = "none"; }
        if (backdropRef.current) { backdropRef.current.style.transition = "none"; }
        // Disable scroll parent to prevent scroll interference
        if (scrollParentRef.current) {
          scrollParentRef.current.style.overflow = "hidden";
          scrollDisabled.current = true;
        }
      } else {
        // Not a drag gesture — cleanup
        if (sheetRef.current) { sheetRef.current.style.animation = ""; sheetRef.current.style.transition = ""; }
        resetDragState();
        return;
      }
    }

    if (!isDragging.current) return;

    // Only allow downward movement
    const translateY = Math.max(deltaY, 0);
    const h = sheetRef.current?.offsetHeight || 400;
    const threshold = h * 0.5;

    // Rubber-band effect past threshold
    const dampened = translateY > threshold
      ? threshold + (translateY - threshold) * 0.25
      : translateY;

    if (sheetRef.current) {
      sheetRef.current.style.transition = "transform 0.08s ease-out";
      sheetRef.current.style.transform = `translateY(${dampened}px)`;
    }

    // Fade backdrop proportionally
    const opacityRatio = Math.min(translateY / h, 1);
    if (backdropRef.current) {
      backdropRef.current.style.opacity = `${Math.max(0, 1 - opacityRatio * 1.2)}`;
    }

    dragCurrentY.current = translateY;
  }, [resetDragState]);

  const endDrag = useCallback(() => {
    const sheet = sheetRef.current;
    const backdrop = backdropRef.current;
    const dy = dragCurrentY.current;
    const dt = Date.now() - dragStartTime.current;
    const velocity = dy / Math.max(dt, 1) * 1000;
    const h = sheet?.offsetHeight || 400;

    // Restore scroll parent
    if (scrollParentRef.current && scrollDisabled.current) {
      scrollParentRef.current.style.overflow = "";
    }

    if (!isDragging.current || dy < 4) {
      // No drag happened — styles were never changed, just reset state
      resetDragState();
      return;
    }

    const spring = `0.28s ${SPRING}`;
    if (sheet) sheet.style.transition = `transform ${spring}`;
    if (backdrop) backdrop.style.transition = `opacity ${spring}`;

    const shouldClose = dy > h * 0.3 || velocity > 950;

    if (shouldClose) {
      if (sheet) { sheet.style.transform = `translateY(${h + 50}px)`; }
      if (backdrop) backdrop.style.opacity = "0";
      resetDragState();
      setTimeout(() => {
        if (sheet) { sheet.style.transition = ""; sheet.style.transform = ""; sheet.style.animation = ""; }
        if (backdrop) { backdrop.style.transition = ""; backdrop.style.opacity = ""; }
        onClose();
      }, 300);
    } else {
      // Snap back to origin
      if (sheet) sheet.style.transform = "translateY(0px)";
      if (backdrop) backdrop.style.opacity = "";
      resetDragState();
      setTimeout(() => {
        if (sheet) { sheet.style.transition = ""; sheet.style.transform = ""; sheet.style.animation = ""; }
        if (backdrop) { backdrop.style.transition = ""; backdrop.style.opacity = ""; }
      }, 300);
    }
  }, [onClose, resetDragState]);

  // --- Touch handlers ---
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    startDrag(e.touches[0].clientY, e.touches[0].clientX, e.target);
  }, [startDrag]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (dragStartY.current === null) return;
    if (isDragging.current) e.preventDefault();
    moveDrag(e.touches[0].clientY, e.touches[0].clientX);
  }, [moveDrag]);

  const handleTouchEnd = useCallback(() => { endDrag(); }, [endDrag]);

  // --- Mouse handlers ---
  const mouseMoveCb = useRef<((e: MouseEvent) => void) | null>(null);
  const mouseUpCb = useRef<((e: MouseEvent) => void) | null>(null);

  const cleanupMouseListeners = useCallback(() => {
    if (mouseMoveCb.current) window.removeEventListener("mousemove", mouseMoveCb.current);
    if (mouseUpCb.current) window.removeEventListener("mouseup", mouseUpCb.current);
    mouseMoveCb.current = null;
    mouseUpCb.current = null;
  }, []);

  useEffect(() => {
    if (!open) cleanupMouseListeners();
    return () => cleanupMouseListeners();
  }, [open, cleanupMouseListeners]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    startDrag(e.clientY, e.clientX, e.target);

    const onMove = (ev: MouseEvent) => {
      ev.preventDefault();
      moveDrag(ev.clientY, ev.clientX);
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

  // --- Content area drag: only when scrolled to top ---
  const handleContentTouchStart = useCallback((e: React.TouchEvent) => {
    if (!isBottomSheet) return;
    startDrag(e.touches[0].clientY, e.touches[0].clientX, e.target);
  }, [isBottomSheet, startDrag]);

  const handleContentTouchMove = useCallback((e: React.TouchEvent) => {
    if (dragStartY.current === null) return;
    if (isDragging.current) e.preventDefault();
    moveDrag(e.touches[0].clientY, e.touches[0].clientX);
  }, [moveDrag]);

  const handleContentTouchEnd = useCallback(() => { endDrag(); }, [endDrag]);

  const handleContentMouseDown = useCallback((e: React.MouseEvent) => {
    if (!isBottomSheet || e.button !== 0) return;
    startDrag(e.clientY, e.clientX, e.target);

    const onMove = (ev: MouseEvent) => {
      moveDrag(ev.clientY, ev.clientX);
    };
    const onUp = () => {
      endDrag();
      cleanupMouseListeners();
    };

    mouseMoveCb.current = onMove;
    mouseUpCb.current = onUp;
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [isBottomSheet, startDrag, moveDrag, endDrag, cleanupMouseListeners]);

  if (!mounted || (!open && !rendered)) return null;

  // Sheet layout classes based on animation type
  const sheetLayoutClasses = resolvedType === 2
    ? `relative h-full ${sizeClasses[size]} bg-bg-secondary rounded-l-[20px] overflow-hidden flex flex-col will-change-transform`
    : `relative w-full ${sizeClasses[size]} bg-bg-secondary rounded-t-[20px] ${centerOnDesktop ? "sm:rounded-[20px] sm:!max-h-[85vh]" : ""} max-h-[90dvh] sm:max-h-[95dvh] ${fullHeight ? "min-h-[90dvh] sm:min-h-[95dvh]" : ""} overflow-hidden flex flex-col will-change-transform`;

  const containerAlignClasses = resolvedType === 2
    ? `fixed inset-0 ${zIndex} flex items-stretch justify-end`
    : `fixed inset-0 ${zIndex} flex items-end ${centerOnDesktop ? "sm:items-center" : ""} justify-center`;

  // Drag props — for handle and header
  const dragHandleProps = showDragHandle ? {
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
    onMouseDown: handleMouseDown,
  } : {};

  const headerDragProps = enableHeaderDrag ? {
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
    onMouseDown: handleMouseDown,
  } : {};

  const animClass =
    resolvedType === 1
      ? (closing
          ? "animate-[slideOutBottom_0.2s_cubic-bezier(0.22,1,0.36,1)_forwards]"
          : "animate-[slideInBottom_0.22s_cubic-bezier(0.22,1,0.36,1)_forwards]")
      : resolvedType === 2
        ? (closing
            ? "animate-[slideOutRight_0.2s_cubic-bezier(0.22,1,0.36,1)_forwards]"
            : "animate-[slideInRight_0.22s_cubic-bezier(0.22,1,0.36,1)_forwards]")
        : (closing
            ? "animate-[slideOut_0.15s_cubic-bezier(0.22,1,0.36,1)_forwards]"
            : "animate-[slideIn_0.18s_cubic-bezier(0.25,0.1,0.25,1)_both]");

  return createPortal(
    <div
      className={`x32flP4rs ${closing ? "" : "show"} ${containerAlignClasses}`}
    >
      <div
        ref={backdropRef}
        className={`absolute inset-0 bg-black/60 transition-opacity ${closing ? "duration-200 opacity-0" : "duration-200 opacity-100"}`}
        onClick={handleClose}
      />

      <div
        ref={sheetRef}
        data-modal
        className={`${sheetLayoutClasses} pop-modal-content type${resolvedType} sm-type${resolvedType} ${animClass}`}
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
          onTouchStart={handleContentTouchStart}
          onTouchMove={handleContentTouchMove}
          onTouchEnd={handleContentTouchEnd}
          onMouseDown={handleContentMouseDown}
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
