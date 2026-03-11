"use client";

import { useEffect, useMemo, useState } from "react";
import ImageViewer from "@/components/ImageViewer";

interface NoteFeaturedImageProps {
  src: string;
  alt: string;
}

export default function NoteFeaturedImage({ src, alt }: NoteFeaturedImageProps) {
  const [viewerOpen, setViewerOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const images = useMemo(() => [{ src, alt, caption: "" }], [src, alt]);

  useEffect(() => {
    setLoaded(false);
  }, [src]);

  return (
    <>
      <div
        className={`mt-[10px] w-full cursor-zoom-in rounded-[20px] overflow-hidden ${loaded ? "border border-border-primary" : ""}`}
        style={loaded ? { borderWidth: "0.9px" } : undefined}
      >
        <img
          src={src}
          alt={alt}
          className="block h-auto max-h-[640px] w-full"
          loading="lazy"
          decoding="async"
          onLoad={() => setLoaded(true)}
          onClick={() => setViewerOpen(true)}
        />
      </div>

      <ImageViewer
        images={images}
        initialIndex={0}
        open={viewerOpen}
        onClose={() => setViewerOpen(false)}
      />
    </>
  );
}
