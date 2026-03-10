"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { useTranslations } from "next-intl";
import { X, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import Modal from "./Modal";

interface CropModalProps {
  open: boolean;
  onClose: () => void;
  imageSrc: string;
  /** width / height — default 16/9 */
  aspectRatio?: number;
  onCrop: (croppedDataUrl: string) => void;
}

export default function CropModal({
  open,
  onClose,
  imageSrc,
  aspectRatio = 16 / 9,
  onCrop,
}: CropModalProps) {
  const t = useTranslations("modals");
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const zoomBarRef = useRef<HTMLDivElement>(null);
  const zoomDragging = useRef(false);

  const [imgLoaded, setImgLoaded] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });

  // Natural image size
  const [naturalW, setNaturalW] = useState(0);
  const [naturalH, setNaturalH] = useState(0);

  // Safe src: convert external URLs to blob URLs to avoid tainted canvas
  const [safeSrc, setSafeSrc] = useState("");

  // Drag state
  const dragStart = useRef<{ x: number; y: number; px: number; py: number } | null>(null);

  // Pinch state
  const pinchDist = useRef(0);
  const pinchZoom = useRef(1);

  // Refs for latest values (used in native event listeners)
  const zoomRef = useRef(zoom);
  const posRef = useRef(pos);
  useEffect(() => { zoomRef.current = zoom; }, [zoom]);
  useEffect(() => { posRef.current = pos; }, [pos]);

  // Reset state when new image
  useEffect(() => {
    if (open && imageSrc) {
      setZoom(1);
      setPos({ x: 0, y: 0 });
      setImgLoaded(false);

      // Fallback: if onLoad doesn't fire (cached image), check after delay
      const timer = setTimeout(() => {
        const img = imgRef.current;
        if (img && img.complete && img.naturalWidth > 0) {
          setNaturalW(img.naturalWidth);
          setNaturalH(img.naturalHeight);
          setImgLoaded(true);
        }
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [open, imageSrc]);

  // Convert external URLs to blob URLs to avoid tainted canvas SecurityError
  useEffect(() => {
    if (!open || !imageSrc) { setSafeSrc(""); return; }
    // data: and blob: URLs are already same-origin safe
    if (imageSrc.startsWith("data:") || imageSrc.startsWith("blob:")) {
      setSafeSrc(imageSrc);
      return;
    }
    // External/CDN URLs: fetch as blob
    let cancelled = false;
    let objectUrl = "";
    fetch(imageSrc)
      .then(r => r.blob())
      .then(blob => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setSafeSrc(objectUrl);
      })
      .catch(() => {
        if (!cancelled) setSafeSrc(imageSrc);
      });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [open, imageSrc]);

  const handleImgLoad = useCallback(() => {
    const img = imgRef.current;
    if (!img) return;
    setNaturalW(img.naturalWidth);
    setNaturalH(img.naturalHeight);
    setImgLoaded(true);
  }, []);

  // Compute the base scale so image covers the crop area
  const getCropAreaSize = useCallback(() => {
    const container = containerRef.current;
    if (!container) return { cw: 300, ch: 200 };
    const cw = container.clientWidth;
    const ch = container.clientHeight;
    const pad = 20;
    const maxW = cw - pad * 2;
    const maxH = ch - pad * 2;
    let cropW: number, cropH: number;
    if (maxW / maxH > aspectRatio) {
      cropH = maxH;
      cropW = cropH * aspectRatio;
    } else {
      cropW = maxW;
      cropH = cropW / aspectRatio;
    }
    return { cw: cropW, ch: cropH };
  }, [aspectRatio]);

  // Clamp position
  const clampPos = useCallback(
    (x: number, y: number, z: number) => {
      if (!naturalW || !naturalH) return { x, y };
      const { cw, ch } = getCropAreaSize();
      const imgAr = naturalW / naturalH;
      let dispW: number, dispH: number;
      if (imgAr > aspectRatio) {
        dispH = ch * z;
        dispW = dispH * imgAr;
      } else {
        dispW = cw * z;
        dispH = dispW / imgAr;
      }
      const maxX = Math.max(0, (dispW - cw) / 2);
      const maxY = Math.max(0, (dispH - ch) / 2);
      return {
        x: Math.max(-maxX, Math.min(maxX, x)),
        y: Math.max(-maxY, Math.min(maxY, y)),
      };
    },
    [naturalW, naturalH, getCropAreaSize, aspectRatio]
  );
  const clampPosRef = useRef(clampPos);
  useEffect(() => { clampPosRef.current = clampPos; }, [clampPos]);

  // Mouse drag
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragStart.current = { x: e.clientX, y: e.clientY, px: posRef.current.x, py: posRef.current.y };
  }, []);

  useEffect(() => {
    if (!open) return;
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragStart.current) return;
      const dx = e.clientX - dragStart.current.x;
      const dy = e.clientY - dragStart.current.y;
      const clamped = clampPosRef.current(dragStart.current.px + dx, dragStart.current.py + dy, zoomRef.current);
      setPos(clamped);
    };
    const handleMouseUp = () => { dragStart.current = null; };
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [open]);

  // Native touch + wheel handlers (passive: false for preventDefault)
  useEffect(() => {
    if (!open) return;
    const el = containerRef.current;
    if (!el) return;

    const onTouchStart = (e: TouchEvent) => {
      e.stopPropagation();
      if (e.touches.length === 1) {
        const t = e.touches[0];
        dragStart.current = { x: t.clientX, y: t.clientY, px: posRef.current.x, py: posRef.current.y };
      } else if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        pinchDist.current = Math.hypot(dx, dy);
        pinchZoom.current = zoomRef.current;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.touches.length === 1 && dragStart.current) {
        const t = e.touches[0];
        const dx = t.clientX - dragStart.current.x;
        const dy = t.clientY - dragStart.current.y;
        const clamped = clampPosRef.current(dragStart.current.px + dx, dragStart.current.py + dy, zoomRef.current);
        setPos(clamped);
      } else if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.hypot(dx, dy);
        if (pinchDist.current > 0) {
          const newZoom = Math.max(1, Math.min(4, pinchZoom.current * (dist / pinchDist.current)));
          setZoom(newZoom);
          setPos(prev => clampPosRef.current(prev.x, prev.y, newZoom));
        }
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      e.stopPropagation();
      dragStart.current = null;
      pinchDist.current = 0;
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = -e.deltaY * 0.002;
      const newZoom = Math.max(1, Math.min(4, zoomRef.current + delta));
      setZoom(newZoom);
      setPos(prev => clampPosRef.current(prev.x, prev.y, newZoom));
    };

    el.addEventListener("touchstart", onTouchStart, { passive: false });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd);
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("wheel", onWheel);
    };
  }, [open]);

  // Zoom bar drag
  const setZoomFromBar = useCallback((clientX: number) => {
    const bar = zoomBarRef.current;
    if (!bar) return;
    const rect = bar.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const newZoom = 1 + ratio * 3; // 1–4 range
    setZoom(newZoom);
    setPos(prev => clampPosRef.current(prev.x, prev.y, newZoom));
  }, []);

  const handleZoomBarDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    zoomDragging.current = true;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setZoomFromBar(e.clientX);
  }, [setZoomFromBar]);

  const handleZoomBarMove = useCallback((e: React.PointerEvent) => {
    if (!zoomDragging.current) return;
    setZoomFromBar(e.clientX);
  }, [setZoomFromBar]);

  const handleZoomBarUp = useCallback(() => {
    zoomDragging.current = false;
  }, []);

  // Crop using canvas
  const handleCrop = useCallback(() => {
    if (!imgRef.current || !naturalW || !naturalH) return;
    const { cw, ch } = getCropAreaSize();
    const imgAr = naturalW / naturalH;
    let dispW: number, dispH: number;
    if (imgAr > aspectRatio) {
      dispH = ch * zoom;
      dispW = dispH * imgAr;
    } else {
      dispW = cw * zoom;
      dispH = dispW / imgAr;
    }

    const scaleX = naturalW / dispW;
    const scaleY = naturalH / dispH;

    const cropX = (dispW / 2 - pos.x - cw / 2) * scaleX;
    const cropY = (dispH / 2 - pos.y - ch / 2) * scaleY;
    const cropW = cw * scaleX;
    const cropH = ch * scaleY;

    const canvas = document.createElement("canvas");
    const outputW = Math.min(cropW, 2048);
    const outputH = Math.min(cropH, 2048);
    canvas.width = outputW;
    canvas.height = outputH;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(imgRef.current, cropX, cropY, cropW, cropH, 0, 0, outputW, outputH);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
    onCrop(dataUrl);
    onClose();
  }, [naturalW, naturalH, zoom, pos, getCropAreaSize, aspectRatio, onCrop, onClose]);

  // Compute display dimensions for render
  const { cw: cropW, ch: cropH } = getCropAreaSize();
  const imgAr = naturalW && naturalH ? naturalW / naturalH : 1;
  let dispW: number, dispH: number;
  if (imgAr > aspectRatio) {
    dispH = cropH * zoom;
    dispW = dispH * imgAr;
  } else {
    dispW = cropW * zoom;
    dispH = dispW / imgAr;
  }

  const closeBtn = (
    <button onClick={onClose} className="i-btn !w-10 !h-10 text-text-muted">
      <X className="h-5 w-5" />
    </button>
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t("cropLabel")}
      size="sm"
      centerOnDesktop
      rightAction={closeBtn}
    >
      <div className="px-3 pb-3 space-y-2">
        {/* Crop area */}
        <div
          ref={containerRef}
          data-modal-no-drag
          className="relative overflow-hidden select-none cursor-grab active:cursor-grabbing rounded-lg bg-black"
          style={{ height: "clamp(220px, 40vh, 380px)", touchAction: "none" }}
          onMouseDown={handleMouseDown}
        >
          {/* Image */}
          <div
            className="absolute"
            style={{
              left: "50%",
              top: "50%",
              width: dispW,
              height: dispH,
              transform: `translate(calc(-50% + ${pos.x}px), calc(-50% + ${pos.y}px))`,
              transition: dragStart.current ? "none" : "transform 0.1s ease-out",
            }}
          >
            {safeSrc ? (
              <img
                key={safeSrc}
                ref={imgRef}
                src={safeSrc}
                crossOrigin="anonymous"
                alt=""
                onLoad={handleImgLoad}
                className={`w-full h-full object-cover${imgLoaded ? "" : " opacity-0"}`}
                draggable={false}
              />
            ) : null}
            {!imgLoaded && (
              <div className="absolute inset-0 bg-bg-tertiary animate-pulse rounded-lg" />
            )}
          </div>

          {/* Overlay mask — darkens outside crop */}
          <div className="absolute inset-0 pointer-events-none">
            {/* Top */}
            <div
              className="absolute left-0 right-0 top-0 bg-black/60"
              style={{ height: `calc(50% - ${cropH / 2}px)` }}
            />
            {/* Bottom */}
            <div
              className="absolute left-0 right-0 bottom-0 bg-black/60"
              style={{ height: `calc(50% - ${cropH / 2}px)` }}
            />
            {/* Left */}
            <div
              className="absolute left-0 bg-black/60"
              style={{
                top: `calc(50% - ${cropH / 2}px)`,
                width: `calc(50% - ${cropW / 2}px)`,
                height: cropH,
              }}
            />
            {/* Right */}
            <div
              className="absolute right-0 bg-black/60"
              style={{
                top: `calc(50% - ${cropH / 2}px)`,
                width: `calc(50% - ${cropW / 2}px)`,
                height: cropH,
              }}
            />
            {/* Crop border */}
            <div
              className="absolute border-2 border-white/40 rounded-sm"
              style={{
                left: `calc(50% - ${cropW / 2}px)`,
                top: `calc(50% - ${cropH / 2}px)`,
                width: cropW,
                height: cropH,
              }}
            />
            {/* Grid lines */}
            <div
              className="absolute"
              style={{
                left: `calc(50% - ${cropW / 2}px)`,
                top: `calc(50% - ${cropH / 2}px)`,
                width: cropW,
                height: cropH,
              }}
            >
              <div className="absolute left-1/3 top-0 bottom-0 w-px bg-white/20" />
              <div className="absolute left-2/3 top-0 bottom-0 w-px bg-white/20" />
              <div className="absolute top-1/3 left-0 right-0 h-px bg-white/20" />
              <div className="absolute top-2/3 left-0 right-0 h-px bg-white/20" />
            </div>
          </div>
        </div>

        {/* Zoom controls */}
        <div data-modal-no-drag className="flex items-center justify-center gap-3 pt-[7px] mt-[7px]" style={{ touchAction: "auto" }}>
          <button
            onClick={() => {
              const z = Math.max(1, zoom - 0.25);
              setZoom(z);
              setPos(prev => clampPos(prev.x, prev.y, z));
            }}
            className="p-2 text-text-muted hover:text-text-primary transition"
          >
            <ZoomOut className="h-5 w-5" />
          </button>
          <div
            ref={zoomBarRef}
            data-modal-no-drag
            className="flex-1 h-7 flex items-center cursor-pointer touch-none select-none"
            onPointerDown={handleZoomBarDown}
            onPointerMove={handleZoomBarMove}
            onPointerUp={handleZoomBarUp}
            onPointerCancel={handleZoomBarUp}
          >
            <div className="w-full h-[3px] bg-border-primary rounded-full relative">
              <div
                className="absolute h-full bg-accent-main rounded-full"
                style={{ width: `${((zoom - 1) / 3) * 100}%` }}
              />
              <div
                className="absolute w-3 h-3 rounded-full bg-accent-main"
                style={{
                  left: `${((zoom - 1) / 3) * 100}%`,
                  top: "50%",
                  transform: "translate(-50%, -50%)",
                  boxShadow: "0 0 4px rgba(0,0,0,0.2)",
                }}
              />
            </div>
          </div>
          <button
            onClick={() => {
              const z = Math.min(4, zoom + 0.25);
              setZoom(z);
              setPos(prev => clampPos(prev.x, prev.y, z));
            }}
            className="p-2 text-text-muted hover:text-text-primary transition"
          >
            <ZoomIn className="h-5 w-5" />
          </button>
          <button
            onClick={() => { setZoom(1); setPos({ x: 0, y: 0 }); }}
            className="p-2 text-text-muted hover:text-text-primary transition"
            title={t("cropReset")}
          >
            <RotateCcw className="h-5 w-5" />
          </button>
        </div>

        {/* Apply button */}
        <button
          onClick={handleCrop}
          disabled={!imgLoaded}
          className="t-btn accept relative w-full !h-10 !text-[0.85rem] disabled:opacity-50"
        >
          {t("cropApply")}
        </button>
      </div>
    </Modal>
  );
}
