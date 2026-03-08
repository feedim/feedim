"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { Rocket, Pause, Play, Trash2, Loader2, BookOpen, Film, Clapperboard, ChevronRight } from "lucide-react";
import Modal from "./Modal";
import { formatCount, formatRelativeDate } from "@/lib/utils";
import { feedimAlert } from "@/components/FeedimAlert";

interface MyBoostsModalProps {
  open: boolean;
  onClose: () => void;
}

interface BoostItem {
  id: number;
  post_id: number;
  status: string;
  goal: string;
  daily_budget: number;
  duration_days: number;
  total_budget: number;
  spent_budget: number;
  impressions: number;
  clicks: number;
  starts_at: string | null;
  started_at: string | null;
  ends_at: string | null;
  paused_at: string | null;
  boost_code: string;
  created_at: string;
  post?: {
    id: number;
    title: string;
    slug: string;
    content_type: string;
  };
}

const STATUS_COLORS: Record<string, string> = {
  active: "bg-[var(--accent-color)]/15 text-[var(--accent-color)]",
  paused: "bg-text-muted/15 text-text-muted",
  pending_review: "bg-accent-main/15 text-accent-main",
  completed: "bg-text-muted/15 text-text-muted",
  rejected: "bg-error/15 text-error",
  refund_requested: "bg-warning/15 text-warning",
  refunded: "bg-text-muted/15 text-text-muted",
  payment_failed: "bg-error/15 text-error",
  awaiting_payment: "bg-info/15 text-info",
};

function ContentIcon({ type }: { type?: string }) {
  switch (type) {
    case "note": return <BookOpen className="h-4 w-4 text-text-muted" />;
    case "video": return <Film className="h-4 w-4 text-text-muted" />;
    case "moment": return <Clapperboard className="h-4 w-4 text-text-muted" />;
    default: return <BookOpen className="h-4 w-4 text-text-muted" />;
  }
}

function getPostUrl(post?: BoostItem["post"]): string | null {
  if (!post?.slug) return null;
  switch (post.content_type) {
    case "note": return `/note/${post.slug}`;
    case "video": return `/video/${post.slug}`;
    case "moment": return `/moments?s=${post.slug}`;
    default: return `/${post.slug}`;
  }
}

