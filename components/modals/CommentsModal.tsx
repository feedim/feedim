"use client";

import { useState, useEffect, useRef, useCallback, memo, useLayoutEffect } from "react";
import { Heart, Trash2, Smile, X, MoreHorizontal, User, Copy, Flag, Link2 } from "lucide-react";
import { encodeId } from "@/lib/hashId";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/components/UserContext";
import { useAuthModal } from "@/components/AuthModal";
import { feedimAlert } from "@/components/FeedimAlert";
import { formatRelativeDate, cn, formatCount } from "@/lib/utils";
import Modal from "./Modal";
import ReportModal from "./ReportModal";
import VerifiedBadge, { getBadgeVariant } from "@/components/VerifiedBadge";
import EmojiPickerPanel from "./EmojiPickerPanel";
import GifPickerPanel from "./GifPickerPanel";
import LoadMoreTrigger from "@/components/LoadMoreTrigger";
import { isBlockedContent } from "@/lib/blockedWords";


interface Comment {
  id: number;
  content: string;
  content_type?: "text" | "gif";
  gif_url?: string | null;
  author_id: string | null;
  parent_id: number | null;
  is_nsfw?: boolean;
  like_count: number;
  reply_count: number;
  created_at: string;
  profiles?: {
    username: string;
    full_name?: string;
    name?: string;
    avatar_url?: string;
    is_verified?: boolean;
    premium_plan?: string | null;
    role?: string;
  } | null;
  replies?: Comment[];
}

interface CommentsModalProps {
  open: boolean;
  onClose: () => void;
  postId: number;
  commentCount: number;
  postSlug?: string;
  targetCommentId?: number | null;
}

