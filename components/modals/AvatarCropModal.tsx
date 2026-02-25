"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Minus, Plus } from "lucide-react";
import Modal from "./Modal";

interface AvatarCropModalProps {
  open: boolean;
  onClose: () => void;
  file: File | null;
  onCrop: (croppedFile: File) => void;
}

export default function AvatarCropModal({ open, onClose, file, onCrop }: AvatarCropModalProps) {
  const t = useTranslations("modals");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const areaRef = useRef<HTMLDivElement>(null);

  const [imageLoaded, setImageLoaded] = useState(false);
  const [scale, setScale] = useState(1);
  const [posX, setPosX] = useState(0);
  const [posY, setPosY] = useState(0);
  const [imageWidth, setImageWidth] = useState(0);
  const [imageHeight, setImageHeight] = useState(0);

  const cropSize = 280;
  const maxScale = 3;

  const dragRef = useRef({
    isDragging: false,
    startX: 0,
    startY: 0,
    lastPosX: 0,
    lastPosY: 0,
  });

  const pinchRef = useRef({
    initialDistance: 0,
    initialScale: 1,
  });

  // Load image when file changes
  useEffect(() => {
    if (!file || !open) return;
    setImageLoaded(false);
    setScale(1);
    setPosX(0);
    setPosY(0);

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        imgRef.current = img;
        const imgRatio = img.width / img.height;
        let displayWidth: number, displayHeight: number;

        if (imgRatio > 1) {
          // Landscape: height = cropSize, width scales
          displayHeight = cropSize;
          displayWidth = displayHeight * imgRatio;
        } else {
          // Portrait/square: width = cropSize, height scales
          displayWidth = cropSize;
          displayHeight = displayWidth / imgRatio;
        }

        setImageWidth(displayWidth);
        setImageHeight(displayHeight);
        setImageLoaded(true);
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  }, [file, open]);

  // Constrain position so image always covers crop area
  const constrainPosition = useCallback((px: number, py: number, s: number) => {
    const scaledWidth = imageWidth * s;
    const scaledHeight = imageHeight * s;
    const maxX = Math.max(0, (scaledWidth - cropSize) / 2);
    const maxY = Math.max(0, (scaledHeight - cropSize) / 2);
    return {
      x: Math.max(-maxX, Math.min(maxX, px)),
      y: Math.max(-maxY, Math.min(maxY, py)),
    };
  }, [imageWidth, imageHeight]);

  // Zoom handler
  const handleZoom = useCallback((delta: number) => {
    setScale(prev => {
      const next = Math.max(1, Math.min(maxScale, prev + delta));
      const constrained = constrainPosition(posX, posY, next);
      setPosX(constrained.x);
      setPosY(constrained.y);
      return next;
    });
  }, [constrainPosition, posX, posY]);

  // Mouse drag
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    dragRef.current = { isDragging: true, startX: e.clientX, startY: e.clientY, lastPosX: posX, lastPosY: posY };
  }, [posX, posY]);

  useEffect(() => {
    if (!open) return;
    const onMouseMove = (e: MouseEvent) => {
      const d = dragRef.current;
      if (!d.isDragging) return;
      const nx = d.lastPosX + (e.clientX - d.startX);
      const ny = d.lastPosY + (e.clientY - d.startY);
      const c = constrainPosition(nx, ny, scale);
      setPosX(c.x);
      setPosY(c.y);
    };
    const onMouseUp = () => { dragRef.current.isDragging = false; };
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
  }, [open, scale, constrainPosition]);

  // Touch drag + pinch
  useEffect(() => {
    if (!open || !areaRef.current) return;
    const el = areaRef.current;

    const onTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.touches.length === 1) {
        dragRef.current = { isDragging: true, startX: e.touches[0].clientX, startY: e.touches[0].clientY, lastPosX: posX, lastPosY: posY };
      } else if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        pinchRef.current = { initialDistance: Math.sqrt(dx * dx + dy * dy), initialScale: scale };
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.touches.length === 1 && dragRef.current.isDragging) {
        const d = dragRef.current;
        const nx = d.lastPosX + (e.touches[0].clientX - d.startX);
        const ny = d.lastPosY + (e.touches[0].clientY - d.startY);
        const c = constrainPosition(nx, ny, scale);
        setPosX(c.x);
        setPosY(c.y);
      } else if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const newScale = Math.max(1, Math.min(maxScale, pinchRef.current.initialScale * (dist / pinchRef.current.initialDistance)));
        setScale(newScale);
        const c = constrainPosition(posX, posY, newScale);
        setPosX(c.x);
        setPosY(c.y);
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      e.stopPropagation();
      dragRef.current.isDragging = false;
    };

    el.addEventListener("touchstart", onTouchStart, { passive: false });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd, { passive: false });
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, [open, posX, posY, scale, constrainPosition]);

  // Wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    handleZoom(e.deltaY > 0 ? -0.1 : 0.1);
  }, [handleZoom]);

  // Crop and export — matches WordPress exactly
  const handleCrop = useCallback(() => {
    const img = imgRef.current;
    const canvas = canvasRef.current;
    if (!img || !canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const outputSize = 512;
    canvas.width = outputSize;
    canvas.height = outputSize;

    const scaledW = imageWidth * scale;
    const scaledH = imageHeight * scale;
    const sourceRatio = img.width / imageWidth;

    const cropCenterX = (scaledW / 2) - posX;
    const cropCenterY = (scaledH / 2) - posY;

    const cropLeft = cropCenterX - (cropSize / 2);
    const cropTop = cropCenterY - (cropSize / 2);

    const sx = (cropLeft / scale) * sourceRatio;
    const sy = (cropTop / scale) * sourceRatio;
    const sWidth = (cropSize / scale) * sourceRatio;
    const sHeight = (cropSize / scale) * sourceRatio;

    ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, outputSize, outputSize);

    canvas.toBlob((blob) => {
      if (blob) {
        const croppedFile = new File([blob], "avatar.jpg", { type: "image/jpeg" });
        onCrop(croppedFile);
        onClose();
      }
    }, "image/jpeg", 0.92);
  }, [imageWidth, imageHeight, scale, posX, posY, onCrop, onClose]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t("cropTitle")}
      size="sm"
      zIndex="z-[10000]"
      rightAction={
        <button
          onClick={handleCrop}
          disabled={!imageLoaded}
          className="t-btn accept !h-9 !px-5 !text-[0.82rem] disabled:opacity-40"
        >
          {t("cropApply")}
        </button>
      }
    >
      <div className="flex flex-col items-center py-6 px-4">
        {/* Crop area — matches WordPress .avatar-crop-area */}
        <div
          ref={areaRef}
          className="relative overflow-hidden rounded-full bg-bg-tertiary cursor-grab active:cursor-grabbing"
          style={{ width: cropSize, height: cropSize, touchAction: "none" }}
          onMouseDown={handleMouseDown}
          onWheel={handleWheel}
        >
          {imageLoaded && (
            <div
              className="absolute"
              style={{
                top: "50%",
                left: "50%",
                transform: `translate(${posX}px, ${posY}px) translate(-50%, -50%) scale(${scale})`,
              }}
            >
              <img
                src={imgRef.current?.src}
                alt=""
                draggable={false}
                className="block select-none pointer-events-none"
                style={{
                  width: imageWidth,
                  height: imageHeight,
                  maxWidth: "none",
                }}
              />
            </div>
          )}
          {!imageLoaded && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-accent-main border-t-transparent rounded-full animate-spin" />
            </div>
          )}
          {/* Crop circle overlay */}
          <div className="absolute inset-0 pointer-events-none rounded-full ring-1 ring-inset ring-white/10" />
        </div>

        {/* Zoom controls */}
        <div className="flex items-center gap-4 mt-6 w-full max-w-[280px]">
          <button
            onClick={() => handleZoom(-0.2)}
            className="i-btn !w-10 !h-10 text-text-muted hover:text-text-primary"
          >
            <Minus className="h-4 w-4" />
          </button>
          <input
            type="range"
            min={1}
            max={maxScale}
            step={0.01}
            value={scale}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              setScale(v);
              const c = constrainPosition(posX, posY, v);
              setPosX(c.x);
              setPosY(c.y);
            }}
            className="flex-1 accent-accent-main h-1.5"
          />
          <button
            onClick={() => handleZoom(0.2)}
            className="i-btn !w-10 !h-10 text-text-muted hover:text-text-primary"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Hidden canvas for crop output */}
      <canvas ref={canvasRef} className="hidden" />
    </Modal>
  );
}
