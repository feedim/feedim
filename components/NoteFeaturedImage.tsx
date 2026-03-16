"use client";

import { useMemo, useState } from "react";
import ImageViewer from "@/components/ImageViewer";

interface NoteFeaturedImageProps {
  src: string;
  alt: string;
}

export default function NoteFeaturedImage({ src, alt }: NoteFeaturedImageProps) {
  const [viewerOpen, setViewerOpen] = useState(false);

  const images = useMemo(() => [{ src, alt, caption: "" }], [src, alt]);

  return (
    <>
      <div
        className="mt-[10px] w-full cursor-zoom-in rounded-[20px] overflow-hidden border border-border-primary"
        style={{ borderWidth: "0.9px" }}
      >
        <img
          src={src}
          alt={alt}
          className="block h-auto max-h-[640px] w-full"
          loading="lazy"
          decoding="async"
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
