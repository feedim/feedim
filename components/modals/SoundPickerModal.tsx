"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslations } from "next-intl";
import { Search, TrendingUp, Upload, Music, X } from "lucide-react";
import Modal from "./Modal";
import SoundPreviewButton from "@/components/SoundPreviewButton";
import { feedimAlert } from "@/components/FeedimAlert";
import { AUDIO_MAX_SIZE_MB, AUDIO_MAX_DURATION } from "@/lib/constants";
import { formatCount } from "@/lib/utils";


export interface SoundItem {
  id: number;
  title: string;
  artist?: string | null;
  audio_url: string;
  duration?: number | null;
  usage_count?: number;
  cover_image_url?: string | null;
  is_original?: boolean;
  status?: string;
}

interface SoundPickerModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (sound: SoundItem) => void;
}

type Tab = "popular" | "search" | "upload";

export default function SoundPickerModal({ open, onClose, onSelect }: SoundPickerModalProps) {
  const t = useTranslations("modals");
  const [tab, setTab] = useState<Tab>("popular");
  const [sounds, setSounds] = useState<SoundItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Upload state
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadArtist, setUploadArtist] = useState("");
  const [uploadDuration, setUploadDuration] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchSounds = useCallback(async (query?: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "20" });
      if (query?.trim()) params.set("q", query.trim());
      else params.set("sort", "popular");
      const res = await fetch(`/api/sounds?${params}`);
      const data = await res.json();
      setSounds(data.sounds || []);
    } catch {
      setSounds([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    if (tab === "popular") fetchSounds();
  }, [open, tab, fetchSounds]);

  useEffect(() => {
    if (tab !== "search") return;
    clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      fetchSounds(searchQuery);
    }, 300);
    return () => clearTimeout(searchTimerRef.current);
  }, [searchQuery, tab, fetchSounds]);

  const fmtDuration = (s?: number | null) => {
    if (!s) return "";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const validateAudioDuration = (file: File): Promise<number> => {
    return new Promise((resolve, reject) => {
      const audio = document.createElement("audio");
      audio.preload = "metadata";
      const url = URL.createObjectURL(file);
      audio.onloadedmetadata = () => {
        URL.revokeObjectURL(url);
        if (audio.duration > AUDIO_MAX_DURATION) {
          reject(new Error(t("soundMaxDurationError", { duration: AUDIO_MAX_DURATION })));
        } else {
          resolve(Math.round(audio.duration));
        }
      };
      audio.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error(t("soundReadError")));
      };
      audio.src = url;
    });
  };

  const computeAudioHash = async (file: File): Promise<string> => {
    try {
      const buffer = await file.arrayBuffer();
      const hash = await crypto.subtle.digest("SHA-256", buffer);
      return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, "0")).join("");
    } catch {
      return "";
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    if (!file.type.startsWith("audio/")) {
      feedimAlert("error", t("soundUnsupportedFormat"));
      return;
    }
    if (file.size > AUDIO_MAX_SIZE_MB * 1024 * 1024) {
      feedimAlert("error", t("soundMaxSizeError", { size: AUDIO_MAX_SIZE_MB }));
      return;
    }

    try {
      const duration = await validateAudioDuration(file);
      setUploadFile(file);
      setUploadDuration(duration);
      setUploadTitle(file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " "));
    } catch (err) {
      feedimAlert("error", (err as Error).message);
    }
  };

  const handleUploadAndCreate = async () => {
    if (!uploadFile || !uploadTitle.trim()) return;
    setUploading(true);
    setUploadProgress(0);

    try {
      // 1. Get presigned URL
      const initRes = await fetch("/api/upload/audio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: uploadFile.name,
          contentType: uploadFile.type || "audio/mpeg",
          fileSize: uploadFile.size,
        }),
      });
      const initData = await initRes.json();
      if (!initRes.ok) throw new Error(initData.error || t("soundUploadInitFailed"));

      const { uploadUrl, publicUrl } = initData;

      // 2. Upload to R2
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", uploadUrl);
        xhr.setRequestHeader("Content-Type", uploadFile.type || "audio/mpeg");
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) setUploadProgress(Math.round((e.loaded / e.total) * 80));
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve();
          else reject(new Error(t("soundUploadFailed")));
        };
        xhr.onerror = () => reject(new Error(t("soundUploadFailed")));
        xhr.send(uploadFile);
      });

      setUploadProgress(85);

      // 3. Compute hash
      const audioHash = await computeAudioHash(uploadFile);
      setUploadProgress(90);

      // 4. Create sound record
      const createRes = await fetch("/api/sounds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: uploadTitle.trim(),
          artist: uploadArtist.trim() || null,
          audio_url: publicUrl,
          duration: uploadDuration,
          audio_hash: audioHash || null,
        }),
      });
      const createData = await createRes.json();
      if (!createRes.ok) throw new Error(createData.error || t("soundCreateFailed"));

      setUploadProgress(100);

      if (createData.deduplicated) {
        feedimAlert("info", t("soundAlreadyExists"));
      }

      onSelect(createData.sound);
      onClose();
    } catch (err) {
      feedimAlert("error", (err as Error).message || t("soundUploadFailed"));
    } finally {
      setUploading(false);
    }
  };

  const resetUpload = () => {
    setUploadFile(null);
    setUploadTitle("");
    setUploadArtist("");
    setUploadDuration(0);
    setUploadProgress(0);
  };

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: "popular", label: t("soundPopular"), icon: <TrendingUp className="h-4 w-4" /> },
    { key: "search", label: t("soundSearch"), icon: <Search className="h-4 w-4" /> },
    { key: "upload", label: t("soundUpload"), icon: <Upload className="h-4 w-4" /> },
  ];

  return (
    <Modal open={open} onClose={onClose} title={t("soundPickerTitle")} size="md" fullHeight infoText={t("soundPickerInfoText")}>
      <div className="flex flex-col h-full">
        {/* Tab bar */}
        <div className="flex border-b border-border-primary px-4 gap-1">
          {tabs.map(tb => (
            <button
              key={tb.key}
              onClick={() => { setTab(tb.key); if (tb.key === "upload") resetUpload(); }}
              className={`flex items-center gap-1.5 px-3 py-2.5 text-sm font-bold transition border-b-[2.5px] -mb-px ${
                tab === tb.key
                  ? "border-accent-main text-text-primary"
                  : "border-transparent text-text-muted opacity-60 hover:opacity-100 hover:text-text-primary"
              }`}
            >
              {tb.icon}
              {tb.label}
            </button>
          ))}
        </div>

        {/* Search input */}
        {tab === "search" && (
          <div className="px-4 py-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted pointer-events-none z-10" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={t("soundSearchPlaceholder")}
                className="input-modern w-full !pl-10"
                autoFocus
              />
            </div>
          </div>
        )}

        {/* Sound list */}
        {(tab === "popular" || tab === "search") && (
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-32"><span className="loader" style={{ width: 22, height: 22 }} /></div>
            ) : sounds.length === 0 ? (
              <div className="text-center py-12 text-text-muted text-[0.74rem]">
                {tab === "search" && searchQuery ? t("soundNoResults") : t("soundNoSounds")}
              </div>
            ) : (
              <div className="divide-y divide-border-primary">
                {sounds.map(sound => (
                  <div
                    key={sound.id}
                    onClick={() => { onSelect(sound); onClose(); }}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-bg-tertiary transition text-left cursor-pointer"
                    role="button"
                    tabIndex={0}
                  >
                    {/* Cover / icon */}
                    <div className="w-11 h-11 rounded-lg bg-bg-tertiary flex items-center justify-center shrink-0 overflow-hidden">
                      {sound.cover_image_url ? (
                        <img src={sound.cover_image_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <Music className="h-5 w-5 text-text-muted" />
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{sound.title}</p>
                      <div className="flex items-center gap-2 text-xs text-text-muted mt-0.5">
                        {sound.artist && <span className="truncate">{sound.artist}</span>}
                        {sound.duration ? <span>{fmtDuration(sound.duration)}</span> : null}
                        <span>{t("soundUsageCount", { count: formatCount(sound.usage_count || 0) })}</span>
                      </div>
                    </div>

                    {/* Preview */}
                    <SoundPreviewButton audioUrl={sound.audio_url} />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Upload tab */}
        {tab === "upload" && (
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
            {!uploadFile ? (
              <label className="flex flex-col items-center justify-center h-40 border-2 border-dashed border-border-primary hover:border-accent-main/50 rounded-xl cursor-pointer transition">
                <Upload className="h-8 w-8 text-text-muted mb-2" />
                <p className="text-sm font-medium">{t("soundSelectFile")}</p>
                <p className="text-xs text-text-muted mt-1">
                  {t("soundMaxSize", { size: AUDIO_MAX_SIZE_MB, duration: AUDIO_MAX_DURATION })}
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="audio/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </label>
            ) : (
              <>
                <div className="flex items-center gap-3 p-3 bg-bg-tertiary rounded-xl">
                  <div className="w-10 h-10 rounded-lg bg-accent-main/10 flex items-center justify-center shrink-0">
                    <Music className="h-5 w-5 text-accent-main" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{uploadFile.name}</p>
                    <p className="text-xs text-text-muted">
                      {fmtDuration(uploadDuration)} &middot; {(uploadFile.size / (1024 * 1024)).toFixed(1)}MB
                    </p>
                  </div>
                  <button onClick={resetUpload} className="p-1.5 hover:bg-bg-secondary rounded-full">
                    <X className="h-4 w-4 text-text-muted" />
                  </button>
                </div>

                <div>
                  <label className="block text-xs text-text-muted mb-1.5">{t("soundTitle")}</label>
                  <input
                    type="text"
                    value={uploadTitle}
                    onChange={e => setUploadTitle(e.target.value)}
                    placeholder={t("soundTitlePlaceholder")}
                    maxLength={100}
                    className="input-modern w-full"
                  />
                </div>

                <div>
                  <label className="block text-xs text-text-muted mb-1.5">{t("soundArtist")}</label>
                  <input
                    type="text"
                    value={uploadArtist}
                    onChange={e => setUploadArtist(e.target.value)}
                    placeholder={t("soundArtistPlaceholder")}
                    maxLength={100}
                    className="input-modern w-full"
                  />
                </div>

                {uploading && (
                  <div>
                    <div className="w-full h-2 bg-bg-tertiary rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%`, backgroundColor: "var(--accent-color)" }}
                      />
                    </div>
                    <p className="text-xs text-text-muted text-center mt-1">%{uploadProgress}</p>
                  </div>
                )}

                <button
                  onClick={handleUploadAndCreate}
                  disabled={uploading || !uploadTitle.trim()}
                  className="t-btn accept w-full !h-10 !text-sm disabled:opacity-40"
                  aria-label={t("soundUploadAndUse")}
                >
                  {uploading ? (
                    <span className="loader" style={{ width: 16, height: 16 }} />
                  ) : (
                    t("soundUploadAndUse")
                  )}
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
