"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { X, Search, Music, Check, Link2, Heart } from "lucide-react";
import { MUSIC_LIBRARY } from "@/lib/musicLibrary";

interface MusicPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (youtubeUrl: string) => void;
  currentUrl?: string;
  onRemove?: () => void;
}

interface SearchResult {
  id: string;
  title: string;
  artist: string;
  thumbnail: string;
}

function extractVideoId(url: string): string | null {
  const m = url.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/|music\.youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/
  );
  return m ? m[1] : null;
}

const BRAND_PINK = "lab(49.5493% 79.8381 2.31768)";

function HeartLoader() {
  return (
    <div className="relative flex items-center justify-center" style={{ width: 40, height: 40 }}>
      <svg width="40" height="40" viewBox="0 0 40 40" className="absolute inset-0 -rotate-90">
        <circle cx="20" cy="20" r="18" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="2.5" />
        <circle
          cx="20" cy="20" r="18" fill="none" strokeWidth="2.5" strokeLinecap="round"
          style={{
            stroke: BRAND_PINK,
            strokeDasharray: `${2 * Math.PI * 18}`,
            strokeDashoffset: `${2 * Math.PI * 18 * 0.75}`,
            animation: "spin 1s linear infinite",
            transformOrigin: "center",
          }}
        />
      </svg>
      <Heart className="h-4 w-4 fill-pink-500 text-pink-500" />
    </div>
  );
}

