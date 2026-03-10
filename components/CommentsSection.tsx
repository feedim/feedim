"use client";

import { useState, useEffect, useCallback, useRef, memo, useMemo } from "react";
import Link from "next/link";
import { Send, Heart, MessageCircle, AlertTriangle, Smile } from "lucide-react";
import EmojiPickerPanel from "@/components/modals/EmojiPickerPanel";
import { useLocale, useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { useAuthModal } from "@/components/AuthModal";
import { useUser } from "@/components/UserContext";
import { isBlockedContent } from "@/lib/blockedWords";
import { formatRelativeDate, cn, formatCount } from "@/lib/utils";
import { VALIDATION } from "@/lib/constants";
import { feedimAlert } from "@/components/FeedimAlert";
import LoadMoreTrigger from "@/components/LoadMoreTrigger";
import { useMention } from "@/lib/useMention";
import MentionDropdown from "@/components/MentionDropdown";
import { renderMentionsAsHTML } from "@/lib/mentionRenderer";
import LazyAvatar from "@/components/LazyAvatar";


interface Comment {
  id: number;
  content: string;
  author_id: string | null;
  parent_id: number | null;
  like_count: number;
  reply_count: number;
  created_at: string;
  is_nsfw?: boolean;
  profiles?: {
    username: string;
    full_name?: string;
    name?: string;
    avatar_url?: string;
  } | null;
  replies?: Comment[];
}

interface CommentsSectionProps {
  postId: number;
  commentCount: number;
}

export default function CommentsSection({ postId, commentCount: initialCount }: CommentsSectionProps) {
  const t = useTranslations("comments");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [totalCount, setTotalCount] = useState(initialCount);
  const [emptyStateVerified, setEmptyStateVerified] = useState(initialCount === 0);
  const [newComment, setNewComment] = useState("");
  const [replyTo, setReplyTo] = useState<{ id: number; name: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [likedComments, setLikedComments] = useState<Set<number>>(new Set());
  const { requireAuth } = useAuthModal();
  const { user: ctxUser } = useUser();
  const supabase = useMemo(() => createClient(), []);
  const commentRef = useRef<HTMLTextAreaElement>(null);
  const mismatchRetryDoneRef = useRef(false);
  const mention = useMention({ maxMentions: 3 });
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // Plan bazli yorum karakter limiti: max/business 500, digerleri 250
  const maxCommentLength = (ctxUser?.role === "admin" || ctxUser?.premiumPlan === "max" || ctxUser?.premiumPlan === "business")
    ? VALIDATION.comment.maxPremium
    : VALIDATION.comment.max;

  const loadComments = useCallback(async (pageNum: number) => {
    setLoading(true);
    try {
      const url = `/api/posts/${postId}/comments?page=${pageNum}`;
      let res = await fetch(url);
      let data = await res.json();
      if (res.ok) {
        const knownCount = initialCount;
        if (
          pageNum === 1 &&
          (data.comments?.length || 0) === 0 &&
          knownCount > 0 &&
          !mismatchRetryDoneRef.current
        ) {
          mismatchRetryDoneRef.current = true;
          const retryRes = await fetch(url, { cache: "no-store" });
          let retryData: Record<string, unknown> = {};
          try {
            retryData = await retryRes.json();
          } catch {
            retryData = {};
          }
          if (retryRes.ok) {
            res = retryRes;
            data = retryData;
          }
        }

        if (pageNum === 1) {
          setComments(data.comments || []);
          setEmptyStateVerified((data.comments?.length || 0) > 0 || initialCount === 0 || mismatchRetryDoneRef.current);
          setLikedComments(new Set(data.userLikedIds || []));
        } else {
          setComments(prev => {
            const existingIds = new Set(prev.map(c => c.id));
            return [...prev, ...(data.comments || []).filter((c: Comment) => !existingIds.has(c.id))];
          });
          if (data.userLikedIds?.length) {
            setLikedComments(prev => {
              const next = new Set(prev);
              data.userLikedIds.forEach((id: number) => next.add(id));
              return next;
            });
          }
        }
        setHasMore(data.hasMore);
      }
    } catch {
      // Silent
    } finally {
      setLoading(false);
    }
  }, [postId, initialCount]);

  useEffect(() => {
    mismatchRetryDoneRef.current = false;
    setComments([]);
    setHasMore(false);
    setPage(1);
    setTotalCount(initialCount);
    setEmptyStateVerified(initialCount === 0);
    setLikedComments(new Set());
    loadComments(1);
  }, [postId, initialCount, loadComments]);

  const handleEmojiSelect = (emoji: string) => {
    const textarea = commentRef.current;
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || submitting) return;
    setSubmitting(true);

    if (!ctxUser) { const user = await requireAuth(); if (!user) { setSubmitting(false); return; } }

    const content = newComment.trim();
    const parentId = replyTo?.id || null;
    const tempId = -Date.now();

    // Optimistic comment — use full user data so name/avatar shows instantly
    const optimisticComment: Comment = {
      id: tempId,
      content,
      author_id: ctxUser?.id || null,
      parent_id: parentId,
      like_count: 0,
      reply_count: 0,
      created_at: new Date().toISOString(),
      profiles: ctxUser ? {
        username: ctxUser.username || "",
        full_name: ctxUser.fullName || undefined,
        avatar_url: ctxUser.avatarUrl || undefined,
      } : null,
    };

    if (parentId && replyTo) {
      setComments(prev => prev.map(c => {
        if (c.id === replyTo.id) {
          return { ...c, replies: [...(c.replies || []), optimisticComment], reply_count: c.reply_count + 1 };
        }
        return c;
      }));
    } else {
      setComments(prev => [optimisticComment, ...prev]);
    }

    setTotalCount(c => c + 1);
    setNewComment("");
    setReplyTo(null);

    // Background API call
    try {
      const reqInit = { method: "POST" as const, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content, parent_id: parentId }) };
      let res = await fetch(`/api/posts/${postId}/comments`, reqInit);

      // Retry once on 401 — session may need refresh after login redirect
      if (res.status === 401) {
        await supabase.auth.refreshSession();
        res = await fetch(`/api/posts/${postId}/comments`, reqInit);
      }

      let data: Record<string, any>;
      try { data = await res.json(); } catch { data = {}; }

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
        feedimAlert("error", data.error || t("commentFailed"));
        return;
      }

      // Replace temp ID with real — keep optimistic profile to avoid avatar flash
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
      feedimAlert("error", t("commentFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleLikeComment = useCallback(async (commentId: number) => {
    if (!ctxUser) { const user = await requireAuth(); if (!user) return; }

    const isLiked = likedComments.has(commentId);

    // Optimistic
    setLikedComments(prev => {
      const next = new Set(prev);
      if (isLiked) next.delete(commentId);
      else next.add(commentId);
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

    try {
      const res = await fetch(likeUrl, { method: likeMethod, keepalive: true });
      if (!res.ok) {
        updateCount(isLiked ? 1 : -1);
        setLikedComments(prev => {
          const next = new Set(prev);
          if (isLiked) next.add(commentId); else next.delete(commentId);
          return next;
        });
        if (res.status === 403 || res.status === 429) {
          const data = await res.json().catch(() => ({}));
          feedimAlert("error", data.error);
        }
      }
    } catch {
      updateCount(isLiked ? 1 : -1);
      setLikedComments(prev => {
        const next = new Set(prev);
        if (isLiked) next.add(commentId); else next.delete(commentId);
        return next;
      });
    }
  }, [likedComments, postId, ctxUser, requireAuth]);

  const getAuthorName = (comment: Comment) => {
    const p = comment.profiles;
    if (!p) return tCommon("anonymous");
    return p.username;
  };

  return (
    <section id="comments-section" className="mt-8">
      <h3 className="text-lg font-bold mb-6">{t("commentsCount", { count: formatCount(totalCount, locale) })}</h3>

      {/* Comment form */}
      <form onSubmit={handleSubmit} className="mb-6">
        {replyTo && (
          <div className="flex items-center gap-2 text-xs text-text-muted mb-2">
            <span className="font-semibold text-text-primary">@{replyTo.name}</span>
            <button type="button" onClick={() => { setReplyTo(null); setNewComment(""); }} className="text-accent-main hover:underline">{tCommon("cancel")}</button>
          </div>
        )}
        <div className="flex gap-2">
          <div className="flex-1" style={{ position: "relative" }}>
            <textarea
              data-hotkey="comment-input"
              ref={commentRef}
              value={newComment}
              onChange={(e) => {
                setNewComment(e.target.value);
                mention.handleTextChange(e.target.value, commentRef.current);
                const el = e.currentTarget;
                el.style.height = "auto";
                el.style.height = `${el.scrollHeight}px`;
              }}
              onInput={(e) => {
                const el = e.currentTarget;
                el.style.height = "auto";
                el.style.height = `${el.scrollHeight}px`;
              }}
              onKeyDown={(e) => {
                if (mention.mentionUsers.length > 0) {
                  if ((e.key === "Enter" || e.key === "Tab") && mention.mentionUsers[mention.mentionIndex]) {
                    e.preventDefault();
                    mention.selectUser(mention.mentionUsers[mention.mentionIndex].username, newComment, (v) => {
                      setNewComment(v);
                      commentRef.current?.focus();
                    });
                    return;
                  }
                  if (mention.handleKeyDown(e)) return;
                }
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  (e.currentTarget as HTMLTextAreaElement).form?.requestSubmit();
                }
              }}
              maxLength={maxCommentLength}
              placeholder={t("writeComment")}
              rows={1}
              className="input-modern comment-textarea w-full pr-14 resize-none overflow-hidden"
            />
            <MentionDropdown
              users={mention.mentionUsers}
              activeIndex={mention.mentionIndex}
              onHover={mention.setMentionIndex}
              onSelect={(username) => {
                mention.selectUser(username, newComment, (v) => {
                  setNewComment(v);
                  commentRef.current?.focus();
                });
              }}
              style={{ bottom: "100%", top: "auto", marginBottom: 8 }}
            />
            {newComment.length >= 100 && (
              <span className="text-[0.66rem] text-text-muted/60 pointer-events-none" style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)" }}>
                {newComment.length}/{maxCommentLength}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className={`flex items-center justify-center h-9 w-9 rounded-full transition shrink-0 ${showEmojiPicker ? "text-accent-main" : "text-text-muted hover:text-text-primary"}`}
          >
            <Smile className="h-[18px] w-[18px]" />
          </button>
          <button
            type="submit"
            disabled={!newComment.trim() || submitting}
            className="btn-primary px-4 disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
        {showEmojiPicker && (
          <EmojiPickerPanel
            onEmojiSelect={handleEmojiSelect}
            onClose={() => setShowEmojiPicker(false)}
          />
        )}
      </form>

      {/* Comments list */}
      {(loading || (comments.length === 0 && Math.max(initialCount, totalCount) > 0 && !emptyStateVerified)) ? (
        <div className="flex justify-center py-8"><span className="loader" style={{ width: 22, height: 22 }} /></div>
      ) : (
        <div className="space-y-5">
          {comments
            .filter(c => !isBlockedContent(c.content || "", c.author_id, ctxUser?.id))
            .map(comment => (
            <CommentItem
              key={comment.id}
              comment={{
                ...comment,
                replies: comment.replies?.filter(r => !isBlockedContent(r.content || "", r.author_id, ctxUser?.id)),
              }}
              likedComments={likedComments}
              onLike={handleLikeComment}
              onReply={(id, name) => { setReplyTo({ id, name }); setNewComment(`@${name} `); setTimeout(() => commentRef.current?.focus(), 100); }}
              getAuthorName={getAuthorName}
            />
          ))}
        </div>
      )}

      {/* Load more */}
      <LoadMoreTrigger onLoadMore={async () => { const u = await requireAuth(); if (!u) return; setPage(p => { loadComments(p + 1); return p + 1; }); }} loading={loading} hasMore={hasMore} />
    </section>
  );
}

/* ── Extracted + memoized CommentItem ── */
interface CommentItemProps {
  comment: Comment;
  isReply?: boolean;
  likedComments: Set<number>;
  onLike: (id: number) => void;
  onReply?: (id: number, name: string) => void;
  getAuthorName: (comment: Comment) => string;
}

const CommentItem = memo(function CommentItem({ comment, isReply = false, likedComments, onLike, onReply, getAuthorName }: CommentItemProps) {
  const t = useTranslations("comments");
  const locale = useLocale();
  return (
    <div className={cn("flex gap-3", isReply && "ml-10 mt-3")}>
      <Link href={`/u/${comment.profiles?.username || ''}`} className="shrink-0 mt-0.5">
        <LazyAvatar src={comment.profiles?.avatar_url} sizeClass="h-8 w-8" />
      </Link>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="text-[0.82rem] font-semibold">{getAuthorName(comment)}</span>
          <span className="text-text-muted/40 text-[0.66rem]">·</span>
          <span className="text-[0.66rem] text-text-muted">{formatRelativeDate(comment.created_at, locale)}</span>
        </div>
        <p className="text-sm text-text-secondary mt-0.5 break-words" dangerouslySetInnerHTML={{ __html: renderMentionsAsHTML(comment.content) }} />
        {comment.is_nsfw && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[0.7rem] font-semibold bg-accent-main/10 text-accent-main mt-0.5">
            <AlertTriangle className="h-3 w-3" /> {t("commentUnderReview")}
          </span>
        )}
        <div className="flex items-center gap-3 mt-1.5">
          <button
            onClick={() => onLike(comment.id)}
            className={cn(
              "flex items-center gap-1 text-xs transition",
              likedComments.has(comment.id) ? "text-error" : "text-text-muted hover:text-error"
            )}
          >
            <Heart className={cn("h-3.5 w-3.5", likedComments.has(comment.id) && "fill-current")} />
            {comment.like_count > 0 && formatCount(comment.like_count)}
          </button>
          {onReply && (
            <button
              onClick={() => onReply(comment.id, getAuthorName(comment))}
              className="flex items-center gap-1 text-xs text-text-muted hover:text-text-primary transition hover:underline"
            >
              <MessageCircle className="h-3.5 w-3.5" /> {t("reply")}
            </button>
          )}
        </div>

        {/* Replies */}
        {!isReply && comment.replies && comment.replies.length > 0 && (
          <div className="mt-2">
            {comment.replies.map(reply => (
              <CommentItem key={reply.id} comment={reply} isReply likedComments={likedComments} onLike={onLike} onReply={onReply ? (_, replyUsername) => {
                        // Reply-to-reply: keep parent_id as the root comment, mention the reply author
                        onReply(comment.id, replyUsername);
                      } : undefined} getAuthorName={getAuthorName} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
})
