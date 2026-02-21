"use client";

import { Suspense, useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { X, Plus, Upload, Smile, ChevronDown, Undo2, Redo2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import dynamic from "next/dynamic";
import type { RichTextEditorHandle } from "@/components/RichTextEditor";

const RichTextEditor = dynamic(() => import("@/components/RichTextEditor"), {
  ssr: false,
  loading: () => (
    <div className="flex-1 flex items-center justify-center py-16">
      <span className="loader" style={{ width: 24, height: 24 }} />
    </div>
  ),
});
import { feedimAlert } from "@/components/FeedimAlert";
import { VALIDATION } from "@/lib/constants";
import { formatCount } from "@/lib/utils";

import { useUser } from "@/components/UserContext";
import AppLayout from "@/components/AppLayout";
import EmojiPickerPanel from "@/components/modals/EmojiPickerPanel";
import GifPickerPanel from "@/components/modals/GifPickerPanel";
import CropModal from "@/components/modals/CropModal";

interface Tag {
  id: number;
  name: string;
  slug: string;
  post_count?: number;
}

export default function WritePage() {
  return (
    <Suspense fallback={<AppLayout hideRightSidebar><div className="py-16 text-center"><span className="loader mx-auto" style={{ width: 24, height: 24 }} /></div></AppLayout>}>
      <WritePageContent />
    </Suspense>
  );
}

function WritePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const { user } = useUser();
  const maxWords = user?.premiumPlan === "max" ? VALIDATION.postContent.maxWordsMax : VALIDATION.postContent.maxWords;
  const editorRef = useRef<RichTextEditorHandle>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const titleJustFocused = useRef(false);
  // Step: 1=title+content, 2=tags/image/settings
  const [step, setStep] = useState(1);
  const [isEditMode, setIsEditMode] = useState(false);
  const [loadingDraft, setLoadingDraft] = useState(false);

  // Step 1
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  // Step 2
  const [tags, setTags] = useState<Tag[]>([]);
  const [tagSearch, setTagSearch] = useState("");
  const [tagSuggestions, setTagSuggestions] = useState<Tag[]>([]);
  const [tagHighlight, setTagHighlight] = useState(-1);
  const [tagCreating, setTagCreating] = useState(false);
  const [popularTags, setPopularTags] = useState<Tag[]>([]);
  const [featuredImage, setFeaturedImage] = useState("");
  const [coverDragging, setCoverDragging] = useState(false);
  const [visibility, setVisibility] = useState("public");
  const [allowComments, setAllowComments] = useState(true);
  const [isForKids, setIsForKids] = useState(false);

  // SEO meta
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [metaKeywords, setMetaKeywords] = useState("");
  const [metaExpanded, setMetaExpanded] = useState(false);

  // State
  const [saving, setSaving] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [draftId, setDraftId] = useState<number | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [cropAspect, setCropAspect] = useState(16 / 9);
  const cropResolveRef = useRef<((url: string) => void) | null>(null);

  // Track unsaved changes
  useEffect(() => {
    if (title.trim() || content.trim()) {
      setHasUnsavedChanges(true);
    }
  }, [title, content, tags, featuredImage]);

  // Warn before leaving with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges && (title.trim() || content.trim())) {
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges, title, content]);

  // Load edit mode post
  useEffect(() => {
    const editId = searchParams.get("edit");
    if (editId) {
      setIsEditMode(true);
      loadDraft(Number(editId));
    }
  }, []);

  const loadDraft = async (draftPostId: number) => {
    setLoadingDraft(true);
    try {
      const res = await fetch(`/api/posts/${draftPostId}`);
      const data = await res.json();
      if (res.ok && data.post) {
        setTitle(data.post.title || "");
        setContent(data.post.content || "");
        setDraftId(draftPostId);
        setFeaturedImage(data.post.featured_image || "");
        setVisibility(data.post.visibility || "public");
        setAllowComments(data.post.allow_comments !== false);
        setIsForKids(data.post.is_for_kids === true);
        if (data.post.meta_title) setMetaTitle(data.post.meta_title);
        if (data.post.meta_description) setMetaDescription(data.post.meta_description);
        if (data.post.meta_keywords) setMetaKeywords(data.post.meta_keywords);
        const postTags = (data.post.post_tags || [])
          .map((pt: { tags: Tag }) => pt.tags)
          .filter(Boolean);
        setTags(postTags);
      }
    } catch {
      feedimAlert("error", "Taslak yüklenemedi, lütfen daha sonra tekrar deneyin");
    } finally {
      setLoadingDraft(false);
    }
  };

  // Auto-save draft to server every 30 seconds
  useEffect(() => {
    if (!title.trim() || !hasUnsavedChanges) return;
    const timer = setInterval(async () => {
      if (saving || autoSaving) return;
      setAutoSaving(true);
      try {
        const endpoint = draftId ? `/api/posts/${draftId}` : "/api/posts";
        const method = draftId ? "PUT" : "POST";
        const cleanedContent = editorRef.current?.cleanContentForSave() || content;
        const res = await fetch(endpoint, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: title.trim(),
            content: cleanedContent,
            status: "draft",
            tags: tags.map(t => t.id),
            featured_image: featuredImage || null,
            meta_title: metaTitle.trim() || null,
            meta_description: metaDescription.trim() || null,
            meta_keywords: metaKeywords.trim() || null,
          }),
        });
        const data = await res.json();
        if (res.ok) {
          if (!draftId && data.post?.id) setDraftId(data.post.id);
          setHasUnsavedChanges(false);
        }
      } catch {}
      setAutoSaving(false);
    }, 30000);
    return () => clearInterval(timer);
  }, [title, content, hasUnsavedChanges, saving, autoSaving, draftId, tags, featuredImage]);

  // Load popular tags on step 2
  useEffect(() => {
    if (step === 2 && popularTags.length === 0) {
      loadPopularTags();
    }
  }, [step]);

  const loadPopularTags = async () => {
    try {
      const res = await fetch("/api/tags?q=");
      const data = await res.json();
      setPopularTags((data.tags || []).slice(0, 8));
    } catch {}
  };

  const searchTags = useCallback(async (q: string) => {
    if (q.trim().length < 1) {
      setTagSuggestions([]);
      setTagHighlight(-1);
      return;
    }
    try {
      const res = await fetch(`/api/tags?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setTagSuggestions(
        (data.tags || []).filter((t: Tag) => !tags.some(existing => existing.id === t.id))
      );
      setTagHighlight(-1);
    } catch {
      setTagSuggestions([]);
    }
  }, [tags]);

  useEffect(() => {
    const timer = setTimeout(() => searchTags(tagSearch), 300);
    return () => clearTimeout(timer);
  }, [tagSearch, searchTags]);

  const addTag = (tag: Tag) => {
    if (tags.length >= VALIDATION.postTags.max || tags.some(t => t.id === tag.id)) return;
    setTags([...tags, tag]);
    setTagSearch("");
    setTagSuggestions([]);
    setTagHighlight(-1);
  };

  const createAndAddTag = async () => {
    const trimmed = tagSearch.trim().replace(/\s+/g, ' ');
    if (!trimmed || tags.length >= VALIDATION.postTags.max || tagCreating) return;
    if (trimmed.length < VALIDATION.tagName.min) {
      feedimAlert("error", `Etiket en az ${VALIDATION.tagName.min} karakter olmalı`);
      return;
    }
    if (trimmed.length > VALIDATION.tagName.max) {
      feedimAlert("error", `Etiket en fazla ${VALIDATION.tagName.max} karakter olabilir`);
      return;
    }
    if (!VALIDATION.tagName.pattern.test(trimmed)) {
      feedimAlert("error", "Etiket adı geçersiz karakterler içeriyor");
      return;
    }
    if (/^\d+$/.test(trimmed)) {
      feedimAlert("error", "Etiket sadece sayılardan oluşamaz");
      return;
    }
    setTagCreating(true);
    try {
      const res = await fetch("/api/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      const data = await res.json();
      if (res.ok && data.tag) {
        addTag(data.tag);
      } else {
        feedimAlert("error", data.error || "Etiket oluşturulamadı");
      }
    } catch {
      feedimAlert("error", "Etiket oluşturulamadı, lütfen daha sonra tekrar deneyin");
    } finally {
      setTagCreating(false);
    }
  };

  const removeTag = (tagId: number) => {
    setTags(tags.filter(t => t.id !== tagId));
  };

  // Tag keyboard navigation (WordPress birebir)
  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (tagSuggestions.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setTagHighlight(prev => (prev < tagSuggestions.length - 1 ? prev + 1 : 0));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setTagHighlight(prev => (prev > 0 ? prev - 1 : tagSuggestions.length - 1));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (tagHighlight >= 0 && tagHighlight < tagSuggestions.length) {
          addTag(tagSuggestions[tagHighlight]);
        } else if (tagSuggestions.length > 0) {
          addTag(tagSuggestions[0]);
        }
      } else if (e.key === "Escape") {
        setTagSuggestions([]);
        setTagHighlight(-1);
      }
    } else if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      if (tagSearch.trim()) createAndAddTag();
    } else if (e.key === "Backspace" && !tagSearch && tags.length > 0) {
      removeTag(tags[tags.length - 1].id);
    }
  };

  const handleImageUpload = async (file: File): Promise<string> => {
    setImageUploading(true);
    try {
      if (!file.type.startsWith("image/")) throw new Error("Geçersiz dosya");
      if (file.size > 5 * 1024 * 1024) throw new Error("Dosya çok büyük (maks 5MB)");

      // Compress before storing (strip metadata, convert to JPEG, max 2MB)
      const { compressImage } = await import("@/lib/imageCompression");
      const compressed = await compressImage(file, { maxSizeMB: 2, maxWidthOrHeight: 2048 });

      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error("Dosya okunamadı"));
        reader.readAsDataURL(compressed);
      });

      // Dismiss mobile keyboard before opening crop modal
      (document.activeElement as HTMLElement)?.blur();

      // Open crop modal and wait for result
      const croppedUrl = await new Promise<string>((resolve) => {
        cropResolveRef.current = resolve;
        setCropAspect(16 / 9);
        setCropSrc(dataUrl);
      });

      // Store in localStorage
      const key = `fdm-img-${Date.now()}`;
      try { localStorage.setItem(key, croppedUrl); } catch {}

      return croppedUrl;
    } finally {
      setImageUploading(false);
    }
  };

  const handleCoverImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      if (!file.type.startsWith("image/")) throw new Error("Geçersiz dosya");
      if (file.size > 5 * 1024 * 1024) throw new Error("Dosya çok büyük (maks 5MB)");

      setImageUploading(true);
      const { compressImage } = await import("@/lib/imageCompression");
      const compressed = await compressImage(file, { maxSizeMB: 2, maxWidthOrHeight: 2048 });

      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error("Dosya okunamadı"));
        reader.readAsDataURL(compressed);
      });

      const croppedUrl = await new Promise<string>((resolve) => {
        cropResolveRef.current = (url) => { resolve(url); setFeaturedImage(url); };
        setCropAspect(16 / 9);
        setCropSrc(dataUrl);
      });

      setImageUploading(false);
    } catch {
      setImageUploading(false);
      feedimAlert("error", "Görsel yüklenemedi, lütfen daha sonra tekrar deneyin");
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
    try {
      if (file.size > 5 * 1024 * 1024) throw new Error("Dosya çok büyük");

      setImageUploading(true);
      const { compressImage } = await import("@/lib/imageCompression");
      const compressed = await compressImage(file, { maxSizeMB: 2, maxWidthOrHeight: 2048 });

      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error("Dosya okunamadı"));
        reader.readAsDataURL(compressed);
      });

      await new Promise<string>((resolve) => {
        cropResolveRef.current = (url) => { resolve(url); setFeaturedImage(url); };
        setCropAspect(16 / 9);
        setCropSrc(dataUrl);
      });

      setImageUploading(false);
    } catch {
      setImageUploading(false);
      feedimAlert("error", "Görsel yüklenemedi, lütfen daha sonra tekrar deneyin");
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
    const trimmedTitle = title.trim();

    if (!trimmedTitle) {
      feedimAlert("error", "Başlık gerekli");
      return;
    }

    // Title validation (WordPress birebir)
    if (trimmedTitle.length < 3) {
      feedimAlert("error", "Başlık en az 3 karakter olmalı");
      return;
    }
    if (/<[^>]+>/.test(trimmedTitle)) {
      feedimAlert("error", "Başlıkta HTML etiketi kullanılamaz");
      return;
    }
    // Domain detection
    if (/^(https?:\/\/|www\.)\S+$/i.test(trimmedTitle)) {
      feedimAlert("error", "Başlık bir URL olamaz");
      return;
    }

    // Content validation (WordPress birebir) — only for publish
    if (status === "published") {
      const cleanedContent = editorRef.current?.cleanContentForSave() || content;
      const { validatePostContent } = await import("@/components/RichTextEditor");
      const validation = validatePostContent(cleanedContent, maxWords);
      if (!validation.ok) {
        feedimAlert("error", validation.error!);
        return;
      }
    }

    setSaving(true);
    try {
      const endpoint = draftId ? `/api/posts/${draftId}` : "/api/posts";
      const method = draftId ? "PUT" : "POST";
      const cleanedContent = editorRef.current?.cleanContentForSave() || content;
      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          content: cleanedContent,
          status,
          tags: tags.map(t => t.id),
          featured_image: featuredImage || null,
          allow_comments: allowComments,
          is_for_kids: isForKids,
          meta_title: metaTitle.trim() || null,
          meta_description: metaDescription.trim() || null,
          meta_keywords: metaKeywords.trim() || null,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setHasUnsavedChanges(false);
        if (status === "published" && data.post?.slug) {
          router.push(`/post/${data.post.slug}`);
        } else {
          router.push("/dashboard");
        }
      } else {
        feedimAlert("error", data.error || "Bir hata oluştu, lütfen daha sonra tekrar deneyin");
      }
    } catch {
      feedimAlert("error", "Bir hata oluştu, lütfen daha sonra tekrar deneyin");
    } finally {
      setSaving(false);
    }
  };

  // Auto-detect featured image from first content image when entering step 2
  const goToStep2 = () => {
    if (!canGoNextRaw) return;
    // Temizlenmiş içerik kontrolü — boş HTML'leri yakala
    const cleaned = editorRef.current?.cleanContentForSave() || "";
    if (!cleaned.trim()) {
      feedimAlert("error", "Gönderi içeriği gerekli");
      return;
    }
    if (!featuredImage) {
      const match = content.match(/<img[^>]+src="([^"]+)"/);
      if (match?.[1]) {
        setFeaturedImage(match[1]);
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
    setStep(2);
  };

  const canGoNextRaw = title.trim().length > 0 && content.trim().length > 0;

  const headerRight = (
    <div className="flex items-center gap-2">
      {autoSaving && <span className="text-xs text-text-muted">Kaydediliyor...</span>}
      {step === 1 && (
        <>
          <button
            onClick={() => editorRef.current?.undo()}
            className="i-btn !w-8 !h-8 text-text-muted hover:text-text-primary"
            title="Geri Al"
          >
            <Undo2 className="h-[18px] w-[18px]" />
          </button>
          <button
            onClick={() => editorRef.current?.redo()}
            className="i-btn !w-8 !h-8 text-text-muted hover:text-text-primary"
            title="İleri Al"
          >
            <Redo2 className="h-[18px] w-[18px]" />
          </button>
        </>
      )}
      {step === 1 ? (
        <button
          onClick={goToStep2}
          disabled={!canGoNextRaw}
          className="t-btn accept !h-9 !px-5 !text-[0.82rem] disabled:opacity-40"
        >
          İleri
        </button>
      ) : (
        <>
          <button
            onClick={() => savePost("draft")}
            disabled={saving || !title.trim()}
            className="t-btn cancel !h-9 !px-4 !text-[0.82rem] disabled:opacity-40"
          >
            Kaydet
          </button>
          <button
            onClick={() => savePost("published")}
            disabled={saving || !title.trim() || !content.trim()}
            className="t-btn accept relative !h-9 !px-5 !text-[0.82rem] disabled:opacity-40"
          >
            {saving ? <span className="loader" style={{ width: 16, height: 16, borderTopColor: "var(--bg-primary)" }} /> : "Yayınla"}
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
      headerTitle={step === 1 ? "Gönderi" : "Detaylar"}
      headerOnBack={() => { if (step === 2) setStep(1); else router.back(); }}
    >
      <div className="flex flex-col min-h-[calc(100dvh-53px)]">
        {/* Step 1: Title + Content */}
        {step === 1 && loadingDraft && (
          <div className="flex flex-col items-center justify-center flex-1 py-16">
            <span className="loader" style={{ width: 28, height: 28 }} />
            <p className="text-sm text-text-muted mt-3">Gönderi yükleniyor...</p>
          </div>
        )}
        {step === 1 && !loadingDraft && (
          <div className="flex flex-col flex-1">
            <div className="px-3 sm:px-4 pt-4">
              <input
                ref={titleInputRef}
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                onKeyDown={handleTitleKeyDown}
                onFocus={() => { titleJustFocused.current = true; }}
                onClick={e => {
                  if (!titleJustFocused.current) return;
                  titleJustFocused.current = false;
                  const el = e.currentTarget;
                  const len = el.value.length;
                  el.setSelectionRange(len, len);
                }}
                maxLength={VALIDATION.postTitle.max}
                placeholder="Başlık..."
                className="title-input"
                autoFocus
              />
              {imageUploading && (
                <div className="flex items-center gap-2 mt-1 text-xs text-text-muted">
                  <span className="loader" style={{ width: 14, height: 14 }} /> Görsel yükleniyor...
                </div>
              )}
            </div>
            <RichTextEditor
              ref={editorRef}
              value={content}
              onChange={setContent}
              onImageUpload={handleImageUpload}
              onBackspaceAtStart={() => titleInputRef.current?.focus()}
              onEmojiClick={() => { (document.activeElement as HTMLElement)?.blur(); setTimeout(() => { (document.activeElement as HTMLElement)?.blur(); }, 50); setShowEmojiPicker(true); }}
              onGifClick={() => { (document.activeElement as HTMLElement)?.blur(); setTimeout(() => { (document.activeElement as HTMLElement)?.blur(); }, 50); setShowGifPicker(true); }}
              onSave={() => savePost("draft")}
              onPublish={() => savePost("published")}
              placeholder="Aklınızda ne var?"
            />
          </div>
        )}

        {/* Step 2: Tags + Cover Image + Settings */}
        {step === 2 && (
          <div className="space-y-6 px-3 sm:px-4 pt-4 pb-20">
            {/* Tags + Cover Image — side by side on desktop */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Tags */}
              <div>
                <label className="block text-sm font-semibold mb-2">Etiketler</label>
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {tags.map(tag => (
                      <span key={tag.id} className="flex items-center gap-1.5 bg-accent-main/10 text-accent-main text-sm font-medium px-3 py-1.5 rounded-full">
                        #{tag.name}
                        <button onClick={() => removeTag(tag.id)} className="hover:text-error transition">
                          <X className="h-3 w-3" />
                        </button>
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
                      placeholder="Etiket ara veya yeni oluştur..."
                      className="input-modern w-full"
                    />
                    {/* Suggestions dropdown */}
                    {tagSuggestions.length > 0 && (
                      <div className="absolute left-0 right-0 top-full mt-1 bg-bg-elevated bg-solid border border-border-primary rounded-xl shadow-xl z-10 max-h-48 overflow-y-auto">
                        {tagSuggestions.map((s, i) => (
                          <button
                            key={s.id}
                            onClick={() => addTag(s)}
                            className={`w-full text-left px-4 py-3 text-sm transition flex items-center gap-2 ${
                              i === tagHighlight ? "bg-accent-main/10 text-accent-main" : "hover:bg-bg-tertiary"
                            }`}
                          >
                            <span className="text-text-muted">#</span>{s.name}
                            {s.post_count !== undefined && (
                              <span className="ml-auto text-xs text-text-muted">{formatCount(s.post_count || 0)} gönderi</span>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                    {/* Create new tag button */}
                    {tagSearch.trim() && tagSuggestions.length === 0 && (
                      <button
                        onClick={createAndAddTag}
                        disabled={tagCreating}
                        className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 text-xs font-semibold text-accent-main hover:underline disabled:opacity-50"
                      >
                        {tagCreating ? <span className="loader" style={{ width: 12, height: 12, borderTopColor: "var(--accent-color)" }} /> : <Plus className="h-3.5 w-3.5" />}
                        Oluştur
                      </button>
                    )}
                  </div>
                )}
                <p className="text-xs text-text-muted mt-1.5">{tags.length}/{VALIDATION.postTags.max} etiket</p>

                {/* Popular tags */}
                {tags.length < VALIDATION.postTags.max && !tagSearch && popularTags.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs text-text-muted mb-2">Popüler etiketler</p>
                    <div className="flex flex-wrap gap-1.5">
                      {popularTags
                        .filter(pt => !tags.some(t => t.id === pt.id))
                        .slice(0, 6)
                        .map(pt => (
                          <button
                            key={pt.id}
                            onClick={() => addTag(pt)}
                            className="text-xs px-2.5 py-1.5 rounded-full border border-border-primary text-text-muted hover:text-accent-main hover:border-accent-main/50 transition"
                          >
                            #{pt.name}
                          </button>
                        ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Cover Image with drag & drop */}
              <div>
                <label className="block text-sm font-semibold mb-2">Kapak Görseli</label>
                {featuredImage ? (
                  <div className="relative rounded-xl overflow-hidden">
                    <img src={featuredImage} alt="Kapak" className="w-full h-48 object-cover" />
                    <button
                      onClick={() => setFeaturedImage("")}
                      className="absolute top-2 right-2 p-1.5 bg-black/50 rounded-full text-white hover:bg-black/70 transition"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <label
                    onDragOver={handleCoverDragOver}
                    onDragLeave={handleCoverDragLeave}
                    onDrop={handleCoverDrop}
                    className={`flex flex-col items-center justify-center h-48 border-2 border-dashed rounded-xl cursor-pointer transition ${
                      coverDragging
                        ? "border-accent-main bg-accent-main/5"
                        : "border-border-primary hover:border-accent-main/50"
                    }`}
                  >
                    <div className="text-center text-text-muted text-sm">
                      {imageUploading ? (
                        <span className="loader mx-auto mb-1" style={{ width: 24, height: 24 }} />
                      ) : (
                        <>
                          <Upload className="h-6 w-6 mx-auto mb-2 opacity-50" />
                          <p>Görsel yüklemek için tıklayın veya sürükleyin</p>
                        </>
                      )}
                    </div>
                    <input
                      ref={coverInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleCoverImage}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>

            {/* Visibility */}
            <div>
              <label className="block text-sm font-semibold mb-2">Kimler görebilir</label>
              <div className="relative">
                <select
                  value={visibility}
                  onChange={e => setVisibility(e.target.value)}
                  className="input-modern w-full appearance-none pr-10 cursor-pointer"
                >
                  <option value="public">Herkese Açık — Herkes görebilir</option>
                  <option value="followers">Takipçiler — Sadece takipçileriniz görebilir</option>
                  <option value="only_me">Sadece Ben — Yalnızca siz görebilirsiniz</option>
                </select>
                <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted pointer-events-none" />
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
                    <p className="text-xs text-text-muted mt-0.5">Okuyucular yorum yapabilir</p>
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
              </div>
            </div>

            {/* SEO / Gönderi bilgileri */}
            <div>
              <button type="button" onClick={() => setMetaExpanded(v => !v)}
                className="flex items-center justify-between w-full text-left">
                <label className="block text-sm font-semibold">Gönderi bilgileri</label>
                <ChevronDown className={`h-4 w-4 text-text-muted transition-transform ${metaExpanded ? "rotate-180" : ""}`} />
              </button>
              {metaExpanded && (
                <div className="mt-3 space-y-4">
                  <div>
                    <label className="block text-xs text-text-muted mb-1.5">Ana konu başlığı</label>
                    <input type="text" value={metaTitle}
                      onChange={e => setMetaTitle(e.target.value)}
                      placeholder="Gönderi ana konusu..." maxLength={60}
                      className="input-modern w-full" />
                    <span className="text-[0.65rem] text-text-muted/60 mt-1 block">{metaTitle.length}/60</span>
                  </div>
                  <div>
                    <label className="block text-xs text-text-muted mb-1.5">Açıklama</label>
                    <textarea value={metaDescription}
                      onChange={e => setMetaDescription(e.target.value)}
                      placeholder="Gönderi açıklaması..." maxLength={155} rows={3}
                      className="input-modern w-full resize-none" />
                    <span className="text-[0.65rem] text-text-muted/60 mt-1 block">{metaDescription.length}/155</span>
                  </div>
                  <div>
                    <label className="block text-xs text-text-muted mb-1.5">Anahtar kelime</label>
                    <input type="text" value={metaKeywords}
                      onChange={e => setMetaKeywords(e.target.value)}
                      placeholder="Anahtar kelime..." maxLength={200}
                      className="input-modern w-full" />
                    <span className="text-[0.65rem] text-text-muted/60 mt-1 block">{metaKeywords.length}/200</span>
                  </div>
                  <p className="text-[0.7rem] text-text-muted/60 leading-relaxed">
                    Bu alandaki metinler içeriğinizin görünürlüğünü ve sıralamasını belirleyen etkenlerdir. Arama motorları için de kullanılır. Manuel girilmezse Feedim AI tarafından otomatik oluşturulur.
                  </p>
                </div>
              )}
            </div>

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
