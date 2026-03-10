"use client";

import { useState, useEffect, useRef, useCallback, memo, useLayoutEffect } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Heart, Trash2, Smile, X, MoreHorizontal, User, Copy, Flag, Link2, AlertTriangle, ChevronDown } from "lucide-react";
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
import { VALIDATION } from "@/lib/constants";
import { useMention } from "@/lib/useMention";
import MentionDropdown from "@/components/MentionDropdown";
import { renderMentionsAsHTML } from "@/lib/mentionRenderer";
import { copyTextToClipboard } from "@/lib/copyTextToClipboard";
import { emitMutation } from "@/lib/mutationEvents";
import LazyAvatar from "@/components/LazyAvatar";
import BlurImage from "@/components/BlurImage";


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

interface CommentsResponse {
  comments?: Comment[];
  hasMore?: boolean;
  userLikedIds?: number[];
  targetParentId?: number;
}

interface CommentMutationResponse {
  error?: string;
  comment?: {
    id: number;
    is_nsfw?: boolean;
  };
}

interface RepliesResponse {
  replies?: Comment[];
  userLikedIds?: number[];
}

interface CommentsModalProps {
  open: boolean;
  onClose: () => void;
  postId: number;
  commentCount: number;
  postSlug?: string;
  targetCommentId?: number | null;
  allowComments?: boolean;
}

