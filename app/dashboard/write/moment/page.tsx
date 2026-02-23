"use client";

import { Suspense, useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { X, Plus, Upload, Film, Music } from "lucide-react";
import PostMetaFields from "@/components/PostMetaFields";
import VideoPlayer from "@/components/VideoPlayer";
import { createClient } from "@/lib/supabase/client";
import { emitNavigationStart } from "@/lib/navigationProgress";
import { feedimAlert } from "@/components/FeedimAlert";
import {
  VALIDATION,
  MOMENT_MAX_DURATION,
  MOMENT_MAX_SIZE_MB,
} from "@/lib/constants";
import { formatCount } from "@/lib/utils";
import { useUser } from "@/components/UserContext";
import AppLayout from "@/components/AppLayout";
import CropModal from "@/components/modals/CropModal";
import SoundPickerModal, { type SoundItem } from "@/components/modals/SoundPickerModal";
import SoundPreviewButton from "@/components/SoundPreviewButton";

interface Tag {
  id: number | string;
  name: string;
  slug: string;
  post_count?: number;
  virtual?: boolean;
}

export default function MomentWritePage() {
  return (
    <Suspense
      fallback={
        <AppLayout hideRightSidebar>
          <div className="py-16 text-center">
            <span className="loader mx-auto" style={{ width: 24, height: 24 }} />
          </div>
        </AppLayout>
      }
    >
      <MomentWriteContent />
    </Suspense>
  );
}

function MomentWriteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const { user } = useUser();

  const videoInputRef = useRef<HTMLInputElement>(null);
  const thumbInputRef = useRef<HTMLInputElement>(null);
  const previewVideoRef = useRef<HTMLVideoElement>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  const [step, setStep] = useState(1);
  const [isEditMode, setIsEditMode] = useState(false);
  const [loadingDraft, setLoadingDraft] = useState(false);

  // Video
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState("");
  const [videoDuration, setVideoDuration] = useState(0);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const uploadAbortRef = useRef<AbortController | null>(null);

  // Content (Step 2)
  const [title, setTitle] = useState("");
  const [tags, setTags] = useState<Tag[]>([]);
  const [tagSearch, setTagSearch] = useState("");
  const [tagSuggestions, setTagSuggestions] = useState<Tag[]>([]);
  const [tagHighlight, setTagHighlight] = useState(-1);
  const [tagCreating, setTagCreating] = useState(false);
  const [popularTags, setPopularTags] = useState<Tag[]>([]);
  const [thumbnail, setThumbnail] = useState("");
  const [allowComments, setAllowComments] = useState(true);
  const [isForKids, setIsForKids] = useState(false);
  const [copyrightProtected, setCopyrightProtected] = useState(false);
  const [frameHashes, setFrameHashes] = useState<{ frameIndex: number; hash: string }[]>([]);
  const [audioHashes, setAudioHashes] = useState<{ chunkIndex: number; hash: string }[]>([]);
  const [cropSrc, setCropSrc] = useState<string | null>(null);

  // Sound
  const [selectedSound, setSelectedSound] = useState<SoundItem | null>(null);
  const [soundModalOpen, setSoundModalOpen] = useState(false);
  const [useOriginalSound, setUseOriginalSound] = useState(true);

  // SEO meta
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [metaKeywords, setMetaKeywords] = useState("");
  const [metaExpanded, setMetaExpanded] = useState(false);

  // State
  const [savingAs, setSavingAs] = useState<"draft" | "published" | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [draftId, setDraftId] = useState<number | null>(null);

  useEffect(() => {
    if (title.trim() || videoUrl) setHasUnsavedChanges(true);
  }, [title, videoUrl]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges && (title.trim() || videoUrl)) e.preventDefault();
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges, title, videoUrl]);

  // Load edit mode
  useEffect(() => {
    const editId = searchParams.get("edit");
    if (editId) {
      setIsEditMode(true);
      setStep(2);
      loadDraft(editId);
    }
  }, []);

  const loadDraft = async (slug: string) => {
    setLoadingDraft(true);
    try {
      const res = await fetch(`/api/posts/${slug}`);
      const data = await res.json();
      if (res.ok && data.post) {
        setTitle(data.post.title || "");
        setDraftId(data.post.id);
        setVideoUrl(data.post.video_url || "");
        setVideoDuration(data.post.video_duration || 0);
        setThumbnail(data.post.video_thumbnail || data.post.featured_image || "");
        setAllowComments(data.post.allow_comments !== false);
        setIsForKids(data.post.is_for_kids === true);
        setCopyrightProtected(data.post.copyright_protected === true);
        if (data.post.meta_title) setMetaTitle(data.post.meta_title);
        if (data.post.meta_description) setMetaDescription(data.post.meta_description);
        if (data.post.meta_keywords) setMetaKeywords(data.post.meta_keywords);
        const postTags = (data.post.post_tags || [])
          .map((pt: { tags: Tag }) => pt.tags)
          .filter(Boolean);
        setTags(postTags);
        // Sound
        const sound = data.post.sounds || (Array.isArray(data.post.sounds) ? data.post.sounds[0] : null);
        if (sound) {
          if (sound.is_original) {
            setUseOriginalSound(true);
            setSelectedSound(null);
          } else {
            setSelectedSound(sound);
            setUseOriginalSound(false);
          }
        }
      }
    } catch {
      feedimAlert("error", "Taslak yüklenemedi");
    } finally {
      setLoadingDraft(false);
    }
  };

  // Sync preview video with selected sound (editor-like preview)
  useEffect(() => {
    // Small delay to ensure video ref is mounted after render
    const timer = setTimeout(() => {
      const video = previewVideoRef.current;
      if (!video) return;

      if (selectedSound) {
        // VideoPlayer manages video muted/volume — only manage the sound overlay audio

        // Create audio element for selected sound
        const audio = new Audio();
        audio.src = selectedSound.audio_url;
        audio.loop = true;
        audio.preload = "auto";
        previewAudioRef.current = audio;

        // Sync play/pause/seek with video
        const onPlay = () => {
          if (audio.duration) {
            audio.currentTime = video.currentTime % audio.duration;
          }
          audio.play().catch(() => {});
        };
        const onPause = () => audio.pause();
        const onSeeked = () => {
          if (!video.paused && audio.duration) {
            audio.currentTime = video.currentTime % audio.duration;
          }
        };
        const onEnded = () => {
          // If video loops or ends, sync audio
          audio.pause();
          audio.currentTime = 0;
        };

        video.addEventListener("play", onPlay);
        video.addEventListener("pause", onPause);
        video.addEventListener("seeked", onSeeked);
        video.addEventListener("ended", onEnded);

        // If video is already playing, start audio now
        if (!video.paused) {
          audio.play().catch(() => {});
        }

        // Store cleanup
        const cleanup = () => {
          video.removeEventListener("play", onPlay);
          video.removeEventListener("pause", onPause);
          video.removeEventListener("seeked", onSeeked);
          video.removeEventListener("ended", onEnded);
          audio.pause();
          audio.src = "";
          previewAudioRef.current = null;
        };

        // Attach cleanup to ref for external access
        (previewAudioRef as any)._cleanup = cleanup;
      } else {
        // Stop and clean up audio
        if (previewAudioRef.current) {
          previewAudioRef.current.pause();
          previewAudioRef.current.src = "";
          previewAudioRef.current = null;
        }
      }
    }, 50);

    return () => {
      clearTimeout(timer);
      // Cleanup previous audio on re-run
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
        previewAudioRef.current.src = "";
        previewAudioRef.current = null;
      }
      // Cleanup audio on effect re-run
    };
  }, [selectedSound, videoPreviewUrl, videoUrl]);

  // Validate video duration & orientation
  const validateVideo = (file: File): Promise<{ duration: number; isVertical: boolean }> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement("video");
      video.preload = "metadata";
      video.muted = true;
      video.playsInline = true;
      const url = URL.createObjectURL(file);
      let settled = false;

      const finish = (dur: number, w: number, h: number) => {
        if (settled) return;
        settled = true;
        URL.revokeObjectURL(url);
        if (dur && isFinite(dur) && dur > MOMENT_MAX_DURATION) {
          reject(new Error(`Moment en fazla ${MOMENT_MAX_DURATION} saniye olabilir`));
        } else {
          const isVertical = h >= w;
          resolve({ duration: dur && isFinite(dur) ? Math.round(dur) : 0, isVertical });
        }
      };

      const fail = (msg: string) => {
        if (settled) return;
        settled = true;
        URL.revokeObjectURL(url);
        reject(new Error(msg));
      };

      video.onloadedmetadata = () => finish(video.duration, video.videoWidth, video.videoHeight);
      video.onloadeddata = () => { if (!settled) finish(video.duration, video.videoWidth, video.videoHeight); };
      video.oncanplay = () => { if (!settled) finish(video.duration, video.videoWidth, video.videoHeight); };
      video.onerror = () => fail("Video dosyası okunamadı");
      setTimeout(() => { if (!settled) finish(0, 0, 0); }, 20000);

      video.src = url;
      video.load();
    });
  };

  // Auto-generate thumbnail from first frame
  const generateThumbnail = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement("video");
      video.preload = "auto";
      video.muted = true;
      video.playsInline = true;
      video.setAttribute("playsinline", "");
      video.setAttribute("webkit-playsinline", "");
      const url = URL.createObjectURL(file);
      let settled = false;

      const cleanup = () => { URL.revokeObjectURL(url); };

      const tryCapture = () => {
        if (settled) return;
        settled = true;
        try {
          const w = video.videoWidth || 640;
          const h = video.videoHeight || 360;
          const canvas = document.createElement("canvas");
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext("2d");
          if (!ctx) { cleanup(); reject(new Error("Canvas failed")); return; }
          ctx.drawImage(video, 0, 0, w, h);
          const pixel = ctx.getImageData(0, 0, 1, 1).data;
          if (pixel[0] === 0 && pixel[1] === 0 && pixel[2] === 0 && pixel[3] === 0) {
            cleanup(); reject(new Error("Blank frame"));
            return;
          }
          const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
          cleanup();
          resolve(dataUrl);
        } catch {
          cleanup();
          reject(new Error("Thumbnail oluşturulamadı"));
        }
      };

      const onFrameReady = () => {
        if (video.duration > 1 && video.currentTime < 0.5) {
          video.currentTime = 1;
        } else {
          tryCapture();
        }
      };
      video.onloadeddata = onFrameReady;
      video.oncanplay = () => { if (!settled) onFrameReady(); };
      video.onseeked = () => tryCapture();
      video.onerror = () => { if (!settled) { settled = true; cleanup(); reject(new Error("Video okunamadı")); } };
      setTimeout(() => { if (!settled) { settled = true; cleanup(); reject(new Error("Timeout")); } }, 20000);

      video.src = url;
      video.load();
    });
  };

  const handleVideoSelect = async (file: File) => {
    if (!file.type.startsWith("video/")) {
      feedimAlert("error", "Desteklenmeyen format. Geçerli bir video dosyası seçin");
      return;
    }
    if (file.size > MOMENT_MAX_SIZE_MB * 1024 * 1024) {
      feedimAlert("error", `Video en fazla ${MOMENT_MAX_SIZE_MB}MB olabilir`);
      return;
    }

    let result: { duration: number; isVertical: boolean };
    try {
      result = await validateVideo(file);
    } catch (err) {
      feedimAlert("error", (err as Error).message);
      return;
    }

    if (!result.isVertical && result.duration > 0) {
      feedimAlert("error", "Moment için dikey (9:16) video gerekli. Lütfen dikey formatta bir video seçin");
      return;
    }

    setVideoFile(file);
    setVideoDuration(result.duration);
    setVideoPreviewUrl(URL.createObjectURL(file));
    // Start upload state immediately — overlay shows from the start, video stays muted & disabled
    setUploading(true);
    setUploadProgress(0);

    try {
      const thumb = await generateThumbnail(file);
      setThumbnail(thumb);
    } catch { /* user can add manually */ }

    // Extract video frame hashes for copyright check (non-blocking)
    import("@/lib/videoFrameHash")
      .then(({ extractVideoFrameHashes }) => extractVideoFrameHashes(file))
      .then(hashes => setFrameHashes(hashes.map(fh => ({ frameIndex: fh.frameIndex, hash: fh.hash }))))
      .catch(() => { /* frame hash extraction failed, continue without */ });

    // Extract audio fingerprint for copyright check (non-blocking)
    import("@/lib/audioFingerprint")
      .then(({ extractAudioFingerprint }) => extractAudioFingerprint(file))
      .then(hashes => setAudioHashes(hashes.map(ah => ({ chunkIndex: ah.chunkIndex, hash: ah.hash }))))
      .catch(() => { /* audio fingerprint extraction failed, continue without */ });

    // Optimize MP4 for instant playback (defragment fMP4 or move moov atom)
    let uploadFile = file;
    try {
      const { optimizeVideo } = await import("@/lib/videoOptimize");
      uploadFile = await optimizeVideo(file);
    } catch { /* optimization failed, upload original */ }

    uploadVideo(uploadFile);
  };

  const uploadVideo = async (file: File) => {
    const abort = new AbortController();
    uploadAbortRef.current = abort;
    setUploading(true);
    setUploadProgress(0);

    try {
      const initRes = await fetch("/api/upload/video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type || "video/mp4",
          fileSize: file.size,
        }),
        signal: abort.signal,
      });
      const initData = await initRes.json();
      if (!initRes.ok) throw new Error(initData.error || "Upload başlatılamadı");

      const { uploadUrl, publicUrl } = initData;

      await new Promise<void>((resolve, reject) => {
        const ct = file.type || "video/mp4";
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", uploadUrl);
        xhr.setRequestHeader("Content-Type", ct);

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            setUploadProgress(Math.round((e.loaded / e.total) * 95));
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve();
          else reject(new Error(`Yükleme başarısız (${xhr.status})`));
        };

        xhr.onerror = () => reject(new Error("Video yüklenemedi"));
        xhr.onabort = () => reject(new DOMException("Upload iptal edildi", "AbortError"));

        abort.signal.addEventListener("abort", () => xhr.abort());
        xhr.send(file);
      });

      setVideoUrl(publicUrl);
      setUploadProgress(100);
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      feedimAlert("error", (err as Error).message || "Video yüklenemedi");
      setVideoFile(null);
      setVideoPreviewUrl("");
      setVideoDuration(0);
    } finally {
      uploadAbortRef.current = null;
      setUploading(false);
    }
  };

  const handleVideoInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleVideoSelect(file);
    e.target.value = "";
  };

  const handleVideoDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = Array.from(e.dataTransfer.files).find(f => f.type.startsWith("video/"));
    if (file) handleVideoSelect(file);
  };

  const removeVideo = () => {
    if (uploadAbortRef.current) uploadAbortRef.current.abort();
    setVideoFile(null);
    setVideoUrl("");
    setVideoPreviewUrl("");
    setVideoDuration(0);
    setUploadProgress(0);
    setUploading(false);
    setThumbnail("");
  };

  // Tags
  useEffect(() => {
    if (step === 2 && popularTags.length === 0) loadPopularTags();
  }, [step]);

  const loadPopularTags = async () => {
    try {
      const res = await fetch("/api/tags?q=");
      const data = await res.json();
      setPopularTags((data.tags || []).slice(0, 8));
    } catch {}
  };

  const searchTagsFn = useCallback(async (q: string) => {
    if (q.trim().length < 1) { setTagSuggestions([]); setTagHighlight(-1); return; }
    try {
      const res = await fetch(`/api/tags?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setTagSuggestions((data.tags || []).filter((t: Tag) => !tags.some(existing => existing.id === t.id || existing.slug === t.slug)));
      setTagHighlight(-1);
    } catch { setTagSuggestions([]); }
  }, [tags]);

  useEffect(() => {
    const timer = setTimeout(() => searchTagsFn(tagSearch), 300);
    return () => clearTimeout(timer);
  }, [tagSearch, searchTagsFn]);

  const addTag = (tag: Tag) => {
    if (tags.length >= VALIDATION.postTags.max) return;
    if (tags.some(t => t.id === tag.id || t.slug === tag.slug || t.name === tag.name)) return;
    setTags([...tags, tag]);
    setTagSearch("");
    setTagSuggestions([]);
    setTagHighlight(-1);
  };

  const createAndAddTag = async () => {
    const trimmed = tagSearch.trim().replace(/\s+/g, " ");
    if (!trimmed || tags.length >= VALIDATION.postTags.max || tagCreating) return;
    if (trimmed.length < VALIDATION.tagName.min) { feedimAlert("error", `Etiket en az ${VALIDATION.tagName.min} karakter olmalı`); return; }
    if (trimmed.length > VALIDATION.tagName.max) { feedimAlert("error", `Etiket en fazla ${VALIDATION.tagName.max} karakter olabilir`); return; }
    setTagCreating(true);
    await new Promise(r => setTimeout(r, 1000));
    try {
      const res = await fetch("/api/tags", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: trimmed }) });
      const data = await res.json();
      if (res.ok && data.tag) addTag(data.tag);
      else feedimAlert("error", data.error || "Etiket oluşturulamadı");
    } catch { feedimAlert("error", "Etiket oluşturulamadı"); } finally { setTagCreating(false); }
  };

  const removeTag = (tagId: number | string) => setTags(tags.filter(t => t.id !== tagId));

  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (tagSuggestions.length > 0) {
      if (e.key === "ArrowDown") { e.preventDefault(); setTagHighlight(prev => prev < tagSuggestions.length - 1 ? prev + 1 : 0); }
      else if (e.key === "ArrowUp") { e.preventDefault(); setTagHighlight(prev => prev > 0 ? prev - 1 : tagSuggestions.length - 1); }
      else if (e.key === "Enter") { e.preventDefault(); if (tagHighlight >= 0) addTag(tagSuggestions[tagHighlight]); else if (tagSuggestions.length > 0) addTag(tagSuggestions[0]); }
      else if (e.key === "Escape") { setTagSuggestions([]); setTagHighlight(-1); }
    } else if (e.key === "Enter" || e.key === ",") { e.preventDefault(); if (tagSearch.trim()) createAndAddTag(); }
    else if (e.key === "Backspace" && !tagSearch && tags.length > 0) { removeTag(tags[tags.length - 1].id); }
  };

  // Thumbnail upload
  const handleThumbUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      if (!file.type.startsWith("image/")) throw new Error("Geçersiz dosya");
      if (file.size > 5 * 1024 * 1024) throw new Error("Maks 5MB");
      const { compressImage } = await import("@/lib/imageCompression");
      const compressed = await compressImage(file, { maxSizeMB: 1, maxWidthOrHeight: 1920 });
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error("Dosya okunamadı"));
        reader.readAsDataURL(compressed);
      });
      setCropSrc(dataUrl);
    } catch { feedimAlert("error", "Görsel yüklenemedi"); }
    e.target.value = "";
  };

  const savePost = async (status: "draft" | "published") => {
    if (!title.trim()) { feedimAlert("error", "Başlık gerekli"); return; }
    if (title.trim().length < 3) { feedimAlert("error", "Başlık en az 3 karakter olmalı"); return; }
    if (status === "published" && !videoUrl) { feedimAlert("error", "Video yüklenmeden yayınlanamaz"); return; }
    if (status === "published" && uploading) { feedimAlert("error", "Video hala yükleniyor, lütfen bekleyin"); return; }

    setSavingAs(status);
    try {
      let thumbUrl = thumbnail;
      let thumbBlurhash: string | null = null;
      if (thumbnail && thumbnail.startsWith("data:")) {
        try {
          const res = await fetch(thumbnail);
          const blob = await res.blob();
          const formData = new FormData();
          const thumbFile = new File([blob], `thumb-${Date.now()}.jpg`, { type: "image/jpeg" });
          formData.append("file", thumbFile);
          formData.append("fileName", thumbFile.name);
          const uploadRes = await fetch("/api/upload/image", { method: "POST", body: formData });
          const uploadData = await uploadRes.json();
          if (uploadRes.ok && uploadData.url) {
            thumbUrl = uploadData.url;
            thumbBlurhash = uploadData.blurhash || null;
          }
        } catch { /* use data url as fallback */ }
      }

      const endpoint = draftId ? `/api/posts/${draftId}` : "/api/posts";
      const method = draftId ? "PUT" : "POST";
      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          content: "",
          content_type: "moment",
          status,
          tags: tags.map(t => typeof t.id === "number" ? t.id : (t.slug || t.name)),
          featured_image: thumbUrl || null,
          video_url: videoUrl || null,
          video_duration: videoDuration || null,
          video_thumbnail: thumbUrl || null,
          blurhash: thumbBlurhash,
          allow_comments: allowComments,
          is_for_kids: isForKids,
          copyright_protected: copyrightProtected,
          meta_title: metaTitle.trim() || null,
          meta_description: metaDescription.trim() || null,
          meta_keywords: metaKeywords.trim() || null,
          sound_id: selectedSound?.id || null,
          frame_hashes: frameHashes,
          audio_hashes: audioHashes,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setHasUnsavedChanges(false);
        if (status === "published" && data.post?.slug) { emitNavigationStart(); router.push(`/post/${data.post.slug}`); }
        else { sessionStorage.setItem("fdm-open-create-modal", "1"); sessionStorage.setItem("fdm-create-view", "drafts"); emitNavigationStart(); router.push("/dashboard"); }
      } else {
        feedimAlert("error", data.error || "Bir hata oluştu");
      }
    } catch { feedimAlert("error", "Bir hata oluştu"); } finally { setSavingAs(null); }
  };

  const goToStep2 = () => {
    if (!videoFile && !videoUrl) { feedimAlert("error", "Video seçilmedi"); return; }
    setStep(2);
  };

  const fmtDuration = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const fmtSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const canGoNext = !!videoFile || !!videoUrl;

  const headerRight = (
    <div className="flex items-center gap-2">
      {step === 1 ? (
        <button
          onClick={goToStep2}
          disabled={!canGoNext || uploading}
          className="t-btn accept !h-9 !px-5 !text-[0.82rem] disabled:opacity-40"
        >
          İleri
        </button>
      ) : (
        <>
          <button
            onClick={() => savePost("draft")}
            disabled={savingAs !== null || !title.trim()}
            className="t-btn cancel relative !h-9 !px-4 !text-[0.82rem] disabled:opacity-40"
          >
            {savingAs === "draft" ? <span className="loader" style={{ width: 16, height: 16 }} /> : "Kaydet"}
          </button>
          <button
            onClick={() => savePost("published")}
            disabled={savingAs !== null || !title.trim() || !videoUrl || uploading}
            className="t-btn accept relative !h-9 !px-5 !text-[0.82rem] disabled:opacity-40"
            aria-label="Yayınla"
          >
            {savingAs === "published" ? <span className="loader" style={{ width: 16, height: 16 }} /> : "Yayınla"}
          </button>
        </>
      )}
    </div>
  );

  return (
    <AppLayout
      hideMobileNav
      hideRightSidebar
      headerRightAction={headerRight}
      headerTitle={step === 1 ? "Moment" : "Detaylar"}
      headerOnBack={() => { if (step === 2) setStep(1); else router.back(); }}
    >
      <div className="flex flex-col min-h-[calc(100dvh-53px)]">

        {/* Step 1: Video Upload */}
        {step === 1 && (
          <div className="flex flex-col flex-1 px-3 sm:px-4 pt-4 pb-20">
            {!videoFile && !videoUrl ? (
              <label
                onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "copy"; }}
                onDrop={handleVideoDrop}
                className="flex flex-col items-center justify-center flex-1 min-h-[340px] border-2 border-solid border-border-primary hover:border-accent-main/50 rounded-2xl cursor-pointer transition bg-bg-secondary"
              >
                <div className="w-16 h-16 rounded-full bg-accent-main/10 flex items-center justify-center mb-4">
                  <Film className="h-8 w-8 text-accent-main" />
                </div>
                <p className="text-base font-semibold text-text-primary mb-1">
                  Moment yüklemek için tıklayın
                </p>
                <p className="text-sm text-text-muted mb-3 hidden sm:block">
                  veya buraya sürükleyin
                </p>
                <div className="flex flex-col sm:flex-row items-center gap-1 sm:gap-3 text-xs text-text-muted/70 mt-2 sm:mt-0">
                  <span>Dikey (9:16) video</span>
                  <span className="hidden sm:inline">&middot;</span>
                  <span>Maks {MOMENT_MAX_SIZE_MB}MB &middot; Maks {MOMENT_MAX_DURATION} saniye</span>
                </div>
                <input
                  ref={videoInputRef}
                  type="file"
                  accept="video/*"
                  onChange={handleVideoInput}
                  className="hidden"
                />
              </label>
            ) : (
              <div className="space-y-3">
                {/* Sound selection — top, before video */}
                {!uploading && (videoUrl || videoFile) && (
                  <div className="mb-[10px]">
                    {selectedSound ? (
                      <div className="flex items-center gap-3 p-3 bg-bg-tertiary rounded-xl max-w-[300px] mx-auto">
                        <div className="w-9 h-9 rounded-lg bg-accent-main/10 flex items-center justify-center shrink-0 overflow-hidden">
                          {selectedSound.cover_image_url ? (
                            <img src={selectedSound.cover_image_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <Music className="h-4 w-4 text-accent-main" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{selectedSound.title}</p>
                          {selectedSound.artist && (
                            <p className="text-xs text-text-muted truncate">{selectedSound.artist}</p>
                          )}
                        </div>
                        <SoundPreviewButton audioUrl={selectedSound.audio_url} />
                        <button
                          onClick={() => {
                            // Stop preview audio immediately
                            if (previewAudioRef.current) {
                              previewAudioRef.current.pause();
                              previewAudioRef.current.src = "";
                              previewAudioRef.current = null;
                            }
                            // Restore video volume
                            if (previewVideoRef.current) previewVideoRef.current.volume = 1;
                            setSelectedSound(null);
                            setUseOriginalSound(true);
                          }}
                          className="p-1 hover:bg-bg-secondary rounded-full"
                        >
                          <X className="h-3.5 w-3.5 text-text-muted" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setSoundModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-border-primary hover:border-accent-main/50 transition mx-auto"
                      >
                        <Music className="h-4 w-4 text-text-muted" />
                        <span className="text-sm text-text-muted">Ses ekle...</span>
                      </button>
                    )}
                  </div>
                )}

                <div className="relative rounded-xl overflow-hidden max-w-[300px] mx-auto bg-black" style={{ aspectRatio: "9/16" }}>
                  {(videoPreviewUrl || videoUrl) && (
                    <VideoPlayer
                      ref={previewVideoRef}
                      src={videoPreviewUrl || videoUrl}
                      poster={thumbnail || undefined}
                      disabled={uploading}
                    />
                  )}

                  {uploading && (
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm rounded-xl flex flex-col items-center justify-center z-10">
                      <span className="loader mb-3" style={{ width: 28, height: 28, borderTopColor: "var(--accent-color)" }} />
                      <p className="text-white/80 text-[0.82rem] font-medium">{uploadProgress > 0 ? `%${uploadProgress}` : "İşleniyor..."}</p>
                      <div className="w-48 h-1.5 bg-white/15 rounded-full mt-2 overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%`, backgroundColor: "var(--accent-color)" }} />
                      </div>
                      <button onClick={removeVideo} className="text-xs text-error hover:underline mt-3">
                        İptal Et
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-center px-1">
                  <div className="flex items-center gap-2 text-xs text-text-muted">
                    <Film className="h-3.5 w-3.5" />
                    <span>{fmtDuration(videoDuration)}</span>
                    {videoFile && (
                      <>
                        <span>{fmtSize(videoFile.size)}</span>
                      </>
                    )}
                  </div>
                </div>

              </div>
            )}
          </div>
        )}

        {/* Step 2: Details */}
        {step === 2 && loadingDraft && (
          <div className="flex flex-col items-center justify-center flex-1 py-16">
            <span className="loader" style={{ width: 28, height: 28 }} />
            <p className="text-sm text-text-muted mt-3">Yükleniyor...</p>
          </div>
        )}
        {step === 2 && !loadingDraft && (
          <div className="flex flex-col flex-1 px-3 sm:px-4 pt-4 pb-20 space-y-5">

            {/* Açıklama (tek alan — title olarak gönderilir) */}
            <div>
              <textarea
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={VALIDATION.postTitle.max}
                placeholder="Moment açıklaması..."
                rows={3}
                className="input-modern w-full resize-none text-[0.95rem] leading-relaxed min-h-[80px] pt-3"
                autoFocus
              />
              <div className="flex justify-end mt-1">
                <span className={`text-[0.66rem] tabular-nums ${title.length >= VALIDATION.postTitle.max - 20 ? "text-error" : "text-text-muted/60"}`}>
                  {title.length}/{VALIDATION.postTitle.max}
                </span>
              </div>
            </div>

            {/* Etiketler + Küçük Resim — yan yana */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Thumbnail */}
            <div className="md:order-2">
              <label className="block text-sm font-semibold mb-2">Küçük Resim</label>
              {thumbnail ? (
                <div className="relative rounded-xl overflow-hidden max-w-[200px]">
                  <img src={thumbnail} alt="Küçük resim" className="w-full aspect-[9/16] object-cover" />
                  <div className="absolute top-2 right-2 flex gap-1.5">
                    <label className="p-1.5 bg-black/50 rounded-full text-white hover:bg-black/70 transition cursor-pointer" aria-label="Küçük resim değiştir">
                      <Upload className="h-4 w-4" />
                      <input ref={thumbInputRef} type="file" accept="image/*" onChange={handleThumbUpload} className="hidden" />
                    </label>
                    <button onClick={() => setThumbnail("")} className="p-1.5 bg-black/50 rounded-full text-white hover:bg-black/70 transition" aria-label="Küçük resmi kaldır">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center h-36 max-w-[200px] border-2 border-dashed border-border-primary hover:border-accent-main/50 rounded-xl cursor-pointer transition">
                  <Upload className="h-6 w-6 mx-auto mb-2 opacity-50 text-text-muted" />
                  <p className="text-sm text-text-muted">Küçük resim yükleyin</p>
                  <input ref={thumbInputRef} type="file" accept="image/*" onChange={handleThumbUpload} className="hidden" />
                </label>
              )}
            </div>

            {/* Tags */}
            <div className="md:order-1">
              <label className="block text-sm font-semibold mb-2">Etiketler</label>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {tags.map(tag => (
                    <span key={tag.id} className="flex items-center gap-1.5 bg-accent-main/10 text-accent-main text-sm font-medium px-3 py-1.5 rounded-full">
                      #{tag.name}
                      <button onClick={() => removeTag(tag.id)} className="hover:text-error transition"><X className="h-3 w-3" /></button>
                    </span>
                  ))}
                </div>
              )}
              {tags.length < VALIDATION.postTags.max && (
                <div className="relative">
                  <input
                    type="text"
                    value={tagSearch}
                    onChange={e => {
                      const raw = e.target.value;
                      const normalized = raw
                        .replace(/\s/g, '')
                        .replace(/[şŞ]/g, 's')
                        .replace(/[ıİ]/g, 'i')
                        .replace(/[ğĞ]/g, 'g')
                        .replace(/[üÜ]/g, 'u')
                        .replace(/[öÖ]/g, 'o')
                        .replace(/[çÇ]/g, 'c')
                        .toLowerCase();
                      setTagSearch(normalized);
                    }}
                    onKeyDown={handleTagKeyDown}
                    placeholder="Etiket ara veya yeni oluştur..."
                    className="input-modern w-full"
                  />
                  {tagSuggestions.length > 0 && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-bg-elevated bg-solid border border-border-primary rounded-xl shadow-xl z-10 max-h-48 overflow-y-auto">
                      {tagSuggestions.map((s, i) => (
                        <button
                          key={s.id}
                          onClick={() => addTag(s)}
                          className={`w-full text-left px-4 py-3 text-sm transition flex items-center gap-2 ${i === tagHighlight ? "bg-accent-main/10 text-accent-main" : "hover:bg-bg-tertiary"}`}
                        >
                          <span className="text-text-muted">#</span>
                          {s.name}
                          {s.post_count !== undefined && <span className="ml-auto text-xs text-text-muted">{formatCount(s.post_count || 0)} gönderi</span>}
                        </button>
                      ))}
                    </div>
                  )}
                  {tagSearch.trim() && tagSuggestions.length === 0 && (
                    <button
                      onClick={createAndAddTag}
                      disabled={tagCreating}
                      className="absolute right-2 inset-y-0 my-auto flex items-center gap-1 text-xs font-semibold text-accent-main hover:underline disabled:opacity-50 tag-create-btn"
                    >
                      {tagCreating ? (
                        <span className="flex items-center justify-center" style={{ width: 27, height: 27 }}><span className="loader" style={{ width: 14, height: 14, borderTopColor: "var(--accent-color)" }} /></span>
                      ) : (
                        <><Plus className="h-3.5 w-3.5" /> Oluştur</>
                      )}
                    </button>
                  )}
                </div>
              )}
              <p className="text-xs text-text-muted mt-1.5">{tags.length}/{VALIDATION.postTags.max} etiket</p>
              {tags.length < VALIDATION.postTags.max && !tagSearch && popularTags.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs text-text-muted mb-2">Popüler etiketler</p>
                  <div className="flex flex-wrap gap-1.5">
                    {popularTags.filter(pt => !tags.some(t => t.id === pt.id)).slice(0, 6).map(pt => (
                      <button key={pt.id} onClick={() => addTag(pt)} className="text-xs px-2.5 py-1.5 rounded-full border border-border-primary text-text-muted hover:text-accent-main hover:border-accent-main/50 transition">
                        #{pt.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            </div>

            {/* Settings */}
            <div>
              <label className="block text-sm font-semibold mb-3">Ayarlar</label>
              <div className="space-y-1">
                <button
                  onClick={() => setAllowComments(!allowComments)}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-lg hover:bg-bg-tertiary transition text-left"
                >
                  <div>
                    <p className="text-sm font-medium">Yorumlara izin ver</p>
                    <p className="text-xs text-text-muted mt-0.5">İzleyiciler yorum yapabilir</p>
                  </div>
                  <div className={`w-10 h-[22px] rounded-full transition-colors relative ${allowComments ? "bg-accent-main" : "bg-border-primary"}`}>
                    <div className={`absolute top-[3px] w-4 h-4 rounded-full bg-white transition-transform ${allowComments ? "left-[22px]" : "left-[3px]"}`} />
                  </div>
                </button>
                <button
                  onClick={() => setIsForKids(!isForKids)}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-lg hover:bg-bg-tertiary transition text-left"
                >
                  <div>
                    <p className="text-sm font-medium">Çocuklara özel</p>
                    <p className="text-xs text-text-muted mt-0.5">Bu içerik çocuklara yönelik</p>
                  </div>
                  <div className={`w-10 h-[22px] rounded-full transition-colors relative ${isForKids ? "bg-accent-main" : "bg-border-primary"}`}>
                    <div className={`absolute top-[3px] w-4 h-4 rounded-full bg-white transition-transform ${isForKids ? "left-[22px]" : "left-[3px]"}`} />
                  </div>
                </button>
                <div>
                <button
                  onClick={() => {
                    if (!user?.copyrightEligible) return;
                    if (isEditMode && copyrightProtected) return;
                    setCopyrightProtected(!copyrightProtected);
                  }}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition text-left ${!user?.copyrightEligible || (isEditMode && copyrightProtected) ? "opacity-50 cursor-not-allowed" : "hover:bg-bg-tertiary"}`}
                >
                  <div>
                    <p className="text-sm font-medium">Telif hakkı koruması</p>
                    <p className="text-xs text-text-muted mt-0.5">{isEditMode && copyrightProtected ? "Telif hakkı koruması etkin içeriklerde kapatılamaz." : !user?.copyrightEligible ? "Düzenli özgün içerik üretiminde sistem tarafından otomatik olarak etkinleşir." : "Açıldığında içeriğiniz telif hakkıyla korunur."}</p>
                  </div>
                  <div className={`w-10 h-[22px] rounded-full transition-colors relative shrink-0 ${copyrightProtected ? "bg-accent-main" : "bg-border-primary"}`}>
                    <div className={`absolute top-[3px] w-4 h-4 rounded-full bg-white transition-transform ${copyrightProtected ? "left-[22px]" : "left-[3px]"}`} />
                  </div>
                </button>
                {!user?.copyrightEligible && (
                  <a href="/help/copyright" className="block px-4 pb-2 text-xs text-accent-main hover:underline">Otomatik etkinleştirme hakkında daha fazla bilgi &rarr;</a>
                )}
                </div>
              </div>
            </div>

            <PostMetaFields
              metaTitle={metaTitle} setMetaTitle={setMetaTitle}
              metaDescription={metaDescription} setMetaDescription={setMetaDescription}
              metaKeywords={metaKeywords} setMetaKeywords={setMetaKeywords}
              expanded={metaExpanded} setExpanded={setMetaExpanded}
              contentType="moment"
            />
          </div>
        )}
      </div>

      {/* Thumb Crop Modal */}
      <CropModal
        open={!!cropSrc}
        onClose={() => setCropSrc(null)}
        imageSrc={cropSrc || ""}
        aspectRatio={9 / 16}
        onCrop={(croppedUrl) => { setThumbnail(croppedUrl); setCropSrc(null); }}
      />

      {/* Sound Picker Modal */}
      <SoundPickerModal
        open={soundModalOpen}
        onClose={() => setSoundModalOpen(false)}
        onSelect={(sound) => { setSelectedSound(sound); setUseOriginalSound(false); }}
      />
    </AppLayout>
  );
}
