"use client";

import { useState, useEffect, useCallback, memo } from "react";
import { Send, Heart, MessageCircle, AlertTriangle } from "lucide-react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { useAuthModal } from "@/components/AuthModal";
import { useUser } from "@/components/UserContext";
import { isBlockedContent } from "@/lib/blockedWords";
import { formatRelativeDate, cn, formatCount } from "@/lib/utils";
import { VALIDATION } from "@/lib/constants";
import { feedimAlert } from "@/components/FeedimAlert";
import LoadMoreTrigger from "@/components/LoadMoreTrigger";


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
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [totalCount, setTotalCount] = useState(initialCount);
  const [newComment, setNewComment] = useState("");
  const [replyTo, setReplyTo] = useState<{ id: number; name: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [likedComments, setLikedComments] = useState<Set<number>>(new Set());
  const { requireAuth } = useAuthModal();
  const { user: ctxUser } = useUser();
  const supabase = createClient();

  // Plan bazli yorum karakter limiti: max/business 500, digerleri 250
  const maxCommentLength = (ctxUser?.premiumPlan === "max" || ctxUser?.premiumPlan === "business") ? VALIDATION.comment.maxPremium : VALIDATION.comment.max;

  const loadComments = useCallback(async (pageNum: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/posts/${postId}/comments?page=${pageNum}`);
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
    }
  }, [postId]);

  useEffect(() => {
    let cancelled = false;
    loadComments(1);
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (cancelled || !user) return;
      const { data } = await supabase
        .from("comment_likes")
        .select("comment_id")
        .eq("user_id", user.id);
      if (!cancelled && data) {
        setLikedComments(new Set(data.map(l => l.comment_id)));
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const loadLikedComments = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("comment_likes")
      .select("comment_id")
      .eq("user_id", user.id);
    if (data) {
      setLikedComments(new Set(data.map(l => l.comment_id)));
    }
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
      const res = await fetch(`/api/posts/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, parent_id: parentId }),
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

    const userId = ctxUser?.id;
    if (!userId) return;

    try {
      if (isLiked) {
        await supabase.from("comment_likes").delete().eq("user_id", userId).eq("comment_id", commentId);
      } else {
        await supabase.from("comment_likes").insert({ user_id: userId, comment_id: commentId });
      }
    } catch {
      updateCount(isLiked ? 1 : -1);
      setLikedComments(prev => {
        const next = new Set(prev);
        if (isLiked) next.add(commentId); else next.delete(commentId);
        return next;
      });
    }
  }, [likedComments, ctxUser, requireAuth, supabase]);

  const getAuthorName = (comment: Comment) => {
    const p = comment.profiles;
    if (!p) return tCommon("anonymous");
    return p.username;
  };

  return (
    <section id="comments-section" className="mt-8">
      <h3 className="text-lg font-bold mb-6">{t("commentsCount", { count: totalCount })}</h3>

      {/* Comment form */}
      <form onSubmit={handleSubmit} className="mb-6">
        {replyTo && (
          <div className="flex items-center gap-2 text-xs text-text-muted mb-2">
            <span>{t("replyingTo", { username: replyTo.name })}</span>
            <button type="button" onClick={() => setReplyTo(null)} className="text-accent-main hover:underline">{tCommon("cancel")}</button>
          </div>
        )}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <textarea
              data-hotkey="comment-input"
              value={newComment}
              onChange={(e) => {
                setNewComment(e.target.value);
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
            {newComment.length >= 100 && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[0.66rem] tabular-nums text-text-muted/60 pointer-events-none">
                {newComment.length}/{maxCommentLength}
              </span>
            )}
          </div>
          <button
            type="submit"
            disabled={!newComment.trim() || submitting}
            className="btn-primary px-4 disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </form>

      {/* Comments list */}
      {loading && comments.length === 0 ? (
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
              onReply={(id, name) => setReplyTo({ id, name })}
              getAuthorName={getAuthorName}
            />
          ))}
        </div>
      )}

      {/* Load more */}
      <LoadMoreTrigger onLoadMore={async () => { const u = await requireAuth(); if (!u) return; setPage(p => p + 1); loadComments(page + 1); }} loading={loading} hasMore={hasMore} />
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
  return (
    <div className={cn("flex gap-3", isReply && "ml-10 mt-3")}>
      {comment.profiles?.avatar_url ? (
        <img src={comment.profiles.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover shrink-0 mt-0.5" />
      ) : (
        <img className="default-avatar-auto h-8 w-8 rounded-full object-cover shrink-0 mt-0.5" alt="" />
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-semibold">{getAuthorName(comment)}</span>
          <span className="text-[0.7rem] text-text-muted">{formatRelativeDate(comment.created_at)}</span>
        </div>
        <p className="text-sm text-text-secondary mt-0.5 break-words">{comment.content}</p>
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
          {!isReply && onReply && (
            <button
              onClick={() => onReply(comment.id, getAuthorName(comment))}
              className="flex items-center gap-1 text-xs text-text-muted hover:text-text-primary transition"
            >
              <MessageCircle className="h-3.5 w-3.5" /> {t("reply")}
            </button>
          )}
        </div>

        {/* Replies */}
        {!isReply && comment.replies && comment.replies.length > 0 && (
          <div className="mt-2">
            {comment.replies.map(reply => (
              <CommentItem key={reply.id} comment={reply} isReply likedComments={likedComments} onLike={onLike} getAuthorName={getAuthorName} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
})
