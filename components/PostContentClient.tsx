"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import ImageViewer from "./ImageViewer";

interface PostContentClientProps {
  html: string;
  className?: string;
  featuredImage?: { src: string; alt: string };
}

export default function PostContentClient({ html, className, featuredImage }: PostContentClientProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerImages, setViewerImages] = useState<{ src: string; alt: string; caption?: string }[]>([]);
  const [viewerIndex, setViewerIndex] = useState(0);

  // Set lazy loading on images + nofollow on external links
  useEffect(() => {
    if (!contentRef.current) return;
    contentRef.current.querySelectorAll('img').forEach(img => {
      img.loading = 'lazy';
      img.decoding = 'async';
    });
    // Add nofollow to all external links
    contentRef.current.querySelectorAll('a[href]').forEach(link => {
      const a = link as HTMLAnchorElement;
      try {
        const url = new URL(a.href, window.location.origin);
        if (url.hostname && url.hostname !== window.location.hostname) {
          a.rel = 'nofollow noopener noreferrer';
          a.target = '_blank';
        }
      } catch {}
    });
  }, [html]);

  const collectAndOpen = useCallback((clickedSrc: string) => {
    const container = contentRef.current;
    const images: { src: string; alt: string; caption?: string }[] = [];

    // Add featured image first if exists
    if (featuredImage) {
      images.push({ src: featuredImage.src, alt: featuredImage.alt, caption: "" });
    }

    // Collect content images
    if (container) {
      const allImgs = Array.from(container.querySelectorAll("img"));
      allImgs
        .filter(el => el.src && !el.src.includes("default-avatar") && !el.src.includes("emoji"))
        .forEach(el => {
          const fig = el.closest("figure");
          const caption = fig?.querySelector("figcaption")?.textContent || "";
          images.push({ src: el.src, alt: el.alt || "", caption });
        });
    }

    if (images.length === 0) return;

    const clickedIdx = images.findIndex(i => i.src === clickedSrc);
    if (clickedIdx === -1) return;

    setViewerImages(images);
    setViewerIndex(clickedIdx);
    setViewerOpen(true);
  }, [featuredImage]);

  const handleContentClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;

    // Handle image clicks
    if (target.tagName === "IMG") {
      const img = target as HTMLImageElement;
      if (img.src) collectAndOpen(img.src);
      return;
    }

    // Handle external link clicks → redirect to /leaving page
    const link = target.closest("a") as HTMLAnchorElement | null;
    if (link?.href) {
      try {
        const url = new URL(link.href, window.location.origin);
        if (url.hostname && url.hostname !== window.location.hostname) {
          e.preventDefault();
          window.location.href = `/leaving?url=${encodeURIComponent(link.href)}`;
        }
      } catch {}
    }
  }, [collectAndOpen]);

  const handleFeaturedClick = useCallback(() => {
    if (featuredImage) collectAndOpen(featuredImage.src);
  }, [featuredImage, collectAndOpen]);

  return (
    <>
      {/* Featured Image — visually hidden but kept in DOM for SEO crawlers */}
      {featuredImage && (
        <div
          className="h-0 overflow-hidden"
          aria-hidden="true"
        >
          <img
            src={featuredImage.src}
            alt={featuredImage.alt}
            className="w-full h-auto"
            loading="lazy"
          />
        </div>
      )}

      {/* Content */}
      <div
        ref={contentRef}
        data-post-content
        className={className}
        dangerouslySetInnerHTML={{ __html: html }}
        onClick={handleContentClick}
      />

      <ImageViewer
        images={viewerImages}
        initialIndex={viewerIndex}
        open={viewerOpen}
        onClose={() => setViewerOpen(false)}
      />
    </>
  );
}
