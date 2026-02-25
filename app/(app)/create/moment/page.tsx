"use client";

import { Suspense, useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { X, Plus, Upload, Film, Music, Clapperboard, Scissors, ChevronDown } from "lucide-react";
import PostMetaFields from "@/components/PostMetaFields";
import VideoEditorPreview from "@/components/VideoEditorPreview";
import { createClient } from "@/lib/supabase/client";
import { emitNavigationStart } from "@/lib/navigationProgress";
import { feedimAlert } from "@/components/FeedimAlert";
import {
  VALIDATION,
  MOMENT_MAX_DURATION,
  MOMENT_MAX_SIZE_MB,
} from "@/lib/constants";
import { formatCount, getPostUrl } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { useUser } from "@/components/UserContext";
import AppLayout from "@/components/AppLayout";
import CropModal from "@/components/modals/CropModal";
import SoundPickerModal, { type SoundItem } from "@/components/modals/SoundPickerModal";
import VideoTrimModal from "@/components/modals/VideoTrimModal";
import ThumbnailPickerModal from "@/components/modals/ThumbnailPickerModal";
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
  const t = useTranslations("create");

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
  const [visibility, setVisibility] = useState("public");
  const [allowComments, setAllowComments] = useState(true);
  const [isForKids, setIsForKids] = useState(false);
  const [isAiContent, setIsAiContent] = useState(false);
  const [copyrightProtected, setCopyrightProtected] = useState(false);
  const [frameHashes, setFrameHashes] = useState<{ frameIndex: number; hash: string }[]>([]);
  const [audioHashes, setAudioHashes] = useState<{ chunkIndex: number; hash: string }[]>([]);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [showThumbPicker, setShowThumbPicker] = useState(false);

  // Sound
  const [selectedSound, setSelectedSound] = useState<SoundItem | null>(null);
  const [soundModalOpen, setSoundModalOpen] = useState(false);
  const [useOriginalSound, setUseOriginalSound] = useState(true);

  // Preview controls
  const [previewPaused, setPreviewPaused] = useState(false);
  const [previewMuted, setPreviewMuted] = useState(false);
  const [trimModalOpen, setTrimModalOpen] = useState(false);

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
        setIsAiContent(data.post.is_ai_content === true);
        setVisibility(data.post.visibility || "public");
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
      feedimAlert("error", t("draftLoadError"));
    } finally {
      setLoadingDraft(false);
    }
  };

  // Ref to track latest previewMuted without re-running the heavy sync effect
  const previewMutedRef = useRef(previewMuted);
  previewMutedRef.current = previewMuted;

  // Sync preview video with selected sound (editor-like preview)
  useEffect(() => {
    const video = previewVideoRef.current;
    if (!video) return;

    // No sound selected → clean up and restore original audio
    if (!selectedSound) {
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
        previewAudioRef.current.src = "";
        previewAudioRef.current = null;
      }
      video.muted = false;
      video.volume = 1;
      return;
    }

    // Mute original video when a sound overlay is active (Reels/TikTok behavior)
    video.muted = true;
    video.volume = 0;

    // Create audio element for selected sound
    const audio = new Audio();
    audio.src = selectedSound.audio_url;
    audio.loop = true;
    audio.preload = "auto";
    audio.muted = previewMutedRef.current;
    previewAudioRef.current = audio;

    // Wait for audio to buffer before syncing — prevents seek-on-unbuffered stalls
    let audioReady = false;
    const onAudioReady = () => {
      audioReady = true;
      if (!video.paused && audio.duration) {
        audio.currentTime = video.currentTime % audio.duration;
        audio.play().catch(() => {});
      }
    };
    audio.addEventListener("canplaythrough", onAudioReady, { once: true });
    // If audio is already cached, canplaythrough may have fired before listener
    if (audio.readyState >= 4) onAudioReady();

    // Sync on play/pause/seek events
    const onPlay = () => {
      if (audioReady && audio.duration) {
        audio.currentTime = video.currentTime % audio.duration;
      }
      audio.play().catch(() => {});
    };
    const onPause = () => audio.pause();
    const onSeeked = () => {
      if (!video.paused && audioReady && audio.duration) {
        audio.currentTime = video.currentTime % audio.duration;
      }
    };

    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    video.addEventListener("seeked", onSeeked);

    // RAF loop — drift correction + mute sync (catches loop restarts that skip seeked)
    let raf: number;
    const tick = () => {
      // Sync mute state every frame (responds to previewMuted changes instantly)
      audio.muted = previewMutedRef.current;

      if (!video.paused && audioReady && audio.duration) {
        const expected = video.currentTime % audio.duration;
        // Correct drift if > 300ms (loop boundary, etc.)
        if (Math.abs(audio.currentTime - expected) > 0.3) {
          audio.currentTime = expected;
        }
        // Ensure audio is playing when video is playing
        if (audio.paused) audio.play().catch(() => {});
      } else if (video.paused && !audio.paused) {
        audio.pause();
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      audio.removeEventListener("canplaythrough", onAudioReady);
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("seeked", onSeeked);
      audio.pause();
      audio.src = "";
      previewAudioRef.current = null;
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
          reject(new Error(t("momentMaxDuration", { seconds: MOMENT_MAX_DURATION })));
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
      video.onerror = () => fail(t("videoFileReadError"));
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
          reject(new Error(t("thumbnailCreateFailed")));
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
      video.onerror = () => { if (!settled) { settled = true; cleanup(); reject(new Error(t("videoFileReadError"))); } };
      setTimeout(() => { if (!settled) { settled = true; cleanup(); reject(new Error("Timeout")); } }, 20000);

      video.src = url;
      video.load();
    });
  };

  const handleVideoSelect = async (file: File) => {
    if (!file.type.startsWith("video/")) {
      feedimAlert("error", t("videoUnsupportedFormat"));
      return;
    }
    if (file.size > MOMENT_MAX_SIZE_MB * 1024 * 1024) {
      feedimAlert("error", t("videoMaxSize", { size: MOMENT_MAX_SIZE_MB }));
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
      feedimAlert("error", t("momentVerticalRequired"));
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
      if (!initRes.ok) throw new Error(initData.error || t("uploadInitFailed"));

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
          else reject(new Error(t("uploadFailed", { status: xhr.status })));
        };

        xhr.onerror = () => reject(new Error(t("videoUploadFailed")));
        xhr.onabort = () => reject(new DOMException(t("uploadCancelled"), "AbortError"));

        abort.signal.addEventListener("abort", () => xhr.abort());
        xhr.send(file);
      });

      setVideoUrl(publicUrl);
      setUploadProgress(100);
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      feedimAlert("error", (err as Error).message || t("videoUploadFailed"));
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

  // Trim handler — only updates preview, re-upload happens at step transition
  const handleTrim = async (trimmedFile: File, newDuration: number) => {
    setVideoFile(trimmedFile);
    setVideoDuration(newDuration);
    const newUrl = URL.createObjectURL(trimmedFile);
    if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl);
    setVideoPreviewUrl(newUrl);
    setPreviewPaused(false); // ensure auto-play after trim

    // Regenerate thumbnail from trimmed file
    try {
      const thumb = await generateThumbnail(trimmedFile);
      setThumbnail(thumb);
    } catch { /* keep existing */ }

    setVideoUrl(""); // re-upload will happen at goToStep2
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
    if (trimmed.length < VALIDATION.tagName.min) { feedimAlert("error", t("tagMinLength", { min: VALIDATION.tagName.min })); return; }
    if (trimmed.length > VALIDATION.tagName.max) { feedimAlert("error", t("tagMaxLength", { max: VALIDATION.tagName.max })); return; }
    setTagCreating(true);
    await new Promise(r => setTimeout(r, 1000));
    try {
      const res = await fetch("/api/tags", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: trimmed }) });
      const data = await res.json();
      if (res.ok && data.tag) addTag(data.tag);
      else feedimAlert("error", data.error || t("tagCreateFailed"));
    } catch { feedimAlert("error", t("tagCreateFailed")); } finally { setTagCreating(false); }
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
      if (!file.type.startsWith("image/")) throw new Error(t("invalidFile"));
      if (file.size > 5 * 1024 * 1024) throw new Error(t("fileTooLarge"));
      const { compressImage } = await import("@/lib/imageCompression");
      const compressed = await compressImage(file, { maxSizeMB: 1, maxWidthOrHeight: 1920 });
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error(t("fileReadError")));
        reader.readAsDataURL(compressed);
      });
      setCropSrc(dataUrl);
    } catch { feedimAlert("error", t("imageUploadFailed")); }
    e.target.value = "";
  };

  const savePost = async (status: "draft" | "published") => {
    if (status === "published" && !videoUrl) { feedimAlert("error", t("videoNotUploaded")); return; }
    if (status === "published" && uploading) { feedimAlert("error", t("videoStillUploading")); return; }

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
          is_ai_content: isAiContent,
          visibility,
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
        if (status === "published" && data.post?.slug) { emitNavigationStart(); router.push(getPostUrl(data.post.slug, "moment")); }
        else { sessionStorage.setItem("fdm-open-create-modal", "1"); sessionStorage.setItem("fdm-create-view", "drafts"); emitNavigationStart(); router.push("/"); }
      } else {
        feedimAlert("error", data.error || t("genericError"));
      }
    } catch { feedimAlert("error", t("genericError")); } finally { setSavingAs(null); }
  };

  const goToStep2 = () => {
    if (!videoFile && !videoUrl) { feedimAlert("error", t("videoNotSelected")); return; }
    // If video was trimmed (videoUrl cleared), re-upload
    if (videoFile && !videoUrl && !uploading) {
      (async () => {
        let f = videoFile;
        try { f = await (await import("@/lib/videoOptimize")).optimizeVideo(videoFile); } catch {}
        uploadVideo(f);
      })();
    }
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
          {t("nextStep")}
        </button>
      ) : (
        <>
          <button
            onClick={() => savePost("draft")}
            disabled={savingAs !== null || !title.trim()}
            className="t-btn cancel relative !h-9 !px-4 !text-[0.82rem] disabled:opacity-40"
          >
            {savingAs === "draft" ? <span className="loader" style={{ width: 16, height: 16 }} /> : t("save")}
          </button>
          <button
            onClick={() => savePost("published")}
            disabled={savingAs !== null || !title.trim() || !videoUrl || uploading}
            className="t-btn accept relative !h-9 !px-5 !text-[0.82rem] disabled:opacity-40"
            aria-label={t("publishBtn")}
          >
            {savingAs === "published" ? <span className="loader" style={{ width: 16, height: 16 }} /> : t("publishBtn")}
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
      headerTitle={step === 1 ? "Moment" : t("headerDetails")}
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
                  {t("momentUploadClick")}
                </p>
                <p className="text-sm text-text-muted mb-3 hidden sm:block">
                  {t("orDragHere")}
                </p>
                <div className="flex flex-col sm:flex-row items-center gap-1 sm:gap-3 text-xs text-text-muted/70 mt-2 sm:mt-0">
                  <span>{t("verticalVideo")}</span>
                  <span className="hidden sm:inline">&middot;</span>
                  <span>{t("maxSize", { size: MOMENT_MAX_SIZE_MB })} &middot; {t("maxSeconds", { seconds: MOMENT_MAX_DURATION })}</span>
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
                  <div className="mb-[10px] space-y-2">
                    {selectedSound && (
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
                            if (previewAudioRef.current) {
                              previewAudioRef.current.pause();
                              previewAudioRef.current.src = "";
                              previewAudioRef.current = null;
                            }
                            if (previewVideoRef.current) {
                              previewVideoRef.current.muted = false;
                              previewVideoRef.current.volume = 1;
                            }
                            setSelectedSound(null);
                            setUseOriginalSound(true);
                          }}
                          className="p-1 hover:bg-bg-secondary rounded-full"
                        >
                          <X className="h-3.5 w-3.5 text-text-muted" />
                        </button>
                      </div>
                    )}
                    <div className="flex items-center gap-2 justify-center">
                      {videoFile && !uploading && (
                        <button
                          onClick={() => { setPreviewPaused(true); setTrimModalOpen(true); }}
                          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-border-primary hover:border-accent-main/50 transition"
                        >
                          <Scissors className="h-4 w-4 text-text-muted" />
                          <span className="text-sm text-text-muted">{t("trimVideo")}</span>
                        </button>
                      )}
                      {!selectedSound && (
                        <button
                          onClick={() => setSoundModalOpen(true)}
                          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-border-primary hover:border-accent-main/50 transition"
                        >
                          <Music className="h-4 w-4 text-text-muted" />
                          <span className="text-sm text-text-muted">{t("addSound")}</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}

                <VideoEditorPreview
                  src={videoPreviewUrl || videoUrl}
                  poster={thumbnail || undefined}
                  aspectRatio="9/16"
                  maxWidth="300px"
                  uploading={uploading}
                  uploadProgress={uploadProgress}
                  onCancelUpload={removeVideo}
                  paused={previewPaused}
                  onTogglePause={() => setPreviewPaused(p => !p)}
                  muted={previewMuted}
                  onToggleMute={() => setPreviewMuted(m => !m)}
                  duration={videoDuration}
                  videoRef={previewVideoRef}
                  hasSoundOverlay={!!selectedSound}
                  onRemove={removeVideo}
                  t={t}
                />

                <div className="flex items-center justify-center px-1">
                  <div className="flex items-center gap-2 text-xs text-text-muted">
                    <Clapperboard className="h-3.5 w-3.5" />
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
            <p className="text-sm text-text-muted mt-3">{t("loading")}</p>
          </div>
        )}
        {step === 2 && !loadingDraft && (
          <div className="flex flex-col flex-1 px-3 sm:px-4 pt-4 pb-20 space-y-5">

            {/* Thumbnail — top center */}
            <div className="flex flex-col items-center">
              <p className="text-[0.68rem] text-text-muted/70 mb-2">{t("thumbnailRecommended9by16")}</p>
              {thumbnail ? (
                <div>
                  <div className="relative rounded-xl overflow-hidden max-w-[160px]">
                    <img src={thumbnail} alt={t("thumbnail")} className="w-full aspect-[9/16] object-cover" />
                    <button onClick={() => setThumbnail("")} className="absolute top-2 right-2 p-1.5 bg-black/50 rounded-full text-white hover:bg-black/70 transition" aria-label={t("thumbnailRemove")}>
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  {videoFile && (
                    <button
                      type="button"
                      onClick={() => setShowThumbPicker(true)}
                      className="mt-2 w-full text-sm text-accent-main hover:text-accent-main/80 font-medium py-1.5 transition text-center"
                    >
                      {t("editCover")}
                    </button>
                  )}
                </div>
              ) : (
                <div className="max-w-[160px] w-full">
                  <label className="flex flex-col items-center justify-center aspect-[9/16] border-2 border-dashed border-border-primary hover:border-accent-main/50 rounded-xl cursor-pointer transition">
                    <Upload className="h-6 w-6 mx-auto mb-2 opacity-50 text-text-muted" />
                    <p className="text-xs text-text-muted text-center">{t("thumbnailUpload")}</p>
                    <input ref={thumbInputRef} type="file" accept="image/*" onChange={handleThumbUpload} className="hidden" />
                  </label>
                  {videoFile && (
                    <button
                      type="button"
                      onClick={() => setShowThumbPicker(true)}
                      className="mt-2 w-full text-sm text-accent-main hover:text-accent-main/80 font-medium py-1.5 transition text-center"
                    >
                      {t("editCover")}
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Description (no border) */}
            <div>
              <textarea
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={VALIDATION.postTitle.max}
                placeholder={t("momentDescPlaceholder")}
                rows={3}
                className="w-full resize-none text-[0.95rem] leading-relaxed min-h-[80px] pt-3 bg-transparent outline-none placeholder:text-text-muted/50"
                autoFocus
              />
              <div className="flex justify-end mt-1">
                <span className={`text-[0.66rem] tabular-nums ${title.length >= VALIDATION.postTitle.max - 20 ? "text-error" : "text-text-muted/60"}`}>
                  {title.length}/{VALIDATION.postTitle.max}
                </span>
              </div>
            </div>

            {/* Tags */}
            <div>
              <label className="block text-sm font-semibold mb-2">{t("tagsLabel")}</label>
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
                    onChange={e => setTagSearch(e.target.value)}
                    onKeyDown={handleTagKeyDown}
                    placeholder={t("tagSearchPlaceholder")}
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
                          {s.post_count !== undefined && <span className="ml-auto text-xs text-text-muted">{formatCount(s.post_count || 0)} {t("postsCount")}</span>}
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
                        <><Plus className="h-3.5 w-3.5" /> {t("createTag")}</>
                      )}
                    </button>
                  )}
                </div>
              )}
              <p className="text-xs text-text-muted mt-1.5">{tags.length}/{VALIDATION.postTags.max} {t("tagUnit")}</p>
              {tags.length < VALIDATION.postTags.max && !tagSearch && popularTags.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs text-text-muted mb-2">{t("popularTags")}</p>
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

            {/* Visibility */}
            <div>
              <label className="block text-sm font-semibold mb-2">{t("visibilityLabel")}</label>
              <div className="relative">
                <select
                  value={visibility}
                  onChange={e => setVisibility(e.target.value)}
                  className="input-modern w-full appearance-none pr-10 cursor-pointer"
                >
                  <option value="public">{t("visibilityPublic")}</option>
                  <option value="followers">{t("visibilityFollowers")}</option>
                  <option value="only_me">{t("visibilityOnlyMe")}</option>
                </select>
                <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted pointer-events-none" />
              </div>
            </div>

            {/* Settings */}
            <div>
              <label className="block text-sm font-semibold mb-3">{t("settingsLabel")}</label>
              <div className="space-y-1">
                <button
                  onClick={() => setAllowComments(!allowComments)}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-lg hover:bg-bg-tertiary transition text-left"
                >
                  <div>
                    <p className="text-sm font-medium">{t("allowComments")}</p>
                    <p className="text-xs text-text-muted mt-0.5">{t("allowCommentsDescViewers")}</p>
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
                    <p className="text-sm font-medium">{t("forKids")}</p>
                    <p className="text-xs text-text-muted mt-0.5">{t("forKidsDesc")}</p>
                  </div>
                  <div className={`w-10 h-[22px] rounded-full transition-colors relative ${isForKids ? "bg-accent-main" : "bg-border-primary"}`}>
                    <div className={`absolute top-[3px] w-4 h-4 rounded-full bg-white transition-transform ${isForKids ? "left-[22px]" : "left-[3px]"}`} />
                  </div>
                </button>
                <div>
                <button
                  onClick={() => setIsAiContent(!isAiContent)}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-lg hover:bg-bg-tertiary transition text-left"
                >
                  <div>
                    <p className="text-sm font-medium">{t("aiContent")}</p>
                    <p className="text-xs text-text-muted mt-0.5">{t("aiContentDesc")}</p>
                  </div>
                  <div className={`w-10 h-[22px] rounded-full transition-colors relative flex-shrink-0 ${isAiContent ? "bg-accent-main" : "bg-border-primary"}`}>
                    <div className={`absolute top-[3px] w-4 h-4 rounded-full bg-white transition-transform ${isAiContent ? "left-[22px]" : "left-[3px]"}`} />
                  </div>
                </button>
                <p className="px-4 pb-2 text-xs text-text-muted leading-relaxed">
                  {t("aiContentWarning")}{" "}
                  <a href="/help/ai" target="_blank" rel="noopener noreferrer" className="text-accent-main hover:underline">{t("aiContentLearnMore")}</a>
                </p>
                </div>
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
                    <p className="text-sm font-medium">{t("copyrightProtection")}</p>
                    <p className="text-xs text-text-muted mt-0.5">{isEditMode && copyrightProtected ? t("copyrightCannotDisable") : !user?.copyrightEligible ? t("copyrightAutoEnable") : t("copyrightDesc")}</p>
                  </div>
                  <div className={`w-10 h-[22px] rounded-full transition-colors relative shrink-0 ${copyrightProtected ? "bg-accent-main" : "bg-border-primary"}`}>
                    <div className={`absolute top-[3px] w-4 h-4 rounded-full bg-white transition-transform ${copyrightProtected ? "left-[22px]" : "left-[3px]"}`} />
                  </div>
                </button>
                {!user?.copyrightEligible && (
                  <a href="/help/copyright" target="_blank" rel="noopener noreferrer" className="block px-4 pb-2 text-xs text-accent-main hover:underline">{t("copyrightLearnMore")} &rarr;</a>
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

      {/* Video Trim Modal */}
      {videoFile && (
        <VideoTrimModal
          open={trimModalOpen}
          onClose={() => { setTrimModalOpen(false); setPreviewPaused(false); }}
          videoFile={videoFile}
          duration={videoDuration}
          onTrim={handleTrim}
          soundUrl={selectedSound?.audio_url}
        />
      )}

      {/* Thumbnail Picker Modal */}
      {videoFile && (
        <ThumbnailPickerModal
          open={showThumbPicker}
          onClose={() => setShowThumbPicker(false)}
          videoFile={videoFile}
          duration={videoDuration}
          aspectRatio="9:16"
          onSelect={(dataUrl) => setThumbnail(dataUrl)}
        />
      )}
    </AppLayout>
  );
}