export default function CommentsModal({ open, onClose, postId, commentCount: initialCount, postSlug, targetCommentId }: CommentsModalProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [totalCount, setTotalCount] = useState(initialCount);
  const [sortBy, setSortBy] = useState<"smart" | "newest" | "popular">("smart");
  const [newComment, setNewComment] = useState("");
  const [replyTo, setReplyTo] = useState<{ id: number; name: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [likedComments, setLikedComments] = useState<Set<number>>(new Set());
  const [reportTarget, setReportTarget] = useState<number | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [showReplies, setShowReplies] = useState<Set<number>>(new Set());

  // Animation + Emoji/GIF
  const [newCommentId, setNewCommentId] = useState<number | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [pendingGif, setPendingGif] = useState<{ url: string; preview: string } | null>(null);
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);

  // Mention system
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionUsers, setMentionUsers] = useState<{ user_id: string; username: string; avatar_url?: string; is_verified?: boolean; premium_plan?: string | null; role?: string }[]>([]);
  const [mentionIndex, setMentionIndex] = useState(0);
  const [mentionPos, setMentionPos] = useState(-1);
  const mentionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { requireAuth } = useAuthModal();
  const { user: ctxUser } = useUser();
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Plan bazli yorum karakter limiti: max/business 500, digerleri 250
  const maxCommentLength = (ctxUser?.premiumPlan === "max" || ctxUser?.premiumPlan === "business") ? 500 : 250;

  const resizeTextarea = useCallback(() => {
    const textarea = inputRef.current;
    if (!textarea) return;
    textarea.style.height = "0";
    const scrollH = textarea.scrollHeight;
    const maxH = 200;
    if (scrollH > maxH) {
      textarea.style.height = `${maxH}px`;
      textarea.style.overflowY = "auto";
    } else {
      textarea.style.height = `${scrollH}px`;
      textarea.style.overflowY = "hidden";
    }
  }, []);

  useLayoutEffect(() => {
    resizeTextarea();
  }, [newComment, pendingGif, resizeTextarea]);

  useEffect(() => {
    if (open) {
      setPage(1);
      loadComments(1, sortBy).then(() => {
        // Scroll to target comment if specified
        if (targetCommentId) {
          setTimeout(() => {
            const el = document.getElementById(`comment-${targetCommentId}`);
            if (el) {
              el.scrollIntoView({ behavior: "smooth", block: "center" });
              el.classList.add("bg-accent-main/10");
              setTimeout(() => el.classList.remove("bg-accent-main/10"), 2000);
            }
          }, 300);
        }
      });
      loadLikedComments();
    }
  }, [open, targetCommentId]);

  useEffect(() => {
    if (replyTo && inputRef.current) {
      inputRef.current.focus();
    }
  }, [replyTo]);

  const loadComments = async (pageNum: number, sort: string = sortBy) => {
    if (pageNum === 1) setLoading(true); else setLoadingMore(true);
    try {
      const res = await fetch(`/api/posts/${postId}/comments?page=${pageNum}&sort=${sort}`);
      const data = await res.json();
      if (res.ok) {
        if (pageNum === 1) {
          setComments(data.comments || []);
        } else {
          setComments(prev => [...prev, ...(data.comments || [])]);
        }
        setHasMore(data.hasMore);
      }
    } catch {
      // Silent
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleSortChange = (sort: "smart" | "newest" | "popular") => {
    if (sort === sortBy) return;
    setSortBy(sort);
    setPage(1);
    loadComments(1, sort);
  };

  const loadLikedComments = async () => {
    if (!ctxUser?.id) return;
    setCurrentUserId(ctxUser.id);
    const supabase = createClient();
    const { data } = await supabase
      .from("comment_likes")
      .select("comment_id")
      .eq("user_id", ctxUser.id);
    if (data) setLikedComments(new Set(data.map(l => l.comment_id)));
  };

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

  const handleCommentChange = (value: string) => {
    setNewComment(value);
    const textarea = inputRef.current;
    if (!textarea) return;
    resizeTextarea();
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
    const before = newComment.substring(0, mentionPos);
    const after = newComment.substring(mentionPos + 1 + mentionQuery.length);
    const newValue = before + "@" + username + " " + after;
    setNewComment(newValue);
    setMentionUsers([]);
    setMentionQuery("");
    setMentionPos(-1);
    setTimeout(() => {
      if (inputRef.current) {
        const pos = before.length + username.length + 2;
        inputRef.current.selectionStart = pos;
        inputRef.current.selectionEnd = pos;
        inputRef.current.focus();
      }
    }, 0);
  };

  const handleMentionKeyDown = (e: React.KeyboardEvent) => {
    if (mentionUsers.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setMentionIndex(i => (i < mentionUsers.length - 1 ? i + 1 : 0));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setMentionIndex(i => (i > 0 ? i - 1 : mentionUsers.length - 1));
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
    if (e.key === "Enter" && !e.shiftKey && mentionUsers.length === 0) {
      e.preventDefault();
      handleSubmit(e as unknown as React.FormEvent);
    }
  };

  // — Actions —
  const handleDeleteComment = useCallback((commentId: number) => {
    feedimAlert("question", "Bu yorumu silmek istediğine emin misin?", {
      showYesNo: true,
      onYes: () => {
        // Optimistic: immediately remove from UI
        setComments(prev => prev.filter(c => c.id !== commentId).map(c => ({
          ...c,
          replies: c.replies?.filter(r => r.id !== commentId),
          reply_count: c.replies?.some(r => r.id === commentId) ? c.reply_count - 1 : c.reply_count,
        })));
        setTotalCount(c => Math.max(0, c - 1));
        // Fire-and-forget background delete
        fetch(`/api/posts/${postId}/comments/${commentId}`, { method: "DELETE", keepalive: true }).catch(() => {});
      },
    });
  }, [postId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const isGif = !!pendingGif;
    const hasText = !isGif && !!newComment.trim();
    if (!isGif && !hasText) return;
    if (submitting) return;
    setSubmitting(true);

    if (!ctxUser) { const u = await requireAuth(); if (!u) { setSubmitting(false); return; } }

    const content = hasText ? newComment.trim() : "";
    const parentId = replyTo?.id || null;
    const tempId = -Date.now();
    const gifData = isGif ? pendingGif : null;

    const body: Record<string, unknown> = { parent_id: parentId };
    if (isGif) {
      body.content_type = "gif";
      body.gif_url = gifData!.url;
      body.content = "";
    } else {
      body.content = content;
    }

    // Optimistic comment
    const optimisticComment: Comment = {
      id: tempId,
      content: isGif ? "" : content,
      content_type: isGif ? "gif" : "text",
      gif_url: isGif ? gifData!.url : undefined,
      author_id: currentUserId,
      parent_id: parentId,
      is_nsfw: false,
      like_count: 0,
      reply_count: 0,
      created_at: new Date().toISOString(),
      profiles: {
        username: ctxUser?.username || "",
        full_name: ctxUser?.fullName || undefined,
        avatar_url: ctxUser?.avatarUrl || undefined,
        is_verified: ctxUser?.isVerified || false,
        premium_plan: ctxUser?.premiumPlan || null,
        role: ctxUser?.role || undefined,
      },
    };

    if (parentId && replyTo) {
      setComments(prev => prev.map(c => {
        if (c.id === replyTo.id) {
          return { ...c, replies: [...(c.replies || []), optimisticComment], reply_count: c.reply_count + 1 };
        }
        return c;
      }));
      setShowReplies(prev => new Set([...prev, replyTo.id]));
    } else {
      setComments(prev => [optimisticComment, ...prev]);
    }

    setTotalCount(c => c + 1);
    setNewComment("");
    setPendingGif(null);
    setReplyTo(null);
    setNewCommentId(tempId);
    setTimeout(() => setNewCommentId(null), 400);

    // Background API call
    try {
      const res = await fetch(`/api/posts/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (!res.ok) {
        // Rollback
        if (parentId) {
          setComments(prev => prev.map(c => {
            if (c.id === parentId) {
              return { ...c, replies: (c.replies || []).filter(r => r.id !== tempId), reply_count: Math.max(0, c.reply_count - 1) };
            }
            return c;
          }));
        } else {
          setComments(prev => prev.filter(c => c.id !== tempId));
        }
        setTotalCount(c => Math.max(0, c - 1));
        feedimAlert("error", data.error || "Yorum gönderilemedi");
        return;
      }

      if (data?.debug) {
        // eslint-disable-next-line no-console
        console.log("[COMMENT][DEBUG][CLIENT]", data.debug);
      }

      // Replace temp ID with real — keep optimistic profile to avoid avatar flash/bounce
      const mergeComment = (temp: Comment): Comment => ({
        ...temp,
        id: data.comment.id,
        is_nsfw: data.comment.is_nsfw,
      });

      if (parentId) {
        setComments(prev => prev.map(c => {
          if (c.id === parentId) {
            return { ...c, replies: (c.replies || []).map(r => r.id === tempId ? mergeComment(r) : r) };
          }
          return c;
        }));
      } else {
        setComments(prev => prev.map(c => c.id === tempId ? mergeComment(c) : c));
      }
    } catch {
      if (parentId) {
        setComments(prev => prev.map(c => {
          if (c.id === parentId) {
            return { ...c, replies: (c.replies || []).filter(r => r.id !== tempId), reply_count: Math.max(0, c.reply_count - 1) };
          }
          return c;
        }));
      } else {
        setComments(prev => prev.filter(c => c.id !== tempId));
      }
      setTotalCount(c => Math.max(0, c - 1));
      feedimAlert("error", "Yorum gönderilemedi");
    } finally {
      setSubmitting(false);
    }
  };

  // — Emoji handler —
  const handleEmojiSelect = (emoji: string) => {
    const textarea = inputRef.current;
    if (!textarea) {
      if ((newComment + emoji).length <= maxCommentLength) setNewComment(prev => prev + emoji);
      setShowEmojiPicker(false);
      return;
    }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newValue = newComment.substring(0, start) + emoji + newComment.substring(end);
    if (newValue.length <= maxCommentLength) {
      setNewComment(newValue);
      setTimeout(() => {
        const pos = start + emoji.length;
        textarea.selectionStart = pos;
        textarea.selectionEnd = pos;
        textarea.focus();
      }, 0);
    }
    setShowEmojiPicker(false);
    setMentionUsers([]);
  };

  // — GIF handler —
  const handleGifSelect = (gifUrl: string, previewUrl: string) => {
    setPendingGif({ url: gifUrl, preview: previewUrl });
    setNewComment("");
    setShowGifPicker(false);
  };

  const handleLikeComment = useCallback(async (commentId: number) => {
    if (!ctxUser) { const user = await requireAuth(); if (!user) return; }

    const isLiked = likedComments.has(commentId);
    setLikedComments(prev => {
      const next = new Set(prev);
      if (isLiked) next.delete(commentId); else next.add(commentId);
      return next;
    });

    const updateCount = (delta: number) => {
      setComments(prev => prev.map(c => {
        if (c.id === commentId) return { ...c, like_count: Math.max(0, c.like_count + delta) };
        const replies = c.replies?.map(r => r.id === commentId ? { ...r, like_count: Math.max(0, r.like_count + delta) } : r);
        return { ...c, replies };
      }));
    };
    updateCount(isLiked ? -1 : 1);

    fetch(`/api/posts/${postId}/comments/${commentId}/like`, { method: isLiked ? "DELETE" : "POST", keepalive: true }).then(res => {
      if (!res.ok) {
        updateCount(isLiked ? 1 : -1);
        setLikedComments(prev => {
          const next = new Set(prev);
          if (isLiked) next.add(commentId); else next.delete(commentId);
          return next;
        });
      }
    }).catch(() => {
      updateCount(isLiked ? 1 : -1);
      setLikedComments(prev => {
        const next = new Set(prev);
        if (isLiked) next.add(commentId); else next.delete(commentId);
        return next;
      });
    });
  }, [likedComments, postId, ctxUser, requireAuth]);

  const toggleRepliesVisibility = (commentId: number) => {
    setShowReplies(prev => {
      const next = new Set(prev);
      if (next.has(commentId)) next.delete(commentId); else next.add(commentId);
      return next;
    });
  };

  const renderMentionContent = useCallback((text: string) => {
    // Escape HTML entities first to prevent XSS
    const escaped = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
    return escaped.replace(
      /@([A-Za-z0-9._-]+)/g,
      '<a href="/u/$1" class="text-accent-main font-semibold hover:underline">@$1</a>'
    );
  }, []);

  const commentFormFooter = (
    <div className="z-[99998] px-3 py-[2px] pb-[env(safe-area-inset-bottom,8px)]">
      {/* Reply indicator */}
      {replyTo && (
        <div className="flex items-center gap-2 py-[11px] px-[2px] ml-[5px] w-full border-b border-bg-tertiary text-[0.85rem]">
          <span className="text-text-muted mr-[5px]">Yanıtlanan:</span>
          <span className="font-semibold text-text-primary">@{replyTo.name}</span>
          <button
            type="button"
            onClick={() => setReplyTo(null)}
            className="pl-[5px] text-[0.85rem] text-accent-main font-medium"
          >
            İptal
          </button>
        </div>
      )}

      {/* Mention dropdown */}
      {mentionUsers.length > 0 && (
        <div className="bg-bg-elevated bg-solid border border-border-primary rounded-xl shadow-xl mb-2 max-h-[200px] overflow-y-auto">
          {mentionUsers.map((u, i) => (
            <button
              key={u.user_id}
              onClick={() => selectMentionUser(u.username)}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition text-sm ${
                i === mentionIndex ? "bg-accent-main/10" : "hover:bg-bg-tertiary"
              }`}
            >
              {u.avatar_url ? (
                <img src={u.avatar_url} alt="" className="h-7 w-7 rounded-full object-cover shrink-0" />
              ) : (
                <img className="default-avatar-auto h-7 w-7 rounded-full object-cover shrink-0" alt="" />
              )}
              <div className="flex flex-col">
                <span className="font-medium">@{u.username}</span>
              </div>
              {u.is_verified && <VerifiedBadge variant={getBadgeVariant(u.premium_plan)} role={u.role} />}
            </button>
          ))}
        </div>
      )}

      {/* GIF preview strip */}
      {pendingGif && !newComment.trim() && (
        <div className="flex items-center gap-2 px-2 py-2">
          <div className="relative">
            <img src={pendingGif.preview} alt="GIF" className="h-[60px] rounded-lg" />
            <button
              type="button"
              onClick={() => setPendingGif(null)}
              className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-bg-inverse text-bg-primary flex items-center justify-center"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}

      {/* Form row */}
      <form onSubmit={handleSubmit} className="flex items-end gap-2 my-[10px] w-full">
        {/* Avatar */}
        <div className="shrink-0 mb-[7px]">
          {ctxUser?.avatarUrl ? (
            <img src={ctxUser.avatarUrl} alt="" className="h-[36px] w-[36px] rounded-full object-cover" />
          ) : (
            <img className="default-avatar-auto h-[36px] w-[36px] rounded-full object-cover" alt="" />
          )}
        </div>
        <div className="flex flex-1 min-w-0 items-stretch rounded-[24px] bg-bg-tertiary relative">
          <textarea
            data-hotkey="comment-input"
            ref={inputRef}
            value={newComment}
            onChange={e => {
              if (pendingGif) return;
              handleCommentChange(e.target.value);
            }}
            readOnly={!!pendingGif}
            maxLength={maxCommentLength}
            placeholder={pendingGif ? "GIF seçili." : "Düşüncelerini paylaş..."}
            rows={1}
            className={cn(
              "comment-textarea flex-1 py-[13px] pl-[18px] pr-[10px] bg-transparent outline-none border-none shadow-none resize-none text-[0.9rem] text-text-readable min-h-[35px] placeholder:text-text-muted",
              pendingGif && "opacity-20 cursor-default"
            )}
            onInput={resizeTextarea}
            onKeyDown={handleMentionKeyDown}
            style={{ fontFamily: 'inherit' }}
          />
          {newComment.length >= 100 && (
            <span className="absolute left-[18px] bottom-[6px] text-[0.66rem] tabular-nums text-text-muted/60 pointer-events-none">
              {newComment.length}/{maxCommentLength}
            </span>
          )}
          <div className="flex items-center shrink-0 mb-[9px] mt-auto mr-[7px] gap-[2px]">
            <button
              type="button"
              onClick={() => { setShowGifPicker(!showGifPicker); setShowEmojiPicker(false); }}
              className={cn(
                "flex items-center justify-center h-[35px] w-[35px] rounded-full transition text-[0.75rem] font-bold",
                showGifPicker ? "text-accent-main" : "text-text-muted hover:text-text-primary"
              )}
            >
              GIF
            </button>
            {!pendingGif && (
              <button
                type="button"
                onClick={() => { setShowEmojiPicker(!showEmojiPicker); setShowGifPicker(false); }}
                className={cn(
                  "flex items-center justify-center h-[35px] w-[35px] rounded-full transition",
                  showEmojiPicker ? "text-accent-main" : "text-text-muted hover:text-text-primary"
                )}
              >
                <Smile className="h-[20px] w-[20px]" />
              </button>
            )}
            {(newComment.trim() || pendingGif) && (
              <button
                type="submit"
                disabled={submitting}
                className="flex items-center justify-center relative h-[35px] w-auto min-w-[53px] rounded-[2rem] bg-bg-inverse text-bg-primary disabled:opacity-50 transition shrink-0"
                aria-label="Yorum Gönder"
              >
                {submitting ? (
                  <span className="loader" style={{ width: 16, height: 16, borderTopColor: 'var(--bg-primary)' }} />
                ) : (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                    <path d="M12 6V18M12 6L7 11M12 6L17 11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );

  return (
    <>
    <Modal open={open} onClose={onClose} title={`Yorumlar (${totalCount})`} size="md" infoText="Düşüncelerini paylaş, emoji ve GIF gönder. Yorumları beğenebilir ve yanıtlayabilirsin." footer={commentFormFooter} fullHeight>
        {/* Sort tabs - sticky */}
        {comments.length > 0 && (
          <div className="sticky top-0 z-10 bg-bg-secondary flex items-center gap-1 px-4 py-1">
            <button
              onClick={() => handleSortChange("smart")}
              className={cn(
                "px-3 py-1 rounded-full text-[0.85rem] font-semibold transition",
                sortBy === "smart" ? "bg-accent-main/10 text-accent-main" : "text-text-muted hover:text-text-primary"
              )}
            >
              Senin için
            </button>
            <button
              onClick={() => handleSortChange("newest")}
              className={cn(
                "px-3 py-1 rounded-full text-[0.85rem] font-semibold transition",
                sortBy === "newest" ? "bg-accent-main/10 text-accent-main" : "text-text-muted hover:text-text-primary"
              )}
            >
              En son
            </button>
            <button
              onClick={() => handleSortChange("popular")}
              className={cn(
                "px-3 py-1 rounded-full text-[0.85rem] font-semibold transition",
                sortBy === "popular" ? "bg-accent-main/10 text-accent-main" : "text-text-muted hover:text-text-primary"
              )}
            >
              Popüler
            </button>
          </div>
        )}

          {loading && comments.length === 0 ? (
            <div className="flex justify-center py-8"><span className="loader" style={{ width: 22, height: 22 }} /></div>
          ) : comments.length === 0 ? (
            /* Empty state */
            <div className="flex items-center justify-center min-h-[50vh]">
              <div className="flex flex-col items-center opacity-60 text-center">
                <h6 className="font-semibold text-base mb-2">Düşüncelerini paylaş</h6>
                <p className="text-[0.9rem] text-text-muted mt-[3px]">İlk yorumu siz yapın</p>
              </div>
            </div>
          ) : (
            <ol className="list-none m-0">
              {comments.filter(c => c.author_id === currentUserId || !isBlockedContent(c.content)).map(comment => (
                <li
                  key={comment.id}
                  id={`comment-${comment.id}`}
                  className={`transition-colors duration-500 ${comment.id === newCommentId ? "animate-[commentIn_0.32s_cubic-bezier(0.34,1.56,0.64,1)]" : ""}`}
                >
                  {/* Comment card */}
                  <CommentCard
                    comment={comment}
                    likedComments={likedComments}
                    currentUserId={currentUserId}
                    openMenuId={openMenuId}
                    postSlug={postSlug}
                    onToggleMenu={setOpenMenuId}
                    onLike={handleLikeComment}
                    onReply={(id, name) => setReplyTo({ id, name })}
                    onDelete={handleDeleteComment}
                    onReport={async (id) => { const user = await requireAuth(); if (user) setReportTarget(id); }}
                    renderMentionContent={renderMentionContent}
                  />

                  {/* Toggle replies button */}
                  {comment.reply_count > 0 && (
                    <button
                      onClick={() => toggleRepliesVisibility(comment.id)}
                      className="py-[7px] px-[29px] bg-transparent border-none text-[0.84rem] text-accent-main cursor-pointer font-medium hover:underline"
                    >
                      {showReplies.has(comment.id)
                        ? `${comment.reply_count} yanıtı gizle`
                        : `${comment.reply_count} yanıtı göster`
                      }
                    </button>
                  )}

                  {/* Replies container */}
                  {showReplies.has(comment.id) && comment.replies && comment.replies.length > 0 && (
                    <div className="pl-[11px] ml-[13px]">
                      {comment.replies.filter(r => r.author_id === currentUserId || !isBlockedContent(r.content)).map(reply => (
                        <CommentCard
                          key={reply.id}
                          comment={reply}
                          isReply
                          likedComments={likedComments}
                          currentUserId={currentUserId}
                          openMenuId={openMenuId}
                          postSlug={postSlug}
                          onToggleMenu={setOpenMenuId}
                          onLike={handleLikeComment}
                          onDelete={handleDeleteComment}
                          onReport={async (id) => { const user = await requireAuth(); if (user) setReportTarget(id); }}
                          renderMentionContent={renderMentionContent}
                        />
                      ))}
                    </div>
                  )}
                </li>
              ))}

              {/* Load more */}
              <li>
                <LoadMoreTrigger onLoadMore={async () => { const u = await requireAuth(); if (!u) return; const next = page + 1; setPage(next); loadComments(next); }} loading={loadingMore} hasMore={hasMore} />
              </li>
            </ol>
          )}
    </Modal>

    {/* Comment options modal */}
    {openMenuId !== null && (() => {
      const allComments = [...comments, ...comments.flatMap(c => c.replies || [])];
      const menuComment = allComments.find(c => c.id === openMenuId);
      if (!menuComment) return null;
      const menuUsername = menuComment.profiles?.username || "anonim";
      return (
        <Modal open={true} onClose={() => setOpenMenuId(null)} hideHeader size="sm" zIndex="z-[99991]">
          <div className="py-1 px-2">
            {!menuComment.is_nsfw && (
              <>
                <button
                  onClick={() => {
                    const username = menuUsername;
                    setOpenMenuId(null);
                    onClose();
                    window.location.href = `/u/${username}`;
                  }}
                  className="flex items-center gap-3 px-4 py-3.5 text-[0.88rem] text-text-primary hover:bg-bg-tertiary transition w-full text-left rounded-[12px]"
                >
                  <User className="h-[18px] w-[18px] text-text-muted" />
                  Profile git
                </button>
                {postSlug && (
                  <button
                    onClick={() => {
                      const url = `${window.location.origin}/${postSlug}?comment=${encodeId(menuComment.id)}`;
                      navigator.clipboard.writeText(url);
                      setOpenMenuId(null);
                      feedimAlert("success", "Yorum bağlantısı kopyalandı");
                    }}
                    className="flex items-center gap-3 px-4 py-3.5 text-[0.88rem] text-text-primary hover:bg-bg-tertiary transition w-full text-left rounded-[12px]"
                  >
                    <Link2 className="h-[18px] w-[18px] text-text-muted" />
                    Bağlantıyı kopyala
                  </button>
                )}
                {menuComment.content_type !== "gif" && menuComment.content && (
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(menuComment.content);
                      setOpenMenuId(null);
                      feedimAlert("success", "Metin kopyalandı");
                    }}
                    className="flex items-center gap-3 px-4 py-3.5 text-[0.88rem] text-text-primary hover:bg-bg-tertiary transition w-full text-left rounded-[12px]"
                  >
                    <Copy className="h-[18px] w-[18px] text-text-muted" />
                    Metni kopyala
                  </button>
                )}
                {currentUserId !== menuComment.author_id && (
                  <button
                    onClick={() => { setOpenMenuId(null); setReportTarget(menuComment.id); }}
                    className="flex items-center gap-3 px-4 py-3.5 text-[0.88rem] text-error hover:bg-error/10 transition w-full text-left rounded-[12px]"
                  >
                    <Flag className="h-[18px] w-[18px]" />
                    Şikayet et
                  </button>
                )}
              </>
            )}
            {(currentUserId === menuComment.author_id || ctxUser?.role === 'admin') && (
              <button
                onClick={() => { setOpenMenuId(null); handleDeleteComment(menuComment.id); }}
                className="flex items-center gap-3 px-4 py-3.5 text-[0.88rem] text-error hover:bg-error/10 transition w-full text-left rounded-[12px]"
              >
                <Trash2 className="h-[18px] w-[18px]" />
                {ctxUser?.role === 'admin' && currentUserId !== menuComment.author_id ? 'Yorumu sil (Admin)' : 'Yorumu sil'}
              </button>
            )}
          </div>
        </Modal>
      );
    })()}

    {showEmojiPicker && (
      <EmojiPickerPanel
        onEmojiSelect={handleEmojiSelect}
        onClose={() => setShowEmojiPicker(false)}
      />
    )}
    {showGifPicker && (
      <GifPickerPanel
        onGifSelect={handleGifSelect}
        onClose={() => setShowGifPicker(false)}
      />
    )}

    <ReportModal
      open={reportTarget !== null}
      onClose={() => setReportTarget(null)}
      targetType="comment"
      targetId={reportTarget || 0}
      authorUserId={(() => { const c = [...comments, ...comments.flatMap(x => x.replies || [])].find(x => x.id === reportTarget); return c?.author_id || undefined; })()}
      authorName={(() => { const c = [...comments, ...comments.flatMap(x => x.replies || [])].find(x => x.id === reportTarget); return c?.profiles?.full_name || c?.profiles?.name || c?.profiles?.username; })()}
    />
    </>
  );
}

/* ─────────────────────────────────────
   CommentCard — extracted outside CommentsModal to prevent
   recreating the component on every parent re-render (keystroke).
───────────────────────────────────── */
interface CommentCardProps {
  comment: Comment;
  isReply?: boolean;
  likedComments: Set<number>;
  currentUserId: string | null;
  openMenuId: number | null;
  postSlug?: string;
  onToggleMenu: (id: number | null) => void;
  onLike: (id: number) => void;
  onReply?: (id: number, name: string) => void;
  onDelete: (id: number) => void;
  onReport: (id: number) => void;
  renderMentionContent: (text: string) => string;
}

const COMMENT_TRUNCATE_LENGTH = 300;
const COMMENT_TRUNCATE_LINES = 6;

const CommentCard = memo(function CommentCard({ comment, isReply = false, likedComments, currentUserId, openMenuId, postSlug, onToggleMenu, onLike, onReply, onDelete, onReport, renderMentionContent }: CommentCardProps) {
  const [expanded, setExpanded] = useState(false);
  const displayName = comment.profiles?.username ? `@${comment.profiles.username}` : "Anonim";
  const profileUsername = comment.profiles?.username || "anonim";
  const isLong = (comment.content?.length || 0) > COMMENT_TRUNCATE_LENGTH || (comment.content?.split("\n").length || 0) > COMMENT_TRUNCATE_LINES;
  return (
    <div className={cn(
      "flex flex-row w-full py-[6px] px-[11px]",
      isReply && "pl-[11px] ml-[13px] border-l-2 border-border-primary"
    )}>
      {/* Avatar */}
      <div className="shrink-0 mt-[9px]">
        <a href={`/u/${profileUsername}`}>
          {comment.profiles?.avatar_url ? (
            <img src={comment.profiles.avatar_url} alt="" className="h-[34px] w-[34px] rounded-full object-cover" />
          ) : (
            <img className="default-avatar-auto h-[34px] w-[34px] rounded-full object-cover" alt="" />
          )}
        </a>
      </div>

      {/* Content */}
      <div className="flex flex-col items-start flex-1 min-w-0 ml-[9px]">
        {/* Author row + action buttons */}
        <div className="flex w-full justify-between mt-[5px]">
          <div className="flex items-center gap-1.5">
            <a href={`/u/${profileUsername}`} className="flex items-center gap-1 text-[0.8rem] font-bold leading-tight text-text-primary hover:underline">
              <span className="line-clamp-1">{displayName}</span>
              {comment.profiles?.is_verified && <VerifiedBadge variant={getBadgeVariant(comment.profiles?.premium_plan)} role={comment.profiles?.role} />}
            </a>
            <span className="text-[0.7rem] text-text-muted">·</span>
            <span className="text-[0.7rem] text-text-muted">
              {formatRelativeDate(comment.created_at)}
            </span>
          </div>
          {/* More menu (top right) */}
          {(!comment.is_nsfw || currentUserId === comment.author_id) && (
            <div className="shrink-0">
              <button
                onClick={(e) => { e.stopPropagation(); onToggleMenu(openMenuId === comment.id ? null : comment.id); }}
                className="flex items-center justify-center h-[26px] w-[26px] rounded-full text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition active:bg-bg-tertiary"
              >
                <MoreHorizontal className="h-[18px] w-[18px]" />
              </button>
            </div>
          )}
        </div>

        {/* Comment body */}
        {comment.is_nsfw && (
          <div className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[0.7rem] font-semibold bg-accent-main/10 text-accent-main">
            Yorumunuz denetleniyor
          </div>
        )}
        {comment.content_type === "gif" && comment.gif_url ? (
          <img src={comment.gif_url} className="mt-0.5 max-w-[200px] rounded-xl cursor-pointer" loading="lazy" alt="GIF" />
        ) : (
          <>
            <div
              className={cn(
                "w-full max-w-full text-[0.82rem] leading-[1.5] text-text-readable select-none break-words pr-[26px] mt-[2px] mx-[1px]",
                !expanded && isLong && "line-clamp-6"
              )}
              dangerouslySetInnerHTML={{ __html: renderMentionContent(comment.content) }}
            />
            {isLong && !expanded && (
              <button
                onClick={() => setExpanded(true)}
                className="text-[0.78rem] text-text-muted hover:text-text-primary transition font-medium mt-0.5"
              >
                devamını oku...
              </button>
            )}
          </>
        )}

        {/* Bottom action bar */}
        {!comment.is_nsfw && (
          <div className="flex items-center w-full h-[28px] justify-between pr-3 mt-[2px]">
            <div className="flex items-center gap-3">
              <button
                onClick={() => onLike(comment.id)}
                className={cn(
                  "flex items-center gap-1 text-xs transition",
                  likedComments.has(comment.id) ? "text-error" : "text-text-muted hover:text-error"
                )}
              >
                <Heart className={cn("h-[14px] w-[14px]", likedComments.has(comment.id) && "fill-current")} />
                <span>{comment.like_count > 0 ? formatCount(comment.like_count) : "Beğen"}</span>
              </button>
              {!isReply && onReply && (
                <button
                  onClick={() => onReply(comment.id, profileUsername)}
                  className="text-[0.84rem] text-text-muted hover:text-text-primary transition font-medium"
                >
                  Yanıtla
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
})
