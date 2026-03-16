"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Search, X } from "lucide-react";

import { useTranslations } from "next-intl";
import Modal from "./Modal";


interface GifPickerPanelProps {
  onGifSelect: (gifUrl: string, previewUrl: string) => void;
  onClose: () => void;
}

interface GiphyGif {
  id: string;
  images: {
    fixed_width_downsampled: { url: string; width: string; height: string; webp?: string };
    fixed_width?: { url: string; width: string; height: string; webp?: string; mp4?: string };
    fixed_width_small_still: { url: string; width: string; height: string };
    original: { url: string };
  };
  title: string;
}

const GIPHY_KEY = "GlVGYHkr3WSBnllca54iNt0yFbjz7L65";

/* ── Lazy + hover-animated GIF thumbnail ── */
function GifThumb({ gif, onSelect }: { gif: GiphyGif; onSelect: () => void }) {
  const ref = useRef<HTMLButtonElement>(null);
  const [visible, setVisible] = useState(false);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); io.disconnect(); } },
      { rootMargin: "200px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const still = gif.images.fixed_width_small_still;
  const animatedPreview = gif.images.fixed_width?.webp || gif.images.fixed_width_downsampled.webp || gif.images.fixed_width_downsampled.url;
  const w = Number(still.width) || 200;
  const h = Number(still.height) || 200;

  return (
    <button
      ref={ref}
      onClick={onSelect}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      className="mb-2 w-full rounded-xl overflow-hidden hover:opacity-90 active:scale-[0.97] transition break-inside-avoid block border border-border-primary"
      style={{ aspectRatio: `${w}/${h}`, borderWidth: "0.9px" }}
    >
      {visible && (
        <img
          src={hovered ? animatedPreview : still.url}
          alt={gif.title}
          decoding="async"
          className="w-full h-full object-cover block"
        />
      )}
    </button>
  );
}

export default function GifPickerPanel({ onGifSelect, onClose }: GifPickerPanelProps) {
  const t = useTranslations("modals");
  const [query, setQuery] = useState("");
  const [gifs, setGifs] = useState<GiphyGif[]>([]);
  const [loading, setLoading] = useState(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchGifs = useCallback(async (searchQuery: string) => {
    setLoading(true);
    try {
      const endpoint = searchQuery.trim()
        ? `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_KEY}&q=${encodeURIComponent(searchQuery.trim())}&limit=20&rating=g&lang=tr`
        : `https://api.giphy.com/v1/gifs/trending?api_key=${GIPHY_KEY}&limit=20&rating=g`;
      const res = await fetch(endpoint);
      const data = await res.json();
      setGifs(data.data || []);
    } catch {
      setGifs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGifs("");
  }, [fetchGifs]);

  const handleSearchChange = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchGifs(value), 300);
  };

  const giphyFooter = (
    <div className="px-3 py-2 border-t border-border-primary flex items-center justify-center">
      <span className="text-[0.65rem] text-text-muted">Powered by GIPHY</span>
    </div>
  );

  const getOptimizedGifUrl = useCallback((gif: GiphyGif) => {
    return gif.images.fixed_width?.webp
      || gif.images.fixed_width_downsampled.webp
      || gif.images.fixed_width?.url
      || gif.images.fixed_width_downsampled.url
      || gif.images.original.url;
  }, []);

  return (
    <Modal open={true} onClose={onClose} title={t("gifTitle")} size="sm" zIndex="z-[10001]" footer={giphyFooter} infoText={t("gifPickerInfo")}>
      {/* Search bar */}
      <div className="sticky top-0 z-10 bg-bg-secondary px-4 py-2.5 border-b border-border-primary">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted pointer-events-none z-10" />
          <input
            type="text"
            value={query}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder={t("gifSearchPlaceholder")}
            className="input-modern w-full !pl-10 pr-9 py-2.5 text-[0.9rem]"
          />
          {query && (
            <button
              onClick={() => { setQuery(""); fetchGifs(""); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition"
              aria-label={t("clear")}
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* GIF grid */}
      <div className="p-2.5">
        {loading ? (
          <div className="columns-2 gap-2">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="mb-2 w-full rounded-xl bg-bg-tertiary animate-pulse" style={{ aspectRatio: i % 2 === 0 ? "4/3" : "3/4" }} />
            ))}
          </div>
        ) : gifs.length === 0 ? (
          <div className="flex items-center justify-center h-[200px] text-[0.74rem] text-text-muted">
            {t("gifNotFound")}
          </div>
        ) : (
          <div className="columns-2 gap-2">
            {gifs.map((gif) => (
              <GifThumb
                key={gif.id}
                gif={gif}
                onSelect={() => onGifSelect(getOptimizedGifUrl(gif), gif.images.fixed_width_small_still.url)}
              />
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}
