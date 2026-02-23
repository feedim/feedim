"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { lockScroll, unlockScroll } from "@/lib/scrollLock";

interface ImageViewerProps {
  images: { src: string; alt: string; caption?: string }[];
  initialIndex: number;
  open: boolean;
  onClose: () => void;
}

export default function ImageViewer({ images, initialIndex, open, onClose }: ImageViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [mounted, setMounted] = useState(false);
  const [closing, setClosing] = useState(false);

  // Zoom & pan state
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const isZoomed = scale > 1.05;

  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const touchStart = useRef<{ x: number; y: number; time: number } | null>(null);
  const pinchStart = useRef<{ dist: number; scale: number } | null>(null);
  const panStart = useRef<{ x: number; y: number; tx: number; ty: number } | null>(null);
  const isDragging = useRef(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (open) {
      setCurrentIndex(initialIndex);
      setScale(1);
      setTranslate({ x: 0, y: 0 });
      setClosing(false);
      lockScroll();
    }
    return () => unlockScroll();
  }, [open, initialIndex]);

  // Scroll to current image
  useEffect(() => {
    if (!open || !scrollRef.current) return;
    const el = scrollRef.current;
    el.scrollTo({ left: currentIndex * el.clientWidth, behavior: "auto" });
  }, [currentIndex, open]);

  const resetZoom = useCallback(() => {
    setScale(1);
    setTranslate({ x: 0, y: 0 });
  }, []);

  const handleClose = useCallback(() => {
    setClosing(true);
    setTimeout(() => {
      setClosing(false);
      resetZoom();
      onClose();
    }, 200);
  }, [onClose, resetZoom]);

  const goTo = useCallback((idx: number) => {
    if (idx < 0 || idx >= images.length) return;
    resetZoom();
    setCurrentIndex(idx);
  }, [images.length, resetZoom]);

  const goPrev = useCallback(() => goTo(currentIndex - 1), [currentIndex, goTo]);
  const goNext = useCallback(() => goTo(currentIndex + 1), [currentIndex, goTo]);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      switch (e.key) {
        case "Escape": handleClose(); break;
        case "ArrowLeft": case "a": case "A": goPrev(); break;
        case "ArrowRight": case "d": case "D": case " ": goNext(); break;
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, handleClose, goPrev, goNext]);

  // Mouse wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setScale(prev => {
      const next = prev + (e.deltaY < 0 ? 0.15 : -0.15);
      const clamped = Math.min(4, Math.max(1, next));
      if (clamped <= 1.05) {
        setTranslate({ x: 0, y: 0 });
        return 1;
      }
      return clamped;
    });
  }, []);

  // Double click/tap zoom
  const lastTap = useRef(0);
  const handleDoubleAction = useCallback((clientX: number, clientY: number) => {
    if (isZoomed) {
      resetZoom();
    } else {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const cx = clientX - rect.left - rect.width / 2;
      const cy = clientY - rect.top - rect.height / 2;
      setScale(2.5);
      setTranslate({ x: -cx * 0.6, y: -cy * 0.6 });
    }
  }, [isZoomed, resetZoom]);

  // Touch handlers
  const getTouchDist = (t: React.TouchList) => {
    const dx = t[0].clientX - t[1].clientX;
    const dy = t[0].clientY - t[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      pinchStart.current = { dist: getTouchDist(e.touches), scale };
      return;
    }
    if (e.touches.length === 1) {
      const now = Date.now();
      const t = e.touches[0];
      if (now - lastTap.current < 300) {
        handleDoubleAction(t.clientX, t.clientY);
        lastTap.current = 0;
        return;
      }
      lastTap.current = now;

      if (isZoomed) {
        panStart.current = { x: t.clientX, y: t.clientY, tx: translate.x, ty: translate.y };
      } else {
        touchStart.current = { x: t.clientX, y: t.clientY, time: now };
      }
    }
  }, [scale, isZoomed, translate, handleDoubleAction]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    // Pinch zoom
    if (e.touches.length === 2 && pinchStart.current) {
      e.preventDefault();
      const dist = getTouchDist(e.touches);
      const ratio = dist / pinchStart.current.dist;
      const next = Math.min(4, Math.max(1, pinchStart.current.scale * ratio));
      setScale(next);
      if (next <= 1.05) setTranslate({ x: 0, y: 0 });
      return;
    }
    // Pan when zoomed
    if (e.touches.length === 1 && panStart.current && isZoomed) {
      e.preventDefault();
      const t = e.touches[0];
      const dx = t.clientX - panStart.current.x;
      const dy = t.clientY - panStart.current.y;
      setTranslate({ x: panStart.current.tx + dx, y: panStart.current.ty + dy });
      isDragging.current = true;
    }
  }, [isZoomed]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    // Pinch end
    if (pinchStart.current) {
      pinchStart.current = null;
      if (scale <= 1.05) resetZoom();
      return;
    }
    // Pan end
    if (panStart.current) {
      panStart.current = null;
      isDragging.current = false;
      return;
    }
    // Swipe navigation (not zoomed)
    if (touchStart.current && !isZoomed && e.changedTouches.length > 0) {
      const t = e.changedTouches[0];
      const dx = t.clientX - touchStart.current.x;
      const dy = t.clientY - touchStart.current.y;
      const dt = Date.now() - touchStart.current.time;
      const velocity = Math.abs(dx) / dt;

      if (Math.abs(dx) > 60 && velocity > 0.08 && Math.abs(dy) < Math.abs(dx)) {
        if (dx > 0) goPrev();
        else goNext();
      }
      touchStart.current = null;
    }
  }, [scale, isZoomed, goPrev, goNext, resetZoom]);

  // Mouse drag for pan (desktop)
  const mouseDown = useRef<{ x: number; y: number; tx: number; ty: number } | null>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!isZoomed) return;
    e.preventDefault();
    mouseDown.current = { x: e.clientX, y: e.clientY, tx: translate.x, ty: translate.y };
  }, [isZoomed, translate]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!mouseDown.current) return;
    const dx = e.clientX - mouseDown.current.x;
    const dy = e.clientY - mouseDown.current.y;
    setTranslate({ x: mouseDown.current.tx + dx, y: mouseDown.current.ty + dy });
  }, []);

  const handleMouseUp = useCallback(() => {
    mouseDown.current = null;
  }, []);

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    handleDoubleAction(e.clientX, e.clientY);
  }, [handleDoubleAction]);

  if (!open || !mounted || images.length === 0) return null;

  const currentImg = images[currentIndex];
  const multipleImages = images.length > 1;

  return createPortal(
    <div
      className={`imgsp-overlay ${closing ? "imgsp-closing" : ""}`}
      ref={containerRef}
    >
      {/* Close button */}
      <button
        className="imgsp-close"
        onClick={handleClose}
        aria-label="Kapat"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m12 19-7-7 7-7" />
          <path d="M19 12H5" />
        </svg>
      </button>

      {/* Image area */}
      <div
        className="imgsp-content"
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onDoubleClick={handleDoubleClick}
        style={{ cursor: isZoomed ? "grab" : "default" }}
      >
        <img
          src={currentImg.src}
          alt={currentImg.alt || ""}
          className="imgsp-image"
          style={{
            transform: `scale(${scale}) translate(${translate.x / scale}px, ${translate.y / scale}px)`,
          }}
          draggable={false}
        />
      </div>

      {/* Caption */}
      {currentImg.caption && (
        <div className="imgsp-caption">{currentImg.caption}</div>
      )}

      {/* Navigation buttons (desktop, multiple images) */}
      {multipleImages && currentIndex > 0 && (
        <button className="imgsp-nav imgsp-prev" onClick={goPrev} aria-label="Onceki">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
      )}
      {multipleImages && currentIndex < images.length - 1 && (
        <button className="imgsp-nav imgsp-next" onClick={goNext} aria-label="Sonraki">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      )}

      {/* Dots pagination */}
      {multipleImages && (
        <div className="imgsp-dots">
          {images.map((_, i) => (
            <button
              key={i}
              className={`imgsp-dot ${i === currentIndex ? "active" : ""}`}
              onClick={() => goTo(i)}
              aria-label={`Gorsel ${i + 1}`}
            />
          ))}
        </div>
      )}

      {/* Counter */}
      {multipleImages && (
        <div className="imgsp-counter">
          {currentIndex + 1} / {images.length}
        </div>
      )}
    </div>,
    document.body
  );
}