export default function MusicPickerModal({
  isOpen,
  onClose,
  onSelect,
  currentUrl,
  onRemove,
}: MusicPickerModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [customUrl, setCustomUrl] = useState("");
  const [customMode, setCustomMode] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Default curated list
  const defaultTracks: SearchResult[] = MUSIC_LIBRARY.map((t) => ({
    id: t.id,
    title: t.title,
    artist: t.artist,
    thumbnail: `https://img.youtube.com/vi/${t.id}/mqdefault.jpg`,
  }));

  // Initialize selectedId from currentUrl
  useEffect(() => {
    if (isOpen && currentUrl) {
      const vid = extractVideoId(currentUrl);
      if (vid) {
        setSelectedId(vid);
        setCustomMode(false);
      }
    }
  }, [isOpen, currentUrl]);

  // Reset state when closed
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery("");
      setCustomMode(false);
      setCustomUrl("");
      setSearchResults([]);
      setSearching(false);
    }
  }, [isOpen]);

  // Focus search on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // YouTube search with debounce
  const searchYouTube = useCallback(async (query: string) => {
    if (!query || query.length < 2) {
      setSearchResults([]);
      setSearching(false);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setSearching(true);
    try {
      const res = await fetch(
        `/api/youtube-search?q=${encodeURIComponent(query)}`,
        { signal: controller.signal }
      );
      if (!res.ok) throw new Error();
      const data = await res.json();
      if (!controller.signal.aborted) {
        setSearchResults(data.items || []);
      }
    } catch {
      if (!controller.signal.aborted) {
        setSearchResults([]);
      }
    } finally {
      if (!controller.signal.aborted) {
        setSearching(false);
      }
    }
  }, []);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!value || value.length < 2) {
      setSearchResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    debounceRef.current = setTimeout(() => searchYouTube(value), 400);
  };

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      abortRef.current?.abort();
    };
  }, []);

  // ─── Handlers ────────────────────────────────────────────
  const handleSelect = () => {
    if (customMode && customUrl) {
      const isValid =
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/|music\.youtube\.com\/watch\?v=)[a-zA-Z0-9_-]{11}/.test(
          customUrl
        );
      if (!isValid) return;
      onSelect(customUrl);
    } else if (selectedId) {
      onSelect(`https://www.youtube.com/watch?v=${selectedId}`);
    }
  };

  const handleTrackClick = (track: SearchResult) => {
    setSelectedId(track.id);
    setCustomMode(false);
    setCustomUrl("");
  };

  if (!isOpen) return null;

  const hasSelection = customMode
    ? !!customUrl &&
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/|music\.youtube\.com\/watch\?v=)[a-zA-Z0-9_-]{11}/.test(
        customUrl
      )
    : !!selectedId;
  const customUrlValid = customUrl
    ? /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/|music\.youtube\.com\/watch\?v=)[a-zA-Z0-9_-]{11}/.test(
        customUrl
      )
    : false;

  const displayTracks = searchQuery.length >= 2 ? searchResults : defaultTracks;

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-zinc-900 w-full sm:w-[480px] rounded-t-3xl sm:rounded-3xl animate-slide-up sm:animate-scale-in flex flex-col"
        style={{ maxHeight: "75vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-2.5 border-b border-white/10 shrink-0">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Music className="h-4.5 w-4.5 text-pink-400" />
              Müzik Seç
            </h3>
            <p className="text-[11px] text-gray-400 mt-0.5">
              YouTube&apos;da arayın veya listeden seçin
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Kapat"
            className="rounded-full p-1.5 bg-white/10 text-gray-400 hover:text-white hover:bg-white/15 transition-all"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 pt-3 shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-pink-500/50 focus:ring-1 focus:ring-pink-500/30 transition-all"
              placeholder="YouTube'da şarkı ara..."
            />
          </div>
        </div>

        {/* Song List */}
        <div
          className="flex-1 overflow-y-auto px-4 py-2.5 space-y-0.5"
          style={{ minHeight: 0 }}
        >
          {searching && displayTracks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8">
              <HeartLoader />
              <p className="text-xs text-gray-500 mt-3">Aranıyor...</p>
            </div>
          ) : displayTracks.length === 0 && searchQuery.length >= 2 ? (
            <div className="text-center py-8">
              <Music className="h-7 w-7 text-gray-600 mx-auto mb-2" />
              <p className="text-sm text-gray-500">Sonuç bulunamadı</p>
            </div>
          ) : (
            displayTracks.map((track) => {
              const isSelected = selectedId === track.id && !customMode;

              return (
                <button
                  key={track.id}
                  onClick={() => handleTrackClick(track)}
                  className={`w-full flex items-center gap-3 p-2 rounded-xl transition-all text-left ${
                    isSelected ? "bg-pink-500/15" : "hover:bg-white/5"
                  }`}
                >
                  <div className="w-11 h-11 rounded-lg overflow-hidden shrink-0 bg-white/5">
                    <img
                      src={track.thumbnail || `https://img.youtube.com/vi/${track.id}/mqdefault.jpg`}
                      alt=""
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {track.title}
                    </p>
                    <p className="text-[11px] text-gray-400 truncate">
                      {track.artist}
                    </p>
                  </div>

                  {isSelected && (
                    <div className="w-5.5 h-5.5 rounded-full bg-pink-500 flex items-center justify-center shrink-0" style={{ marginRight: 3 }}>
                      <Check className="h-3 w-3 text-white" />
                    </div>
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* Custom URL Section */}
        <div className="px-4 pt-1.5 shrink-0 border-t border-white/5">
          <button
            onClick={() => {
              setCustomMode(!customMode);
              if (!customMode) setSelectedId(null);
            }}
            className="flex items-center gap-2 text-[11px] text-gray-400 hover:text-gray-300 transition-colors py-1.5 w-full"
          >
            <Link2 className="h-3.5 w-3.5" />
            <span>
              {customMode ? "Listeden seç" : "veya YouTube linki yapıştır"}
            </span>
          </button>

          {customMode && (
            <div className="pb-2">
              <input
                type="url"
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-pink-500/50 focus:ring-1 focus:ring-pink-500/30 transition-all"
                placeholder="https://www.youtube.com/watch?v=..."
                autoFocus
              />
              {customUrl && !customUrlValid && (
                <p className="text-[11px] text-red-400 mt-1">
                  Geçerli bir YouTube linki girin
                </p>
              )}
              {customUrl && customUrlValid && (
                <div
                  className="flex items-center gap-3 mt-1.5 rounded-xl p-2"
                  style={{ background: "rgba(255,255,255,0.03)" }}
                >
                  <img
                    src={`https://img.youtube.com/vi/${extractVideoId(customUrl)}/mqdefault.jpg`}
                    alt=""
                    className="w-11 h-11 rounded-lg object-cover shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">
                      YouTube Video
                    </p>
                    <p className="text-white/40 text-[11px] mt-0.5">Özel link</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 pb-4 pt-2 shrink-0 space-y-2.5">
          <p className="text-[10px] text-gray-500 text-center leading-tight">
            Müzik YouTube&apos;dan oynatılır. Telif hakkı sorumluluğu kullanıcıya aittir.
          </p>
          <div className="flex gap-3">
            {(currentUrl || onRemove) && (
              <button
                onClick={() => onRemove?.()}
                className="flex-1 btn-secondary"
                style={{ height: 44, lineHeight: '44px' }}
              >
                Müziği Kaldır
              </button>
            )}
            <button
              onClick={handleSelect}
              disabled={!hasSelection}
              className="flex-1 btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ height: 44, lineHeight: '44px' }}
            >
              Müzik Ekle
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
