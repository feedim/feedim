"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Pause, Play, Trash2, Loader2 } from "lucide-react";
import Modal from "./Modal";
import { formatCount } from "@/lib/utils";
import { feedimAlert } from "@/components/FeedimAlert";

interface BoostDetailsModalProps {
  open: boolean;
  onClose: () => void;
  postId: number;
}

interface BoostData {
  id: number;
  status: string;
  goal: string;
  impressions: number;
  clicks: number;
  daily_budget: number;
  duration_days: number;
  total_budget: number;
  spent_budget: number;
  starts_at: string | null;
  started_at: string | null;
  ends_at: string | null;
  paused_at: string | null;
  target_countries: string[];
  target_gender: string;
  age_min: number | null;
  age_max: number | null;
  boost_code: string;
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
};

export default function BoostDetailsModal({ open, onClose, postId }: BoostDetailsModalProps) {
  const t = useTranslations("boost");
  const tModals = useTranslations("modals");
  const locale = useLocale();
  const [loading, setLoading] = useState(true);
  const [boost, setBoost] = useState<BoostData | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const loadBoost = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/posts/${postId}/boost`);
      const data = await res.json();
      if (data.boost) {
        setBoost(data.boost);
      }
    } catch {} finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    if (open) loadBoost();
  }, [open, loadBoost]);

  const executeAction = async (action: string) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/posts/${postId}/boost`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, boost_id: boost?.id }),
      });
      const data = await res.json();
      if (data.success) {
        await loadBoost();
      } else {
        feedimAlert("error", data.error || tModals("errorOccurred"));
      }
    } catch {
      feedimAlert("error", tModals("errorOccurred"));
    } finally {
      setActionLoading(false);
    }
  };

  const handleAction = (action: string) => {
    if (!boost || actionLoading) return;

    if (action === "delete_boost") {
      feedimAlert("question", t("deleteConfirm"), {
        showYesNo: true,
        onYes: () => executeAction(action),
      });
      return;
    }

    executeAction(action);
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
    <Modal open={open} onClose={onClose} size="md" centerOnDesktop title={t("boostStatsTitle")} rightAction={
      boost ? (
        <span className={`text-[0.72rem] font-semibold px-2.5 py-1 rounded-full ${STATUS_COLORS[boost.status] || "bg-bg-tertiary text-text-muted"}`}>
          {getStatusLabel(boost.status)}
        </span>
      ) : undefined
    }>
      <div className="px-4 pb-6">
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 text-accent-main animate-spin" />
          </div>
        ) : !boost ? (
          <p className="text-center text-text-muted py-8 text-sm">{t("noPendingBoosts")}</p>
        ) : (
          <div className="space-y-4">

            {/* Boost Code */}
            {boost.boost_code && (
              <div className="flex items-center justify-between bg-bg-secondary rounded-[8px] border border-border-primary/30 px-4 py-2.5 mt-[5px]">
                <span className="text-[0.75rem] text-text-muted">{t("boostCode")}</span>
                <span className="text-[0.82rem] font-bold font-mono">{boost.boost_code}</span>
              </div>
            )}

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-bg-secondary rounded-xl p-3">
                <p className="text-[0.65rem] text-text-muted uppercase tracking-wider">{t("impressions")}</p>
                <p className="text-xl font-bold mt-1">{formatCount(boost.impressions || 0)}</p>
              </div>
              <div className="bg-bg-secondary rounded-xl p-3">
                <p className="text-[0.65rem] text-text-muted uppercase tracking-wider">{t("clicks")}</p>
                <p className="text-xl font-bold mt-1">{formatCount(boost.clicks || 0)}</p>
              </div>
            </div>

            {/* Budget Info */}
            <div className="bg-bg-secondary rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between text-[0.82rem]">
                <span className="text-text-muted">{t("dailyBudget")}</span>
                <span className="font-semibold">₺{boost.daily_budget.toLocaleString(locale)}{t("perDay")}</span>
              </div>
              <div className="flex items-center justify-between text-[0.82rem]">
                <span className="text-text-muted">{t("duration")}</span>
                <span className="font-semibold">{t("days", { count: boost.duration_days })}</span>
              </div>
              <div className="h-px bg-border-primary/40" />
              <div className="flex items-center justify-between text-[0.88rem]">
                <span className="font-bold">{t("totalCost")}</span>
                <span className="font-bold">₺{boost.total_budget.toLocaleString(locale)}</span>
              </div>
              {boost.spent_budget > 0 && (
                <div className="flex items-center justify-between text-[0.82rem]">
                  <span className="text-text-muted">{t("spentBudget")}</span>
                  <span className="font-semibold">₺{boost.spent_budget.toLocaleString(locale)}</span>
                </div>
              )}
            </div>

            {/* Targeting Summary */}
            <div className="bg-bg-secondary rounded-xl p-4">
              <p className="text-[0.72rem] font-bold text-text-muted uppercase tracking-wider mb-2">{t("targeting")}</p>
              <div className="flex flex-wrap gap-1.5">
                {boost.target_countries && boost.target_countries.length > 0 ? (
                  boost.target_countries.map(c => (
                    <span key={c} className="text-[0.75rem] bg-bg-tertiary px-2 py-0.5 rounded-full text-text-secondary font-medium">{c}</span>
                  ))
                ) : (
                  <span className="text-[0.75rem] text-text-muted">{t("allCountries")}</span>
                )}
                {boost.target_gender && boost.target_gender !== "all" && (
                  <span className="text-[0.75rem] bg-bg-tertiary px-2 py-0.5 rounded-full text-text-secondary font-medium">
                    {boost.target_gender === "male" ? t("male") : t("female")}
                  </span>
                )}
                {boost.age_min && boost.age_max && (
                  <span className="text-[0.75rem] bg-bg-tertiary px-2 py-0.5 rounded-full text-text-secondary font-medium">
                    {boost.age_min}-{boost.age_max}
                  </span>
                )}
              </div>
            </div>

            {/* Time Info */}
            {(boost.starts_at || boost.ends_at) && (
              <div className="text-[0.75rem] text-text-muted flex items-center justify-between">
                {boost.starts_at && (
                  <span>{new Date(boost.starts_at).toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" })}</span>
                )}
                {boost.starts_at && boost.ends_at && <span>—</span>}
                {boost.ends_at && (
                  <span>{new Date(boost.ends_at).toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" })}</span>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-2 pt-1">
              {boost.status === "active" && (
                <button
                  onClick={() => handleAction("pause")}
                  disabled={actionLoading}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-bg-tertiary text-text-primary font-semibold text-[0.88rem] hover:bg-bg-tertiary/80 transition disabled:opacity-50"
                >
                  <Pause className="h-4 w-4" />
                  {t("pauseBoost")}
                </button>
              )}
              {boost.status === "paused" && (
                <button
                  onClick={() => handleAction("resume")}
                  disabled={actionLoading}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[var(--accent-color)]/10 text-[var(--accent-color)] font-semibold text-[0.88rem] hover:bg-[var(--accent-color)]/15 transition disabled:opacity-50"
                >
                  <Play className="h-4 w-4" />
                  {t("resumeBoost")}
                </button>
              )}
              {boost.status === "pending_review" && !boost.starts_at && (
                <button
                  onClick={() => handleAction("delete_boost")}
                  disabled={actionLoading}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-error/10 text-error font-semibold text-[0.88rem] hover:bg-error/15 transition disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" />
                  {t("deleteBoost")}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
