"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { X, Search, Music, Check, Heart } from "lucide-react";
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
      const m = currentUrl.match(
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/|music\.youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/
      );
      if (m?.[1]) setSelectedId(m[1]);
    }
  }, [isOpen, currentUrl]);

  // Reset state when closed
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery("");
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
    if (selectedId) {
      onSelect(`https://www.youtube.com/watch?v=${selectedId}`);
    }
  };

  const handleTrackClick = (track: SearchResult) => {
    setSelectedId(track.id);
  };

  if (!isOpen) return null;

  const displayTracks = searchQuery.length >= 2 ? searchResults : defaultTracks;

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-md z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#1a1520]/65 backdrop-blur-2xl w-full sm:w-[480px] rounded-t-3xl sm:rounded-3xl animate-slide-up sm:animate-scale-in flex flex-col"
        style={{ height: "89vh", maxHeight: "89vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-2.5 border-b border-white/10 shrink-0">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              Müzik Seç
            </h3>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              YouTube&apos;da arayın veya listeden seçin
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Kapat"
            className="rounded-full p-1.5 bg-white/10 text-zinc-400 hover:text-white hover:bg-white/15 transition-all"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 pt-3 shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full bg-white/5 rounded-xl pl-10 pr-4 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-pink-500/30 transition-all"
              placeholder="YouTube'da şarkı ara..."
            />
          </div>
        </div>

        {/* Song List */}
        <div
          className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5"
          style={{ minHeight: 0 }}
        >
          {searching && displayTracks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8">
              <HeartLoader />
              <p className="text-xs text-zinc-500 mt-3">Aranıyor...</p>
            </div>
          ) : displayTracks.length === 0 && searchQuery.length >= 2 ? (
            <div className="text-center py-8">
              <Music className="h-7 w-7 text-zinc-600 mx-auto mb-2" />
              <p className="text-sm text-zinc-500">Sonuç bulunamadı</p>
            </div>
          ) : (
            displayTracks.map((track) => {
              const isSelected = selectedId === track.id;

              return (
                <button
                  key={track.id}
                  onClick={() => handleTrackClick(track)}
                  className={`w-full flex items-center gap-2.5 p-1.5 rounded-xl transition-all text-left ${
                    isSelected ? "bg-pink-500/15" : "hover:bg-white/5"
                  }`}
                >
                  <div className="w-10 h-10 rounded-md overflow-hidden shrink-0 bg-white/5">
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
                    <p className="text-[11px] text-zinc-400 truncate">
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

        {/* Footer */}
        <div className="px-4 pb-4 pt-2.5 shrink-0 border-t border-white/5 space-y-2.5">
          <p className="text-[10px] text-zinc-500 text-center leading-tight">
            Müzik YouTube&apos;dan oynatılır. Telif hakkı sorumluluğu kullanıcıya aittir.
          </p>
          <div className="flex gap-3">
            {(currentUrl || onRemove) && (
              <button
                onClick={() => onRemove?.()}
                className="flex-1 btn-secondary"
              >
                Müziği Kaldır
              </button>
            )}
            <button
              onClick={handleSelect}
              disabled={!selectedId}
              className="flex-1 btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Müzik Ekle
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
