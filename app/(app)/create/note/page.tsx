"use client";

import { Suspense, useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { X, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { emitNavigationStart } from "@/lib/navigationProgress";
import { feedimAlert } from "@/components/FeedimAlert";
import { VALIDATION } from "@/lib/constants";
import { formatCount, getPostUrl } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { useUser } from "@/components/UserContext";
import AppLayout from "@/components/AppLayout";
import VerifiedBadge, { getBadgeVariant } from "@/components/VerifiedBadge";

interface Tag {
  id: number | string;
  name: string;
  slug: string;
  post_count?: number;
  virtual?: boolean;
}

export default function NoteWritePage() {
  return (
    <Suspense fallback={<AppLayout hideRightSidebar><div className="py-16 text-center"><span className="loader mx-auto" style={{ width: 24, height: 24 }} /></div></AppLayout>}>
      <NoteWriteContent />
    </Suspense>
  );
}

function NoteWriteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const { user } = useUser();
  const t = useTranslations("create");

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Step: 1=content, 2=tags/settings
  const [step, setStep] = useState(1);
  const [isEditMode, setIsEditMode] = useState(false);
  const [loadingDraft, setLoadingDraft] = useState(false);

  // Step 1
  const [noteText, setNoteText] = useState("");

  // Step 2
  const [tags, setTags] = useState<Tag[]>([]);
  const [tagSearch, setTagSearch] = useState("");
  const [tagSuggestions, setTagSuggestions] = useState<Tag[]>([]);
  const [tagHighlight, setTagHighlight] = useState(-1);
  const [tagCreating, setTagCreating] = useState(false);
  const [popularTags, setPopularTags] = useState<Tag[]>([]);
  const [allowComments, setAllowComments] = useState(true);
  const [isForKids, setIsForKids] = useState(false);

  // Mention system
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionUsers, setMentionUsers] = useState<{ user_id: string; username: string; avatar_url?: string; is_verified?: boolean; premium_plan?: string | null; role?: string }[]>([]);
  const [mentionIndex, setMentionIndex] = useState(0);
  const [mentionPos, setMentionPos] = useState(-1);
  const mentionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // State
  const [savingAs, setSavingAs] = useState<"draft" | "published" | null>(null);
  const [autoSaving, setAutoSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [draftId, setDraftId] = useState<number | null>(null);

  const MAX_CHARS = VALIDATION.noteContent.max;
  const remaining = MAX_CHARS - noteText.length;

  // Track unsaved changes
  useEffect(() => {
    if (noteText.trim()) setHasUnsavedChanges(true);
  }, [noteText, tags]);

  // Warn before leaving with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges && noteText.trim()) {
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges, noteText]);

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
      const res = await fetch(`/api/posts/${slug}`);
      const data = await res.json();
      if (res.ok && data.post) {
        const plainText = (data.post.content || "").replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "").trim();
        setNoteText(plainText);
        setDraftId(data.post.id);
        setAllowComments(data.post.allow_comments !== false);
        setIsForKids(data.post.is_for_kids === true);
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

  // Auto-save draft to server every 30 seconds
  useEffect(() => {
    if (!noteText.trim() || !hasUnsavedChanges) return;
    const timer = setInterval(async () => {
      if (savingAs || autoSaving) return;
      setAutoSaving(true);
      try {
        const autoTitle = noteText.trim().slice(0, 50);
        const content = `<p>${noteText.trim().replace(/\n/g, "<br>")}</p>`;
        const endpoint = draftId ? `/api/posts/${draftId}` : "/api/posts";
        const method = draftId ? "PUT" : "POST";
        const res = await fetch(endpoint, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: autoTitle,
            content,
            content_type: "note",
            status: "draft",
            tags: tags.map(t => typeof t.id === "number" ? t.id : (t.slug || t.name)),
            allow_comments: allowComments,
            is_for_kids: isForKids,
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
  }, [noteText, hasUnsavedChanges, savingAs, autoSaving, draftId, tags, allowComments, isForKids]);

  // — Mention helpers —
  const searchMentionUsers = useCallback(async (query: string) => {
    if (query.length < 1) { setMentionUsers([]); return; }
    try {
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setMentionUsers(data.users || []);
      setMentionIndex(0);
    } catch { setMentionUsers([]); }
  }, []);

  const handleNoteChange = (value: string) => {
    if (value.length <= MAX_CHARS) {
      setNoteText(value);
    }
    const textarea = textareaRef.current;
    if (!textarea) return;
    const cursorPos = textarea.selectionStart;
    const textBeforeCursor = value.substring(0, cursorPos);
    const mentionMatch = textBeforeCursor.match(/(^|[^A-Za-z0-9._-])@(\w*)$/);
    if (mentionMatch) {
      const query = mentionMatch[2];
      setMentionPos(cursorPos - query.length - 1);
      setMentionQuery(query);
      if (mentionTimerRef.current) clearTimeout(mentionTimerRef.current);
      mentionTimerRef.current = setTimeout(() => searchMentionUsers(query), 200);
    } else {
      setMentionUsers([]);
      setMentionQuery("");
      setMentionPos(-1);
    }
  };

  const selectMentionUser = (username: string) => {
    if (mentionPos < 0) return;
    const before = noteText.substring(0, mentionPos);
    const after = noteText.substring(mentionPos + 1 + mentionQuery.length);
    const newValue = before + "@" + username + " " + after;
    if (newValue.length <= MAX_CHARS) {
      setNoteText(newValue);
    }
    setMentionUsers([]);
    setMentionQuery("");
    setMentionPos(-1);
    textareaRef.current?.focus();
  };

  const handleMentionKeyDown = (e: React.KeyboardEvent) => {
    if (mentionUsers.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        const newIndex = mentionIndex < mentionUsers.length - 1 ? mentionIndex + 1 : 0;
        setMentionIndex(newIndex);
        const el = document.querySelector(`[data-mention-index="${newIndex}"]`);
        el?.scrollIntoView({ block: "nearest" });
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        const newIndex = mentionIndex > 0 ? mentionIndex - 1 : mentionUsers.length - 1;
        setMentionIndex(newIndex);
        const el = document.querySelector(`[data-mention-index="${newIndex}"]`);
        el?.scrollIntoView({ block: "nearest" });
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        selectMentionUser(mentionUsers[mentionIndex].username);
        return;
      }
      if (e.key === "Escape") {
        setMentionUsers([]);
        return;
      }
    }
  };

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
    await new Promise(r => setTimeout(r, 1000));
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
      const autoTitle = trimmed.slice(0, 50);
      const content = `<p>${trimmed.replace(/\n/g, "<br>")}</p>`;

      const endpoint = draftId ? `/api/posts/${draftId}` : "/api/posts";
      const method = draftId ? "PUT" : "POST";

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: autoTitle,
          content,
          content_type: "note",
          status,
          tags: tags.map(t => typeof t.id === "number" ? t.id : (t.slug || t.name)),
          allow_comments: allowComments,
          is_for_kids: isForKids,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setHasUnsavedChanges(false);
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

  const goToStep2 = () => {
    if (!noteText.trim()) return;
    setStep(2);
  };

  const canGoNext = noteText.trim().length > 0 && remaining >= 0;

  const headerRight = (
    <div className="flex items-center gap-2">
      {autoSaving && <span className="text-xs text-text-muted">{t("autoSaving")}</span>}
      {/* Character counter in header */}
      {step === 1 && (
        <span className={`text-xs ${remaining <= 20 ? (remaining <= 0 ? "text-error font-semibold" : "text-warning") : "text-text-muted"}`}>
          {noteText.length}/{MAX_CHARS}
        </span>
      )}
      {step === 1 ? (
        <button
          onClick={goToStep2}
          disabled={!canGoNext}
          className="t-btn accept !h-9 !px-5 !text-[0.82rem] disabled:opacity-40"
        >
          {t("nextStep")}
        </button>
      ) : (
        <>
          <button
            onClick={() => savePost("draft")}
            disabled={savingAs !== null || !noteText.trim()}
            className="t-btn cancel !h-9 !px-4 !text-[0.82rem] disabled:opacity-40"
          >
            {savingAs === "draft" ? <span className="loader" style={{ width: 16, height: 16 }} /> : t("save")}
          </button>
          <button
            onClick={() => savePost("published")}
            disabled={savingAs !== null || !noteText.trim() || remaining < 0}
            className="t-btn accept relative !h-9 !px-5 !text-[0.82rem] disabled:opacity-40"
            aria-label={t("shareBtn")}
          >
            {savingAs === "published" ? <span className="loader" style={{ width: 16, height: 16 }} /> : t("shareBtn")}
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
      headerOnBack={() => { if (step === 2) setStep(1); else router.back(); }}
    >
      <div className="flex flex-col min-h-[calc(100dvh-53px)]">
        {/* Step 1: Note content */}
        {step === 1 && loadingDraft && (
          <div className="flex flex-col items-center justify-center flex-1 py-16">
            <span className="loader" style={{ width: 28, height: 28 }} />
            <p className="text-sm text-text-muted mt-3">{t("noteLoading")}</p>
          </div>
        )}
        {step === 1 && !loadingDraft && (
          <div className="flex flex-col flex-1">
            <div className="px-3 sm:px-4 pt-4 flex-1">
              <div className="flex gap-3">
                {/* Avatar */}
                <div className="shrink-0 pt-0.5">
                  {user?.avatarUrl ? (
                    <img src={user.avatarUrl} alt="" className="w-10 h-10 rounded-full object-cover" loading="lazy" />
                  ) : (
                    <div className="w-10 h-10 rounded-full overflow-hidden">
                      <img className="default-avatar-auto w-full h-full rounded-full object-cover" alt="" loading="lazy" />
                    </div>
                  )}
                </div>

                {/* Textarea */}
                <div className="flex-1 min-w-0">
                  <div className="relative">
                    <textarea
                      ref={textareaRef}
                      value={noteText}
                      onChange={(e) => handleNoteChange(e.target.value)}
                      onKeyDown={handleMentionKeyDown}
                      placeholder={t("whatsOnYourMind")}
                      className="w-full bg-transparent text-[1.05rem] leading-[1.55] text-text-primary placeholder:text-text-muted/50 resize-none min-h-[200px]"
                      style={{ border: "none", outline: "none", boxShadow: "none", padding: 0, borderRadius: 0, height: "auto" }}
                      maxLength={MAX_CHARS}
                      autoFocus
                      onInput={(e) => {
                        const el = e.target as HTMLTextAreaElement;
                        el.style.height = "auto";
                        el.style.height = `${Math.max(200, el.scrollHeight)}px`;
                      }}
                    />

                    {/* Mention dropdown */}
                    {mentionUsers.length > 0 && (
                      <div className="absolute left-0 right-0 bg-bg-elevated bg-solid border border-border-primary rounded-xl shadow-xl z-50 max-h-[200px] overflow-y-auto">
                        {mentionUsers.map((u, i) => (
                          <button
                            key={u.user_id}
                            data-mention-index={i}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              selectMentionUser(u.username);
                            }}
                            className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition text-sm ${
                              i === mentionIndex ? "bg-accent-main/10" : "hover:bg-bg-tertiary"
                            }`}
                          >
                            {u.avatar_url ? (
                              <img src={u.avatar_url} alt="" className="h-7 w-7 rounded-full object-cover shrink-0" />
                            ) : (
                              <img className="default-avatar-auto h-7 w-7 rounded-full object-cover shrink-0" alt="" />
                            )}
                            <span className="font-medium">@{u.username}</span>
                            {u.is_verified && <VerifiedBadge variant={getBadgeVariant(u.premium_plan)} role={u.role} />}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* Step 2: Tags + Settings */}
        {step === 2 && (
          <div className="space-y-6 px-3 sm:px-4 pt-4 pb-20">
            {/* Tags */}
            <div>
              <label className="block text-sm font-semibold mb-2">{t("tagsLabel")}</label>
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
                    placeholder={t("tagSearchPlaceholder")}
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
                            <span className="ml-auto text-xs text-text-muted">{formatCount(s.post_count || 0)} {t("postsCount")}</span>
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

              {/* Popular tags */}
              {tags.length < VALIDATION.postTags.max && !tagSearch && popularTags.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs text-text-muted mb-2">{t("popularTags")}</p>
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
                    <p className="text-xs text-text-muted mt-0.5">{t("allowCommentsDesc")}</p>
                  </div>
                  <div className={`w-10 h-[22px] rounded-full transition-colors relative ${allowComments ? "bg-accent-main" : "bg-border-primary"}`}>
                    <div className={`absolute top-[3px] w-4 h-4 rounded-full bg-white transition-transform ${allowComments ? "left-[22px]" : "left-[3px]"}`} />
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
