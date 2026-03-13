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

  // Set lazy loading on images, hide duplicate featured image, nofollow external links
  useEffect(() => {
    if (!contentRef.current) return;
    // Legacy/boş caption kalıntılarını temizle
    contentRef.current.querySelectorAll(".image-caption").forEach((caption) => {
      const text = (caption.textContent || "").replace(/\u00A0/g, " ").trim();
      if (!text) caption.remove();
    });

    const imgs = contentRef.current.querySelectorAll('img');
    imgs.forEach(img => {
      img.loading = 'lazy';
      img.decoding = 'async';

      // Skeleton → blur → clear for content images
      const wrapper = img.closest('.image-wrapper') || img.parentElement;
      if (!wrapper || (wrapper as HTMLElement).dataset.skeletonReady) return;
      (wrapper as HTMLElement).dataset.skeletonReady = '1';
      const wrapperEl = wrapper as HTMLElement;
      wrapperEl.style.position = 'relative';

      // Skeleton overlay
      const skeleton = document.createElement('div');
      skeleton.style.cssText = 'position:absolute;inset:0;background:var(--bg-secondary);border-radius:12px;transition:opacity 250ms ease;z-index:1';
      skeleton.className = 'animate-pulse';
      wrapperEl.insertBefore(skeleton, wrapperEl.firstChild);

      // Keep reveal soft and neutral; the skeleton handles loading feedback.
      img.style.opacity = '0';
      img.style.transition = 'opacity 220ms ease';

      const reveal = () => {
        skeleton.style.opacity = '0';
        skeleton.style.pointerEvents = 'none';
        img.style.opacity = '1';
        setTimeout(() => skeleton.remove(), 300);
      };

      if (img.complete && img.naturalWidth > 0) {
        reveal();
      } else {
        img.addEventListener('load', reveal, { once: true });
      }
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
            data-src={featuredImage.src}
            alt={featuredImage.alt}
            className="lazyload w-full h-auto"
            suppressHydrationWarning
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
