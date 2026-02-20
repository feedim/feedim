"use client";

import { useState } from "react";
import { Link as LinkIcon, Ban, Eye, Flag, Check, Shield, ShieldOff, Snowflake, Trash2, BadgeCheck, BadgeX } from "lucide-react";
import ShareIcon from "@/components/ShareIcon";
import VerifiedBadge from "@/components/VerifiedBadge";
import { useAuthModal } from "@/components/AuthModal";
import { useUser } from "@/components/UserContext";
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
}: ProfileMoreModalProps) {
  const [copied, setCopied] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const { requireAuth } = useAuthModal();
  const { user: currentUser } = useUser();

  const isAdmin = currentUser?.role === "admin";
  const isMod = currentUser?.role === "moderator" || isAdmin;

  const handleCopyUrl = async () => {
    const url = `${window.location.origin}/u/${username}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = url;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
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
        feedimAlert("success", data.message || "Islem basarili");
        onClose();
      } else {
        feedimAlert("error", data.error || "Hata olustu");
      }
    } catch {
      feedimAlert("error", "Sunucu hatasi");
    } finally {
      setActionLoading(false);
    }
  };

  const confirmAction = (action: string, label: string) => {
    feedimAlert("question", `${username} icin "${label}" islemini onayliyor musunuz?`, {
      showYesNo: true,
      onYes: () => doModAction(action, label),
    });
  };

  const btnClass = "flex items-center gap-3 w-full px-3.5 py-3.5 hover:bg-bg-tertiary transition text-left rounded-[14px]";
  const labelClass = "text-[0.93rem] font-medium";
  const iconClass = "h-5 w-5 shrink-0";

  return (
    <>
      <Modal open={open} onClose={onClose} size="sm" title="Daha Fazla" infoText="Profil baglantisini kopyalayabilir, paylasabilir veya uygunsuz hesaplari sikayet edebilirsin.">
        <div className="py-2 px-2.5">
          <button onClick={handleCopyUrl} className={btnClass}>
            {copied ? <Check className={`${iconClass} text-text-primary`} /> : <LinkIcon className={`${iconClass} text-text-muted`} />}
            <span className={labelClass}>{copied ? "Kopyalandi!" : "Profil URL'sini kopyala"}</span>
          </button>

          <button onClick={handleShare} className={btnClass}>
            <ShareIcon className={`${iconClass} text-text-muted`} />
            <span className={labelClass}>Profili paylas</span>
          </button>

          {isOwn && currentUser?.premiumPlan === "max" && (
            <button onClick={handleVisitors} className={btnClass}>
              <Eye className={`${iconClass} text-text-muted`} />
              <span className={labelClass}>Profil ziyaretcileri</span>
            </button>
          )}

          {!isOwn && (
            <>
              <div className="border-t border-border-primary mx-4 my-1" />
              <button onClick={handleBlock} className={btnClass}>
                <Ban className={`${iconClass} ${isBlocked ? "text-text-muted" : "text-error"}`} />
                <span className={`${labelClass} ${isBlocked ? "" : "text-error"}`}>
                  {isBlocked ? "Engeli kaldir" : "Engelle"}
                </span>
              </button>

              <button onClick={handleReport} className={btnClass}>
                <Flag className={`${iconClass} text-error`} />
                <span className={`${labelClass} text-error`}>Sikayet et</span>
              </button>
            </>
          )}

          {/* Admin / Moderator Actions */}
          {isMod && !isOwn && (
            <>
              <div className="border-t border-border-primary mx-4 my-2" />
              <p className="px-5 py-1 text-[0.68rem] text-text-muted font-semibold uppercase tracking-wider">
                {isAdmin ? "Admin" : "Moderator"}
              </p>

              <button onClick={() => confirmAction("warn_user", "Uyar")} disabled={actionLoading} className={btnClass}>
                <Shield className={`${iconClass} text-warning`} />
                <span className={labelClass}>Uyar (+20 spam puan)</span>
              </button>

              <button onClick={() => confirmAction("ban_user", "Engelle")} disabled={actionLoading} className={btnClass}>
                <ShieldOff className={`${iconClass} text-error`} />
                <span className={`${labelClass} text-error`}>Hesabi engelle</span>
              </button>

              <button onClick={() => confirmAction("unban_user", "Engeli kaldir")} disabled={actionLoading} className={btnClass}>
                <ShieldOff className={`${iconClass} text-text-muted`} />
                <span className={labelClass}>Engeli kaldir</span>
              </button>

              <button onClick={() => doModAction("freeze_user", "Hesap donduruldu")} disabled={actionLoading} className={btnClass}>
                <Snowflake className={`${iconClass} text-info`} />
                <span className={labelClass}>Hesabi dondur</span>
              </button>

              <button onClick={() => confirmAction("verify_user", "Dogrula")} disabled={actionLoading} className={btnClass}>
                <BadgeCheck className={`${iconClass} text-info`} />
                <span className={labelClass}>Dogrula (mavi tik)</span>
              </button>

              <button onClick={() => confirmAction("unverify_user", "Dogrulamayi kaldir")} disabled={actionLoading} className={btnClass}>
                <BadgeX className={`${iconClass} text-text-muted`} />
                <span className={labelClass}>Dogrulamayi kaldir</span>
              </button>

              {isAdmin && (
                <>
                  <button onClick={() => confirmAction("grant_premium", "Premium ver")} disabled={actionLoading} className={btnClass}>
                    <VerifiedBadge size="md" variant="max" />
                    <span className={labelClass}>Premium ver</span>
                  </button>

                  <button onClick={() => confirmAction("revoke_premium", "Premium kaldir")} disabled={actionLoading} className={btnClass}>
                    <VerifiedBadge size="md" className="opacity-40" />
                    <span className={labelClass}>Premium kaldir</span>
                  </button>

                  <button
                    onClick={() => confirmAction("delete_user", "Hesabi sil")}
                    disabled={actionLoading}
                    className={btnClass}
                  >
                    <Trash2 className={`${iconClass} text-error`} />
                    <span className={`${labelClass} text-error`}>Hesabi sil</span>
                  </button>
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
      />
    </>
  );
}
