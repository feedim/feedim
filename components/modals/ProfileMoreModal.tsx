"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link as LinkIcon, Ban, Flag, Check, ShieldOff, Snowflake, Sun, Trash2, AlertTriangle, Eye, ImageOff, MessageCircleOff, HeartOff, UserX, UserMinus } from "lucide-react";
import ShareIcon from "@/components/ShareIcon";
import VerifiedBadge from "@/components/VerifiedBadge";
import { useAuthModal } from "@/components/AuthModal";
import { useUser } from "@/components/UserContext";
import { copyTextToClipboard } from "@/lib/copyTextToClipboard";
import Modal from "./Modal";
import ReportModal from "./ReportModal";
import { feedimAlert } from "@/components/FeedimAlert";

interface ProfileMoreModalProps {
  open: boolean;
  onClose: () => void;
  username: string;
  userId?: string;
  isBlocked: boolean;
  onBlock: () => void;
  onShare: () => void;
  onVisitors: () => void;
  isOwn: boolean;
  targetRole?: string;
  targetStatus?: string;
  followsMe?: boolean;
  onRemoveFollower?: () => void;
}

export default function ProfileMoreModal({
  open,
  onClose,
  username,
  userId,
  isBlocked,
  onBlock,
  onShare,
  onVisitors,
  isOwn,
  targetRole,
  targetStatus,
  followsMe,
  onRemoveFollower,
}: ProfileMoreModalProps) {
  const t = useTranslations("modals");
  const tc = useTranslations("common");
  const [copied, setCopied] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const { requireAuth } = useAuthModal();
  const { user: currentUser } = useUser();

  const isAdmin = currentUser?.role === "admin";
  const isMod = currentUser?.role === "moderator" || isAdmin;
  const targetIsStaff = targetRole === "admin" || targetRole === "moderator";

  const handleCopyUrl = async () => {
    const url = `${window.location.origin}/u/${username}`;
    const copiedOk = await copyTextToClipboard(url);
    if (!copiedOk) {
      feedimAlert("error", tc("genericError"));
      return;
    }
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
      onClose();
    }, 1000);
  };

  const handleBlock = async () => {
    const user = await requireAuth();
    if (!user) return;
    onBlock();
    onClose();
  };

  const handleShare = () => {
    onShare();
    onClose();
  };

  const handleVisitors = () => {
    onVisitors();
    onClose();
  };

  const handleReport = async () => {
    const user = await requireAuth();
    if (!user) return;
    onClose();
    setTimeout(() => setReportOpen(true), 250);
  };

  const doModAction = async (action: string, reason?: string) => {
    if (!userId) return;
    setActionLoading(true);
    try {
      const res = await fetch("/api/admin/moderation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, target_id: userId, target_type: "user", reason }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        feedimAlert("success", data.message || t("operationSuccess"));
        onClose();
      } else {
        feedimAlert("error", data.error || t("operationError"));
      }
    } catch {
      feedimAlert("error", t("serverError"));
    } finally {
      setActionLoading(false);
    }
  };

  const confirmAction = (action: string, label: string) => {
    feedimAlert("question", t("confirmOperation", { label }), {
      showYesNo: true,
      onYes: () => doModAction(action),
    });
  };

  const s = targetStatus || "active";
  const showBan = s === "active" || s === "frozen" || s === "moderation";
  const showUnban = s === "blocked" || s === "deleted";
  const showFreeze = s === "active";
  const showUnfreeze = s === "frozen";
  const showModerate = s === "active";
  const showUnmoderate = s === "moderation";
  const showDelete = s !== "deleted";

  const btnClass = "flex items-center gap-3 w-full px-2 py-3.5 hover:bg-bg-tertiary transition text-left rounded-[14px]";
  const labelClass = "text-[0.93rem] font-medium";
  const iconClass = "h-5 w-5 shrink-0";

  return (
    <>
      <Modal open={open} onClose={onClose} size="sm" title={t("profileMoreTitle")} infoText={t("profileMoreInfoText")}>
        <div className="py-2 px-2 space-y-[3px]">
          <button onClick={handleCopyUrl} className={btnClass}>
            {copied ? <Check className={`${iconClass} text-text-primary`} /> : <LinkIcon className={`${iconClass} text-text-muted`} />}
            <span className={labelClass}>{copied ? t("copied") : t("copyProfileUrl")}</span>
          </button>

          <button onClick={handleShare} className={btnClass}>
            <ShareIcon className={`${iconClass} text-text-muted`} />
            <span className={labelClass}>{t("shareProfile")}</span>
          </button>

          {isOwn && (currentUser?.role === "admin" || currentUser?.premiumPlan === "max") && (
            <button onClick={handleVisitors} className={btnClass}>
              <Eye className={`${iconClass} text-text-muted`} />
              <span className={labelClass}>{t("profileVisitorsLink")}</span>
            </button>
          )}

          {!isOwn && !targetIsStaff && (
            <>
              <div className="border-t border-border-primary mx-4 my-1" />

              {followsMe && onRemoveFollower && (
                <button onClick={() => {
                  feedimAlert("question", t("confirmRemoveFollower", { username }), {
                    showYesNo: true,
                    onYes: () => { onRemoveFollower(); onClose(); },
                  });
                }} className={btnClass}>
                  <UserMinus className={`${iconClass} text-text-muted`} />
                  <span className={labelClass}>{t("removeFollower")}</span>
                </button>
              )}

              <button onClick={handleBlock} className={btnClass}>
                <Ban className={`${iconClass} ${isBlocked ? "text-text-muted" : "text-error"}`} />
                <span className={`${labelClass} ${isBlocked ? "" : "text-error"}`}>
                  {isBlocked ? t("unblock") : t("block")}
                </span>
              </button>

              <button onClick={handleReport} className={btnClass}>
                <Flag className={`${iconClass} text-error`} />
                <span className={`${labelClass} text-error`}>{t("reportProfile")}</span>
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

              {showBan && (
                <button onClick={() => confirmAction("ban_user", t("closeAccount"))} disabled={actionLoading} className={btnClass}>
                  <ShieldOff className={`${iconClass} text-error`} />
                  <span className={`${labelClass} text-error`}>{t("closeAccount")}</span>
                </button>
              )}

              {showUnban && (
                <button onClick={() => confirmAction("unban_user", t("openAccount"))} disabled={actionLoading} className={btnClass}>
                  <ShieldOff className={`${iconClass} text-text-muted`} />
                  <span className={labelClass}>{t("openAccount")}</span>
                </button>
              )}

              {showFreeze && (
                <button onClick={() => confirmAction("freeze_user", t("freezeAccount"))} disabled={actionLoading} className={btnClass}>
                  <Snowflake className={`${iconClass} text-info`} />
                  <span className={labelClass}>{t("freezeAccount")}</span>
                </button>
              )}

              {showUnfreeze && (
                <button onClick={() => confirmAction("unfreeze_user", t("unfreezeAccount"))} disabled={actionLoading} className={btnClass}>
                  <Sun className={`${iconClass} text-warning`} />
                  <span className={labelClass}>{t("unfreezeAccount")}</span>
                </button>
              )}

              {showModerate && (
                <button onClick={() => confirmAction("moderation_user", t("moderateAccount"))} disabled={actionLoading} className={btnClass}>
                  <AlertTriangle className={`${iconClass} text-warning`} />
                  <span className={labelClass}>{t("moderateAccount")}</span>
                </button>
              )}

              {showUnmoderate && (
                <button onClick={() => confirmAction("activate_user", t("removeModerationLabel"))} disabled={actionLoading} className={btnClass}>
                  <Check className={`${iconClass} text-success`} />
                  <span className={labelClass}>{t("removeModerationLabel")}</span>
                </button>
              )}

              {isAdmin && (
                <>
                  {(["super", "pro", "max", "business"] as const).map((plan) => (
                    <button
                      key={plan}
                      onClick={() => {
                        feedimAlert("question", t("grantPremiumConfirm", { username, plan: plan.charAt(0).toUpperCase() + plan.slice(1) }), {
                          showYesNo: true,
                          onYes: async () => {
                            setActionLoading(true);
                            try {
                              const res = await fetch("/api/admin/moderation", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ action: "grant_premium", target_id: userId, target_type: "user", plan }),
                              });
                              const data = await res.json();
                              if (res.ok && data.success) {
                                feedimAlert("success", t("premiumGranted", { plan: plan.charAt(0).toUpperCase() + plan.slice(1) }));
                                onClose();
                              } else {
                                feedimAlert("error", data.error || t("operationError"));
                              }
                            } catch { feedimAlert("error", t("serverError")); } finally { setActionLoading(false); }
                          },
                        });
                      }}
                      disabled={actionLoading}
                      className={btnClass}
                    >
                      <VerifiedBadge size="md" variant={plan === "max" || plan === "business" ? "max" : "default"} />
                      <span className={labelClass}>{t("grantPremium", { plan: plan.charAt(0).toUpperCase() + plan.slice(1) })}</span>
                    </button>
                  ))}

                  <button onClick={() => confirmAction("revoke_premium", t("revokePremium"))} disabled={actionLoading} className={btnClass}>
                    <VerifiedBadge size="md" className="opacity-40" />
                    <span className={labelClass}>{t("revokePremium")}</span>
                  </button>

                  <div className="border-t border-border-primary mx-4 my-1" />

                  <button onClick={() => confirmAction("remove_avatar", t("removeAvatarAdmin"))} disabled={actionLoading} className={btnClass}>
                    <ImageOff className={`${iconClass} text-warning`} />
                    <span className={labelClass}>{t("removeAvatarAdmin")}</span>
                  </button>

                  <button onClick={() => confirmAction("restrict_follow", t("restrictFollow"))} disabled={actionLoading} className={btnClass}>
                    <UserX className={`${iconClass} text-warning`} />
                    <span className={labelClass}>{t("restrictFollow")}</span>
                  </button>

                  <button onClick={() => confirmAction("restrict_like", t("restrictLike"))} disabled={actionLoading} className={btnClass}>
                    <HeartOff className={`${iconClass} text-warning`} />
                    <span className={labelClass}>{t("restrictLike")}</span>
                  </button>

                  <button onClick={() => confirmAction("restrict_comment", t("restrictComment"))} disabled={actionLoading} className={btnClass}>
                    <MessageCircleOff className={`${iconClass} text-warning`} />
                    <span className={labelClass}>{t("restrictComment")}</span>
                  </button>

                  {showDelete && (
                    <>
                      <div className="border-t border-border-primary mx-4 my-1" />

                      <button
                        onClick={() => confirmAction("delete_user", t("deleteAccount"))}
                        disabled={actionLoading}
                        className={btnClass}
                      >
                        <Trash2 className={`${iconClass} text-error`} />
                        <span className={`${labelClass} text-error`}>{t("deleteAccount")}</span>
                      </button>
                    </>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </Modal>

      <ReportModal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        targetType="user"
        targetId={userId || username}
        authorUserId={userId}
        authorUsername={username}
        authorName={username}
      />
    </>
  );
}