export default function MyBoostsModal({ open, onClose }: MyBoostsModalProps) {
  const t = useTranslations("boost");
  const tModals = useTranslations("modals");
  const locale = useLocale();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [boosts, setBoosts] = useState<BoostItem[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const loadBoosts = useCallback(async (pageNum: number, append = false) => {
    if (pageNum === 1) setLoading(true);
    else setLoadingMore(true);
    try {
      const res = await fetch(`/api/boosts?page=${pageNum}&limit=10`);
      const data = await res.json();
      const newBoosts = data.boosts || [];
      setBoosts(prev => append ? [...prev, ...newBoosts] : newBoosts);
      setHasMore(data.hasMore || false);
      setPage(pageNum);
    } catch {} finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  const loadedRef = useRef(false);
  useEffect(() => {
    if (open && !loadedRef.current) {
      loadedRef.current = true;
      loadBoosts(1);
    }
  }, [open, loadBoosts]);

  const handleLoadMore = () => {
    if (loadingMore || !hasMore) return;
    loadBoosts(page + 1, true);
  };

  const handleNavigate = (boost: BoostItem) => {
    const url = getPostUrl(boost.post);
    if (url) {
      onClose();
      router.push(url);
    }
  };

  const handleAction = async (e: React.MouseEvent, action: string, boost: BoostItem) => {
    e.stopPropagation();
    if (actionLoading) return;

    if (action === "delete_boost") {
      feedimAlert("question", t("deleteConfirm"), {
        showYesNo: true,
        onYes: async () => {
          setActionLoading(boost.id);
          try {
            const res = await fetch(`/api/posts/${boost.post_id}/boost`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action, boost_id: boost.id }),
            });
            const data = await res.json();
            if (data.success) {
              feedimAlert("success", data.message);
              loadBoosts(1);
            } else {
              feedimAlert("error", data.error || tModals("errorOccurred"));
            }
          } catch {
            feedimAlert("error", tModals("errorOccurred"));
          } finally {
            setActionLoading(null);
          }
        },
      });
      return;
    }

    setActionLoading(boost.id);
    try {
      const res = await fetch(`/api/posts/${boost.post_id}/boost`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, boost_id: boost.id }),
      });
      const data = await res.json();
      if (data.success) {
        feedimAlert("success", data.message);
        loadBoosts(1);
      } else {
        feedimAlert("error", data.error || tModals("errorOccurred"));
      }
    } catch {
      feedimAlert("error", tModals("errorOccurred"));
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusLabel = (status: string) => {
    const map: Record<string, string> = {
      active: t("active"),
      paused: t("paused"),
      pending_review: t("pendingReview"),
      completed: t("completed"),
      rejected: t("rejected"),
      refund_requested: t("refundRequested"),
      refunded: t("refunded"),
      payment_failed: t("paymentFailed"),
      awaiting_payment: t("awaitingPayment"),
    };
    return map[status] || status;
  };

  return (
    <Modal open={open} onClose={onClose} size="md" centerOnDesktop title={t("myAds")}>
      <div className="px-3 pb-5">
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 text-accent-main animate-spin" />
          </div>
        ) : boosts.length === 0 ? (
          <div className="text-center py-10">
            <Rocket className="h-10 w-10 text-text-muted mx-auto mb-3 opacity-40" />
            <p className="text-sm text-text-muted">{t("noAdsYet")}</p>
          </div>
        ) : (
          <>
            <div>
              {boosts.map(boost => {
                const url = getPostUrl(boost.post);
                return (
                  <div
                    key={boost.id}
                    onClick={() => handleNavigate(boost)}
                    className={`group w-full flex items-center gap-3 px-3 py-3 rounded-[13px] hover:bg-bg-tertiary transition text-left mb-1 ${url ? "cursor-pointer" : ""}`}
                  >
                    {/* Left: content type icon */}
                    <div className="shrink-0 w-9 h-9 rounded-full bg-bg-secondary flex items-center justify-center">
                      <ContentIcon type={boost.post?.content_type} />
                    </div>

                    {/* Middle: title + subtitle */}
                    <div className="flex-1 min-w-0">
                      <p className="text-[0.82rem] font-semibold truncate">
                        {boost.post?.title || `Post #${boost.post_id}`}
                      </p>
                      <div className="flex items-center gap-1.5 text-[0.7rem] text-text-muted mt-0.5">
                        <span>{formatRelativeDate(boost.created_at, locale)}</span>
                        <span>·</span>
                        <span>₺{boost.total_budget.toLocaleString(locale)}</span>
                        <span>·</span>
                        <span>{formatCount(boost.impressions || 0)} {t("boostImpressions")}</span>
                      </div>
                    </div>

                    {/* Right: status badge + action buttons */}
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-[0.63rem] font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[boost.status] || "bg-bg-tertiary text-text-muted"}`}>
                        {getStatusLabel(boost.status)}
                      </span>

                      {/* Action button */}
                      {boost.status === "active" && (
                        <button
                          onClick={(e) => handleAction(e, "pause", boost)}
                          disabled={actionLoading === boost.id}
                          className="i-btn !w-7 !h-7 text-warning hover:bg-warning/10 disabled:opacity-50"
                          title={t("pauseBoost")}
                        >
                          {actionLoading === boost.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Pause className="h-3.5 w-3.5" />}
                        </button>
                      )}
                      {boost.status === "paused" && (
                        <button
                          onClick={(e) => handleAction(e, "resume", boost)}
                          disabled={actionLoading === boost.id}
                          className="i-btn !w-7 !h-7 text-success hover:bg-success/10 disabled:opacity-50"
                          title={t("resumeBoost")}
                        >
                          {actionLoading === boost.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                        </button>
                      )}
                      {boost.status === "pending_review" && !boost.starts_at && (
                        <button
                          onClick={(e) => handleAction(e, "delete_boost", boost)}
                          disabled={actionLoading === boost.id}
                          className="i-btn !w-7 !h-7 text-error hover:bg-error/10 disabled:opacity-50"
                          title={t("deleteBoost")}
                        >
                          {actionLoading === boost.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                        </button>
                      )}

                      {url && <ChevronRight className="h-4 w-4 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Load more */}
            {hasMore && (
              <button
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="w-full py-2.5 mt-2 text-[0.8rem] font-semibold text-accent-main hover:bg-bg-tertiary rounded-xl transition disabled:opacity-50"
              >
                {loadingMore ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : t("loadMore")}
              </button>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}
