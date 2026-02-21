"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, PenLine, Trash2, BarChart3, Shield, ShieldOff, Archive, Eye } from "lucide-react";
import { feedimAlert } from "@/components/FeedimAlert";
import { useAuthModal } from "@/components/AuthModal";
import { useUser } from "@/components/UserContext";
import Modal from "./Modal";
import ReportModal from "./ReportModal";
import PostStatsModal from "./PostStatsModal";

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
  contentType?: "post" | "video" | "moment";
}

export default function PostMoreModal({ open, onClose, postId, postUrl, authorUsername, authorUserId, authorName, onShare, isOwnPost, postSlug, contentType }: PostMoreModalProps) {
  const [copied, setCopied] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const router = useRouter();
  const { requireAuth } = useAuthModal();
  const { user: currentUser } = useUser();

  const isAdmin = currentUser?.role === "admin";
  const isMod = currentUser?.role === "moderator" || isAdmin;

  const handleCopyUrl = async () => {
    const fullUrl = `${window.location.origin}${postUrl}`;
    await navigator.clipboard.writeText(fullUrl);
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
      ? `/dashboard/write/moment?edit=${postId}`
      : contentType === "video"
        ? `/dashboard/write/video?edit=${postId}`
        : `/dashboard/write?edit=${postId}`;
    router.push(editPath);
  };

  const handleDelete = async () => {
    feedimAlert("question", "Bu gönderiyi silmek istediğinize emin misiniz? Bu işlem geri alınamaz.", {
      showYesNo: true,
      onYes: () => {
        // Optimistic: immediately close, navigate, and show success
        onClose();
        feedimAlert("success", "Gönderi silindi");
        // Mark as deleted in sessionStorage so feed hides it immediately
        try {
          const deleted = JSON.parse(sessionStorage.getItem("fdm-deleted-posts") || "[]");
          deleted.push(postId);
          sessionStorage.setItem("fdm-deleted-posts", JSON.stringify(deleted));
        } catch {}
        router.push("/dashboard");
        // Fire-and-forget background delete
        fetch(`/api/posts/${postId}`, { method: "DELETE" }).catch(() => {});
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
        feedimAlert("success", data.message || "İşlem başarılı");
        onClose();
        router.refresh();
      } else {
        feedimAlert("error", data.error || "Hata oluştu");
      }
    } catch {
      feedimAlert("error", "Sunucu hatası");
    } finally {
      setActionLoading(false);
    }
  };

  const confirmModAction = (action: string, label: string) => {
    feedimAlert("question", `"${label}" işlemini onaylıyor musunuz?`, {
      showYesNo: true,
      onYes: () => doModAction(action, label),
    });
  };

  const btnClass = "flex items-center justify-between w-full px-5 py-3.5 hover:bg-bg-tertiary transition rounded-[14px]";
  const labelClass = "text-[0.93rem] font-medium";
  const iconClass = "h-5 w-5 text-text-muted";

  return (
    <>
      <Modal open={open} onClose={onClose} size="sm" title="Daha Fazla" infoText="Gönderi bağlantısını kopyalayabilir, paylaşabilir veya uygunsuz içerikleri şikayet edebilirsin.">
        <div className="py-2 px-2.5">
          <button onClick={handleCopyUrl} className={btnClass}>
            <span className={labelClass}>{copied ? "Kopyalandı!" : "Bağlantıyı kopyala"}</span>
            {copied ? (
              <Check className="h-5 w-5 text-text-primary" />
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-text-muted"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>
            )}
          </button>

          <button onClick={handleShare} className={btnClass}>
            <span className={labelClass}>Paylaş</span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-text-muted"><path d="M16 7L12 3M12 3L8 7M12 3V15M21 11V17.8C21 18.92 21 19.48 20.782 19.907C20.59 20.284 20.284 20.59 19.908 20.782C19.48 21 18.92 21 17.8 21H6.2C5.08 21 4.52 21 4.092 20.782C3.716 20.59 3.41 20.284 3.218 19.908C3 19.48 3 18.92 3 17.8V11"/></svg>
          </button>

          {authorUsername && !isOwnPost && (
            <button onClick={handleVisitAuthor} className={btnClass}>
              <span className={labelClass}>Profili ziyaret et</span>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-text-muted"><path d="M20 21V19C20 16.79 18.21 15 16 15H8C5.79 15 4 16.79 4 19V21"/><circle cx="12" cy="7" r="4"/></svg>
            </button>
          )}

          {isOwnPost && (
            <>
              <div className="border-t border-border-primary mx-4 my-1" />
              <button
                onClick={() => { onClose(); setTimeout(() => setStatsOpen(true), 250); }}
                className={btnClass}
              >
                <span className={labelClass}>İstatistikler</span>
                <BarChart3 className={iconClass} />
              </button>
              <button onClick={handleEdit} className={btnClass}>
                <span className={labelClass}>Düzenle</span>
                <PenLine className={iconClass} />
              </button>
              <button onClick={handleDelete} disabled={deleting} className={btnClass}>
                <span className={`${labelClass} text-error`}>{deleting ? "Siliniyor..." : "Sil"}</span>
                <Trash2 className="h-5 w-5 text-error" />
              </button>
            </>
          )}

          {!isOwnPost && (
            <>
              <div className="border-t border-border-primary mx-4 my-1" />
              <button onClick={handleReport} className={btnClass}>
                <span className={`${labelClass} text-error`}>Şikayet et</span>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-error"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>
              </button>
            </>
          )}

          {/* Admin / Moderator Actions */}
          {isMod && !isOwnPost && (
            <>
              <div className="border-t border-border-primary mx-4 my-2" />
              <p className="px-5 py-1 text-[0.68rem] text-text-muted font-semibold uppercase tracking-wider">
                {isAdmin ? "Admin" : "Moderator"}
              </p>

              <button onClick={() => confirmModAction("approve_post", "Onayla")} disabled={actionLoading} className={btnClass}>
                <span className={labelClass}>Gönderiyi onayla</span>
                <Shield className="h-5 w-5 text-success" />
              </button>

              <button onClick={() => confirmModAction("remove_post", "Kaldır")} disabled={actionLoading} className={btnClass}>
                <span className={`${labelClass} text-error`}>Gönderiyi kaldır</span>
                <ShieldOff className="h-5 w-5 text-error" />
              </button>

              <button onClick={() => confirmModAction("archive_post", "Arşivle")} disabled={actionLoading} className={btnClass}>
                <span className={labelClass}>Arşivle</span>
                <Archive className={iconClass} />
              </button>

              <button
                onClick={() => { onClose(); setTimeout(() => setStatsOpen(true), 250); }}
                className={btnClass}
              >
                <span className={labelClass}>İstatistikleri gör</span>
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
        authorName={authorName || authorUsername}
      />
      <PostStatsModal
        open={statsOpen}
        onClose={() => setStatsOpen(false)}
        postId={postId}
      />
    </>
  );
}
