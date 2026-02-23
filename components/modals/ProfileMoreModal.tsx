"use client";

import { useState } from "react";
import { Link as LinkIcon, Ban, Flag, Check, Shield, ShieldOff, Snowflake, Sun, Trash2, AlertTriangle, Eye, ImageOff, MessageCircleOff, HeartOff, UserX } from "lucide-react";
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
        feedimAlert("success", data.message || "İşlem başarılı");
        onClose();
      } else {
        feedimAlert("error", data.error || "Hata oluştu");
      }
    } catch {
      feedimAlert("error", "Sunucu hatası");
    } finally {
      setActionLoading(false);
    }
  };

  const confirmAction = (action: string, label: string) => {
    feedimAlert("question", `${username} için "${label}" işlemini onaylıyor musunuz?`, {
      showYesNo: true,
      onYes: () => doModAction(action, label),
    });
  };

  const btnClass = "flex items-center gap-3 w-full px-3.5 py-3.5 hover:bg-bg-tertiary transition text-left rounded-[14px]";
  const labelClass = "text-[0.93rem] font-medium";
  const iconClass = "h-5 w-5 shrink-0";

  return (
    <>
      <Modal open={open} onClose={onClose} size="sm" title="Daha Fazla" infoText="Profil bağlantısını kopyalayabilir, paylaşabilir veya uygunsuz hesapları şikayet edebilirsin.">
        <div className="py-2 px-2.5">
          <button onClick={handleCopyUrl} className={btnClass}>
            {copied ? <Check className={`${iconClass} text-text-primary`} /> : <LinkIcon className={`${iconClass} text-text-muted`} />}
            <span className={labelClass}>{copied ? "Kopyalandı!" : "Profil URL'sini kopyala"}</span>
          </button>

          <button onClick={handleShare} className={btnClass}>
            <ShareIcon className={`${iconClass} text-text-muted`} />
            <span className={labelClass}>Profili paylaş</span>
          </button>

          {isOwn && currentUser?.premiumPlan === "max" && (
            <button onClick={handleVisitors} className={btnClass}>
              <Eye className={`${iconClass} text-text-muted`} />
              <span className={labelClass}>Profil ziyaretçileri</span>
            </button>
          )}

          {!isOwn && (
            <>
              <div className="border-t border-border-primary mx-4 my-1" />
              <button onClick={handleBlock} className={btnClass}>
                <Ban className={`${iconClass} ${isBlocked ? "text-text-muted" : "text-error"}`} />
                <span className={`${labelClass} ${isBlocked ? "" : "text-error"}`}>
                  {isBlocked ? "Engeli kaldır" : "Engelle"}
                </span>
              </button>

              <button onClick={handleReport} className={btnClass}>
                <Flag className={`${iconClass} text-error`} />
                <span className={`${labelClass} text-error`}>Şikayet et</span>
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

              <button onClick={() => confirmAction("ban_user", "Hesabı kapat")} disabled={actionLoading} className={btnClass}>
                <ShieldOff className={`${iconClass} text-error`} />
                <span className={`${labelClass} text-error`}>Hesabı kapat</span>
              </button>

              <button onClick={() => confirmAction("unban_user", "Hesabı aç")} disabled={actionLoading} className={btnClass}>
                <ShieldOff className={`${iconClass} text-text-muted`} />
                <span className={labelClass}>Hesabı aç</span>
              </button>

              <button onClick={() => doModAction("freeze_user", "Hesap donduruldu")} disabled={actionLoading} className={btnClass}>
                <Snowflake className={`${iconClass} text-info`} />
                <span className={labelClass}>Hesabı dondur</span>
              </button>

              <button onClick={() => doModAction("unfreeze_user", "Dondurma kaldırıldı")} disabled={actionLoading} className={btnClass}>
                <Sun className={`${iconClass} text-warning`} />
                <span className={labelClass}>Dondurmayı kaldır</span>
              </button>


              <button onClick={() => confirmAction("moderation_user", "Hesap incelemesi")} disabled={actionLoading} className={btnClass}>
                <AlertTriangle className={`${iconClass} text-warning`} />
                <span className={labelClass}>Moderasyona al</span>
              </button>

              <button onClick={() => doModAction("activate_user", "Moderasyon kaldırıldı")} disabled={actionLoading} className={btnClass}>
                <Check className={`${iconClass} text-success`} />
                <span className={labelClass}>Moderasyonu kaldır</span>
              </button>

              {isAdmin && (
                <>
                  {(["super", "pro", "max", "business"] as const).map((plan) => (
                    <button
                      key={plan}
                      onClick={() => {
                        feedimAlert("question", `${username} için "${plan.charAt(0).toUpperCase() + plan.slice(1)}" planı (30 gün) hediye edilsin mi?`, {
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
                                feedimAlert("success", `${plan.charAt(0).toUpperCase() + plan.slice(1)} planı hediye edildi`);
                                onClose();
                              } else {
                                feedimAlert("error", data.error || "Hata oluştu");
                              }
                            } catch { feedimAlert("error", "Sunucu hatası"); } finally { setActionLoading(false); }
                          },
                        });
                      }}
                      disabled={actionLoading}
                      className={btnClass}
                    >
                      <VerifiedBadge size="md" variant={plan === "max" || plan === "business" ? "max" : "default"} />
                      <span className={labelClass}>{plan.charAt(0).toUpperCase() + plan.slice(1)} ver (30 gün)</span>
                    </button>
                  ))}

                  <button onClick={() => confirmAction("revoke_premium", "Premium kaldır")} disabled={actionLoading} className={btnClass}>
                    <VerifiedBadge size="md" className="opacity-40" />
                    <span className={labelClass}>Premium kaldır</span>
                  </button>

                  <div className="border-t border-border-primary mx-4 my-1" />

                  <button onClick={() => confirmAction("remove_avatar", "Avatarı kaldır")} disabled={actionLoading} className={btnClass}>
                    <ImageOff className={`${iconClass} text-warning`} />
                    <span className={labelClass}>Avatarı kaldır</span>
                  </button>

                  <button onClick={() => confirmAction("restrict_follow", "Takip engeli")} disabled={actionLoading} className={btnClass}>
                    <UserX className={`${iconClass} text-warning`} />
                    <span className={labelClass}>Takip engeli at/kaldır</span>
                  </button>

                  <button onClick={() => confirmAction("restrict_like", "Beğeni engeli")} disabled={actionLoading} className={btnClass}>
                    <HeartOff className={`${iconClass} text-warning`} />
                    <span className={labelClass}>Beğeni engeli at/kaldır</span>
                  </button>

                  <button onClick={() => confirmAction("restrict_comment", "Yorum engeli")} disabled={actionLoading} className={btnClass}>
                    <MessageCircleOff className={`${iconClass} text-warning`} />
                    <span className={labelClass}>Yorum engeli at/kaldır</span>
                  </button>

                  <div className="border-t border-border-primary mx-4 my-1" />

                  <button
                    onClick={() => confirmAction("delete_user", "Hesabı sil")}
                    disabled={actionLoading}
                    className={btnClass}
                  >
                    <Trash2 className={`${iconClass} text-error`} />
                    <span className={`${labelClass} text-error`}>Hesabı sil</span>
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
        authorUserId={userId}
        authorName={username}
      />
    </>
  );
}
