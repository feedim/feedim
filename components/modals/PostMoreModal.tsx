"use client";

import { useState, lazy, Suspense } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Check, PenLine, Trash2, BarChart3, AlertTriangle, Eye, Rocket } from "lucide-react";
import { feedimAlert } from "@/components/FeedimAlert";
import { useAuthModal } from "@/components/AuthModal";
import { emitNavigationStart } from "@/lib/navigationProgress";
import { smartBack } from "@/lib/smartBack";
import { invalidateCache } from "@/lib/fetchWithCache";
import { useUser } from "@/components/UserContext";
import { copyTextToClipboard } from "@/lib/copyTextToClipboard";
import Modal from "./Modal";
import ReportModal from "./ReportModal";
import PostStatsModal from "./PostStatsModal";

const BoostModal = lazy(() => import("./BoostModal"));
const BoostDetailsModal = lazy(() => import("./BoostDetailsModal"));

interface PostMoreModalProps {
  open: boolean;
  onClose: () => void;
  postId: number;
  postUrl: string;
  authorUsername?: string;
  authorUserId?: string;
  authorName?: string;
  onShare?: () => void;
  isOwnPost?: boolean;
  postSlug?: string;
  contentType?: "post" | "note" | "video" | "moment";
  onDeleteSuccess?: () => void;
  authorRole?: string;
  visibility?: string;
  isSponsored?: boolean;
  isBoosted?: boolean;
}

