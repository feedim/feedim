"use client";

import { Suspense, useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { X, Upload, Smile, ChevronDown } from "lucide-react";
import CreateHeaderActions from "@/components/create/CreateHeaderActions";
import { fetchCreateDraftPost } from "@/components/create/api";
import { confirmDeleteDraft } from "@/components/create/deleteDraft";
import { redirectAfterCreateSave } from "@/components/create/navigation";
import CreateTagInput from "@/components/create/CreateTagInput";
import { uploadGeneratedImageDataUrl } from "@/components/create/imageUpload";
import CreateSettingsSection from "@/components/create/CreateSettingsSection";
import CreateSettingsToggle from "@/components/create/CreateSettingsToggle";
import { extractHashtagsToTags } from "@/components/create/hashtags";
import useCreateSaveState from "@/components/create/useCreateSaveState";
import { useCreateTagManager } from "@/components/create/useCreateTagManager";
import type { CreateTag as Tag } from "@/components/create/types";
import { createClient } from "@/lib/supabase/client";
import { smartBack } from "@/lib/smartBack";
import dynamic from "next/dynamic";
import type { RichTextEditorHandle } from "@/components/RichTextEditor";

const RichTextEditor = dynamic(() => import("@/components/RichTextEditor"), {
  ssr: false,
  loading: () => (
    <div className="flex-1 px-1.5 sm:px-4 pt-4 space-y-2.5">
      <div className="h-[9px] w-full bg-bg-secondary rounded-[5px] animate-pulse" />
      <div className="h-[9px] w-full bg-bg-secondary rounded-[5px] animate-pulse" />
      <div className="h-[9px] w-[50%] bg-bg-secondary rounded-[5px] animate-pulse" />
    </div>
  ),
});
const EmojiPickerPanel = dynamic(
  () => import("@/components/modals/EmojiPickerPanel"),
  { ssr: false },
);
const GifPickerPanel = dynamic(
  () => import("@/components/modals/GifPickerPanel"),
  { ssr: false },
);
const CropModal = dynamic(() => import("@/components/modals/CropModal"), {
  ssr: false,
});
const PostMetaFields = dynamic(() => import("@/components/PostMetaFields"), {
  ssr: false,
  loading: () => <div className="h-24 rounded-[14px] bg-bg-secondary animate-pulse" />,
});
import { feedimAlert } from "@/components/FeedimAlert";
import { VALIDATION } from "@/lib/constants";

import { useTranslations, useLocale } from "next-intl";
import { useUser } from "@/components/UserContext";
import AppLayout from "@/components/AppLayout";
import { openFilePicker } from "@/lib/openFilePicker";

export default function WritePage() {
  return (
    <Suspense fallback={<AppLayout hideRightSidebar><div className="px-1.5 sm:px-4 pt-4 space-y-2.5"><div className="h-5 w-[55%] bg-bg-secondary rounded-[5px] animate-pulse" /><div className="h-[9px] w-full bg-bg-secondary rounded-[5px] animate-pulse" /><div className="h-[9px] w-full bg-bg-secondary rounded-[5px] animate-pulse" /><div className="h-[9px] w-[50%] bg-bg-secondary rounded-[5px] animate-pulse" /></div></AppLayout>}>
      <WritePageContent />
    </Suspense>
  );
}

function WritePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const { user } = useUser();
  const t = useTranslations("create");
  const locale = useLocale();
  const maxWords = (user?.role === "admin" || user?.premiumPlan === "max" || user?.premiumPlan === "business")
    ? VALIDATION.postContent.maxWordsMax
    : VALIDATION.postContent.maxWords;
  const editorRef = useRef<RichTextEditorHandle>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const coverUploadPromiseRef = useRef<Promise<string> | null>(null);
  const coverUploadRequestIdRef = useRef(0);
  // Step: 1=title+content, 2=tags/image/settings
  const [step, setStep] = useState(1);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isPublished, setIsPublished] = useState(false);
  const [loadingDraft, setLoadingDraft] = useState(false);

  // Step 1
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  // Step 2
  const [featuredImage, setFeaturedImage] = useState("");
  const [featuredImagePreview, setFeaturedImagePreview] = useState("");
  const [coverDragging, setCoverDragging] = useState(false);
  const [visibility, setVisibility] = useState("public");
  const [allowComments, setAllowComments] = useState(true);
  const [isForKids, setIsForKids] = useState(false);
  const [isAiContent, setIsAiContent] = useState(false);
  const [copyrightProtected, setCopyrightProtected] = useState(false);

  // Auto-disable copyright protection when content drops below 50 words
  useEffect(() => {
    const wordCount = content.replace(/<[^>]*>/g, ' ').trim().split(/\s+/).filter(Boolean).length;
    if (wordCount < 50 && copyrightProtected) setCopyrightProtected(false);
  }, [content, copyrightProtected]);

  // SEO meta
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [metaKeywords, setMetaKeywords] = useState("");
  const [metaExpanded, setMetaExpanded] = useState(false);
  const [settingsExpanded, setSettingsExpanded] = useState(true);

  // State
  const { savingAs, startSaving, finishSaving } = useCreateSaveState();
  const [deleting, setDeleting] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [draftId, setDraftId] = useState<number | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [cropAspect, setCropAspect] = useState(16 / 9);

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
  const cropResolveRef = useRef<((url: string) => void) | null>(null);

  // Load edit mode post
  useEffect(() => {
    const editSlug = searchParams.get("edit");
    if (editSlug) {
      setIsEditMode(true);
      loadDraft(editSlug);
    }
  }, []);

  const loadDraft = async (slug: string) => {
    setLoadingDraft(true);
    try {
      const post = await fetchCreateDraftPost(slug);
      setTitle(post.title || "");
      setContent(post.content || "");
      setDraftId(post.id);
      setFeaturedImage(post.featured_image || "");
      setFeaturedImagePreview(post.featured_image || "");
      setVisibility(post.visibility || "public");
      setAllowComments(post.allow_comments !== false);
      setIsForKids(post.is_for_kids === true);
      setIsAiContent(post.is_ai_content === true);
      setCopyrightProtected(post.copyright_protected === true);
      setIsPublished(post.status === "published");
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

  const handleImageUpload = async (file: File): Promise<string> => {
    setImageUploading(true);
    try {
      if (!file.type.startsWith("image/")) throw new Error(t("invalidFile"));

      // Compress before storing (strip metadata, convert to JPEG, max 2MB)
      const {
        compressImage,
        fileToDataUrl,
        getImageDimensions,
        isAspectClose,
        isSourceImageTooLarge,
        MAX_SOURCE_IMAGE_SIZE_MB,
      } = await import("@/lib/imageCompression");
      if (isSourceImageTooLarge(file)) throw new Error(t("fileTooLarge", { size: MAX_SOURCE_IMAGE_SIZE_MB }));
      const compressed = await compressImage(file, { maxSizeMB: 2, maxWidthOrHeight: 2048 });

      const dataUrl = await fileToDataUrl(compressed).catch(() => {
        throw new Error(t("fileReadError"));
      });

      // Dismiss mobile keyboard before opening crop modal
      (document.activeElement as HTMLElement)?.blur();

      const actualRatio = await getImageDimensions(dataUrl)
        .then((dims) => dims.ratio)
        .catch(() => 16 / 9);
      const croppedUrl = isAspectClose(actualRatio, 16 / 9)
        ? dataUrl
        : await new Promise<string>((resolve) => {
            cropResolveRef.current = resolve;
            setCropAspect(16 / 9);
            setCropSrc(dataUrl);
          });

      // Crop cancelled
      if (!croppedUrl) throw new Error("cancelled");

      // Upload cropped image to R2 immediately (data: URLs are stripped by sanitizer)
      const uploadData = await uploadGeneratedImageDataUrl(croppedUrl, "inline");
      return uploadData.url;
    } finally {
      setImageUploading(false);
    }
  };

  const handleCoverImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const requestId = ++coverUploadRequestIdRef.current;
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
      if (isSourceImageTooLarge(file)) throw new Error(t("fileTooLarge", { size: MAX_SOURCE_IMAGE_SIZE_MB }));
      const compressed = await compressImage(file, { maxSizeMB: 2, maxWidthOrHeight: 2048 });

      const dataUrl = await fileToDataUrl(compressed).catch(() => {
        throw new Error(t("fileReadError"));
      });

      // Dismiss keyboard before crop modal
      (document.activeElement as HTMLElement)?.blur();

      const actualRatio = await getImageDimensions(dataUrl)
        .then((dims) => dims.ratio)
        .catch(() => 16 / 9);
      const croppedUrl = isAspectClose(actualRatio, 16 / 9)
        ? dataUrl
        : await new Promise<string>((resolve) => {
            cropResolveRef.current = resolve;
            setCropAspect(16 / 9);
            setCropSrc(dataUrl);
          });

      // Crop cancelled
      if (!croppedUrl) {
        setImageUploading(false);
        return;
      }

      if (requestId !== coverUploadRequestIdRef.current) return;
      setFeaturedImagePreview(croppedUrl);

      // Upload cropped image to R2
      const uploadPromise = (async () => {
        const uploadData = await uploadGeneratedImageDataUrl(croppedUrl, "cover");
        return uploadData.url;
      })();
      coverUploadPromiseRef.current = uploadPromise;
      const uploadedUrl = await uploadPromise;

      if (requestId !== coverUploadRequestIdRef.current) return;
      setFeaturedImage(uploadedUrl);
      setFeaturedImagePreview(uploadedUrl);
    } catch {
      if (requestId === coverUploadRequestIdRef.current) {
        setFeaturedImage("");
        setFeaturedImagePreview("");
      }
      feedimAlert("error", t("imageUploadFailedRetry"));
    } finally {
      if (requestId === coverUploadRequestIdRef.current) {
        coverUploadPromiseRef.current = null;
        setImageUploading(false);
      }
    }
    e.target.value = "";
  };

  // Cover image drag & drop
  const handleCoverDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    setCoverDragging(true);
  };
  const handleCoverDragLeave = () => setCoverDragging(false);
  const handleCoverDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setCoverDragging(false);
    const file = Array.from(e.dataTransfer.files).find(f => f.type.startsWith("image/"));
    if (!file) return;
    const requestId = ++coverUploadRequestIdRef.current;
    try {
      const {
        compressImage,
        fileToDataUrl,
        getImageDimensions,
        isAspectClose,
        isSourceImageTooLarge,
        MAX_SOURCE_IMAGE_SIZE_MB,
      } = await import("@/lib/imageCompression");
      if (isSourceImageTooLarge(file)) throw new Error(t("fileTooLarge", { size: MAX_SOURCE_IMAGE_SIZE_MB }));

      setImageUploading(true);
      const compressed = await compressImage(file, { maxSizeMB: 2, maxWidthOrHeight: 2048 });

      const dataUrl = await fileToDataUrl(compressed).catch(() => {
        throw new Error(t("fileReadError"));
      });

      const actualRatio = await getImageDimensions(dataUrl)
        .then((dims) => dims.ratio)
        .catch(() => 16 / 9);
      const croppedUrl = isAspectClose(actualRatio, 16 / 9)
        ? dataUrl
        : await new Promise<string>((resolve) => {
            cropResolveRef.current = resolve;
            setCropAspect(16 / 9);
            setCropSrc(dataUrl);
          });

      if (!croppedUrl) {
        setImageUploading(false);
        return;
      }

      if (requestId !== coverUploadRequestIdRef.current) return;
      setFeaturedImagePreview(croppedUrl);

      // Upload cropped image to R2
      const uploadPromise = (async () => {
        const uploadData = await uploadGeneratedImageDataUrl(croppedUrl, "cover");
        return uploadData.url;
      })();
      coverUploadPromiseRef.current = uploadPromise;
      const uploadedUrl = await uploadPromise;

      if (requestId !== coverUploadRequestIdRef.current) return;
      setFeaturedImage(uploadedUrl);
      setFeaturedImagePreview(uploadedUrl);
    } catch {
      if (requestId === coverUploadRequestIdRef.current) {
        setFeaturedImage("");
        setFeaturedImagePreview("");
      }
      feedimAlert("error", t("imageUploadFailedRetry"));
    } finally {
      if (requestId === coverUploadRequestIdRef.current) {
        coverUploadPromiseRef.current = null;
        setImageUploading(false);
      }
    }
  };

  // Title Enter → focus editor
  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      editorRef.current?.focus();
    }
  };

  const savePost = async (status: "draft" | "published") => {
    if (!startSaving(status)) return;
    let shouldReleaseLock = true;

    const trimmedTitle = title.trim();

    if (!trimmedTitle) {
      feedimAlert("error", t("titleRequired"));
      return;
    }

    // Title validation (WordPress birebir)
    if (trimmedTitle.length < 3) {
      feedimAlert("error", t("titleMinLength"));
      return;
    }
    if (/<[^>]+>/.test(trimmedTitle)) {
      feedimAlert("error", t("titleNoHtml"));
      return;
    }
    // Domain detection
    if (/^(https?:\/\/|www\.)\S+$/i.test(trimmedTitle)) {
      feedimAlert("error", t("titleNoUrl"));
      return;
    }

    // Content validation (WordPress birebir) — only for publish
    if (status === "published") {
      const cleanedContent = editorRef.current?.cleanContentForSave() || content;
      const { validatePostContent } = await import("@/components/RichTextEditor");
      const validation = validatePostContent(cleanedContent, maxWords, {
        contentRequired: t("contentRequired"),
        minChars: t("postMinChars"),
        maxWords: t("postMaxWords", { max: maxWords.toLocaleString(locale) }),
        maxListItems: t("postMaxListItems"),
        repetitiveContent: t("repetitiveContent"),
        onlyNumbers: t("postOnlyNumbers"),
      });
      if (!validation.ok) {
        feedimAlert("error", validation.error!);
        return;
      }
    }

    let finalTitle = title;
    let finalTags = tags;
    const hashtagResult = await extractHashtagsToTags(title, tags);
    if (hashtagResult.foundHashtags) {
      finalTitle = hashtagResult.cleanedText;
      finalTags = hashtagResult.tags;
      setTitle(finalTitle);
      if (hashtagResult.tagsChanged) setTags(finalTags);
    }

    try {
      let finalFeaturedImage = featuredImage;
      if (coverUploadPromiseRef.current) {
        try {
          finalFeaturedImage = await coverUploadPromiseRef.current;
        } catch {
          feedimAlert("error", t("imageUploadFailedRetry"));
          return;
        }
      }

      const endpoint = draftId ? `/api/posts/${draftId}` : "/api/posts";
      const method = draftId ? "PUT" : "POST";
      let cleanedContent = editorRef.current?.cleanContentForSave() || content;

      // Re-upload external images to CDN on publish
      if (status === "published") {
        try {
          const { reuploadExternalImages } = await import("@/lib/reuploadExternalImages");
          cleanedContent = await reuploadExternalImages(cleanedContent);
        } catch {}
      }

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: finalTitle.trim(),
          content: cleanedContent,
          status,
          tags: finalTags.map(t => typeof t.id === "number" ? t.id : (t.slug || t.name)),
          featured_image: finalFeaturedImage || null,
          allow_comments: allowComments,
          is_for_kids: isForKids,
          is_ai_content: isAiContent,
          visibility,
          copyright_protected: copyrightProtected && cleanedContent.replace(/<[^>]*>/g, ' ').trim().split(/\s+/).filter(Boolean).length >= 50,
          meta_title: metaTitle.trim() || null,
          meta_description: metaDescription.trim() || null,
          meta_keywords: metaKeywords.trim() || null,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        shouldReleaseLock = false;
        redirectAfterCreateSave({
          router,
          status,
          slug: data.post?.slug,
          contentType: "post",
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

  // Crop inline image in editor — called by editor's crop toolbar button
  const handleEditorCropImage = async (src: string): Promise<string> => {
    (document.activeElement as HTMLElement)?.blur();
    const croppedUrl = await new Promise<string>((resolve) => {
      cropResolveRef.current = resolve;
      setCropAspect(16 / 9);
      setCropSrc(src);
    });
    if (!croppedUrl) return "";
    // Upload cropped image to R2
    try {
      const uploadData = await uploadGeneratedImageDataUrl(croppedUrl, "crop");
      return uploadData.url;
    } catch {
      return "";
    }
  };

  // Auto-detect featured image from first content image when entering step 2
  const goToStep2 = async () => {
    if (!canGoNextRaw) return;
    // Temizlenmiş içerik kontrolü — boş HTML'leri yakala
    const cleaned = editorRef.current?.cleanContentForSave() || "";
    if (!cleaned.trim()) {
      feedimAlert("error", t("contentRequired"));
      return;
    }
    if (!featuredImage) {
      const imgRegex = /<img[^>]+src="([^"]+)"/g;
      let imgMatch;
      while ((imgMatch = imgRegex.exec(content)) !== null) {
        const url = imgMatch[1];
        if (!url.toLowerCase().endsWith('.gif')) {
          setFeaturedImage(url);
          setFeaturedImagePreview(url);
          break;
        }
      }
    }
    // Ana konu başlığı: title'dan otomatik doldur (60 karakter)
    if (!metaTitle.trim()) {
      const t = title.trim();
      if (t.length <= 60) {
        setMetaTitle(t);
      } else {
        const cut = t.slice(0, 57);
        const lastSpace = cut.lastIndexOf(" ");
        setMetaTitle((lastSpace > 30 ? cut.slice(0, lastSpace) : cut) + "...");
      }
    }

    const hashtagResult = await extractHashtagsToTags(title, tags);
    if (hashtagResult.foundHashtags) {
      setTitle(hashtagResult.cleanedText);
      if (hashtagResult.tagsChanged) setTags(hashtagResult.tags);
    }

    setStep(2);
  };

  const canGoNextRaw = title.trim().length > 0 && content.trim().length > 0;

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
      nextDisabled={!canGoNextRaw}
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
      publishDisabled={savingAs !== null || !title.trim() || !content.trim()}
      publishLoading={savingAs === "published"}
    />
  );

  return (
    <AppLayout
      hideMobileNav
      hideRightSidebar
      headerRightAction={headerRight}
      headerTitle={step === 1 ? t("headerPost") : t("headerDetails")}
      headerOnBack={() => { if (step === 2) setStep(1); else smartBack(router); }}
    >
      <div className="flex flex-col min-h-[calc(100vh-53px)]">
        {/* Step 1: Title + Content */}
        {step === 1 && loadingDraft && (
          <div className="flex-1 px-1.5 sm:px-4 pt-4 space-y-2.5">
            <div className="h-5 w-[55%] bg-bg-secondary rounded-[5px] animate-pulse" />
            <div className="h-[9px] w-full bg-bg-secondary rounded-[5px] animate-pulse" />
            <div className="h-[9px] w-full bg-bg-secondary rounded-[5px] animate-pulse" />
            <div className="h-[9px] w-[50%] bg-bg-secondary rounded-[5px] animate-pulse" />
          </div>
        )}
        {step === 1 && !loadingDraft && (
          <div className="flex flex-col flex-1">
            <div className="px-1.5 sm:px-4 pt-4">
              <input
                ref={titleInputRef}
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                onKeyDown={handleTitleKeyDown}
                onFocus={e => {
                  const el = e.currentTarget;
                  requestAnimationFrame(() => {
                    const len = el.value.length;
                    el.setSelectionRange(len, len);
                  });
                }}
                maxLength={VALIDATION.postTitle.max}
                placeholder={t("titlePlaceholder")}
                className="title-input"
                autoFocus
              />
            </div>
            <RichTextEditor
              ref={editorRef}
              value={content}
              onChange={setContent}
              onImageUpload={handleImageUpload}
              onBackspaceAtStart={() => titleInputRef.current?.focus()}
              onEmojiClick={() => { (document.activeElement as HTMLElement)?.blur(); setTimeout(() => { (document.activeElement as HTMLElement)?.blur(); }, 50); setShowEmojiPicker(true); }}
              onGifClick={() => { (document.activeElement as HTMLElement)?.blur(); setTimeout(() => { (document.activeElement as HTMLElement)?.blur(); }, 50); setShowGifPicker(true); }}
              onCropImage={handleEditorCropImage}
              onMentionSearch={async (query) => {
                try {
                  const res = await fetch(`/api/users/search?q=${encodeURIComponent(query)}&mention=1`);
                  const data = await res.json();
                  return data.users || [];
                } catch { return []; }
              }}
              onSave={() => savePost("draft")}
              onPublish={() => savePost("published")}
              placeholder={t("whatsOnYourMind")}
            />
          </div>
        )}

        {/* Step 2: Tags + Cover Image + Settings */}
        {step === 2 && (
          <div className="space-y-6 px-[11px] sm:px-3 pt-4 pb-20">
            {/* Tags + Cover Image — side by side on desktop */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                  locale={locale}
                  onTagSearchChange={handleTagSearchChange}
                  onTagKeyDown={handleTagKeyDown}
                  onTagFocus={handleTagFocus}
                  onTagHighlight={setTagHighlight}
                  onAddTag={addTag}
                  onCreateTag={createAndAddTag}
                  onRemoveTag={removeTag}
                />
              </div>

              {/* Cover Image with drag & drop */}
              <div>
                <label className="block text-sm font-semibold mb-2">{t("coverImage")}</label>
                {(featuredImagePreview || featuredImage) ? (
                  <div>
                    <div
                      className="relative flex min-h-[220px] items-center justify-center rounded-xl overflow-hidden border border-border-primary"
                      style={{ borderWidth: "0.9px" }}
                    >
                      <img
                        src={featuredImagePreview || featuredImage}
                        alt={t("coverImage")}
                        className="block h-auto max-h-[520px] w-auto max-w-full object-contain"
                      />
                      {imageUploading && (
                        <div className="absolute inset-0 bg-bg-secondary/80 animate-pulse" />
                      )}
                      <button
                        onClick={() => {
                          coverUploadRequestIdRef.current += 1;
                          coverUploadPromiseRef.current = null;
                          setImageUploading(false);
                          setFeaturedImage("");
                          setFeaturedImagePreview("");
                        }
                        className="absolute top-2 right-2 p-1.5 bg-black/50 rounded-full text-white hover:bg-black/70 transition"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="flex items-center gap-3 mt-2">
                      <button
                        onClick={async () => {
                          // Re-crop existing cover image
                          (document.activeElement as HTMLElement)?.blur();
                          setImageUploading(true);
                          try {
                            const croppedUrl = await new Promise<string>((resolve) => {
                              cropResolveRef.current = resolve;
                              setCropAspect(16 / 9);
                              setCropSrc(featuredImage);
                            });
                            if (!croppedUrl) { setImageUploading(false); return; }
                            const uploadData = await uploadGeneratedImageDataUrl(croppedUrl, "cover");
                            setFeaturedImage(uploadData.url);
                          } catch {} finally { setImageUploading(false); }
                        }}
                        className="text-sm text-accent-main hover:text-accent-main/80 font-medium py-1.5 transition"
                      >
                        {t("editCover")}
                      </button>
                      <button
                        onClick={() => openFilePicker(coverInputRef.current)}
                        className="text-sm text-text-muted hover:text-text-primary font-medium py-1.5 transition"
                      >
                        {t("changeCover")}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onDragOver={handleCoverDragOver}
                    onDragLeave={handleCoverDragLeave}
                    onDrop={handleCoverDrop}
                    onClick={() => { if (!imageUploading) openFilePicker(coverInputRef.current); }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        if (!imageUploading) openFilePicker(coverInputRef.current);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    className={`flex flex-col items-center justify-center h-48 border-2 rounded-xl cursor-pointer transition px-10 ${
                      coverDragging
                        ? "border-accent-main bg-accent-main/5"
                        : "border-border-primary hover:border-accent-main/50"
                    }`}
                  >
                    <div className="text-center text-text-muted text-sm">
                      {imageUploading ? (
                        <div className="flex flex-col items-center gap-2">
                          <div className="w-10 h-10 rounded-full bg-bg-tertiary animate-pulse" />
                          <div className="h-[9px] w-28 bg-bg-tertiary rounded-[5px] animate-pulse" />
                        </div>
                      ) : (
                        <>
                          <Upload className="h-6 w-6 mx-auto mb-2 opacity-50" />
                          <p className="text-xs">{t("coverUploadHint")}</p>
                        </>
                      )}
                    </div>
                  </div>
                )}
                <input
                  ref={coverInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleCoverImage}
                  className="hidden"
                />
              <p className="text-[0.68rem] text-text-muted/70 mt-1.5">{t("coverRecommended")}</p>
              <p className="text-[0.68rem] text-text-muted/70 mt-0.5 italic">{t("coverCopyrightNote")}</p>
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
                    if (content.replace(/<[^>]*>/g, " ").trim().split(/\s+/).filter(Boolean).length < 50) return;
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
              contentType="post"
              readOnly={false}
            />

          </div>
        )}
      </div>

      {/* Emoji Picker */}
      {showEmojiPicker && (
        <EmojiPickerPanel
          onEmojiSelect={(emoji) => {
            editorRef.current?.insertEmoji(emoji);
            setShowEmojiPicker(false);
          }}
          onClose={() => setShowEmojiPicker(false)}
        />
      )}

      {/* GIF Picker */}
      {showGifPicker && (
        <GifPickerPanel
          onGifSelect={(gifUrl, previewUrl) => {
            editorRef.current?.insertGif(previewUrl || gifUrl);
            setShowGifPicker(false);
          }}
          onClose={() => setShowGifPicker(false)}
        />
      )}

      {/* Crop Modal */}
      <CropModal
        open={!!cropSrc}
        onClose={() => {
          setCropSrc(null);
          if (cropResolveRef.current) {
            cropResolveRef.current("");
          }
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
