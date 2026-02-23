"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { emitNavigationStart } from "@/lib/navigationProgress";
import Link from "next/link";
import {
  User, Mail, LogOut, Clock, Calendar, Wallet, Bookmark,
  Shield, HelpCircle, FileText, MessageCircle, ScrollText,
  ArrowLeft, Check, Trash2
} from "lucide-react";
import { SettingsItemSkeleton } from "@/components/Skeletons";
import LoadingShell from "@/components/LoadingShell";
import { createClient } from "@/lib/supabase/client";
import { feedimAlert } from "@/components/FeedimAlert";
import Modal from "./Modal";

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

export default function SettingsModal({ open, onClose }: SettingsModalProps) {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [emailVerified, setEmailVerified] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [confirmDeleteText, setConfirmDeleteText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    if (open) loadProfile();
  }, [open]);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;
      setUser(authUser);

      const { data } = await supabase
        .from("profiles")
        .select("user_id, name, surname, full_name, username, avatar_url, coin_balance, email_verified, role")
        .eq("user_id", authUser.id)
        .single();

      if (data) {
        setProfile(data);
        setEmailVerified(data.email_verified || false);
      }
    } finally {
      setLoading(false);
    }
  };

  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    setSigningOut(true);
    await supabase.auth.signOut();
    onClose();
    emitNavigationStart();
    router.push("/");
  };

  const handleDeleteAccount = async () => {
    if (confirmDeleteText !== "DELETE") {
      feedimAlert("error", "Lütfen 'DELETE' yazarak onaylayın");
      return;
    }
    setDeleting(true);
    try {
      const res = await fetch("/api/account/delete", { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Hesap silinemedi");
      }
      await supabase.auth.signOut();
      feedimAlert("success", "Hesabınız kalıcı olarak silindi");
      onClose();
      emitNavigationStart();
      router.push("/");
    } catch (error: any) {
      feedimAlert("error",error.message);
    } finally {
      setDeleting(false);
    }
  };

  const displayName = profile?.full_name || profile?.name || profile?.username || "Kullanıcı";
  const initials = ((profile?.name?.[0] || "") + (profile?.surname?.[0] || "")).toUpperCase() || "U";

  return (
    <Modal open={open} onClose={onClose} title="Ayarlar" size="md" infoText="Hesap ve uygulama ayarlarını buradan yönetebilirsin.">
      <div className="px-4 py-4 space-y-4">
        {loading ? (
          <LoadingShell><SettingsItemSkeleton /></LoadingShell>
        ) : (
          <>
            {/* Profile Header */}
            <Link href="/dashboard/profile" onClick={onClose} className="flex items-center gap-3 pb-4 hover:opacity-80 transition">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="w-14 h-14 rounded-full object-cover" />
              ) : (
                <img className="default-avatar-auto w-14 h-14 rounded-full object-cover" alt="" />
              )}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-[1.05rem] truncate">{displayName}</p>
                <p className="text-sm text-text-muted truncate">{user?.email}</p>
              </div>
            </Link>

            {/* Coin Balance */}
            <Link
              href="/dashboard/coins"
              onClick={onClose}
              className="flex items-center justify-between px-4 py-3.5 hover:bg-bg-tertiary transition-colors"
            >
              <div>
                <p className="text-xs text-text-muted">Bakiye</p>
                <p className="text-2xl font-bold">
                  {profile?.coin_balance?.toLocaleString() || 0}{" "}
                  <span className="text-sm text-text-muted">Jeton</span>
                </p>
              </div>
              <span className="t-btn accept text-sm">
                <Wallet className="h-4 w-4" /> Yükle
              </span>
            </Link>

            {/* Hesap */}
            <div className="overflow-hidden">
              <div className="px-4 pt-5 pb-1">
                <h3 className="font-semibold text-xs text-text-muted uppercase tracking-wider">Hesap</h3>
              </div>
              <div className="">
                <Link href="/dashboard/profile" onClick={onClose} className="flex items-center justify-between px-4 py-3.5 hover:bg-bg-tertiary transition-colors">
                  <div className="flex items-center gap-3">
                    <User className="h-5 w-5 text-text-muted" />
                    <span className="text-sm font-medium">Profil</span>
                  </div>
                  <ArrowLeft className="h-4 w-4 text-text-muted rotate-180" />
                </Link>
                <Link href="/dashboard/transactions" onClick={onClose} className="flex items-center justify-between px-4 py-3.5 hover:bg-bg-tertiary transition-colors">
                  <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-text-muted" />
                    <span className="text-sm font-medium">İşlem Geçmişi</span>
                  </div>
                  <ArrowLeft className="h-4 w-4 text-text-muted rotate-180" />
                </Link>
                <Link href="/dashboard/bookmarks" onClick={onClose} className="flex items-center justify-between px-4 py-3.5 hover:bg-bg-tertiary transition-colors">
                  <div className="flex items-center gap-3">
                    <Bookmark className="h-5 w-5 text-text-muted" />
                    <span className="text-sm font-medium">Kaydedilenler</span>
                  </div>
                  <ArrowLeft className="h-4 w-4 text-text-muted rotate-180" />
                </Link>
              </div>
            </div>

            {/* Bilgiler */}
            <div className="overflow-hidden">
              <div className="px-4 pt-5 pb-1">
                <h3 className="font-semibold text-xs text-text-muted uppercase tracking-wider">Bilgiler</h3>
              </div>
              <div className="">
                <div className="flex items-center justify-between px-4 py-3.5">
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-text-muted" />
                    <span className="text-sm text-text-muted">Üyelik Tarihi</span>
                  </div>
                  <span className="text-xs">{user?.created_at ? new Date(user.created_at).toLocaleDateString("tr-TR", { year: "numeric", month: "long", day: "numeric" }) : "-"}</span>
                </div>
              </div>
            </div>

            {/* Guvenlik */}
            <div className="overflow-hidden">
              <div className="px-4 pt-5 pb-1">
                <h3 className="font-semibold text-xs text-text-muted uppercase tracking-wider">Güvenlik</h3>
              </div>
              <div className="">
                <Link href="/dashboard/security" onClick={onClose} className="flex items-center justify-between px-4 py-3.5 hover:bg-bg-tertiary transition-colors">
                  <div className="flex items-center gap-3">
                    <Mail className="h-5 w-5 text-text-muted" />
                    <div>
                      <span className="text-sm text-text-muted">E-posta</span>
                      <p className="text-xs mt-0.5">{user?.email}</p>
                    </div>
                  </div>
                  {emailVerified ? (
                    <span className="flex items-center gap-1 text-xs text-accent-main font-semibold"><Check className="h-3.5 w-3.5" />Onaylı</span>
                  ) : (
                    <span className="text-xs text-accent-main font-semibold">Doğrula</span>
                  )}
                </Link>
                <Link href="/dashboard/security" onClick={onClose} className="flex items-center justify-between px-4 py-3.5 hover:bg-bg-tertiary transition-colors">
                  <div className="flex items-center gap-3">
                    <Shield className="h-5 w-5 text-text-muted" />
                    <span className="text-sm font-medium">Güvenlik Ayarları</span>
                  </div>
                  <ArrowLeft className="h-4 w-4 text-text-muted rotate-180" />
                </Link>
              </div>
            </div>

            {/* Destek */}
            <div className="overflow-hidden">
              <div className="px-4 pt-5 pb-1">
                <h3 className="font-semibold text-xs text-text-muted uppercase tracking-wider">Destek & Yasal</h3>
              </div>
              <div className="">
                <Link href="/help" onClick={onClose} className="flex items-center justify-between px-4 py-3.5 hover:bg-bg-tertiary transition-colors">
                  <div className="flex items-center gap-3">
                    <HelpCircle className="h-5 w-5 text-text-muted" />
                    <span className="text-sm font-medium">Yardım Merkezi</span>
                  </div>
                  <ArrowLeft className="h-4 w-4 text-text-muted rotate-180" />
                </Link>
                <Link href="/help/contact" onClick={onClose} className="flex items-center justify-between px-4 py-3.5 hover:bg-bg-tertiary transition-colors">
                  <div className="flex items-center gap-3">
                    <MessageCircle className="h-5 w-5 text-text-muted" />
                    <span className="text-sm font-medium">Bize Ulaşın</span>
                  </div>
                  <ArrowLeft className="h-4 w-4 text-text-muted rotate-180" />
                </Link>
                <Link href="/help/terms" onClick={onClose} className="flex items-center justify-between px-4 py-3.5 hover:bg-bg-tertiary transition-colors">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-text-muted" />
                    <span className="text-sm font-medium">Kullanım Koşulları</span>
                  </div>
                  <ArrowLeft className="h-4 w-4 text-text-muted rotate-180" />
                </Link>
                <Link href="/help/privacy" onClick={onClose} className="flex items-center justify-between px-4 py-3.5 hover:bg-bg-tertiary transition-colors">
                  <div className="flex items-center gap-3">
                    <ScrollText className="h-5 w-5 text-text-muted" />
                    <span className="text-sm font-medium">Gizlilik Politikası</span>
                  </div>
                  <ArrowLeft className="h-4 w-4 text-text-muted rotate-180" />
                </Link>
              </div>
            </div>

            {/* Çıkış */}
            <button onClick={handleSignOut} disabled={signingOut} className="t-btn cancel w-full">
              {signingOut ? <span className="loader" style={{ width: 16, height: 16 }} /> : <><LogOut className="h-5 w-5" /> Çıkış Yap</>}
            </button>

            {/* Hesap Silme */}
            <div className="pt-2 pb-4 text-center">
              {!showDeleteConfirm ? (
                <button onClick={() => setShowDeleteConfirm(true)} className="text-sm text-error hover:opacity-80 transition font-medium">
                  <Trash2 className="h-4 w-4 inline mr-1" /> Hesabı kalıcı olarak sil
                </button>
              ) : (
                <div className="space-y-3 text-left">
                  <p className="text-sm text-error">Hesabınız ve tüm verileriniz kalıcı olarak silinecektir.</p>
                  <p className="text-sm text-text-muted">Devam için <span className="font-bold">DELETE</span> yazın:</p>
                  <input
                    type="text"
                    value={confirmDeleteText}
                    onChange={(e) => setConfirmDeleteText(e.target.value)}
                    className="input-modern w-full"
                    placeholder="DELETE"
                  />
                  <div className="flex gap-2">
                    <button onClick={handleDeleteAccount} className="flex-1 t-btn accept relative !bg-error !text-white" disabled={confirmDeleteText !== "DELETE" || deleting} aria-label="Hesabı Sil">
                      {deleting ? <span className="loader" /> : "Evet, Sil"}
                    </button>
                    <button onClick={() => { setShowDeleteConfirm(false); setConfirmDeleteText(""); }} className="flex-1 t-btn cancel">İptal</button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