export default function PostMoreModal({ open, onClose, postId, postUrl, authorUsername, authorUserId, authorName, onShare, isOwnPost, postSlug, contentType, onDeleteSuccess, authorRole, visibility, isSponsored, isBoosted }: PostMoreModalProps) {
  const t = useTranslations("modals");
  const tc = useTranslations("common");
  const [copied, setCopied] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);
  const [boostOpen, setBoostOpen] = useState(false);
  const [boostDetailsOpen, setBoostDetailsOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const router = useRouter();
  const { requireAuth } = useAuthModal();
  const { user: currentUser } = useUser();

  const isOwn = isOwnPost ?? (!!currentUser && !!authorUserId && currentUser.id === authorUserId);
  const isAdmin = currentUser?.role === "admin";
  const isMod = currentUser?.role === "moderator" || isAdmin;
  const authorIsStaff = authorRole === "admin" || authorRole === "moderator";

  const handleCopyUrl = async () => {
    const fullUrl = `${window.location.origin}${postUrl}`;
    const copiedOk = await copyTextToClipboard(fullUrl);
    if (!copiedOk) {
      feedimAlert("error", tc("genericError"));
      return;
    }
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
      onClose();
    }, 1200);
  };

  const handleShare = () => {
    onClose();
    onShare?.();
  };

  const handleVisitAuthor = () => {
    if (authorUsername) {
      window.location.href = `/u/${authorUsername}`;
    }
    onClose();
  };

  const handleReport = async () => {
    const user = await requireAuth();
    if (!user) return;
    onClose();
    setTimeout(() => setReportOpen(true), 250);
  };

  const handleEdit = () => {
    onClose();
    const editPath = contentType === "moment"
      ? `/create/moment?edit=${postSlug}`
      : contentType === "video"
        ? `/create/video?edit=${postSlug}`
        : contentType === "note"
          ? `/create/note?edit=${postSlug}`
          : `/create?edit=${postSlug}`;
    emitNavigationStart();
    router.push(editPath);
  };

  const handleDelete = async () => {
    feedimAlert("question", t("deletePostConfirm"), {
      showYesNo: true,
      onYes: async () => {
        try {
          const res = await fetch(`/api/posts/${postId}`, { method: "DELETE" });
          if (!res.ok && res.status !== 404 && res.status !== 403) {
            const data = await res.json().catch(() => ({}));
            feedimAlert("error", data.error || t("deleteFailed"));
            return;
          }
          onClose();
          if (res.ok) feedimAlert("success", t("postDeleted"));
          // Mark as deleted in sessionStorage + notify other components
          try {
            const deleted = JSON.parse(sessionStorage.getItem("fdm-deleted-posts") || "[]");
            if (!deleted.includes(postId)) { deleted.push(postId); sessionStorage.setItem("fdm-deleted-posts", JSON.stringify(deleted)); }
            window.dispatchEvent(new CustomEvent("fdm-post-deleted", { detail: postId }));
            invalidateCache("/api/posts");
            invalidateCache("/internal/bookmarks");
          } catch {}

          if (onDeleteSuccess) {
            onDeleteSuccess();
          } else {
            smartBack(router);
          }
        } catch {
          feedimAlert("error", t("deleteFailed"));
        }
      },
    });
  };

  const doModAction = async (action: string, reason?: string) => {
    setActionLoading(true);
    try {
      const res = await fetch("/api/admin/moderation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, target_id: postId, target_type: "post", reason }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        feedimAlert("success", data.message || t("operationSuccess"));
        onClose();
        router.refresh();
      } else {
        feedimAlert("error", data.error || t("operationError"));
      }
    } catch {
      feedimAlert("error", t("serverError"));
    } finally {
      setActionLoading(false);
    }
  };

  const confirmModAction = (action: string, label: string) => {
    feedimAlert("question", t("confirmOperation", { label }), {
      showYesNo: true,
      onYes: () => doModAction(action),
    });
  };

  const btnClass = "flex items-center justify-between w-full px-3 py-3.5 hover:bg-bg-tertiary transition rounded-[14px]";
  const labelClass = "text-[0.93rem] font-medium";
  const iconClass = "h-5 w-5 text-text-muted";

  return (
    <>
      <Modal open={open} onClose={onClose} size="sm" title={t("postMore")} infoText={t("postMoreInfoText")}>
        <div className="py-2 px-2 space-y-[3px]">
          <button onClick={handleCopyUrl} className={btnClass}>
            <span className={labelClass}>{copied ? t("copied") : t("copyLink")}</span>
            {copied ? (
              <Check className="h-5 w-5 text-text-primary" />
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-text-muted"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>
            )}
          </button>

          <button onClick={handleShare} className={btnClass}>
            <span className={labelClass}>{t("share")}</span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-text-muted"><path d="M16 7L12 3M12 3L8 7M12 3V15M21 11V17.8C21 18.92 21 19.48 20.782 19.907C20.59 20.284 20.284 20.59 19.908 20.782C19.48 21 18.92 21 17.8 21H6.2C5.08 21 4.52 21 4.092 20.782C3.716 20.59 3.41 20.284 3.218 19.908C3 19.48 3 18.92 3 17.8V11"/></svg>
          </button>

          {authorUsername && !isOwn && (
            <button onClick={handleVisitAuthor} className={btnClass}>
              <span className={labelClass}>{t("visitProfile")}</span>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-text-muted"><path d="M20 21V19C20 16.79 18.21 15 16 15H8C5.79 15 4 16.79 4 19V21"/><circle cx="12" cy="7" r="4"/></svg>
            </button>
          )}

          {isOwn && (
            <>
              <div className="border-t border-border-primary mx-4 my-1" />
              <button
                onClick={() => { onClose(); setTimeout(() => setStatsOpen(true), 250); }}
                className={btnClass}
              >
                <span className={labelClass}>{t("statistics")}</span>
                <BarChart3 className={iconClass} />
              </button>
              {isBoosted ? (
                <button
                  onClick={() => { onClose(); setTimeout(() => setBoostDetailsOpen(true), 250); }}
                  className={btnClass}
                >
                  <span className={labelClass}>{t("boostAd")}</span>
                  <Rocket className={iconClass} />
                </button>
              ) : !currentUser?.accountPrivate && visibility === "public" ? (
                <button
                  onClick={() => {
                    if (currentUser?.accountType === "creator" || currentUser?.accountType === "business") {
                      onClose(); setTimeout(() => setBoostOpen(true), 250);
                    } else {
                      onClose();
                      feedimAlert("info", t("boostRequiresProfessional"));
                    }
                  }}
                  className={btnClass}
                >
                  <span className={labelClass}>{t("boostPost")}</span>
                  <Rocket className={iconClass} />
                </button>
              ) : null}
              {!isBoosted && (
              <button onClick={handleEdit} className={btnClass}>
                <span className={labelClass}>{t("edit")}</span>
                <PenLine className={iconClass} />
              </button>
              )}
              <button onClick={handleDelete} disabled={deleting} className={btnClass}>
                <span className={`${labelClass} text-error`}>{deleting ? t("deleting") : tc("delete")}</span>
                <Trash2 className="h-5 w-5 text-error" />
              </button>
            </>
          )}

          {!isOwn && !authorIsStaff && (
            <>
              <div className="border-t border-border-primary mx-4 my-1" />
              <button onClick={handleReport} className={btnClass}>
                <span className={`${labelClass} text-error`}>{t("reportComment")}</span>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-error"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>
              </button>
            </>
          )}

          {/* Admin / Moderator Actions */}
          {isMod && !isOwn && (
            <>
              <div className="border-t border-border-primary mx-4 my-2" />
              <p className="px-5 py-1 text-[0.68rem] text-text-muted font-semibold uppercase tracking-wider">
                {isAdmin ? t("adminLabel") : t("moderatorLabel")}
              </p>

              <button onClick={() => confirmModAction("flag_for_moderation", t("sendToModeration"))} disabled={actionLoading} className={btnClass}>
                <span className={labelClass}>{t("sendToModeration")}</span>
                <AlertTriangle className="h-5 w-5 text-accent-main" />
              </button>

              <button
                onClick={() => { onClose(); setTimeout(() => setStatsOpen(true), 250); }}
                className={btnClass}
              >
                <span className={labelClass}>{t("viewStats")}</span>
                <Eye className={iconClass} />
              </button>
            </>
          )}
        </div>
      </Modal>

      <ReportModal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        targetType="post"
        targetId={postId}
        authorUserId={authorUserId}
        authorUsername={authorUsername}
        authorName={authorName || authorUsername}
        isSponsored={isSponsored}
      />
      <PostStatsModal
        open={statsOpen}
        onClose={() => setStatsOpen(false)}
        postId={postId}
      />
      {boostOpen && (
        <Suspense fallback={null}>
          <BoostModal
            open={boostOpen}
            onClose={() => setBoostOpen(false)}
            postId={postId}
          />
        </Suspense>
      )}
      {boostDetailsOpen && (
        <Suspense fallback={null}>
          <BoostDetailsModal
            open={boostDetailsOpen}
            onClose={() => setBoostDetailsOpen(false)}
            postId={postId}
          />
        </Suspense>
      )}
    </>
  );
}
