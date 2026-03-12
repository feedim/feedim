"use client";

import { Suspense, useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { smartBack } from "@/lib/smartBack";
import { X, Upload, Film, Music, Clapperboard, Scissors, ChevronDown, Smile } from "lucide-react";
import CreateHeaderActions from "@/components/create/CreateHeaderActions";
import { fetchCreateDraftPost } from "@/components/create/api";
import { confirmDeleteDraft } from "@/components/create/deleteDraft";
import { uploadGeneratedImageDataUrl } from "@/components/create/imageUpload";
import {
  generateVideoThumbnail,
  loadVideoMetadata,
} from "@/components/create/videoMedia";
import useManagedVideoMedia from "@/components/create/useManagedVideoMedia";
import { redirectAfterCreateSave } from "@/components/create/navigation";
import CreateTagInput from "@/components/create/CreateTagInput";
import CreateSettingsSection from "@/components/create/CreateSettingsSection";
import CreateSettingsToggle from "@/components/create/CreateSettingsToggle";
import { extractHashtagsToTags } from "@/components/create/hashtags";
import useBeforeUnloadGuard from "@/components/create/useBeforeUnloadGuard";
import useCreateSaveState from "@/components/create/useCreateSaveState";
import { useCreateTagManager } from "@/components/create/useCreateTagManager";
import type { CreateTag as Tag } from "@/components/create/types";
import VideoEditorPreview from "@/components/VideoEditorPreview";
import { createClient } from "@/lib/supabase/client";
import { feedimAlert } from "@/components/FeedimAlert";
import {
  VALIDATION,
  MOMENT_MAX_DURATION,
  MOMENT_MAX_SIZE_MB,
} from "@/lib/constants";
import { useTranslations } from "next-intl";
import { useUser } from "@/components/UserContext";
import BlurImage from "@/components/BlurImage";
import AppLayout from "@/components/AppLayout";
import type { SoundItem } from "@/components/modals/SoundPickerModal";
import { useMention } from "@/lib/useMention";
import MentionDropdown from "@/components/MentionDropdown";
import { openFilePicker } from "@/lib/openFilePicker";

const EmojiPickerPanel = dynamic(
  () => import("@/components/modals/EmojiPickerPanel"),
  { ssr: false },
);
const CropModal = dynamic(() => import("@/components/modals/CropModal"), {
  ssr: false,
});
const SoundPickerModal = dynamic(
  () => import("@/components/modals/SoundPickerModal"),
  { ssr: false },
);
const VideoTrimModal = dynamic(
  () => import("@/components/modals/VideoTrimModal"),
  { ssr: false },
);
const ThumbnailPickerModal = dynamic(
  () => import("@/components/modals/ThumbnailPickerModal"),
  { ssr: false },
);
const PostMetaFields = dynamic(() => import("@/components/PostMetaFields"), {
  ssr: false,
  loading: () => <div className="h-24 rounded-[14px] bg-bg-secondary animate-pulse" />,
});

export default function MomentWritePage() {
  return (
    <Suspense
      fallback={
        <AppLayout hideRightSidebar>
          <div className="px-2 sm:px-4 pt-4">
            <div className="flex flex-col items-center justify-center min-h-[340px] rounded-2xl bg-bg-secondary animate-pulse" />
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
  const tc = useTranslations("common");

  const videoInputRef = useRef<HTMLInputElement>(null);
  const thumbInputRef = useRef<HTMLInputElement>(null);
  const previewVideoRef = useRef<HTMLVideoElement>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const mention = useMention({ maxMentions: 3, limitMessage: tc("mentionLimit") });

  const [step, setStep] = useState(1);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isPublished, setIsPublished] = useState(false);
  const [loadingDraft, setLoadingDraft] = useState(false);

  // Video
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState("");
  const [videoDuration, setVideoDuration] = useState(0);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Content (Step 2)
  const [title, setTitle] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [thumbnail, setThumbnail] = useState("");
  const [visibility, setVisibility] = useState("public");
  const [allowComments, setAllowComments] = useState(true);
  const [isAiContent, setIsAiContent] = useState(false);
  const [copyrightProtected, setCopyrightProtected] = useState(false);
  const [frameHashes, setFrameHashes] = useState<{ frameIndex: number; hash: string }[]>([]);
  const [audioHashes, setAudioHashes] = useState<{ chunkIndex: number; hash: string }[]>([]);
  const [nsfwFrameUrls, setNsfwFrameUrls] = useState<string[]>([]);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [showThumbPicker, setShowThumbPicker] = useState(false);

  // Sound
  const [selectedSound, setSelectedSound] = useState<SoundItem | null>(null);
  const [soundModalOpen, setSoundModalOpen] = useState(false);
  const [useOriginalSound, setUseOriginalSound] = useState(true);

  // Preview controls
  const [previewPaused, setPreviewPaused] = useState(false);
  const [previewMuted, setPreviewMuted] = useState(true);
  const [trimModalOpen, setTrimModalOpen] = useState(false);

  // SEO meta
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [metaKeywords, setMetaKeywords] = useState("");
  const [metaExpanded, setMetaExpanded] = useState(false);
  const [settingsExpanded, setSettingsExpanded] = useState(true);

  // State
  const { savingAs, startSaving, finishSaving } = useCreateSaveState();
  const [deleting, setDeleting] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [draftId, setDraftId] = useState<number | null>(null);

  const {
    tagAutocompleteRef,
    tags,
    setTags,
    tagSearch,
    tagSuggestions,
    tagHighlight,
    tagCreating,
    addTag,
    createAndAddTag,
    removeTag,
    handleTagKeyDown,
    handleTagSearchChange,
    handleTagFocus,
    setTagHighlight,
  } = useCreateTagManager({
    tagMinLength: (min) => t("tagMinLength", { min }),
    tagMaxLength: (max) => t("tagMaxLength", { max }),
    tagInvalidChars: t("tagInvalidChars"),
    tagOnlyNumbers: t("tagOnlyNumbers"),
    tagCreateFailed: t("tagCreateFailed"),
    tagCreateFailedRetry: t("tagCreateFailedRetry"),
  });

  const handleEmojiSelect = (emoji: string) => {
    const textarea = titleRef.current;
    if (!textarea) {
      if ((title + emoji).length <= VALIDATION.postTitle.max) setTitle(prev => prev + emoji);
      setShowEmojiPicker(false);
      return;
    }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newValue = title.substring(0, start) + emoji + title.substring(end);
    if (newValue.length <= VALIDATION.postTitle.max) {
      setTitle(newValue);
      setTimeout(() => {
        const pos = start + emoji.length;
        textarea.selectionStart = pos;
        textarea.selectionEnd = pos;
        textarea.focus();
      }, 0);
    }
    setShowEmojiPicker(false);
  };

  useEffect(() => {
    if (title.trim() || videoUrl) setHasUnsavedChanges(true);
  }, [title, videoUrl]);

  // Focus title at end when returning to step 2 or after draft loads
  useEffect(() => {
    if (step === 2 && titleRef.current && title) {
      const el = titleRef.current;
      requestAnimationFrame(() => { el.focus(); el.selectionStart = el.selectionEnd = el.value.length; });
    }
  }, [step, loadingDraft]);

  useBeforeUnloadGuard(hasUnsavedChanges && Boolean(title.trim() || videoUrl));

  // Load edit mode
  useEffect(() => {
    const editSlug = searchParams.get("edit");
    if (editSlug) {
      setIsEditMode(true);
      setStep(2);
      loadDraft(editSlug);
    }
  }, []);

  const loadDraft = async (slug: string) => {
    setLoadingDraft(true);
    try {
      const post = await fetchCreateDraftPost(slug);
      setTitle(post.title || "");
      setDraftId(post.id);
      setIsPublished(post.status === "published");
      setVideoUrl(post.video_url || "");
      setVideoDuration(post.video_duration || 0);
      setThumbnail(post.video_thumbnail || post.featured_image || "");
      setAllowComments(post.allow_comments !== false);
      setIsAiContent(post.is_ai_content === true);
      setVisibility(post.visibility || "public");
      setCopyrightProtected(post.copyright_protected === true);
      if (post.meta_title) setMetaTitle(post.meta_title);
      if (post.meta_description) setMetaDescription(post.meta_description);
      if (post.meta_keywords) setMetaKeywords(post.meta_keywords);
      const postTags = (post.post_tags || [])
        .map((pt: { tags: Tag }) => pt.tags)
        .filter(Boolean);
      setTags(postTags);
      const sound = post.sounds || (Array.isArray(post.sounds) ? post.sounds[0] : null);
      if (sound) {
        if (sound.is_original) {
          setUseOriginalSound(true);
          setSelectedSound(null);
        } else {
          setSelectedSound(sound);
          setUseOriginalSound(false);
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
      video.muted = previewMutedRef.current;
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

  const validateVideo = (file: File): Promise<{ duration: number; isVertical: boolean }> => {
    return loadVideoMetadata(file).then(({ duration, width, height }) => {
      if (duration > MOMENT_MAX_DURATION) {
        throw new Error(t("momentMaxDuration", { seconds: MOMENT_MAX_DURATION }));
      }
      return {
        duration,
        isVertical: height >= width,
      };
    });
  };

  const generateThumbnail = (file: File): Promise<string> => {
    return generateVideoThumbnail(file, {
      thumbnailCreateFailed: t("thumbnailCreateFailed"),
      videoFileReadError: t("videoFileReadError"),
    });
  };

  const {
    handleVideoSelect,
    handleVideoInput,
    handleVideoDrop,
    removeVideo,
    handleTrim,
    handleThumbUpload,
    uploadVideo,
  } = useManagedVideoMedia({
    maxSizeMb: MOMENT_MAX_SIZE_MB,
    targetRatio: 9 / 16,
    currentPreviewUrl: videoPreviewUrl,
    unsupportedFormatMessage: t("videoUnsupportedFormat"),
    fileTooLargeMessage: t("videoMaxSize", { size: MOMENT_MAX_SIZE_MB }),
    invalidFileMessage: t("invalidFile"),
    fileReadErrorMessage: t("fileReadError"),
    imageUploadFailedMessage: t("imageUploadFailed"),
    uploadErrorFallback: t("videoUploadFailed"),
    uploadMessages: {
      uploadInitFailed: t("uploadInitFailed"),
      uploadFailed: (status) => t("uploadFailed", { status }),
      videoUploadFailed: t("videoUploadFailed"),
      uploadCancelled: t("uploadCancelled"),
    },
    reportError: (message) => feedimAlert("error", message),
    validateSelection: validateVideo,
    getDuration: (result) => result.duration,
    getValidationError: (result) =>
      !result.isVertical && result.duration > 0 ? t("momentVerticalRequired") : null,
    generateThumbnail,
    setVideoFile,
    setVideoUrl,
    setVideoDuration,
    setVideoPreviewUrl,
    setUploading,
    setUploadProgress,
    setThumbnail,
    setPreviewPaused,
    setCropSrc,
    setFrameHashes,
    setAudioHashes,
    setNsfwFrameUrls,
    progressMap: (fraction) => Math.round(fraction * 95),
  });

  const savePost = async (status: "draft" | "published") => {
    if (!startSaving(status)) return;
    let shouldReleaseLock = true;

    if (status === "published" && !videoUrl) { feedimAlert("error", t("videoNotUploaded")); return; }
    if (status === "published" && uploading) { feedimAlert("error", t("videoStillUploading")); return; }

    let finalTitle = title;
    let finalTags = tags;
    const hashtagResult = await extractHashtagsToTags(title, tags);
    if (hashtagResult.foundHashtags) {
      finalTitle = hashtagResult.cleanedText;
      finalTags = hashtagResult.tags;
    }

    try {
      let thumbUrl = thumbnail;
      let thumbBlurhash: string | null = null;
      if (thumbnail && thumbnail.startsWith("data:")) {
        try {
          const uploadData = await uploadGeneratedImageDataUrl(thumbnail, "thumb");
          thumbUrl = uploadData.url;
          thumbBlurhash = uploadData.blurhash;
        } catch { /* use data url as fallback */ }
      }

      const endpoint = draftId ? `/api/posts/${draftId}` : "/api/posts";
      const method = draftId ? "PUT" : "POST";
      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: finalTitle.trim(),
          content: "",
          content_type: "moment",
          status,
          tags: finalTags.map(t => typeof t.id === "number" ? t.id : (t.slug || t.name)),
          featured_image: thumbUrl || null,
          video_url: videoUrl || null,
          video_duration: videoDuration || null,
          video_thumbnail: thumbUrl || null,
          blurhash: thumbBlurhash,
          allow_comments: allowComments,
          is_ai_content: isAiContent,
          visibility,
          copyright_protected: copyrightProtected,
          meta_title: metaTitle.trim() || null,
          meta_description: metaDescription.trim() || null,
          meta_keywords: metaKeywords.trim() || null,
          sound_id: selectedSound?.id || null,
          frame_hashes: frameHashes,
          audio_hashes: audioHashes,
          nsfw_frame_urls: nsfwFrameUrls,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        shouldReleaseLock = false;
        setHasUnsavedChanges(false);
        redirectAfterCreateSave({
          router,
          status,
          slug: data.post?.slug,
          contentType: "moment",
        });
      } else {
        feedimAlert("error", data.error || t("genericErrorRetry"));
      }
    } catch { feedimAlert("error", t("genericErrorRetry")); } finally {
      finishSaving(!shouldReleaseLock);
    }
  };

  const goToStep2 = async () => {
    if (!videoFile && !videoUrl) { feedimAlert("error", t("videoNotSelected")); return; }
    // If video was trimmed (videoUrl cleared), re-upload
    if (videoFile && !videoUrl && !uploading) {
      (async () => {
        let f = videoFile;
        try { f = await (await import("@/lib/videoOptimize")).optimizeVideo(videoFile); } catch {}
        uploadVideo(f);
      })();
    }

    const hashtagResult = await extractHashtagsToTags(title, tags);
    if (hashtagResult.foundHashtags) {
      if (hashtagResult.tagsChanged) setTags(hashtagResult.tags);
      setTitle(hashtagResult.cleanedText);
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

  const handleDeletePost = () => {
    confirmDeleteDraft({
      draftId,
      deleting,
      setDeleting,
      confirmText: t("deleteConfirmContent"),
      successText: t("deleted"),
      failedText: t("deleteFailed"),
      onDeleted: () => router.push("/dashboard"),
    });
  };

  const headerRight = (
    <CreateHeaderActions
      step={step}
      isPublished={isPublished}
      nextLabel={t("nextStep")}
      onNext={goToStep2}
      nextDisabled={!canGoNext || uploading}
      saveLabel={t("save")}
      onSaveDraft={() => savePost("draft")}
      saveDisabled={savingAs !== null}
      saveLoading={savingAs === "draft"}
      deleteLabel={t("deleteBtn")}
      onDelete={handleDeletePost}
      deleteDisabled={deleting || savingAs !== null}
      deleteLoading={deleting}
      publishLabel={t("publishBtn")}
      updateLabel={t("updateBtn")}
      onPublish={() => savePost("published")}
      publishDisabled={savingAs !== null || !videoUrl || uploading}
      publishLoading={savingAs === "published"}
    />
  );

  return (
    <AppLayout
      hideMobileNav
      hideRightSidebar
      headerRightAction={headerRight}
      headerTitle={step === 1 ? t("headerMoment") : t("headerDetails")}
      headerOnBack={() => { if (step === 2) setStep(1); else smartBack(router); }}
    >
      <div className="flex flex-col min-h-[calc(100vh-53px)]">

        {/* Step 1: Video Upload */}
        {step === 1 && (
          <div className="flex flex-col flex-1 px-2 sm:px-4 pt-4 pb-20">
            {!videoFile && !videoUrl ? (
              <>
                <div
                  onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "copy"; }}
                  onDrop={handleVideoDrop}
                  onClick={() => openFilePicker(videoInputRef.current)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      openFilePicker(videoInputRef.current);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  className="flex flex-col items-center justify-center flex-1 min-h-[340px] border-2 border-solid border-border-primary hover:border-accent-main/50 rounded-2xl cursor-pointer transition bg-bg-secondary"
                >
                  <div className="w-16 h-16 rounded-full bg-accent-main/10 flex items-center justify-center mb-4">
                    <Film className="h-8 w-8 text-accent-main" />
                  </div>
                  <p className="text-base font-semibold text-text-primary mb-1">
                    {t("momentUploadClick")}
                  </p>
                  <p className="text-xs text-text-muted mb-3 hidden sm:block">
                    {t("orDragHere")}
                  </p>
                  <div className="flex flex-col sm:flex-row items-center gap-1 sm:gap-3 text-xs text-text-muted/70 mt-2 sm:mt-0">
                    <span>{t("verticalVideo")}</span>
                    <span className="hidden sm:inline">&middot;</span>
                    <span>{t("maxSize", { size: MOMENT_MAX_SIZE_MB })} &middot; {t("maxSeconds", { seconds: MOMENT_MAX_DURATION })}</span>
                  </div>
                </div>
                <input
                  ref={videoInputRef}
                  type="file"
                  accept="video/*"
                  onChange={handleVideoInput}
                  className="hidden"
                />
              </>
            ) : (
              <div className="space-y-3">
                {/* Sound selection — top, before video */}
                {!uploading && (videoUrl || videoFile) && (
                  <div className="mb-[10px] space-y-2">
                    <div className="flex items-center gap-2 justify-center">
                      {videoFile && !uploading && (
                        <button
                          onClick={() => { setPreviewPaused(true); setTrimModalOpen(true); }}
                          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border-primary hover:border-accent-main/50 transition"
                        >
                          <Scissors className="h-4 w-4 text-text-muted" />
                          <span className="text-sm text-text-muted">{t("trimVideo")}</span>
                        </button>
                      )}
                      {!selectedSound && (
                        <button
                          onClick={() => setSoundModalOpen(true)}
                          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border-primary hover:border-accent-main/50 transition"
                        >
                          <Music className="h-4 w-4 text-text-muted" />
                          <span className="text-sm text-text-muted">{t("addSound")}</span>
                        </button>
                      )}
                    </div>
                    {selectedSound && (
                      <div className="flex items-center gap-2.5 p-2.5 bg-bg-tertiary rounded-lg max-w-[300px] mx-auto">
                        <div className="w-9 h-9 rounded-md bg-accent-main/10 flex items-center justify-center shrink-0 overflow-hidden">
                          {selectedSound.cover_image_url ? (
                            <BlurImage src={selectedSound.cover_image_url} alt={selectedSound.title || ""} className="w-full h-full" />
                          ) : (
                            <Music className="h-4 w-4 text-accent-main" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[0.82rem] font-semibold truncate">{selectedSound.title}</p>
                          {selectedSound.artist && (
                            <p className="text-xs text-text-muted truncate">{selectedSound.artist}</p>
                          )}
                        </div>
                        <button
                          onClick={() => setSoundModalOpen(true)}
                          className="px-2.5 py-1 text-xs font-semibold text-accent-main hover:bg-accent-main/10 rounded-md transition"
                        >
                          {t("changeSound")}
                        </button>
                        <button
                          onClick={() => {
                            if (previewAudioRef.current) {
                              previewAudioRef.current.pause();
                              previewAudioRef.current.src = "";
                              previewAudioRef.current = null;
                            }
                            if (previewVideoRef.current) {
                              previewVideoRef.current.muted = previewMuted;
                              previewVideoRef.current.volume = 1;
                            }
                            setSelectedSound(null);
                            setUseOriginalSound(true);
                          }}
                          className="p-1.5 hover:bg-bg-secondary rounded-md transition"
                        >
                          <X className="h-3.5 w-3.5 text-text-muted" strokeWidth={2.5} />
                        </button>
                      </div>
                    )}
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
                  <div className="flex items-center gap-2 text-xs text-text-muted font-medium">
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
          <div className="flex-1 px-[11px] sm:px-4 pt-4 space-y-2.5">
            <div className="mx-auto w-40 aspect-[9/16] rounded-xl bg-bg-secondary animate-pulse" />
            <div className="h-5 w-[55%] bg-bg-secondary rounded-[5px] animate-pulse" />
            <div className="h-[9px] w-[50%] bg-bg-secondary rounded-[5px] animate-pulse" />
          </div>
        )}
        {step === 2 && !loadingDraft && (
          <div className="flex flex-col flex-1 px-[11px] sm:px-4 pt-4 pb-20 space-y-5">

            {/* Thumbnail — top center */}
            <div className="flex flex-col items-center">
              {thumbnail ? (
                <div className="flex flex-col items-center">
                  <div className="relative rounded-xl overflow-hidden max-w-[160px]">
                    <img src={thumbnail} alt={t("thumbnail")} className="w-full aspect-[9/16] object-contain bg-bg-tertiary" />
                    <button onClick={() => setThumbnail("")} className="absolute top-2 right-2 p-1.5 bg-black/50 rounded-full text-white hover:bg-black/70 transition" aria-label={t("thumbnailRemove")}>
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <p className="text-[0.68rem] text-text-muted/70 mt-2 text-center">{t("thumbnailRecommended9by16")}</p>
                  {(videoFile || videoUrl) && (
                    <button
                      type="button"
                      onClick={() => setShowThumbPicker(true)}
                      className="mt-1 w-full text-sm text-accent-main hover:text-accent-main/80 font-medium py-1.5 transition text-center"
                    >
                      {t("editCover")}
                    </button>
                  )}
                </div>
              ) : (
                <div className="max-w-[160px] w-full">
                  {(videoFile || videoUrl) && (
                    <button
                      type="button"
                      onClick={() => setShowThumbPicker(true)}
                      className="flex flex-col items-center justify-center aspect-[9/16] border-2 border-border-primary hover:border-accent-main/50 rounded-xl cursor-pointer transition w-full"
                    >
                      <Upload className="h-6 w-6 mx-auto mb-2 opacity-50 text-text-muted" />
                      <p className="text-xs text-text-muted text-center">{t("editCover")}</p>
                    </button>
                  )}
                  <p className="text-[0.68rem] text-text-muted/70 mt-2 text-center">{t("thumbnailRecommended9by16")}</p>
                </div>
              )}
            </div>

            {/* Description (no border) */}
            <div style={{ position: "relative" }}>
              <textarea
                ref={titleRef}
                value={title}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v.length <= VALIDATION.postTitle.max) setTitle(v);
                  mention.handleTextChange(v, titleRef.current);
                }}
                onKeyDown={(e) => {
                  if (mention.mentionUsers.length > 0) {
                    if ((e.key === "Enter" || e.key === "Tab") && mention.mentionUsers[mention.mentionIndex]) {
                      e.preventDefault();
                      mention.selectUser(mention.mentionUsers[mention.mentionIndex].username, title, (v, cursorPos) => {
                        if (v.length <= VALIDATION.postTitle.max) setTitle(v);
                        setTimeout(() => {
                          if (titleRef.current) {
                            titleRef.current.focus();
                            titleRef.current.selectionStart = cursorPos;
                            titleRef.current.selectionEnd = cursorPos;
                          }
                        }, 0);
                      });
                      return;
                    }
                    if (mention.handleKeyDown(e)) return;
                  }
                }}
                maxLength={VALIDATION.postTitle.max}
                placeholder={t("momentDescPlaceholder")}
                rows={3}
                className="w-full resize-none text-[0.95rem] leading-relaxed min-h-[80px] pt-3 bg-transparent text-text-primary outline-none placeholder:text-[0.95rem] placeholder:text-text-muted/50"
              />
              <MentionDropdown
                users={mention.mentionUsers}
                activeIndex={mention.mentionIndex}
                onHover={mention.setMentionIndex}
                onSelect={(username) => {
                  mention.selectUser(username, title, (v, cursorPos) => {
                    if (v.length <= VALIDATION.postTitle.max) setTitle(v);
                    setTimeout(() => {
                      if (titleRef.current) {
                        titleRef.current.focus();
                        titleRef.current.selectionStart = cursorPos;
                        titleRef.current.selectionEnd = cursorPos;
                      }
                    }, 0);
                  });
                }}
                style={{ top: "100%", marginTop: 4 }}
                className="!w-full"
              />
              <div className="flex items-center justify-between mt-1">
                <button
                  type="button"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className={`flex items-center justify-center h-7 w-7 rounded-full transition ${showEmojiPicker ? "text-accent-main" : "text-text-muted hover:text-text-primary"}`}
                >
                  <Smile className="h-[18px] w-[18px]" />
                </button>
                <span className={`text-[0.66rem] ${title.length >= VALIDATION.postTitle.max - 20 ? "text-error" : "text-text-muted/60"}`}>
                  {title.length}/{VALIDATION.postTitle.max}
                </span>
              </div>
            </div>

            {showEmojiPicker && (
              <EmojiPickerPanel
                onEmojiSelect={handleEmojiSelect}
                onClose={() => setShowEmojiPicker(false)}
              />
            )}

            {/* Tags */}
            <div>
              <CreateTagInput
                label={t("tagsLabel")}
                tags={tags}
                maxTags={VALIDATION.postTags.max}
                tagSearch={tagSearch}
                tagSuggestions={tagSuggestions}
                tagHighlight={tagHighlight}
                tagCreating={tagCreating}
                placeholder={t("tagSearchPlaceholder")}
                createLabel={t("createTag")}
                postsCountLabel={t("postsCount")}
                tagUnitLabel={t("tagUnit")}
                autocompleteRef={tagAutocompleteRef}
                onTagSearchChange={handleTagSearchChange}
                onTagKeyDown={handleTagKeyDown}
                onTagFocus={handleTagFocus}
                onTagHighlight={setTagHighlight}
                onAddTag={addTag}
                onCreateTag={createAndAddTag}
                onRemoveTag={removeTag}
              />
            </div>

            {/* Visibility */}
            <div>
              <label className="block text-sm font-semibold mb-2">{t("visibilityLabel")}</label>
              <div className="relative">
                <select
                  value={visibility}
                  onChange={e => setVisibility(e.target.value)}
                  disabled={isPublished}
                  className={`input-modern w-full appearance-none pr-10 ${isPublished ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
                >
                  <option value="public">{t("visibilityPublic")}</option>
                  <option value="followers">{t("visibilityFollowers")}</option>
                  <option value="only_me">{t("visibilityOnlyMe")}</option>
                </select>
                <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted pointer-events-none" />
              </div>
              {isPublished && <p className="text-xs text-text-muted mt-1.5">{t("visibilityCannotChange")}</p>}
            </div>

            {/* Settings */}
            <CreateSettingsSection
              label={t("settingsLabel")}
              description={t("settingsDesc")}
              expanded={settingsExpanded}
              onToggle={() => setSettingsExpanded(!settingsExpanded)}
              lockedMessage={isPublished ? t("publishedFieldLocked") : undefined}
            >
                <CreateSettingsToggle
                  label={t("allowComments")}
                  description={t("allowCommentsDescViewers")}
                  checked={allowComments}
                  disabled={isPublished}
                  onToggle={() => setAllowComments(!allowComments)}
                />
                <div>
                <CreateSettingsToggle
                  label={t("aiContent")}
                  description={t("aiContentDesc")}
                  checked={isAiContent}
                  disabled={isPublished}
                  onToggle={() => setIsAiContent(!isAiContent)}
                  paddingClassName="px-2 py-3"
                />
                <p className="pt-0.5 pb-0 text-[0.7rem] text-text-muted leading-snug">
                  {t("aiContentWarning")}{" "}
                  <a href="/help/ai" target="_blank" rel="noopener noreferrer" className="text-accent-main hover:underline">{t("aiContentLearnMore")}</a>
                </p>
                </div>
                <div>
                <CreateSettingsToggle
                  label={t("copyrightProtection")}
                  description={isPublished && copyrightProtected ? t("copyrightCannotDisable") : !user?.copyrightEligible ? t("copyrightAutoEnable") : t("copyrightDesc")}
                  checked={copyrightProtected}
                  disabled={isPublished || !user?.copyrightEligible || (isPublished && copyrightProtected)}
                  disabledClassName="opacity-50 cursor-not-allowed"
                  onToggle={() => {
                    if (!user?.copyrightEligible) return;
                    if (isPublished) return;
                    setCopyrightProtected(!copyrightProtected);
                  }}
                  paddingClassName="px-2 py-3"
                />
                {!user?.copyrightEligible && (
                  <a href="/help/copyright" target="_blank" rel="noopener noreferrer" className="block px-4 pb-2 text-xs text-accent-main hover:underline">{t("copyrightLearnMore")} &rarr;</a>
                )}
                </div>
            </CreateSettingsSection>

            <PostMetaFields
              metaTitle={metaTitle} setMetaTitle={setMetaTitle}
              metaDescription={metaDescription} setMetaDescription={setMetaDescription}
              metaKeywords={metaKeywords} setMetaKeywords={setMetaKeywords}
              expanded={metaExpanded} setExpanded={setMetaExpanded}
              contentType="moment"
              readOnly={false}
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
          aspectRatio="9/16"
        />
      )}

      {/* Thumbnail Picker Modal */}
      {(videoFile || videoUrl) && (
        <ThumbnailPickerModal
          open={showThumbPicker}
          onClose={() => setShowThumbPicker(false)}
          videoFile={videoFile}
          videoSrc={!videoFile ? videoUrl : undefined}
          duration={videoDuration}
          aspectRatio="9:16"
          onSelect={(dataUrl) => setThumbnail(dataUrl)}
        />
      )}
    </AppLayout>
  );
}