export default function CommentsModal({ open, onClose, postId, commentCount: initialCount, postSlug, targetCommentId, allowComments = true }: CommentsModalProps) {
  const t = useTranslations("modals");
  const tc = useTranslations("common");
  const locale = useLocale();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [totalCount, setTotalCount] = useState(initialCount);
  const initialCountRef = useRef(initialCount);
  const knownCountRef = useRef(Math.max(initialCount, totalCount));
  const [emptyStateVerified, setEmptyStateVerified] = useState(initialCount === 0);
  const [sortBy, setSortBy] = useState<"smart" | "newest" | "popular">("smart");
  const currentSortRef = useRef<"smart" | "newest" | "popular">(sortBy);
  const [newComment, setNewComment] = useState("");
  const [replyTo, setReplyTo] = useState<{ id: number; name: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [likedComments, setLikedComments] = useState<Set<number>>(new Set());
  const [reportTarget, setReportTarget] = useState<number | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [showReplies, setShowReplies] = useState<Set<number>>(new Set());
  const [loadingReplies, setLoadingReplies] = useState<Set<number>>(new Set());

  // Animation + Emoji/GIF
  const [newCommentId, setNewCommentId] = useState<number | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [pendingGif, setPendingGif] = useState<{ url: string; preview: string } | null>(null);
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);

  // Like debounce: prevent double-tapping same comment
  const likingRef = useRef<Set<number>>(new Set());

  // AbortController for race condition prevention
  const abortRef = useRef<AbortController | null>(null);
  const mismatchRetryDoneRef = useRef(false);

  // Per-tab cache for instant tab switching
  const tabCacheRef = useRef<Record<string, { comments: Comment[]; hasMore: boolean }>>({});

  // Mention system
  const mention = useMention({ maxMentions: 3, limitMessage: tc("mentionLimit") });

  const { requireAuth } = useAuthModal();
  const { user: ctxUser } = useUser();
  const viewerIdRef = useRef<string | null>(ctxUser?.id ?? null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const maxCommentLength = (ctxUser?.role === "admin" || ctxUser?.premiumPlan === "max" || ctxUser?.premiumPlan === "business")
    ? VALIDATION.comment.maxPremium
    : VALIDATION.comment.max;

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
    initialCountRef.current = initialCount;
    setTotalCount(initialCount);
    setEmptyStateVerified(initialCount === 0);
  }, [initialCount]);

  useEffect(() => {
    knownCountRef.current = Math.max(initialCount, totalCount);
  }, [initialCount, totalCount]);

  useEffect(() => {
    currentSortRef.current = sortBy;
  }, [sortBy]);

  useEffect(() => {
    viewerIdRef.current = ctxUser?.id ?? null;
    setCurrentUserId(ctxUser?.id ?? null);
  }, [ctxUser?.id]);

  const loadComments = useCallback(async (
    pageNum: number,
    sort: "smart" | "newest" | "popular",
    { isTabSwitch = false, target }: { isTabSwitch?: boolean; target?: number | null } = {},
  ): Promise<{ targetParentId?: number } | void> => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    if (isTabSwitch && pageNum === 1) {
      setComments([]);
      setLoading(true);
    } else if (pageNum === 1) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    try {
      let url = `/api/posts/${postId}/comments?page=${pageNum}&sort=${sort}`;
      if (target) url += `&target=${target}`;
      let res = await fetch(url, { signal: controller.signal });
      let data: CommentsResponse = {};
      try {
        data = await res.json() as CommentsResponse;
      } catch {
        data = {};
      }

      if (res.ok) {
        const knownCount = knownCountRef.current;
        if (
          pageNum === 1 &&
          (data.comments?.length || 0) === 0 &&
          knownCount > 0 &&
          !mismatchRetryDoneRef.current
        ) {
          mismatchRetryDoneRef.current = true;
          const retryRes = await fetch(url, { signal: controller.signal, cache: "no-store" });
          let retryData: CommentsResponse = {};
          try {
            retryData = await retryRes.json() as CommentsResponse;
          } catch {
            retryData = {};
          }
          if (retryRes.ok) {
            res = retryRes;
            data = retryData;
          }
        }

        if (pageNum === 1) {
          const nextComments = data.comments || [];
          setComments(nextComments);
          tabCacheRef.current[sort] = { comments: nextComments, hasMore: !!data.hasMore };
          setEmptyStateVerified(nextComments.length > 0 || knownCount === 0 || mismatchRetryDoneRef.current);
        } else {
          setComments(prev => {
            const updated = [...prev, ...(data.comments || [])];
            tabCacheRef.current[sort] = { comments: updated, hasMore: !!data.hasMore };
            return updated;
          });
        }
        setHasMore(!!data.hasMore);
        if (pageNum === 1) {
          setLikedComments(new Set(data.userLikedIds || []));
        } else if (data.userLikedIds?.length) {
          setLikedComments(prev => {
            const next = new Set(prev);
            data.userLikedIds?.forEach((id) => next.add(id));
            return next;
          });
        }
        return { targetParentId: data.targetParentId };
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [postId]);

  useEffect(() => {
    if (open) {
      const startingCount = initialCountRef.current;
      mismatchRetryDoneRef.current = false;
      setComments([]);
      setLoading(true);
      setHasMore(false);
      setPage(1);
      setTotalCount(startingCount);
      setEmptyStateVerified(startingCount === 0);
      setLikedComments(new Set());
      setCurrentUserId(viewerIdRef.current);
      tabCacheRef.current = {};
      void loadComments(1, currentSortRef.current, { target: targetCommentId }).then((res) => {
        if (targetCommentId) {
          // If target is a reply, expand its parent's replies first
          if (res?.targetParentId) {
            setShowReplies(prev => new Set([...prev, res.targetParentId!]));
          }
          setTimeout(() => {
            const el = document.getElementById(`comment-${targetCommentId}`);
            if (el) {
              el.scrollIntoView({ behavior: "smooth", block: "center" });
              el.classList.add("bg-accent-main/10");
              setTimeout(() => el.classList.remove("bg-accent-main/10"), 2000);
            }
          }, 500);
        }
      });
    } else {
      abortRef.current?.abort();
      tabCacheRef.current = {};
      setComments([]);
      setLikedComments(new Set());
      setLoading(true);
    }
  }, [loadComments, open, targetCommentId]);

  useEffect(() => {
    if (replyTo && inputRef.current) {
      inputRef.current.focus();
    }
  }, [replyTo]);

  const handleSortChange = (sort: "smart" | "newest" | "popular") => {
    if (sort === sortBy) return;
    currentSortRef.current = sort;
    setSortBy(sort);
    setPage(1);
    setShowReplies(new Set());
    setOpenMenuId(null);
    void loadComments(1, sort, { isTabSwitch: true });
  };

  // — Mention helpers —
  const handleCommentChange = (value: string) => {
    setNewComment(value);
    resizeTextarea();
    mention.handleTextChange(value, inputRef.current);
  };

  const selectMentionUser = (username: string) => {
    mention.selectUser(username, newComment, (v) => {
      setNewComment(v);
      setTimeout(() => {
        if (inputRef.current) {
          const pos = v.indexOf("@" + username) + username.length + 2;
          inputRef.current.selectionStart = pos;
          inputRef.current.selectionEnd = pos;
          inputRef.current.focus();
        }
      }, 0);
    });
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
    if (e.key === "Enter" && !e.shiftKey && mention.mentionUsers.length === 0) {
      e.preventDefault();
      handleSubmit(e as unknown as React.FormEvent);
    }
  };

  // — Actions —
  const handleDeleteComment = useCallback((commentId: number) => {
    feedimAlert("question", t("deleteCommentConfirm"), {
      showYesNo: true,
      onYes: () => {
        // Snapshot for rollback
        let prevComments: Comment[] = [];
        let prevCount = 0;
        setComments(prev => {
          prevComments = prev;
          // If deleting a parent comment, promote its replies to root-level
          const deletedParent = prev.find(c => c.id === commentId);
          const promotedReplies = (deletedParent?.replies || []).map(r => ({ ...r, parent_id: null, replies: [] }));
          const filtered = prev.filter(c => c.id !== commentId).map(c => ({
            ...c,
            replies: c.replies?.filter(r => r.id !== commentId),
            reply_count: c.replies?.some(r => r.id === commentId) ? c.reply_count - 1 : c.reply_count,
          }));
          return [...promotedReplies, ...filtered];
        });
        setTotalCount(c => { prevCount = c; return Math.max(0, c - 1); });
        fetch(`/api/posts/${postId}/comments/${commentId}`, { method: "DELETE", keepalive: true })
          .then(res => { if (!res.ok) throw res; emitMutation({ type: "comment-deleted", postId, delta: -1 }); })
          .catch(() => { setComments(prevComments); setTotalCount(prevCount); });
      },
    });
  }, [postId, t]);

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
      const reqInit = { method: "POST" as const, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
      let res = await fetch(`/api/posts/${postId}/comments`, reqInit);

      // Retry once on 401 — session may need refresh after login redirect
      if (res.status === 401) {
        const sb = createClient();
        await sb.auth.refreshSession();
        res = await fetch(`/api/posts/${postId}/comments`, reqInit);
      }

      let data: CommentMutationResponse = {};
      try { data = await res.json(); } catch { data = {}; }

      if (!res.ok || !data.comment) {
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
        feedimAlert("error", data.error || t("commentFailed"));
        return;
      }

      // Replace temp ID with real — keep optimistic profile to avoid avatar flash/bounce
      const mergeComment = (temp: Comment): Comment => ({
        ...temp,
        id: data.comment!.id,
        is_nsfw: data.comment!.is_nsfw,
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
      emitMutation({ type: "comment-added", postId, delta: 1 });
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
      feedimAlert("error", t("commentFailed"));
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
    mention.clearMention();
  };

  // — GIF handler —
  const handleGifSelect = (gifUrl: string, previewUrl: string) => {
    setPendingGif({ url: gifUrl, preview: previewUrl });
    setNewComment("");
    setShowGifPicker(false);
  };

  const handleLikeComment = useCallback(async (commentId: number) => {
    if (likingRef.current.has(commentId)) return;
    if (!ctxUser) { const user = await requireAuth(); if (!user) return; }

    likingRef.current.add(commentId);
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

    const likeUrl = `/api/posts/${postId}/comments/${commentId}/like`;
    const likeMethod = isLiked ? "DELETE" : "POST";
    fetch(likeUrl, { method: likeMethod, keepalive: true }).then(async res => {
      if (res.status === 401) {
        const sb = createClient();
        await sb.auth.refreshSession();
        res = await fetch(likeUrl, { method: likeMethod, keepalive: true });
      }
      if (!res.ok) {
        updateCount(isLiked ? 1 : -1);
        setLikedComments(prev => {
          const next = new Set(prev);
          if (isLiked) next.add(commentId); else next.delete(commentId);
          return next;
        });
        if (res.status === 403 || res.status === 429) {
          res.json().then(data => feedimAlert("error", data.error)).catch(() => {});
        }
      }
    }).catch(() => {
      updateCount(isLiked ? 1 : -1);
      setLikedComments(prev => {
        const next = new Set(prev);
        if (isLiked) next.add(commentId); else next.delete(commentId);
        return next;
      });
    }).finally(() => {
      likingRef.current.delete(commentId);
    });
  }, [likedComments, postId, ctxUser, requireAuth]);

  const REPLY_PAGE_SIZE = 10;

  const loadMoreReplies = useCallback(async (commentId: number) => {
    const comment = comments.find(c => c.id === commentId);
    if (!comment) return;
    const loaded = comment.replies?.length || 0;

    setLoadingReplies(prev => new Set(prev).add(commentId));
    try {
      const res = await fetch(`/api/posts/${postId}/comments?parent_id=${commentId}&offset=${loaded}&limit=${REPLY_PAGE_SIZE}`);
      if (res.ok) {
        const data = await res.json() as RepliesResponse;
        const nextReplies = data.replies || [];
        if (nextReplies.length) {
          setComments(prev => prev.map(c => {
            if (c.id === commentId) {
              return { ...c, replies: [...(c.replies || []), ...nextReplies] };
            }
            return c;
          }));
        }
        if (data.userLikedIds?.length) {
          setLikedComments(prev => {
            const next = new Set(prev);
            data.userLikedIds?.forEach((id) => next.add(id));
            return next;
          });
        }
      }
    } catch {}
    setLoadingReplies(prev => { const next = new Set(prev); next.delete(commentId); return next; });
  }, [comments, postId]);

  const toggleRepliesVisibility = (commentId: number) => {
    setShowReplies(prev => {
      const next = new Set(prev);
      if (next.has(commentId)) next.delete(commentId); else next.add(commentId);
      return next;
    });
  };

  const renderMentionContent = useCallback((text: string) => {
    return renderMentionsAsHTML(text);
  }, []);

  const commentFormFooter = (
    <div className="z-[99998] px-3 py-[2px] pb-[env(safe-area-inset-bottom,8px)]">
      {/* Reply indicator */}
      {replyTo && (
        <div className="flex items-center gap-2 py-[11px] px-[2px] ml-[5px] w-full border-b border-bg-tertiary text-[0.85rem]">
          <span className="font-semibold text-text-primary">@{replyTo.name}</span>
          <button
            type="button"
            onClick={() => { setReplyTo(null); setNewComment(""); }}
            className="pl-[5px] text-[0.85rem] text-accent-main font-medium hover:underline"
          >
            {tc("cancel")}
          </button>
        </div>
      )}

      {/* GIF preview strip */}
      {pendingGif && !newComment.trim() && (
        <div className="flex items-center gap-2 px-2 py-2">
          <div className="relative">
            <BlurImage src={pendingGif.preview} alt="GIF" className="h-[60px] w-[60px] rounded-md overflow-hidden" />
            <button
              type="button"
              onClick={() => setPendingGif(null)}
              aria-label={tc("delete")}
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
          <LazyAvatar src={ctxUser?.avatarUrl} alt="" sizeClass="h-9 w-9" />
        </div>
        <div className="flex flex-1 min-w-0 items-stretch rounded-[24px] bg-bg-tertiary" style={{ position: "relative" }}>
          {/* Mention dropdown — positioned above textarea */}
          <MentionDropdown
            users={mention.mentionUsers}
            activeIndex={mention.mentionIndex}
            onSelect={selectMentionUser}
            onHover={mention.setMentionIndex}
            style={{ bottom: "100%", left: 0, marginBottom: 8, top: "auto" }}
          />
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
            placeholder={pendingGif ? t("gifSelected") : t("sharePlaceholder")}
            rows={1}
            className={cn(
              "comment-textarea flex-1 py-[13px] pl-[18px] pr-[10px] bg-transparent outline-none border-none shadow-none resize-none text-[0.9rem] min-h-[35px] text-text-readable placeholder:text-[0.9rem] placeholder:text-text-muted",
              pendingGif && "opacity-20 cursor-default"
            )}
            style={{ fontFamily: 'inherit' }}
            onInput={resizeTextarea}
            onKeyDown={handleMentionKeyDown}
          />
          {newComment.length >= 100 && (
            <span className="absolute right-3 top-1.5 text-[0.65rem] text-text-muted/50 pointer-events-none select-none">
              {newComment.length}/{maxCommentLength}
            </span>
          )}
          <div className="flex items-center shrink-0 mb-[9px] mt-auto mr-[7px] gap-[2px]">
            <button
              type="button"
              onClick={() => { setShowGifPicker(!showGifPicker); setShowEmojiPicker(false); }}
              aria-label="GIF"
              data-tooltip="GIF"
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
                aria-label="Emoji"
                data-tooltip="Emoji"
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
                aria-label={tc("send")}
                data-tooltip={tc("send")}
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

  const showSortSelect = loading || comments.length > 0 || Math.max(initialCount, totalCount) > 0;

  return (
    <>
    <Modal open={open} onClose={onClose} title={t("commentsTitle")} size="md" infoText={t("commentsInfoText")} footer={allowComments ? commentFormFooter : undefined} fullHeight>
        {/* Sort select - sticky */}
        {showSortSelect && (
          <div className="sticky top-0 z-10 bg-bg-secondary flex items-center py-1 px-[5px] select-none">
            <div className="relative inline-flex items-center">
              <select
                value={sortBy}
                onChange={(e) => handleSortChange(e.target.value as "smart" | "newest" | "popular")}
                className="appearance-none bg-transparent text-text-muted text-[0.82rem] font-semibold rounded-lg pl-2.5 pr-6 py-1 outline-none cursor-pointer"
              >
                <option value="smart">{t("sortForYou")}</option>
                <option value="newest">{t("sortNewest")}</option>
                <option value="popular">{t("sortPopular")}</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-1 h-4 w-4 text-text-muted" />
            </div>
          </div>
        )}

          {(loading || (comments.length === 0 && Math.max(initialCount, totalCount) > 0 && !emptyStateVerified)) ? (
            <div className="space-y-0 px-3">
              {[1,2,3,4,5].map(i => (
                <div key={i} className="flex gap-2.5 py-3">
                  <div className="h-8 w-8 rounded-full bg-bg-tertiary shrink-0" />
                  <div className="flex-1 space-y-[6px] pt-1">
                    <div className="h-[9px] w-20 bg-bg-tertiary rounded-[5px] animate-pulse" />
                    <div className="h-[9px] w-[80%] bg-bg-tertiary rounded-[5px] animate-pulse" />
                    <div className="h-[9px] w-[50%] bg-bg-tertiary rounded-[5px] animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          ) : comments.length === 0 ? (
            /* Empty state */
            <div className="flex items-center justify-center min-h-[50vh]">
              <div className="flex flex-col items-center opacity-60 text-center select-none">
                {allowComments ? (
                  <>
                    <h6 className="font-semibold text-lg">{t("shareThoughts")}</h6>
                    <p className="text-[0.85rem] text-text-muted mt-[2px]">{t("beFirstToComment")}</p>
                  </>
                ) : (
                  <p className="text-[0.9rem] text-text-muted">{t("commentsDisabled")}</p>
                )}
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
	                        onToggleMenu={setOpenMenuId}
	                        onLike={handleLikeComment}
	                        onReply={(id, name) => { if (id < 0) return; setReplyTo({ id, name }); setNewComment(`@${name} `); setTimeout(() => inputRef.current?.focus(), 100); }}
	                        renderMentionContent={renderMentionContent}
	                      />

                  {/* Toggle replies button */}
                  {comment.reply_count > 0 && (
                    <div className={`flex items-center gap-0 ml-[54px] my-[2px]`}>
                      {!showReplies.has(comment.id) && <span className="w-6 border-t border-text-muted/30" />}
                      <button
                        onClick={() => toggleRepliesVisibility(comment.id)}
                        className="py-[5px] px-[10px] bg-transparent border-none text-[0.84rem] text-text-muted cursor-pointer font-semibold hover:text-text-primary transition"
                      >
                        {showReplies.has(comment.id)
                          ? t("hideReplies", { count: formatCount(comment.reply_count, locale) })
                          : t("showReplies", { count: formatCount(comment.reply_count, locale) })
                        }
                      </button>
                    </div>
                  )}

                  {/* Replies container */}
                  {showReplies.has(comment.id) && comment.replies && comment.replies.length > 0 && (
                    <div className="pl-[41px] pb-[10px]">
                      {comment.replies.filter(r => r.author_id === currentUserId || !isBlockedContent(r.content)).map(reply => (
                        <div key={reply.id} id={`comment-${reply.id}`}>
	                        <CommentCard
	                          comment={reply}
	                          isReply
	                          likedComments={likedComments}
	                          currentUserId={currentUserId}
	                          openMenuId={openMenuId}
	                          onToggleMenu={setOpenMenuId}
	                          onLike={handleLikeComment}
	                          onReply={(_, replyUsername) => {
	                            setReplyTo({ id: comment.id, name: replyUsername });
	                            setNewComment(`@${replyUsername} `);
	                            setTimeout(() => inputRef.current?.focus(), 100);
	                          }}
	                          renderMentionContent={renderMentionContent}
	                        />
                        </div>
                      ))}
                      {/* Load more replies */}
                      {comment.reply_count > (comment.replies?.length || 0) && (
                        <div className="ml-[30px] my-[2px]">
                          <button
                            onClick={() => loadMoreReplies(comment.id)}
                            disabled={loadingReplies.has(comment.id)}
                            className="py-[5px] px-[10px] bg-transparent border-none text-[0.84rem] text-text-muted cursor-pointer font-semibold hover:text-text-primary transition disabled:opacity-50"
                          >
                            {loadingReplies.has(comment.id)
                              ? <span className="loader" style={{ width: 14, height: 14 }} />
                              : t("loadMoreReplies")
                            }
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </li>
              ))}

	              {/* Load more */}
	              <li>
	                <LoadMoreTrigger onLoadMore={async () => { const u = await requireAuth(); if (!u) return; const next = page + 1; setPage(next); void loadComments(next, currentSortRef.current); }} loading={loadingMore} hasMore={hasMore} />
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
          <div className="py-1 px-2 space-y-[3px]">
            {!menuComment.is_nsfw && (
              <>
                <button
                  onClick={() => {
                    const username = menuUsername;
                    setOpenMenuId(null);
                    onClose();
                    window.location.href = `/u/${username}`;
                  }}
                  className="flex items-center gap-3 px-2 py-3.5 text-[0.93rem] font-medium text-text-primary hover:bg-bg-tertiary transition w-full text-left rounded-[12px]"
                >
                  <User className="h-[18px] w-[18px] text-text-muted" />
                  {t("goToProfile")}
                </button>
                {postSlug && (
                  <button
                    onClick={async () => {
                      const url = `${window.location.origin}/${postSlug}?comment=${encodeId(menuComment.id)}`;
                      const copiedOk = await copyTextToClipboard(url);
                      if (!copiedOk) {
                        feedimAlert("error", tc("genericError"));
                        return;
                      }
                      setOpenMenuId(null);
                      feedimAlert("success", t("commentLinkCopied"));
                    }}
                    className="flex items-center gap-3 px-2 py-3.5 text-[0.93rem] font-medium text-text-primary hover:bg-bg-tertiary transition w-full text-left rounded-[12px]"
                  >
                    <Link2 className="h-[18px] w-[18px] text-text-muted" />
                    {t("copyCommentLink")}
                  </button>
                )}
                {menuComment.content_type !== "gif" && (menuComment.content || "").trim() !== "" && (
                  <button
                    onClick={async () => {
                      const copiedOk = await copyTextToClipboard(menuComment.content || "");
                      if (!copiedOk) {
                        feedimAlert("error", tc("genericError"));
                        return;
                      }
                      setOpenMenuId(null);
                      feedimAlert("success", t("textCopied"));
                    }}
                    className="flex items-center gap-3 px-2 py-3.5 text-[0.93rem] font-medium text-text-primary hover:bg-bg-tertiary transition w-full text-left rounded-[12px]"
                  >
                    <Copy className="h-[18px] w-[18px] text-text-muted" />
                    {t("copyText")}
                  </button>
                )}
                {currentUserId !== menuComment.author_id && (
                  <button
                    onClick={() => { setOpenMenuId(null); setReportTarget(menuComment.id); }}
                    className="flex items-center gap-3 px-2 py-3.5 text-[0.93rem] font-medium text-error hover:bg-error/10 transition w-full text-left rounded-[12px]"
                  >
                    <Flag className="h-[18px] w-[18px]" />
                    {t("reportComment")}
                  </button>
                )}
              </>
            )}
            {(ctxUser?.role === 'admin' || ctxUser?.role === 'moderator') && currentUserId !== menuComment.author_id && (
              <>
                <div className="border-t border-border-primary mx-3 my-1" />
                <button
                  onClick={() => {
                    setOpenMenuId(null);
                    feedimAlert("question", t("confirmOperation", { label: t("sendToModeration") }), {
                      showYesNo: true,
                      onYes: async () => {
                        try {
                          const res = await fetch("/api/admin/moderation", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ action: "flag_for_moderation", target_id: menuComment.id, target_type: "comment" }),
                          });
                          const data = await res.json();
                          if (res.ok && data.success) {
                            feedimAlert("success", data.message || t("operationSuccess"));
                            setComments(prev => prev.map(c => {
                              if (c.id === menuComment.id) return { ...c, is_nsfw: true };
                              return { ...c, replies: c.replies?.map(r => r.id === menuComment.id ? { ...r, is_nsfw: true } : r) };
                            }));
                          } else {
                            feedimAlert("error", data.error || t("operationError"));
                          }
                        } catch {
                          feedimAlert("error", t("serverError"));
                        }
                      },
                    });
                  }}
                  className="flex items-center gap-3 px-2 py-3.5 text-[0.93rem] font-medium text-accent-main hover:bg-accent-main/10 transition w-full text-left rounded-[12px]"
                >
                  <AlertTriangle className="h-[18px] w-[18px]" />
                  {t("sendToModeration")}
                </button>
              </>
            )}
            {(currentUserId === menuComment.author_id || ctxUser?.role === 'admin') && (
              <button
                onClick={() => { setOpenMenuId(null); handleDeleteComment(menuComment.id); }}
                className="flex items-center gap-3 px-2 py-3.5 text-[0.93rem] font-medium text-error hover:bg-error/10 transition w-full text-left rounded-[12px]"
              >
                <Trash2 className="h-[18px] w-[18px]" />
                {ctxUser?.role === 'admin' && currentUserId !== menuComment.author_id ? t("deleteCommentAdmin") : t("deleteComment")}
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
      authorUsername={(() => { const c = [...comments, ...comments.flatMap(x => x.replies || [])].find(x => x.id === reportTarget); return c?.profiles?.username; })()}
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
  onToggleMenu: (id: number | null) => void;
  onLike: (id: number) => void;
  onReply?: (id: number, name: string) => void;
  renderMentionContent: (text: string) => string;
}

const COMMENT_TRUNCATE_LENGTH = 300;
const COMMENT_TRUNCATE_LINES = 6;

const CommentCard = memo(function CommentCard({ comment, isReply = false, likedComments, currentUserId, openMenuId, onToggleMenu, onLike, onReply, renderMentionContent }: CommentCardProps) {
  const t = useTranslations("modals");
  const tc = useTranslations("common");
  const tt = useTranslations("tooltip");
  const locale = useLocale();
  const [expanded, setExpanded] = useState(false);
  const displayName = comment.profiles?.username ? `@${comment.profiles.username}` : tc("anonymous");
  const profileUsername = comment.profiles?.username || "anonim";
  const isLong = (comment.content?.length || 0) > COMMENT_TRUNCATE_LENGTH || (comment.content?.split("\n").length || 0) > COMMENT_TRUNCATE_LINES;
  return (
    <div className={cn(
      "flex flex-row w-full py-[6px] px-2 sm:px-[11px]",
      isReply && "pl-[11px]"
    )}>
      {/* Avatar */}
      <div className="shrink-0 mt-[9px]">
        <a href={`/u/${profileUsername}`}>
          <LazyAvatar src={comment.profiles?.avatar_url} alt="" sizeClass="h-8 w-8" />
        </a>
      </div>

      {/* Content */}
      <div className="flex flex-col items-start flex-1 min-w-0 ml-2 mr-2">
        {/* Author row + action buttons */}
        <div className="flex w-full justify-between mt-[3px]">
          <div className="flex items-center gap-1">
            <a href={`/u/${profileUsername}`} className="flex items-center gap-1 text-[0.78rem] font-semibold leading-tight text-text-primary hover:underline">
              <span className="line-clamp-1">{displayName}</span>
              {(comment.profiles?.is_verified || comment.profiles?.role === "admin") && <VerifiedBadge variant={getBadgeVariant(comment.profiles?.premium_plan)} role={comment.profiles?.role} />}
            </a>
            <span className="text-[0.66rem] text-text-muted">·</span>
            <span className="text-[0.66rem] text-text-muted">
              {formatRelativeDate(comment.created_at, locale)}
            </span>
          </div>
          {/* More menu (top right) */}
          {(!comment.is_nsfw || currentUserId === comment.author_id) && (
            <div className="shrink-0">
              <button
                onClick={(e) => { e.stopPropagation(); onToggleMenu(openMenuId === comment.id ? null : comment.id); }}
                aria-label={tt("options")}
                data-tooltip={tt("options")}
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
            {t("commentUnderReview")}
          </div>
        )}
        {comment.content_type === "gif" && comment.gif_url ? (
          <>
            <BlurImage src={comment.gif_url} alt="GIF" className="mt-0.5 max-w-[200px] max-h-[200px] rounded-[10px] overflow-hidden" />
          </>
        ) : (
          <>
            <div
              className={cn(
                "w-full max-w-full text-[0.84rem] leading-[1.4] text-text-readable select-none break-words pr-[26px] mx-[1px]",
                !expanded && isLong && "line-clamp-6"
              )}
              dangerouslySetInnerHTML={{ __html: renderMentionContent(comment.content) }}
            />
            {isLong && !expanded && (
              <button
                onClick={() => setExpanded(true)}
                className="text-[0.78rem] text-text-muted hover:text-text-primary transition hover:underline font-medium mt-0.5"
              >
                {tc("readMore")}
              </button>
            )}
          </>
        )}

        {/* Bottom action bar */}
        {!comment.is_nsfw && (
          <div className="flex items-center w-full h-[28px] justify-between pr-3">
            <div className="flex items-center gap-3">
              <button
                onClick={() => onLike(comment.id)}
                aria-label={tt("like")}
                className={cn(
                  "flex items-center gap-1 text-[0.78rem] font-medium transition hover:underline",
                  likedComments.has(comment.id) ? "text-error" : "text-text-muted hover:text-error"
                )}
              >
                <Heart className={cn("h-[14px] w-[14px]", likedComments.has(comment.id) && "fill-current")} />
                <span>{(comment.like_count > 0 || likedComments.has(comment.id)) ? formatCount(Math.max(comment.like_count, likedComments.has(comment.id) ? 1 : 0)) : t("like")}</span>
              </button>
              {onReply && (
                <button
                  onClick={() => onReply(comment.id, profileUsername)}
                  className="text-[0.78rem] text-text-muted hover:text-text-primary transition hover:underline font-medium"
                >
                  {t("reply")}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
})
