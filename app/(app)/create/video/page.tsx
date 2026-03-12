"use client";

import { Suspense, useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { smartBack } from "@/lib/smartBack";
import { X, Upload, Film, Scissors, ChevronDown, Smile } from "lucide-react";
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
  VIDEO_MAX_DURATION,
  VIDEO_MAX_SIZE_MB,
  VIDEO_ALLOWED_TYPES,
} from "@/lib/constants";
import { useTranslations } from "next-intl";
import { useUser } from "@/components/UserContext";
import AppLayout from "@/components/AppLayout";
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

export default function VideoWritePage() {
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
      <VideoWriteContent />
    </Suspense>
  );
}

function VideoWriteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const { user } = useUser();
  const t = useTranslations("create");
  const tc = useTranslations("common");

  const videoInputRef = useRef<HTMLInputElement>(null);
  const thumbInputRef = useRef<HTMLInputElement>(null);
  const previewVideoRef = useRef<HTMLVideoElement>(null);
  const descRef = useRef<HTMLTextAreaElement>(null);
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
  const [description, setDescription] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [thumbnail, setThumbnail] = useState("");
  const [visibility, setVisibility] = useState("public");
  const [allowComments, setAllowComments] = useState(true);
  const [isForKids, setIsForKids] = useState(false);
  const [isAiContent, setIsAiContent] = useState(false);
  const [copyrightProtected, setCopyrightProtected] = useState(false);
  const [frameHashes, setFrameHashes] = useState<{ frameIndex: number; hash: string }[]>([]);
  const [audioHashes, setAudioHashes] = useState<{ chunkIndex: number; hash: string }[]>([]);
  const [nsfwFrameUrls, setNsfwFrameUrls] = useState<string[]>([]);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [showThumbPicker, setShowThumbPicker] = useState(false);

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

  const maxDescLength = 2000;

  const handleEmojiSelect = (emoji: string) => {
    const textarea = descRef.current;
    if (!textarea) {
      if ((description + emoji).length <= maxDescLength) setDescription(prev => prev + emoji);
      setShowEmojiPicker(false);
      return;
    }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newValue = description.substring(0, start) + emoji + description.substring(end);
    if (newValue.length <= maxDescLength) {
      setDescription(newValue);
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
  }, [title, description, videoUrl]);

  // Focus description at end when returning to step 2 or after draft loads
  useEffect(() => {
    if (step === 2 && descRef.current && description) {
      const el = descRef.current;
      requestAnimationFrame(() => { el.focus(); el.selectionStart = el.selectionEnd = el.value.length; });
    }
  }, [step, loadingDraft]);

  useBeforeUnloadGuard(hasUnsavedChanges && Boolean(title.trim() || videoUrl));

  // Load edit mode
  useEffect(() => {
    const editSlug = searchParams.get("edit");
    if (editSlug) {
      setIsEditMode(true);
      setStep(2); // Skip to step 2 since video already uploaded
      loadDraft(editSlug);
    }
  }, []);

  const loadDraft = async (slug: string) => {
    setLoadingDraft(true);
    try {
      const post = await fetchCreateDraftPost(slug);
      setTitle(post.title || "");
      setDescription((post.content || "").replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, ""));
      setDraftId(post.id);
      setIsPublished(post.status === "published");
      setVideoUrl(post.video_url || "");
      setVideoDuration(post.video_duration || 0);
      setThumbnail(post.video_thumbnail || post.featured_image || "");
      setAllowComments(post.allow_comments !== false);
      setIsForKids(post.is_for_kids === true);
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
    } catch {
      feedimAlert("error", t("draftLoadError"));
    } finally {
      setLoadingDraft(false);
    }
  };

  const validateVideo = (file: File): Promise<number> => {
    return loadVideoMetadata(file, {
      rejectOnError: true,
      readErrorMessage: t("videoFileReadError"),
    }).then(({ duration }) => {
      if (duration > VIDEO_MAX_DURATION) {
        throw new Error(t("videoMaxDuration", { minutes: Math.floor(VIDEO_MAX_DURATION / 60) }));
      }
      return duration;
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
    maxSizeMb: VIDEO_MAX_SIZE_MB,
    targetRatio: 16 / 9,
    currentPreviewUrl: videoPreviewUrl,
    unsupportedFormatMessage: t("videoUnsupportedFormat"),
    fileTooLargeMessage: t("videoMaxSize", { size: VIDEO_MAX_SIZE_MB }),
    invalidFileMessage: t("invalidFile"),
    fileReadErrorMessage: t("fileReadError"),
    imageUploadFailedMessage: t("imageUploadFailedRetry"),
    uploadErrorFallback: t("videoUploadFailedRetry"),
    uploadMessages: {
      uploadInitFailed: t("uploadInitFailed"),
      uploadFailed: (status) => t("uploadFailed", { status }),
      videoUploadFailed: t("videoUploadFailed"),
      uploadCancelled: t("uploadCancelled"),
    },
    reportError: (message) => feedimAlert("error", message),
    validateSelection: async (file) => ({ duration: await validateVideo(file) }),
    getDuration: (result) => result.duration,
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
    initProgress: 2,
    progressMap: (fraction) => Math.round(2 + fraction * 93),
  });

  const savePost = async (status: "draft" | "published") => {
    if (!startSaving(status)) return;
    let shouldReleaseLock = true;

    if (!title.trim()) { feedimAlert("error", t("titleRequired")); return; }
    if (title.trim().length < 3) { feedimAlert("error", t("titleMinLength")); return; }
    if (status === "published" && !videoUrl) { feedimAlert("error", t("videoNotUploaded")); return; }
    if (status === "published" && uploading) { feedimAlert("error", t("videoStillUploading")); return; }

    let finalDescription = description;
    let finalTags = tags;
    const hashtagResult = await extractHashtagsToTags(description, tags);
    if (hashtagResult.foundHashtags) {
      finalDescription = hashtagResult.cleanedText;
      finalTags = hashtagResult.tags;
    }

    try {
      // Upload thumbnail image if it's a data URL
      let thumbUrl = thumbnail;
      let thumbBlurhash: string | null = null;
      if (thumbnail && thumbnail.startsWith("data:")) {
        try {
          const uploadData = await uploadGeneratedImageDataUrl(thumbnail, "thumb");
          thumbUrl = uploadData.url;
          thumbBlurhash = uploadData.blurhash;
        } catch { /* use data url as fallback */ }
      }

      // Convert newlines to <br> for proper display (like notes)
      const contentHtml = finalDescription.trim().replace(/\n/g, "<br>");

      const endpoint = draftId ? `/api/posts/${draftId}` : "/api/posts";
      const method = draftId ? "PUT" : "POST";
      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          content: contentHtml,
          content_type: "video",
          status,
          tags: finalTags.map(t => typeof t.id === "number" ? t.id : (t.slug || t.name)),
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
          frame_hashes: frameHashes,
          audio_hashes: audioHashes,
          nsfw_frame_urls: nsfwFrameUrls,
          meta_title: metaTitle.trim() || null,
          meta_description: metaDescription.trim() || null,
          meta_keywords: metaKeywords.trim() || null,
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
          contentType: "video",
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

    const hashtagResult = await extractHashtagsToTags(description, tags);
    if (hashtagResult.foundHashtags) {
      if (hashtagResult.tagsChanged) setTags(hashtagResult.tags);
      setDescription(hashtagResult.cleanedText);
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
      saveDisabled={savingAs !== null || !title.trim()}
      saveLoading={savingAs === "draft"}
      deleteLabel={t("deleteBtn")}
      onDelete={handleDeletePost}
      deleteDisabled={deleting || savingAs !== null}
      deleteLoading={deleting}
      publishLabel={t("publishBtn")}
      updateLabel={t("updateBtn")}
      onPublish={() => savePost("published")}
      publishDisabled={savingAs !== null || !title.trim() || !videoUrl || uploading}
      publishLoading={savingAs === "published"}
    />
  );

  return (
    <AppLayout
      hideMobileNav
      hideRightSidebar
      headerRightAction={headerRight}
      headerTitle={step === 1 ? t("headerVideo") : t("headerDetails")}
      headerOnBack={() => { if (step === 2) setStep(1); else smartBack(router); }}
    >
      <div className="flex flex-col min-h-[calc(100vh-53px)]">

        {/* ─── Step 1: Video Upload ─── */}
        {step === 1 && (
          <div className="flex flex-col flex-1 px-2 sm:px-4 pt-4 pb-20">
            {!videoFile && !videoUrl ? (
              /* Upload area */
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
                    {t("videoUploadClick")}
                  </p>
                  <p className="text-sm text-text-muted mb-3 hidden sm:block">
                    {t("orDragHere")}
                  </p>
                  <div className="flex flex-col sm:flex-row items-center gap-1 sm:gap-3 text-xs text-text-muted/70 mt-2 sm:mt-0">
                    <span>MP4, WebM, MOV, AVI, MKV...</span>
                    <span className="hidden sm:inline">&middot;</span>
                    <span>{t("maxSize", { size: VIDEO_MAX_SIZE_MB })} &middot; {t("maxMinutes", { minutes: Math.floor(VIDEO_MAX_DURATION / 60) })}</span>
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
              /* Video preview */
              <div className="space-y-3">
                {/* Trim button */}
                {videoFile && !uploading && (
                  <div className="flex justify-center">
                    <button
                      onClick={() => { setPreviewPaused(true); setTrimModalOpen(true); }}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border-primary hover:border-accent-main/50 transition"
                    >
                      <Scissors className="h-4 w-4 text-text-muted" />
                      <span className="text-sm text-text-muted">{t("trimVideo")}</span>
                    </button>
                  </div>
                )}

                <VideoEditorPreview
                  src={videoPreviewUrl || videoUrl}
                  poster={thumbnail || undefined}
                  aspectRatio="16/9"
                  maxWidth="100%"
                  uploading={uploading}
                  uploadProgress={uploadProgress}
                  onCancelUpload={removeVideo}
                  paused={previewPaused}
                  onTogglePause={() => setPreviewPaused(p => !p)}
                  muted={previewMuted}
                  onToggleMute={() => setPreviewMuted(m => !m)}
                  duration={videoDuration}
                  videoRef={previewVideoRef}
                  onRemove={removeVideo}
                  t={t}
                />

                {/* Video info */}
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

        {/* ─── Step 2: Title + Description + Tags + Thumbnail + Settings ─── */}
        {step === 2 && loadingDraft && (
          <div className="flex-1 px-[11px] sm:px-4 pt-4 space-y-2.5">
            <div className="h-5 w-[55%] bg-bg-secondary rounded-[5px] animate-pulse" />
            <div className="h-[9px] w-full bg-bg-secondary rounded-[5px] animate-pulse" />
            <div className="h-[9px] w-[50%] bg-bg-secondary rounded-[5px] animate-pulse" />
            <div className="h-36 w-full rounded-xl bg-bg-secondary animate-pulse" />
          </div>
        )}
        {step === 2 && !loadingDraft && (
          <div className="flex flex-col flex-1 px-[11px] sm:px-4 pt-4 pb-20 space-y-5">

            {/* Title */}
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={VALIDATION.postTitle.max}
              placeholder={t("videoTitlePlaceholder")}
              className="title-input"
            />

            {/* Description */}
            <div style={{ position: "relative" }}>
              <textarea
                ref={descRef}
                value={description}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v.length <= maxDescLength) setDescription(v);
                  mention.handleTextChange(v, descRef.current);
                }}
                onKeyDown={(e) => {
                  if (mention.mentionUsers.length > 0) {
                    if ((e.key === "Enter" || e.key === "Tab") && mention.mentionUsers[mention.mentionIndex]) {
                      e.preventDefault();
                      mention.selectUser(mention.mentionUsers[mention.mentionIndex].username, description, (v, cursorPos) => {
                        if (v.length <= maxDescLength) setDescription(v);
                        setTimeout(() => {
                          if (descRef.current) {
                            descRef.current.focus();
                            descRef.current.selectionStart = cursorPos;
                            descRef.current.selectionEnd = cursorPos;
                          }
                        }, 0);
                      });
                      return;
                    }
                    if (mention.handleKeyDown(e)) return;
                  }
                }}
                maxLength={maxDescLength}
                placeholder={t("videoDescPlaceholder")}
                rows={4}
                className="input-modern w-full resize-none text-[0.95rem] leading-relaxed min-h-[100px] pt-3 placeholder:text-[0.95rem]"
              />
              <MentionDropdown
                users={mention.mentionUsers}
                activeIndex={mention.mentionIndex}
                onHover={mention.setMentionIndex}
                onSelect={(username) => {
                  mention.selectUser(username, description, (v, cursorPos) => {
                    if (v.length <= maxDescLength) setDescription(v);
                    setTimeout(() => {
                      if (descRef.current) {
                        descRef.current.focus();
                        descRef.current.selectionStart = cursorPos;
                        descRef.current.selectionEnd = cursorPos;
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
                <span className={`text-[0.66rem] ${description.length >= maxDescLength - 50 ? "text-error" : "text-text-muted/60"}`}>
                  {description.length}/{maxDescLength}
                </span>
              </div>
            </div>

            {showEmojiPicker && (
              <EmojiPickerPanel
                onEmojiSelect={handleEmojiSelect}
                onClose={() => setShowEmojiPicker(false)}
              />
            )}

            {/* Tags + Thumbnail — side by side */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Thumbnail */}
            <div className="md:order-2">
              <label className="block text-sm font-semibold mb-1">{t("thumbnail")}</label>
              <p className="text-[0.68rem] text-text-muted/70 mb-2">{t("thumbnailRecommended16by9")}</p>
              {thumbnail ? (
                <div>
                  <div className="relative rounded-xl overflow-hidden">
                    <img src={thumbnail} alt={t("thumbnail")} className="w-full h-48 object-contain bg-bg-tertiary" />
                    <button onClick={() => setThumbnail("")} className="absolute top-2 right-2 p-1.5 bg-black/50 rounded-full text-white hover:bg-black/70 transition" aria-label={t("thumbnailRemove")}>
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  {(videoFile || videoUrl) && (
                    <button
                      type="button"
                      onClick={() => setShowThumbPicker(true)}
                      className="mt-2 w-full text-sm text-accent-main hover:text-accent-main/80 font-medium py-1.5 transition"
                    >
                      {t("editCover")}
                    </button>
                  )}
                </div>
              ) : (
                <div>
                  {(videoFile || videoUrl) && (
                    <button
                      type="button"
                      onClick={() => setShowThumbPicker(true)}
                      className="flex flex-col items-center justify-center h-36 border-2 border-border-primary hover:border-accent-main/50 rounded-xl cursor-pointer transition w-full"
                    >
                      <Upload className="h-6 w-6 mx-auto mb-2 opacity-50 text-text-muted" />
                      <p className="text-sm text-text-muted">{t("editCover")}</p>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Tags */}
            <div className="md:order-1">
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
                <CreateSettingsToggle
                  label={t("forKids")}
                  description={t("forKidsDesc")}
                  checked={isForKids}
                  disabled={isPublished}
                  onToggle={() => setIsForKids(!isForKids)}
                  paddingClassName="px-2 py-3"
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
              contentType="video"
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
        aspectRatio={16 / 9}
        onCrop={(croppedUrl) => { setThumbnail(croppedUrl); setCropSrc(null); }}
      />

      {/* Video Trim Modal */}
      {videoFile && (
        <VideoTrimModal
          open={trimModalOpen}
          onClose={() => { setTrimModalOpen(false); setPreviewPaused(false); }}
          videoFile={videoFile}
          duration={videoDuration}
          onTrim={handleTrim}
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
          aspectRatio="16:9"
          onSelect={(dataUrl) => setThumbnail(dataUrl)}
        />
      )}
    </AppLayout>
  );
}
