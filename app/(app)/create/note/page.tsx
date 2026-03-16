"use client";

import { Suspense, useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { X, ChevronDown, Smile, ImagePlus } from "lucide-react";
import CreateHeaderActions from "@/components/create/CreateHeaderActions";
import { fetchCreateDraftPost } from "@/components/create/api";
import { confirmDeleteDraft } from "@/components/create/deleteDraft";
import { uploadGeneratedImageDataUrl } from "@/components/create/imageUpload";
import { redirectAfterCreateSave } from "@/components/create/navigation";
import CreateTagInput from "@/components/create/CreateTagInput";
import CreateSettingsSection from "@/components/create/CreateSettingsSection";
import CreateSettingsToggle from "@/components/create/CreateSettingsToggle";
import { extractHashtagsToTags, stripHashtags } from "@/components/create/hashtags";
import useCreateSaveState from "@/components/create/useCreateSaveState";
import { useCreateTagManager } from "@/components/create/useCreateTagManager";
import type { CreateTag as Tag } from "@/components/create/types";
import { smartBack } from "@/lib/smartBack";
import { feedimAlert } from "@/components/FeedimAlert";
import { VALIDATION } from "@/lib/constants";
import { useTranslations } from "next-intl";
import { useUser } from "@/components/UserContext";
import AppLayout from "@/components/AppLayout";
import { useMention } from "@/lib/useMention";
import MentionDropdown from "@/components/MentionDropdown";
import LazyAvatar from "@/components/LazyAvatar";

const EmojiPickerPanel = dynamic(
  () => import("@/components/modals/EmojiPickerPanel"),
  { ssr: false },
);
const CropModal = dynamic(() => import("@/components/modals/CropModal"), {
  ssr: false,
});
const PostMetaFields = dynamic(() => import("@/components/PostMetaFields"), {
  ssr: false,
  loading: () => <div className="h-24 rounded-[14px] bg-bg-secondary animate-pulse" />,
});

export default function NoteWritePage() {
  return (
    <Suspense fallback={<AppLayout hideRightSidebar><div className="px-1.5 sm:px-4 pt-4"><div className="flex gap-3"><div className="w-10 h-10 rounded-full bg-bg-secondary shrink-0 animate-pulse" /><div className="flex-1 space-y-3 pt-1"><div className="h-[11px] w-[80%] bg-bg-secondary rounded-[5px] animate-pulse" /><div className="h-[11px] w-[55%] bg-bg-secondary rounded-[5px] animate-pulse" /></div></div></div></AppLayout>}>
      <NoteWriteContent />
    </Suspense>
  );
}

function NoteWriteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useUser();
  const t = useTranslations("create");
  const tc = useTranslations("common");

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const cropResolveRef = useRef<((croppedUrl: string) => void) | null>(null);
  const imageUploadPromiseRef = useRef<Promise<string> | null>(null);
  const imageUploadRequestIdRef = useRef(0);

  // Step: 1=content, 2=tags/settings
  const [step, setStep] = useState(1);
  const [isPublished, setIsPublished] = useState(false);
  const [loadingDraft, setLoadingDraft] = useState(false);

  // Step 1
  const [noteText, setNoteText] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [extractingTags, setExtractingTags] = useState(false);
  const [featuredImage, setFeaturedImage] = useState("");
  const [featuredImagePreview, setFeaturedImagePreview] = useState("");
  const [imageUploading, setImageUploading] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [cropAspect, setCropAspect] = useState(1);

  // Step 2
  const [visibility, setVisibility] = useState("public");
  const [allowComments, setAllowComments] = useState(true);
  const [isAiContent, setIsAiContent] = useState(false);
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [metaKeywords, setMetaKeywords] = useState("");
  const [metaExpanded, setMetaExpanded] = useState(false);
  const [settingsExpanded, setSettingsExpanded] = useState(true);

  // Mention system
  const mention = useMention({ maxMentions: 3, limitMessage: tc("mentionLimit") });

  // State
  const { savingAs, startSaving, finishSaving } = useCreateSaveState();
  const [deleting, setDeleting] = useState(false);
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

  const MAX_CHARS = VALIDATION.noteContent.max;
  const remaining = MAX_CHARS - noteText.length;

  // Focus textarea at end of text when returning to step 1 + recalculate height
  useEffect(() => {
    if (step === 1 && textareaRef.current && noteText) {
      const el = textareaRef.current;
      requestAnimationFrame(() => {
        el.style.height = "auto";
        el.style.height = `${el.scrollHeight}px`;
        el.focus();
        el.selectionStart = el.selectionEnd = el.value.length;
      });
    }
  }, [step]);

  // Recalculate textarea height + set cursor to end after draft is loaded
  useEffect(() => {
    if (!loadingDraft && noteText && textareaRef.current) {
      const el = textareaRef.current;
      requestAnimationFrame(() => {
        el.style.height = "auto";
        el.style.height = `${el.scrollHeight}px`;
        el.focus();
        el.selectionStart = el.selectionEnd = el.value.length;
      });
    }
  }, [loadingDraft]);

  // Load edit mode post
  useEffect(() => {
    const editSlug = searchParams.get("edit");
    if (editSlug) {
      loadDraft(editSlug);
    }
  }, []);

  const loadDraft = async (slug: string) => {
    setLoadingDraft(true);
    try {
      const post = await fetchCreateDraftPost(slug);
      const plainText = (post.content || "").replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "").trim();
      setNoteText(plainText);
      setDraftId(post.id);
      setIsPublished(post.status === "published");
      setFeaturedImage(post.featured_image || "");
      setFeaturedImagePreview(post.featured_image || "");
      setAllowComments(post.allow_comments !== false);
      setIsAiContent(post.is_ai_content === true);
      setVisibility(post.visibility || "public");
      setMetaTitle(post.meta_title || "");
      setMetaDescription(post.meta_description || "");
      setMetaKeywords(post.meta_keywords || "");
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

  // — Mention helpers —
  const handleNoteChange = (value: string) => {
    if (value.length <= MAX_CHARS) {
      setNoteText(value);
    }
    mention.handleTextChange(value, textareaRef.current);
  };

  const selectMentionUser = (username: string) => {
    mention.selectUser(username, noteText, (v, cursorPos) => {
      if (v.length <= MAX_CHARS) {
        setNoteText(v);
      } else {
        feedimAlert("error", t("noteMaxChars", { max: MAX_CHARS }));
      }
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          textareaRef.current.selectionStart = cursorPos;
          textareaRef.current.selectionEnd = cursorPos;
        }
      }, 0);
    });
  };

  const handleEmojiSelect = (emoji: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      if ((noteText + emoji).length <= MAX_CHARS) setNoteText(prev => prev + emoji);
      setShowEmojiPicker(false);
      return;
    }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newValue = noteText.substring(0, start) + emoji + noteText.substring(end);
    if (newValue.length <= MAX_CHARS) {
      setNoteText(newValue);
      setTimeout(() => {
        const pos = start + emoji.length;
        textarea.selectionStart = pos;
        textarea.selectionEnd = pos;
        textarea.focus();
      }, 0);
    }
    setShowEmojiPicker(false);
  };

  const openFilePicker = () => {
    if (!imageUploading) imageInputRef.current?.click();
  };

  const resolveNoteCropAspect = async (dataUrl: string) => {
    const dimensions = await new Promise<{ width: number; height: number }>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = () => reject(new Error("image-load-failed"));
      img.src = dataUrl;
    });

    const ratio = dimensions.width / Math.max(dimensions.height, 1);
    if (ratio >= 1.2) return 1.91;
    if (ratio <= 0.9) return 4 / 5;
    return 1;
  };

  const uploadSingleNoteImage = async (file: File) => {
    const requestId = ++imageUploadRequestIdRef.current;
    try {
      if (!file.type.startsWith("image/")) throw new Error(t("invalidFile"));

      setImageUploading(true);

      const {
        compressImage,
        fileToDataUrl,
        getImageDimensions,
        isAspectClose,
        isSourceImageTooLarge,
        MAX_SOURCE_IMAGE_SIZE_MB,
      } = await import("@/lib/imageCompression");
      if (isSourceImageTooLarge(file)) {
        throw new Error(t("fileTooLarge", { size: MAX_SOURCE_IMAGE_SIZE_MB }));
      }
      const compressed = await compressImage(file, { maxSizeMB: 2, maxWidthOrHeight: 2048 });

      const dataUrl = await fileToDataUrl(compressed).catch(() => {
        throw new Error(t("fileReadError"));
      });

      (document.activeElement as HTMLElement | null)?.blur();

      const nextCropAspect = await resolveNoteCropAspect(dataUrl).catch(() => 1);
      const actualRatio = await getImageDimensions(dataUrl)
        .then((dims) => dims.ratio)
        .catch(() => nextCropAspect);

      const croppedUrl = isAspectClose(actualRatio, nextCropAspect, 0.12)
        ? dataUrl
        : await new Promise<string>((resolve) => {
            cropResolveRef.current = resolve;
            setCropAspect(nextCropAspect);
            setCropSrc(dataUrl);
          });

      if (!croppedUrl) {
        setImageUploading(false);
        return;
      }

      if (requestId !== imageUploadRequestIdRef.current) {
        return;
      }

      setFeaturedImagePreview(croppedUrl);

      const uploadPromise = (async () => {
        const uploadData = await uploadGeneratedImageDataUrl(croppedUrl, "note");
        return uploadData.url;
      })();

      imageUploadPromiseRef.current = uploadPromise;
      const uploadedUrl = await uploadPromise;
      if (requestId !== imageUploadRequestIdRef.current) {
        return;
      }

      setFeaturedImage(uploadedUrl);
      setFeaturedImagePreview(uploadedUrl);
    } catch (err) {
      if (err instanceof Error && err.message === "cancelled") return;
      if (requestId === imageUploadRequestIdRef.current) {
        setFeaturedImage("");
        setFeaturedImagePreview("");
      }
      feedimAlert("error", t("imageUploadFailedRetry"));
    } finally {
      if (requestId === imageUploadRequestIdRef.current) {
        imageUploadPromiseRef.current = null;
        setImageUploading(false);
      }
    }
  };

  const handleImageFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) await uploadSingleNoteImage(file);
    if (imageInputRef.current) imageInputRef.current.value = "";
  };

  const handleTextareaPaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = Array.from(e.clipboardData.items);
    const imageItem = items.find((item) => item.kind === "file" && item.type.startsWith("image/"));
    if (!imageItem) return;
    const file = imageItem.getAsFile();
    if (!file) return;
    e.preventDefault();
    await uploadSingleNoteImage(file);
  };

  const handleMentionKeyDown = (e: React.KeyboardEvent) => {
    if (mention.mentionUsers.length > 0) {
      if ((e.key === "Enter" || e.key === "Tab") && mention.mentionUsers[mention.mentionIndex]) {
        e.preventDefault();
        selectMentionUser(mention.mentionUsers[mention.mentionIndex].username);
        return;
      }
      if (mention.handleKeyDown(e)) return;
    }
  };

  const savePost = async (status: "draft" | "published") => {
    if (!startSaving(status)) return;
    let shouldReleaseLock = true;

    const trimmed = noteText.trim();
    if (!trimmed) {
      feedimAlert("error", t("noteContentEmpty"));
      return;
    }
    if (status === "published" && trimmed.length > MAX_CHARS) {
      feedimAlert("error", t("noteMaxChars", { max: MAX_CHARS }));
      return;
    }

    let finalText = trimmed;
    let finalTags = tags;
    const hashtagResult = await extractHashtagsToTags(trimmed, tags);
    if (hashtagResult.foundHashtags) {
      finalText = hashtagResult.cleanedText;
      finalTags = hashtagResult.tags;
    }

    try {
      let finalFeaturedImage = featuredImage;
      if (imageUploadPromiseRef.current) {
        try {
          finalFeaturedImage = await imageUploadPromiseRef.current;
        } catch {
          feedimAlert("error", t("imageUploadFailedRetry"));
          return;
        }
      }

      const autoTitle = finalText.replace(/<[^>]*>/g, "").slice(0, 50);
      const content = `<p>${finalText.replace(/\n/g, "<br>")}</p>`;

      const endpoint = draftId ? `/api/posts/${draftId}` : "/api/posts";
      const method = draftId ? "PUT" : "POST";

      const body: Record<string, unknown> = {
          title: autoTitle,
          content,
          content_type: "note",
          status,
          featured_image: finalFeaturedImage || null,
          tags: finalTags.map(t => typeof t.id === "number" ? t.id : (t.slug || t.name)),
          allow_comments: allowComments,
          is_ai_content: isAiContent,
          visibility,
          meta_title: metaTitle.trim() || null,
          meta_description: metaDescription.trim() || null,
          meta_keywords: metaKeywords.trim() || null,
      };

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (res.ok) {
        shouldReleaseLock = false;
        redirectAfterCreateSave({
          router,
          status,
          slug: data.post?.slug,
          contentType: "note",
        });
      } else {
        feedimAlert("error", data.error || t("genericErrorRetry"));
      }
    } catch {
      feedimAlert("error", t("genericErrorRetry"));
    } finally {
      finishSaving(!shouldReleaseLock);
    }
  };

  const goToStep2 = async () => {
    if (!noteText.trim()) return;

    const hasPotentialHashtag = noteText.includes("#");
    if (hasPotentialHashtag) setExtractingTags(true);
    const hashtagResult = await extractHashtagsToTags(noteText, tags);
    if (hashtagResult.foundHashtags) {
      if (hashtagResult.tagsChanged) setTags(hashtagResult.tags);
      if (hashtagResult.cleanedText) setNoteText(hashtagResult.cleanedText);
    }
    if (hasPotentialHashtag) setExtractingTags(false);

    // Don't proceed if content is empty after extraction
    const finalText = stripHashtags(noteText);
    if (!finalText && hashtagResult.foundHashtags) {
      feedimAlert("error", t("noteContentEmpty"));
      return;
    }

    setStep(2);
  };

  const canGoNext = noteText.trim().length > 0 && remaining >= 0;

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
      stepOnePrefix={step === 1 ? (
        <span className={`text-xs font-semibold mr-[5px] ${remaining <= 0 ? "text-error" : "text-text-muted"}`}>
          {noteText.length}/{MAX_CHARS}
        </span>
      ) : null}
      nextLabel={t("nextStep")}
      onNext={goToStep2}
      nextDisabled={!canGoNext || extractingTags}
      nextLoading={extractingTags}
      saveLabel={t("save")}
      onSaveDraft={() => savePost("draft")}
      saveDisabled={savingAs !== null || !noteText.trim()}
      saveLoading={savingAs === "draft"}
      deleteLabel={t("deleteBtn")}
      onDelete={handleDeletePost}
      deleteDisabled={deleting || savingAs !== null}
      deleteLoading={deleting}
      publishLabel={t("shareBtn")}
      updateLabel={t("updateBtn")}
      onPublish={() => savePost("published")}
      publishDisabled={savingAs !== null || !noteText.trim() || remaining < 0}
      publishLoading={savingAs === "published"}
    />
  );

  return (
    <AppLayout
      hideMobileNav
      hideRightSidebar
      headerRightAction={headerRight}
      headerTitle={step === 1 ? t("headerNote") : t("headerDetails")}
      headerOnBack={() => { if (step === 2) setStep(1); else smartBack(router); }}
    >
      <div className="flex flex-col min-h-[calc(100vh-53px)]">
        {/* Step 1: Note content */}
        {step === 1 && loadingDraft && (
          <div className="px-1.5 sm:px-4 pt-4">
            <div className="flex gap-3">
              <div className="w-10 h-10 rounded-full bg-bg-secondary shrink-0 animate-pulse" />
              <div className="flex-1 space-y-2 pt-1.5">
                <div className="h-[9px] w-full bg-bg-secondary rounded-[5px] animate-pulse" />
                <div className="h-[9px] w-full bg-bg-secondary rounded-[5px] animate-pulse" />
                <div className="h-[9px] w-[50%] bg-bg-secondary rounded-[5px] animate-pulse" />
              </div>
            </div>
          </div>
        )}
        {step === 1 && !loadingDraft && (
          <div className="flex flex-col flex-1">
            <div className="px-1.5 sm:px-4 pt-4 flex-1">
              <div className="flex gap-3">
                {/* Avatar */}
                <div className="shrink-0">
                  <LazyAvatar src={user?.avatarUrl} sizeClass="w-10 h-10" />
                </div>

                {/* Textarea */}
                <div className="flex-1 min-w-0">
                  <div style={{ position: 'relative' }}>
                    <textarea
                      ref={textareaRef}
                      value={noteText}
                      onChange={(e) => handleNoteChange(e.target.value)}
                      onKeyDown={handleMentionKeyDown}
                      onPaste={handleTextareaPaste}
                      placeholder={t("whatsOnYourMind")}
                      className="w-full bg-transparent text-[1.06rem] leading-[1.55] text-text-primary placeholder:text-[1.06rem] placeholder:leading-[1.55] placeholder:text-text-muted/50 resize-none min-h-0 overflow-hidden"
                      style={{ border: "none", outline: "none", boxShadow: "none", padding: 0, borderRadius: 0, height: "auto", fontSize: "1.06rem" }}
                      rows={1}
                      maxLength={MAX_CHARS}
                      autoFocus
                      onInput={(e) => {
                        const el = e.target as HTMLTextAreaElement;
                        el.style.height = "auto";
                        el.style.height = `${el.scrollHeight}px`;
                      }}
                    />

                    {/* Mention dropdown */}
                    <MentionDropdown
                      users={mention.mentionUsers}
                      activeIndex={mention.mentionIndex}
                      onHover={mention.setMentionIndex}
                      onSelect={(username) => selectMentionUser(username)}
                      style={mention.mentionDropdownTop != null ? { top: mention.mentionDropdownTop } : { top: 36 }}
                    />
                  </div>
                  {(featuredImagePreview || featuredImage || imageUploading) && (
                    <div className="mt-0">
                      <div
                        className="relative w-full overflow-hidden rounded-[18px] border border-border-primary"
                        style={{ borderWidth: "0.9px" }}
                      >
                        {featuredImagePreview || featuredImage ? (
                          <>
                            <img
                              src={featuredImagePreview || featuredImage}
                              alt={tc("image")}
                              className="block h-auto max-h-[560px] w-full"
                            />
                            {imageUploading && (
                              <div className="absolute inset-0 animate-pulse bg-bg-secondary/20" />
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                imageUploadRequestIdRef.current += 1;
                                imageUploadPromiseRef.current = null;
                                setImageUploading(false);
                                setFeaturedImage("");
                                setFeaturedImagePreview("");
                              }}
                              className="absolute top-2 right-2 flex items-center justify-center h-8 w-8 rounded-full bg-black/55 text-white transition hover:bg-black/70"
                              aria-label={tc("delete")}
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </>
                        ) : (
                          <div className="h-[320px] w-full animate-pulse rounded-[18px] bg-bg-secondary" />
                        )}
                      </div>
                    </div>
                  )}
                  <div className="flex items-center justify-end mt-1">
                    <button
                      type="button"
                      onClick={openFilePicker}
                      disabled={imageUploading}
                      className={`flex items-center justify-center h-7 w-7 rounded-full transition ${featuredImage ? "text-accent-main" : "text-text-muted/50 hover:text-text-primary"} disabled:opacity-50`}
                      aria-label={t("addImage")}
                    >
                      <ImagePlus className="h-[18px] w-[18px]" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                      className={`flex items-center justify-center h-7 w-7 rounded-full transition ${showEmojiPicker ? "text-accent-main" : "text-text-muted/50 hover:text-text-primary"}`}
                    >
                      <Smile className="h-[18px] w-[18px]" />
                    </button>
                  </div>
                </div>
              </div>
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageFile}
                className="hidden"
              />

              {showEmojiPicker && (
                <EmojiPickerPanel
                  onEmojiSelect={handleEmojiSelect}
                  onClose={() => setShowEmojiPicker(false)}
                />
              )}
            </div>
          </div>
        )}

        {/* Step 2: Tags + Settings */}
        {step === 2 && (
          <div className="space-y-6 px-[9px] sm:px-3 pt-4 pb-8">
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
                  className={`input-modern w-full appearance-none pr-10 ${isPublished ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
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
                  description={t("allowCommentsDesc")}
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
                />
                <p className="px-4 pt-1.5 pb-2 text-[0.7rem] text-text-muted leading-snug">
                  {t("aiContentWarning")}{" "}
                  <a href="/help/ai" target="_blank" rel="noopener noreferrer" className="text-accent-main hover:underline">{t("aiContentLearnMore")}</a>
                </p>
                </div>
            </CreateSettingsSection>

            <PostMetaFields
              metaTitle={metaTitle} setMetaTitle={setMetaTitle}
              metaDescription={metaDescription} setMetaDescription={setMetaDescription}
              metaKeywords={metaKeywords} setMetaKeywords={setMetaKeywords}
              expanded={metaExpanded} setExpanded={setMetaExpanded}
              contentType="note"
              readOnly={false}
            />
          </div>
        )}
      </div>

      <CropModal
        open={!!cropSrc}
        onClose={() => {
          setCropSrc(null);
          if (cropResolveRef.current) cropResolveRef.current("");
          cropResolveRef.current = null;
        }}
        imageSrc={cropSrc || ""}
        aspectRatio={cropAspect}
        onCrop={(croppedUrl) => {
          if (cropResolveRef.current) {
            cropResolveRef.current(croppedUrl);
            cropResolveRef.current = null;
          }
          setCropSrc(null);
        }}
      />
    </AppLayout>
  );
}
