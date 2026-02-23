"use client";

import { useState, useEffect } from "react";
import {useRouter, useSearchParams } from "next/navigation";
import { emitNavigationStart } from "@/lib/navigationProgress";
import Link from "next/link";
import {
  User, Mail, LogOut, Clock, Calendar, Wallet, Bookmark,
  Shield, HelpCircle, FileText, MessageCircle, ScrollText,
  ChevronRight, Check, Lock, Briefcase, Ban, Bell,
  Smartphone, Link2, EyeOff,
  Sun, Moon, CloudMoon, Monitor, Sparkles, Keyboard
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { feedimAlert } from "@/components/FeedimAlert";
import AppLayout from "@/components/AppLayout";
import ShareIcon from "@/components/ShareIcon";
import ProfessionalAccountModal from "@/components/modals/ProfessionalAccountModal";
import DarkModeModal from "@/components/modals/DarkModeModal";
import { isProfessional, getCategoryLabel } from "@/lib/professional";
import { SettingsItemSkeleton } from "@/components/Skeletons";
import LoadingShell from "@/components/LoadingShell";
import VerifiedBadge, { getBadgeVariant } from "@/components/VerifiedBadge";

const minDelay = (ms: number) => new Promise(r => setTimeout(r, ms));

export default function SettingsPage() {
  useSearchParams();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [emailVerified, setEmailVerified] = useState(false);
  const [isPrivate, setIsPrivate] = useState(false);
  const [accountType, setAccountType] = useState("personal");
  const [professionalCategory, setProfessionalCategory] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [proModalOpen, setProModalOpen] = useState(false);
  const [darkModeOpen, setDarkModeOpen] = useState(false);
  const [copyrightEligible, setCopyrightEligible] = useState(false);
  const [copyrightEligibleSince, setCopyrightEligibleSince] = useState<string | null>(null);
  const [copyrightApplicationStatus, setCopyrightApplicationStatus] = useState<string | null>(null);
  const [currentTheme, setCurrentTheme] = useState("system");
  const [ambientLight, setAmbientLight] = useState("on");
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    loadProfile();
    setCurrentTheme(localStorage.getItem("fdm-theme") || "system");
    setAmbientLight(localStorage.getItem("fdm-ambient-light") || "on");
  }, []);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) { router.push("/login"); return; }
      setUser(authUser);

      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", authUser.id)
        .single();

      if (data) {
        setProfile(data);
        setEmailVerified(data.email_verified || false);
        setIsPrivate(data.account_private || false);
        setAccountType(data.account_type || "personal");
        setProfessionalCategory(data.professional_category || "");
        setContactEmail(data.contact_email || "");
        setContactPhone(data.contact_phone || "");
        setCopyrightEligible(data.copyright_eligible || false);
        setCopyrightEligibleSince(data.copyright_eligible_since || null);
      }

      try {
        const appRes = await fetch("/api/copyright-applications");
        const appData = await appRes.json();
        if (appData.application) setCopyrightApplicationStatus(appData.application.status);
      } catch {}

    } finally {
      setLoading(false);
    }
  };

  const handlePrivacyToggle = async () => {
    const newValue = !isPrivate;

    // Professional accounts cannot be made private
    if (newValue && isProfessional(accountType)) {
      feedimAlert("question", "Profesyonel hesaplar gizli olamaz. Kişisel hesaba geçmek ister misiniz? Profesyonel hesap özellikleri (istatistikler, kategori, iletişim butonları) kaldırılacak.", {
        showYesNo: true,
        onYes: async () => {
          await handleSwitchToPersonal(true);
        },
      });
      return;
    }

    const message = newValue
      ? "Hesabınızı gizli yapmak istediğinize emin misiniz? Sadece onayladığınız kişiler gönderilerinizi görebilecek."
      : "Hesabınızı herkese açık yapmak istediğinize emin misiniz? Herkes gönderilerinizi görebilecek.";

    feedimAlert("question", message, {
      showYesNo: true,
      onYes: async () => {
        setIsPrivate(newValue);
        try {
          const [res] = await Promise.all([
            fetch("/api/profile", {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ account_private: newValue }),
            }),
            minDelay(2000),
          ]);
          if (!res.ok) {
            setIsPrivate(!newValue);
            feedimAlert("error", "Ayar güncellenemedi, lütfen daha sonra tekrar deneyin");
          }
        } catch {
          setIsPrivate(!newValue);
        }
      },
    });
  };

  const handleSwitchToPersonal = async (makePrivate = false) => {
    const doSwitch = async () => {
      try {
        const body: Record<string, any> = { account_type: "personal" };
        if (makePrivate) body.account_private = true;
        const [res] = await Promise.all([
          fetch("/api/profile", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          }),
          minDelay(2000),
        ]);
        if (res.ok) {
          setAccountType("personal");
          setProfessionalCategory("");
          setContactEmail("");
          setContactPhone("");
          if (makePrivate) setIsPrivate(true);
          // silent
        } else {
          feedimAlert("error", "Hesap türü değiştirilemedi, lütfen daha sonra tekrar deneyin");
        }
      } catch {
        feedimAlert("error", "Bir hata oluştu, lütfen daha sonra tekrar deneyin");
      }
    };

    if (!makePrivate) {
      feedimAlert("question", "Kişisel hesaba geçmek istediğinize emin misiniz? Profesyonel hesap özellikleri (istatistikler, kategori, iletişim butonları) kaldırılacak.", {
        showYesNo: true,
        onYes: doSwitch,
      });
    } else {
      await doSwitch();
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    emitNavigationStart();
    router.push("/");
  };

  const displayName = profile?.full_name || profile?.username || "Kullanıcı";

  return (
    <AppLayout headerTitle="Ayarlar" hideRightSidebar>
      <div className="py-2">
        {loading ? (
          <LoadingShell><SettingsItemSkeleton /></LoadingShell>
        ) : (
          <>
            {/* Profile Header */}
            <div className="flex items-center gap-3 px-4 py-4">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="w-14 h-14 rounded-full object-cover" />
              ) : (
                <img className="default-avatar-auto w-14 h-14 rounded-full object-cover" alt="" />
              )}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-[1.05rem] truncate">{displayName}</p>
                <p className="text-sm text-text-muted truncate">{user?.email}</p>
              </div>
            </div>

            {/* Coin Balance */}
            <Link href="/dashboard/coins" className="mx-4 mt-3 mb-1 flex items-center justify-between px-4 py-3.5 rounded-[13px] bg-bg-secondary hover:bg-bg-tertiary transition-colors">
              <div className="flex items-center gap-3">
                <Wallet className="h-5 w-5 text-text-muted" />
                <div>
                  <span className="text-sm font-medium">Bakiye</span>
                  <p className="text-xs text-text-muted">{profile?.coin_balance?.toLocaleString() || 0} Jeton</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-text-muted" />
            </Link>

            {/* Abonelik — admin için gizle */}
            {profile?.role !== "admin" && (
              profile?.is_premium ? (
                <Link href="/dashboard/settings/premium" className={`mx-4 mt-3 mb-1 flex items-center gap-3 px-4 py-3.5 rounded-[13px] transition-colors ${getBadgeVariant(profile.premium_plan) === "max" ? "bg-verified-max/[0.06] hover:bg-verified-max/[0.1]" : "bg-accent-main/[0.06] hover:bg-accent-main/[0.1]"}`}>
                  <VerifiedBadge size="lg" variant={getBadgeVariant(profile.premium_plan)} role={profile?.role} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold">Feedim {(profile.premium_plan || "").charAt(0).toUpperCase() + (profile.premium_plan || "").slice(1)}</p>
                    <p className="text-xs text-text-muted mt-0.5">Premium üyeliğin aktif</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-text-muted shrink-0" />
                </Link>
              ) : (
                <Link href="/dashboard/settings/premium" className="mx-4 mt-3 mb-1 flex items-center gap-3 px-4 py-3.5 rounded-[13px] bg-bg-secondary hover:bg-bg-tertiary transition-colors">
                  <VerifiedBadge size="lg" className="opacity-50" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold">Premium'a Yükselt</p>
                    <p className="text-xs text-text-muted mt-0.5">Onaylı rozet, reklamsız deneyim ve daha fazlası</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-text-muted shrink-0" />
                </Link>
              )
            )}

            {/* Hesap */}
            <h3 className="px-4 pt-6 pb-1 text-xs font-semibold text-text-muted uppercase tracking-wider">Hesap</h3>
            <Link href="/dashboard/profile" className="flex items-center justify-between px-4 py-3.5 rounded-[13px] hover:bg-bg-tertiary transition-colors">
              <div className="flex items-center gap-3">
                <User className="h-5 w-5 text-text-muted" />
                <span className="text-sm font-medium">Profil</span>
              </div>
              <ChevronRight className="h-4 w-4 text-text-muted" />
            </Link>
            {(profile?.role === "admin" || profile?.role === "moderator") && (
              <Link href="/dashboard/moderation" className="flex items-center justify-between px-4 py-3.5 rounded-[13px] hover:bg-bg-tertiary transition-colors">
                <div className="flex items-center gap-3">
                  <Shield className="h-5 w-5 text-text-muted" />
                  <span className="text-sm font-medium">Moderation</span>
                </div>
                <ChevronRight className="h-4 w-4 text-text-muted" />
              </Link>
            )}
            <Link href="/dashboard/transactions" className="flex items-center justify-between px-4 py-3.5 rounded-[13px] hover:bg-bg-tertiary transition-colors">
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-text-muted" />
                <span className="text-sm font-medium">İşlem Geçmişi</span>
              </div>
              <ChevronRight className="h-4 w-4 text-text-muted" />
            </Link>
            <Link href="/dashboard/bookmarks" className="flex items-center justify-between px-4 py-3.5 rounded-[13px] hover:bg-bg-tertiary transition-colors">
              <div className="flex items-center gap-3">
                <Bookmark className="h-5 w-5 text-text-muted" />
                <span className="text-sm font-medium">Kaydedilenler</span>
              </div>
              <ChevronRight className="h-4 w-4 text-text-muted" />
            </Link>
            <Link href="/dashboard/withdrawal" className="flex items-center justify-between px-4 py-3.5 rounded-[13px] hover:bg-bg-tertiary transition-colors">
              <div className="flex items-center gap-3">
                <Wallet className="h-5 w-5 text-text-muted" />
                <span className="text-sm font-medium">Ödeme Alma</span>
              </div>
              <ChevronRight className="h-4 w-4 text-text-muted" />
            </Link>
            <Link href="/dashboard/settings/invite" className="flex items-center justify-between px-4 py-3.5 rounded-[13px] hover:bg-bg-tertiary transition-colors">
              <div className="flex items-center gap-3">
                <ShareIcon className="h-5 w-5 text-text-muted" />
                <span className="text-sm font-medium">Arkadaşlarını Davet Et</span>
              </div>
              <ChevronRight className="h-4 w-4 text-text-muted" />
            </Link>

            {/* Görünüm */}
            <h3 className="px-4 pt-6 pb-1 text-xs font-semibold text-text-muted uppercase tracking-wider">Görünüm</h3>
            <button
              onClick={() => setDarkModeOpen(true)}
              className="flex items-center justify-between w-full px-4 py-3.5 rounded-[13px] hover:bg-bg-tertiary transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                {currentTheme === "dark" ? <Moon className="h-5 w-5 text-text-muted" /> : currentTheme === "dim" ? <CloudMoon className="h-5 w-5 text-text-muted" /> : currentTheme === "light" ? <Sun className="h-5 w-5 text-text-muted" /> : <Monitor className="h-5 w-5 text-text-muted" />}
                <div>
                  <span className="text-sm font-medium">Tema</span>
                  <p className="text-xs text-text-muted mt-0.5">{currentTheme === "light" ? "Açık" : currentTheme === "dark" ? "Koyu" : currentTheme === "dim" ? "Dim" : "Sistem"}</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-text-muted" />
            </button>

            <div className="flex items-center justify-between px-4 py-3.5 rounded-[13px]">
              <div className="flex items-center gap-3">
                <Sparkles className="h-5 w-5 text-text-muted" />
                <div>
                  <span className="text-sm font-medium">Sahne Işığı</span>
                  <p className="text-xs text-text-muted mt-0.5">Gönderi sayfalarında arka plan ışık efekti</p>
                </div>
              </div>
              <button
                onClick={() => {
                  const next = ambientLight === "on" ? "off" : "on";
                  setAmbientLight(next);
                  localStorage.setItem("fdm-ambient-light", next);
                }}
                className={`relative w-11 h-6 rounded-full transition-colors duration-200 shrink-0 ${ambientLight === "on" ? "bg-accent-main" : "bg-bg-tertiary"}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${ambientLight === "on" ? "translate-x-5" : "translate-x-0"}`} />
              </button>
            </div>

            {/* Gizlilik */}
            <h3 className="px-4 pt-6 pb-1 text-xs font-semibold text-text-muted uppercase tracking-wider">Gizlilik</h3>
            <div className="flex items-center justify-between px-4 py-3.5 rounded-[13px]">
              <div className="flex items-center gap-3">
                <Lock className="h-5 w-5 text-text-muted" />
                <div>
                  <span className="text-sm font-medium">Gizli Hesap</span>
                  <p className="text-xs text-text-muted mt-0.5">Sadece onayladığın kişiler gönderilerini görebilir</p>
                </div>
              </div>
              <button
                onClick={handlePrivacyToggle}
                className={`relative w-11 h-6 rounded-full transition-colors duration-200 shrink-0 ${isPrivate ? "bg-accent-main" : "bg-bg-tertiary"}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${isPrivate ? "translate-x-5" : "translate-x-0"}`} />
              </button>
            </div>
            <Link href="/dashboard/settings/blocked-users" className="flex items-center justify-between px-4 py-3.5 rounded-[13px] hover:bg-bg-tertiary transition-colors">
              <div className="flex items-center gap-3">
                <Ban className="h-5 w-5 text-text-muted" />
                <span className="text-sm font-medium">Engellenenler</span>
              </div>
              <ChevronRight className="h-4 w-4 text-text-muted" />
            </Link>
            <Link href="/dashboard/settings/blocked-words" className="flex items-center justify-between px-4 py-3.5 rounded-[13px] hover:bg-bg-tertiary transition-colors">
              <div className="flex items-center gap-3">
                <EyeOff className="h-5 w-5 text-text-muted" />
                <div>
                  <span className="text-sm font-medium">Engellenen Kelimeler</span>
                  <p className="text-xs text-text-muted mt-0.5">Bu kelimeleri içeren gönderiler gizlenir</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-text-muted" />
            </Link>

            {/* Bildirimler */}
            <h3 className="px-4 pt-6 pb-1 text-xs font-semibold text-text-muted uppercase tracking-wider">Bildirimler</h3>
            <Link href="/dashboard/settings/notifications" className="flex items-center justify-between px-4 py-3.5 rounded-[13px] hover:bg-bg-tertiary transition-colors">
              <div className="flex items-center gap-3">
                <Bell className="h-5 w-5 text-text-muted" />
                <span className="text-sm font-medium">Bildirim Ayarları</span>
              </div>
              <ChevronRight className="h-4 w-4 text-text-muted" />
            </Link>

            <button
              onClick={() => { if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("fdm-open-hotkeys")); }}
              className="flex items-center justify-between w-full px-4 py-3.5 rounded-[13px] hover:bg-bg-tertiary transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <Keyboard className="h-5 w-5 text-text-muted" />
                <span className="text-sm font-medium">Klavye Kısayolları</span>
              </div>
              <ChevronRight className="h-4 w-4 text-text-muted" />
            </button>

            {/* Hesap Türü */}
            <h3 className="px-4 pt-6 pb-1 text-xs font-semibold text-text-muted uppercase tracking-wider">Hesap Türü</h3>
            {isProfessional(accountType) ? (
              <>
                <button
                  onClick={() => setProModalOpen(true)}
                  className="flex items-center justify-between w-full px-4 py-3.5 rounded-[13px] hover:bg-bg-tertiary transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <Briefcase className="h-5 w-5 text-accent-main" />
                    <div>
                      <span className="text-sm font-medium">{accountType === "creator" ? "İçerik Üretici" : "İşletme"}</span>
                      {professionalCategory && (
                        <p className="text-xs text-text-muted mt-0.5">{getCategoryLabel(accountType, professionalCategory)}</p>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-text-muted" />
                </button>
                <button
                  onClick={() => handleSwitchToPersonal()}
                  className="flex items-center justify-between w-full px-4 py-3.5 rounded-[13px] hover:bg-bg-tertiary transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <User className="h-5 w-5 text-text-muted" />
                    <span className="text-sm font-medium text-text-muted">Kişisel hesaba geç</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-text-muted" />
                </button>
              </>
            ) : (
              <button
                onClick={() => setProModalOpen(true)}
                className="flex items-center justify-between w-full px-4 py-3.5 rounded-[13px] hover:bg-bg-tertiary transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <Briefcase className="h-5 w-5 text-text-muted" />
                  <div>
                    <span className="text-sm font-medium">Profesyonel hesaba geç</span>
                    <p className="text-xs text-text-muted mt-0.5">Kazanç, kategori ve iletişim butonları</p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-text-muted" />
              </button>
            )}

            {/* Hesap Sağlığı */}
            <h3 className="px-4 pt-6 pb-1 text-xs font-semibold text-text-muted uppercase tracking-wider">Hesap Sağlığı</h3>
            <Link href="/dashboard/settings/health" className="flex items-center justify-between px-4 py-3.5 rounded-[13px] hover:bg-bg-tertiary transition-colors">
              <div className="flex items-center gap-3">
                <Shield className="h-5 w-5 text-text-muted" />
                <div>
                  <span className="text-sm font-medium">Hesap Sağlığı</span>
                  <p className="text-xs text-text-muted mt-0.5">İhlal hakları ve hesap durumu</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-text-muted" />
            </Link>

            {/* Telif Hakkı Koruması */}
            <h3 className="px-4 pt-6 pb-1 text-xs font-semibold text-text-muted uppercase tracking-wider">Telif Hakkı Koruması</h3>
            <Link href="/dashboard/settings/copyright" className="flex items-center justify-between px-4 py-3.5 rounded-[13px] hover:bg-bg-tertiary transition-colors">
              <div className="flex items-center gap-3">
                <Shield className="h-5 w-5 text-text-muted" />
                <div>
                  <span className="text-sm font-medium">Telif Hakki Korumasi</span>
                  <p className="text-xs text-text-muted mt-0.5">
                    {copyrightEligible
                      ? "Etkin" + (copyrightEligibleSince ? ` — ${new Date(copyrightEligibleSince).toLocaleDateString("tr-TR", { year: "numeric", month: "long", day: "numeric" })}` : "")
                      : copyrightApplicationStatus === "pending"
                        ? "Basvurunuz inceleniyor..."
                        : "Otomatik veya sirket basvurusu ile etkinlesir"}
                  </p>
                </div>
              </div>
              {copyrightEligible ? (
                <span className="flex items-center gap-1 text-xs text-success font-semibold"><Check className="h-3.5 w-3.5" />Etkin</span>
              ) : (
                <ChevronRight className="h-4 w-4 text-text-muted" />
              )}
            </Link>

            {/* Güvenlik */}
            <h3 className="px-4 pt-6 pb-1 text-xs font-semibold text-text-muted uppercase tracking-wider">Güvenlik</h3>
            <Link href="/dashboard/security" className="flex items-center justify-between px-4 py-3.5 rounded-[13px] hover:bg-bg-tertiary transition-colors">
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-text-muted" />
                <div>
                  <span className="text-sm">E-posta</span>
                  <p className="text-xs text-text-muted mt-0.5">{user?.email}</p>
                </div>
              </div>
              {emailVerified ? (
                <span className="flex items-center gap-1 text-xs text-accent-main font-semibold"><Check className="h-3.5 w-3.5" />Onaylı</span>
              ) : (
                <span className="text-xs text-accent-main font-semibold">Doğrula</span>
              )}
            </Link>
            <Link href="/dashboard/security" className="flex items-center justify-between px-4 py-3.5 rounded-[13px] hover:bg-bg-tertiary transition-colors">
              <div className="flex items-center gap-3">
                <Shield className="h-5 w-5 text-text-muted" />
                <span className="text-sm font-medium">Güvenlik Ayarları</span>
              </div>
              <ChevronRight className="h-4 w-4 text-text-muted" />
            </Link>
            <Link href="/dashboard/settings/connected" className="flex items-center justify-between px-4 py-3.5 rounded-[13px] hover:bg-bg-tertiary transition-colors">
              <div className="flex items-center gap-3">
                <Link2 className="h-5 w-5 text-text-muted" />
                <span className="text-sm font-medium">Bağlı Hesaplar</span>
              </div>
              <ChevronRight className="h-4 w-4 text-text-muted" />
            </Link>
            <Link href="/dashboard/settings/sessions" className="flex items-center justify-between px-4 py-3.5 rounded-[13px] hover:bg-bg-tertiary transition-colors">
              <div className="flex items-center gap-3">
                <Smartphone className="h-5 w-5 text-text-muted" />
                <span className="text-sm font-medium">Aktif Oturumlar</span>
              </div>
              <ChevronRight className="h-4 w-4 text-text-muted" />
            </Link>

            {/* Bilgiler */}
            <h3 className="px-4 pt-6 pb-1 text-xs font-semibold text-text-muted uppercase tracking-wider">Bilgiler</h3>
            <div className="flex items-center justify-between px-4 py-3.5 rounded-[13px]">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-text-muted" />
                <span className="text-sm text-text-muted">Üyelik Tarihi</span>
              </div>
              <span className="text-xs">{user?.created_at ? new Date(user.created_at).toLocaleDateString("tr-TR", { year: "numeric", month: "long", day: "numeric" }) : "-"}</span>
            </div>

            {/* Destek & Yasal */}
            <h3 className="px-4 pt-6 pb-1 text-xs font-semibold text-text-muted uppercase tracking-wider">Destek & Yasal</h3>
            <Link href="/help" className="flex items-center justify-between px-4 py-3.5 rounded-[13px] hover:bg-bg-tertiary transition-colors">
              <div className="flex items-center gap-3">
                <HelpCircle className="h-5 w-5 text-text-muted" />
                <span className="text-sm font-medium">Yardım Merkezi</span>
              </div>
              <ChevronRight className="h-4 w-4 text-text-muted" />
            </Link>
            <Link href="/contact" className="flex items-center justify-between px-4 py-3.5 rounded-[13px] hover:bg-bg-tertiary transition-colors">
              <div className="flex items-center gap-3">
                <MessageCircle className="h-5 w-5 text-text-muted" />
                <span className="text-sm font-medium">Bize Ulaşın</span>
              </div>
              <ChevronRight className="h-4 w-4 text-text-muted" />
            </Link>
            <Link href="/terms" className="flex items-center justify-between px-4 py-3.5 rounded-[13px] hover:bg-bg-tertiary transition-colors">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-text-muted" />
                <span className="text-sm font-medium">Kullanım Koşulları</span>
              </div>
              <ChevronRight className="h-4 w-4 text-text-muted" />
            </Link>
            <Link href="/privacy" className="flex items-center justify-between px-4 py-3.5 rounded-[13px] hover:bg-bg-tertiary transition-colors">
              <div className="flex items-center gap-3">
                <ScrollText className="h-5 w-5 text-text-muted" />
                <span className="text-sm font-medium">Gizlilik Politikası</span>
              </div>
              <ChevronRight className="h-4 w-4 text-text-muted" />
            </Link>

            {/* Çıkış */}
            <div className="px-4 pt-6">
              <button onClick={handleSignOut} className="t-btn cancel w-full">
                <LogOut className="h-4 w-4" /> Çıkış Yap
              </button>
            </div>

            {/* Hesap Dondurma & Silme */}
            <div className="px-4 pt-4 pb-8 text-center">
              <div className="flex items-center justify-center gap-3">
                <Link href="/dashboard/settings/freeze" className="text-xs text-text-muted hover:text-accent-main transition">
                  Hesabı dondur
                </Link>
                <span className="text-text-muted">|</span>
                <Link href="/dashboard/settings/delete-account" className="text-xs text-text-muted hover:text-error transition">
                  Hesabı sil
                </Link>
              </div>
            </div>
          </>
        )}
      </div>

      <DarkModeModal open={darkModeOpen} onClose={() => { setDarkModeOpen(false); setCurrentTheme(localStorage.getItem("fdm-theme") || "system"); }} />

      <ProfessionalAccountModal
        open={proModalOpen}
        onClose={() => setProModalOpen(false)}
        onComplete={(data) => {
          setAccountType(data.account_type);
          setProfessionalCategory(data.professional_category);
          setContactEmail(data.contact_email);
          setContactPhone(data.contact_phone);
          setIsPrivate(false);
        }}
        isPrivate={isPrivate}
        initialStep={isProfessional(accountType) ? 1 : undefined}
        onMakePublic={async () => {
          try {
            const res = await fetch("/api/profile", {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ account_private: false }),
            });
            if (res.ok) {
              setIsPrivate(false);
              return true;
            }
            feedimAlert("error", "Ayar güncellenemedi, lütfen daha sonra tekrar deneyin");
            return false;
          } catch {
            return false;
          }
        }}
      />
    </AppLayout>
  );
}
