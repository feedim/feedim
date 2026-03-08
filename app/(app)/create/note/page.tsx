"use client";

import { Suspense, useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { X, Plus, ChevronDown, Smile } from "lucide-react";
import EmojiPickerPanel from "@/components/modals/EmojiPickerPanel";
import PostMetaFields from "@/components/PostMetaFields";
import { emitNavigationStart } from "@/lib/navigationProgress";
import { smartBack } from "@/lib/smartBack";
import { feedimAlert } from "@/components/FeedimAlert";
import { VALIDATION } from "@/lib/constants";
import { formatCount, getPostUrl } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { useUser } from "@/components/UserContext";
import AppLayout from "@/components/AppLayout";
import { useMention } from "@/lib/useMention";
import MentionDropdown from "@/components/MentionDropdown";

interface Tag {
  id: number | string;
  name: string;
  slug: string;
  post_count?: number;
  virtual?: boolean;
}

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

  // Step: 1=content, 2=tags/settings
  const [step, setStep] = useState(1);
  const [isPublished, setIsPublished] = useState(false);
  const [loadingDraft, setLoadingDraft] = useState(false);

  // Step 1
  const [noteText, setNoteText] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [extractingTags, setExtractingTags] = useState(false);

  // Step 2
  const [tags, setTags] = useState<Tag[]>([]);
  const [tagSearch, setTagSearch] = useState("");
  const [tagSuggestions, setTagSuggestions] = useState<Tag[]>([]);
  const [tagHighlight, setTagHighlight] = useState(-1);
  const [tagCreating, setTagCreating] = useState(false);
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
  const [savingAs, setSavingAs] = useState<"draft" | "published" | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [draftId, setDraftId] = useState<number | null>(null);

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
      const res = await fetch(`/api/posts/${slug}`);
      const data = await res.json();
      if (res.ok && data.post) {
        const plainText = (data.post.content || "").replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "").trim();
        setNoteText(plainText);
        setDraftId(data.post.id);
        setIsPublished(data.post.status === 'published');
        setAllowComments(data.post.allow_comments !== false);
        setIsAiContent(data.post.is_ai_content === true);
        setVisibility(data.post.visibility || "public");
        setMetaTitle(data.post.meta_title || "");
        setMetaDescription(data.post.meta_description || "");
        setMetaKeywords(data.post.meta_keywords || "");
        const postTags = (data.post.post_tags || [])
          .map((pt: { tags: Tag }) => pt.tags)
          .filter(Boolean);
        setTags(postTags);
      }
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
        (data.tags || []).filter((t: Tag) => !tags.some(existing => existing.id === t.id || existing.slug === t.slug))
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
    if (tags.length >= VALIDATION.postTags.max) return;
    if (tags.some(t => t.id === tag.id || t.slug === tag.slug || t.name === tag.name)) return;
    setTags([...tags, tag]);
    setTagSearch("");
    setTagSuggestions([]);
    setTagHighlight(-1);
  };

  const createAndAddTag = async () => {
    const trimmed = tagSearch.trim().replace(/\s+/g, ' ');
    if (!trimmed || tags.length >= VALIDATION.postTags.max || tagCreating) return;
    if (trimmed.length < VALIDATION.tagName.min) {
      feedimAlert("error", t("tagMinLength", { min: VALIDATION.tagName.min }));
      return;
    }
    if (trimmed.length > VALIDATION.tagName.max) {
      feedimAlert("error", t("tagMaxLength", { max: VALIDATION.tagName.max }));
      return;
    }
    if (!VALIDATION.tagName.pattern.test(trimmed)) {
      feedimAlert("error", t("tagInvalidChars"));
      return;
    }
    if (/^\d+$/.test(trimmed)) {
      feedimAlert("error", t("tagOnlyNumbers"));
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
        feedimAlert("error", data.error || t("tagCreateFailed"));
      }
    } catch {
      feedimAlert("error", t("tagCreateFailedRetry"));
    } finally {
      setTagCreating(false);
    }
  };

  const removeTag = (tagId: number | string) => {
    setTags(tags.filter(t => t.id !== tagId));
  };

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
        } else if (tagSearch.trim()) {
          createAndAddTag();
        }
      } else if (e.key === "Escape") {
        setTagSuggestions([]);
        setTagHighlight(-1);
      }
    } else if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      if (tagSearch.trim()) createAndAddTag();
    }
  };

  const savePost = async (status: "draft" | "published") => {
    const trimmed = noteText.trim();
    if (!trimmed) {
      feedimAlert("error", t("noteContentEmpty"));
      return;
    }
    if (status === "published" && trimmed.length > MAX_CHARS) {
      feedimAlert("error", t("noteMaxChars", { max: MAX_CHARS }));
      return;
    }

    setSavingAs(status);
    try {
      const autoTitle = trimmed.replace(/<[^>]*>/g, "").slice(0, 50);
      const content = `<p>${trimmed.replace(/\n/g, "<br>")}</p>`;

      const endpoint = draftId ? `/api/posts/${draftId}` : "/api/posts";
      const method = draftId ? "PUT" : "POST";

      const body: Record<string, unknown> = {
          title: autoTitle,
          content,
          content_type: "note",
          status,
          tags: tags.map(t => typeof t.id === "number" ? t.id : (t.slug || t.name)),
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
        if (status === "published" && data.post?.slug) {
          emitNavigationStart();
          router.push(getPostUrl(data.post.slug, "note"));
        } else {
          sessionStorage.setItem("fdm-open-create-modal", "1");
          sessionStorage.setItem("fdm-create-view", "drafts");
          emitNavigationStart();
          router.push("/");
        }
      } else {
        feedimAlert("error", data.error || t("genericErrorRetry"));
      }
    } catch {
      feedimAlert("error", t("genericErrorRetry"));
    } finally {
      setSavingAs(null);
    }
  };

  const goToStep2 = async () => {
    if (!noteText.trim()) return;

    // Extract #hashtags from content and auto-add as tags
    const hashtagRegex = /#([A-Za-z0-9\u00C0-\u024F\u0400-\u04FF\u0600-\u06FFğüşıöçĞÜŞİÖÇəƏ_]+)/g;
    const matches = [...noteText.matchAll(hashtagRegex)];
    if (matches.length > 0) {
      setExtractingTags(true);
      let cleaned = noteText;
      const existingNames = new Set(tags.map(t => t.name.toLowerCase()));
      const newTags: Tag[] = [];

      for (const match of matches) {
        const name = match[1];
        if (name.length < VALIDATION.tagName.min || /^\d+$/.test(name)) continue;
        if (existingNames.has(name.toLowerCase()) || newTags.some(t => t.name.toLowerCase() === name.toLowerCase())) continue;
        if (tags.length + newTags.length >= VALIDATION.postTags.max) break;
        try {
          const res = await fetch("/api/tags", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) });
          const data = await res.json();
          if (res.ok && data.tag) newTags.push(data.tag);
        } catch { /* skip */ }
      }

      if (newTags.length > 0) {
        setTags(prev => [...prev, ...newTags]);
      }

      // Remove hashtags from content (trim leftover whitespace)
      cleaned = cleaned.replace(hashtagRegex, "").replace(/  +/g, " ").trim();
      if (cleaned) setNoteText(cleaned);
      setExtractingTags(false);
    }

    // Don't proceed if content is empty after extraction
    const finalText = noteText.replace(hashtagRegex, "").replace(/  +/g, " ").trim();
    if (!finalText && matches.length > 0) {
      feedimAlert("error", t("noteContentEmpty"));
      return;
    }

    setStep(2);
  };

  const canGoNext = noteText.trim().length > 0 && remaining >= 0;

  const headerRight = (
    <div className="flex items-center gap-2">
      {/* Character counter in header */}
      {step === 1 && (
        <span className={`text-xs font-semibold mr-[5px] ${remaining <= 0 ? "text-error" : "text-text-muted"}`}>
          {noteText.length}/{MAX_CHARS}
        </span>
      )}
      {step === 1 ? (
        <button
          onClick={goToStep2}
          disabled={!canGoNext || extractingTags}
          className="t-btn accept !h-10 !px-5 !text-[0.82rem] disabled:opacity-40"
        >
          {extractingTags ? <span className="loader" style={{ width: 16, height: 16 }} /> : t("nextStep")}
        </button>
      ) : (
        <>
          {!isPublished ? (
            <button
              onClick={() => savePost("draft")}
              disabled={savingAs !== null || !noteText.trim()}
              className="t-btn cancel relative !h-10 !px-5 !text-[0.82rem] disabled:opacity-40"
            >
              {savingAs === "draft" ? <span className="loader" style={{ width: 16, height: 16 }} /> : t("save")}
            </button>
          ) : (
            <button
              onClick={() => {
                if (!draftId || deleting) return;
                feedimAlert("question", t("deleteConfirmContent"), {
                  showYesNo: true,
                  onYes: async () => {
                    setDeleting(true);
                    try {
                      const res = await fetch(`/api/posts/${draftId}`, { method: "DELETE" });
                      if (res.ok) { feedimAlert("success", t("deleted")); router.push("/dashboard"); }
                      else feedimAlert("error", t("deleteFailed"));
                    } catch { feedimAlert("error", t("deleteFailed")); }
                    finally { setDeleting(false); }
                  },
                });
              }}
              disabled={deleting || savingAs !== null}
              className="t-btn cancel relative !h-10 !px-5 !text-[0.82rem] !text-error disabled:opacity-40"
            >
              {deleting ? <span className="loader" style={{ width: 16, height: 16 }} /> : t("deleteBtn")}
            </button>
          )}
          <button
            onClick={() => savePost("published")}
            disabled={savingAs !== null || !noteText.trim() || remaining < 0}
            className="t-btn accept relative !h-10 !px-5 !text-[0.82rem] disabled:opacity-40"
            aria-label={isPublished ? t("updateBtn") : t("shareBtn")}
          >
            {savingAs === "published" ? <span className="loader" style={{ width: 16, height: 16 }} /> : isPublished ? t("updateBtn") : t("shareBtn")}
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
      headerTitle={step === 1 ? t("headerNote") : t("headerDetails")}
      headerOnBack={() => { if (step === 2) setStep(1); else smartBack(router); }}
    >
      <div className="flex flex-col min-h-[calc(100dvh-53px)]">
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
                  {user?.avatarUrl ? (
                    <img suppressHydrationWarning data-src={user.avatarUrl} alt="" className="lazyload w-10 h-10 rounded-full object-cover bg-bg-tertiary border border-border-primary" decoding="async" />
                  ) : (
                    <div className="w-10 h-10 rounded-full overflow-hidden">
                      <img className="default-avatar-auto bg-bg-tertiary w-full h-full rounded-full object-cover border border-border-primary" alt="" loading="lazy" />
                    </div>
                  )}
                </div>

                {/* Textarea */}
                <div className="flex-1 min-w-0">
                  <div style={{ position: 'relative' }}>
                    <textarea
                      ref={textareaRef}
                      value={noteText}
                      onChange={(e) => handleNoteChange(e.target.value)}
                      onKeyDown={handleMentionKeyDown}
                      placeholder={t("whatsOnYourMind")}
                      className="w-full bg-transparent text-[1rem] leading-[1.55] text-text-primary placeholder:text-[1rem] placeholder:leading-[1.55] placeholder:text-text-muted/50 resize-none min-h-0 overflow-hidden"
                      style={{ border: "none", outline: "none", boxShadow: "none", padding: 0, borderRadius: 0, height: "auto", fontSize: "1rem" }}
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
                  <div className="flex items-center justify-end mt-1">
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
          <div className="space-y-6 px-1.5 sm:px-4 pt-4 pb-8">
            {/* Tags */}
            <div>
              <label className="block text-sm font-semibold mb-2">{t("tagsLabel")}</label>
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
                    <div className="absolute left-0 right-0 top-full mt-1.5 mb-[7px] bg-bg-secondary border border-border-primary rounded-[13px] z-10 max-h-48 overflow-y-auto">
                      {tagSuggestions.map((s, i) => (
                        <button
                          key={s.id}
                          onClick={() => addTag(s)}
                          onMouseEnter={() => setTagHighlight(i)}
                          className={`w-full text-left px-4 py-3.5 text-[0.88rem] transition flex items-center border-b border-border-primary/40 last:border-b-0 ${
                            i === tagHighlight ? "bg-accent-main/10 text-accent-main" : "text-text-primary hover:bg-bg-tertiary"
                          }`}
                        >
                          <span className="text-accent-main">#</span><span className="font-semibold truncate">{s.name}</span>
                          {s.post_count !== undefined && (
                            <span className="ml-auto text-[0.7rem] text-text-muted font-medium shrink-0 pl-2">{formatCount(s.post_count || 0)} {t("postsCount")}</span>
                          )}
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
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
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
              <p className="text-xs text-text-muted mt-1.5 text-right font-semibold mr-2">{tags.length}/{VALIDATION.postTags.max} {t("tagUnit")}</p>

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
            <div>
              <div className="cursor-pointer select-none" onClick={() => setSettingsExpanded(!settingsExpanded)}>
                <div className="flex items-center justify-between w-full text-left">
                  <span className="block text-sm font-semibold">{t("settingsLabel")}</span>
                  <ChevronDown className={`h-4 w-4 text-text-muted transition-transform ${settingsExpanded ? "rotate-180" : ""}`} />
                </div>
                {isPublished && <p className="text-xs text-text-muted mt-1.5">{t("publishedFieldLocked")}</p>}
                <p className="text-[0.7rem] text-text-muted/60 leading-relaxed mt-1.5">{t("settingsDesc")}</p>
              </div>
              {settingsExpanded && <div className="space-y-1 mt-3">
                <button
                  disabled={isPublished}
                  onClick={() => setAllowComments(!allowComments)}
                  className={`w-full flex items-center justify-between px-2 py-3 rounded-lg transition text-left ${isPublished ? "opacity-60 cursor-not-allowed" : "hover:bg-bg-tertiary"}`}
                >
                  <div>
                    <p className="text-sm font-semibold">{t("allowComments")}</p>
                    <p className="text-xs text-text-muted mt-0.5">{t("allowCommentsDesc")}</p>
                  </div>
                  <div className={`w-10 h-[22px] rounded-full transition-colors relative flex-shrink-0 ${allowComments ? "bg-accent-main" : "bg-border-primary"}`}>
                    <div className={`absolute top-[3px] w-4 h-4 rounded-full bg-white transition-transform ${allowComments ? "left-[22px]" : "left-[3px]"}`} />
                  </div>
                </button>
                <div>
                <button
                  disabled={isPublished}
                  onClick={() => setIsAiContent(!isAiContent)}
                  className={`w-full flex items-center justify-between px-2 py-3 rounded-lg transition text-left ${isPublished ? "opacity-60 cursor-not-allowed" : "hover:bg-bg-tertiary"}`}
                >
                  <div>
                    <p className="text-sm font-semibold">{t("aiContent")}</p>
                    <p className="text-xs text-text-muted mt-0.5">{t("aiContentDesc")}</p>
                  </div>
                  <div className={`w-10 h-[22px] rounded-full transition-colors relative flex-shrink-0 ${isAiContent ? "bg-accent-main" : "bg-border-primary"}`}>
                    <div className={`absolute top-[3px] w-4 h-4 rounded-full bg-white transition-transform ${isAiContent ? "left-[22px]" : "left-[3px]"}`} />
                  </div>
                </button>
                <p className="px-4 pt-1.5 pb-2 text-[0.7rem] text-text-muted leading-snug">
                  {t("aiContentWarning")}{" "}
                  <a href="/help/ai" target="_blank" rel="noopener noreferrer" className="text-accent-main hover:underline">{t("aiContentLearnMore")}</a>
                </p>
                </div>
              </div>}
            </div>

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
    </AppLayout>
  );
}
