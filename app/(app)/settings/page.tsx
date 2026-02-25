"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslations, useLocale } from "next-intl";
import {useRouter, useSearchParams } from "next/navigation";
import { emitNavigationStart } from "@/lib/navigationProgress";
import Link from "next/link";
import {
  User, Mail, LogOut, Clock, Calendar, Wallet, Bookmark,
  Shield, HelpCircle, FileText, MessageCircle, ScrollText,
  ChevronRight, Check, Lock, Briefcase, Ban, Bell,
  Smartphone, Link2, EyeOff, MapPin,
  Sun, Moon, CloudMoon, Monitor, Sparkles, Keyboard, Globe
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { feedimAlert } from "@/components/FeedimAlert";
import AppLayout from "@/components/AppLayout";
import ShareIcon from "@/components/ShareIcon";
import ProfessionalAccountModal from "@/components/modals/ProfessionalAccountModal";
import DarkModeModal from "@/components/modals/DarkModeModal";
import { isProfessional, getCategoryLabel } from "@/lib/professional";
import VerifiedBadge, { getBadgeVariant } from "@/components/VerifiedBadge";

const minDelay = (ms: number) => new Promise(r => setTimeout(r, ms));

export default function SettingsPage() {
  useSearchParams();
  const t = useTranslations("settings");
  const tTheme = useTranslations("theme");
  const tLang = useTranslations("languages");
  const locale = useLocale();
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
  const [langOpen, setLangOpen] = useState(false);
  const [locationText, setLocationText] = useState<string | null>(null);
  const langRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    loadProfile();
    setCurrentTheme(localStorage.getItem("fdm-theme") || "dark");
    setAmbientLight(localStorage.getItem("fdm-ambient-light") || "on");
    // Fetch user location
    fetch("/api/location")
      .then(r => r.json())
      .then(d => {
        if (d.location) {
          const parts = [d.location.city, d.location.region, d.location.country_code].filter(Boolean);
          if (parts.length > 0) setLocationText(parts.join(", "));
        }
      })
      .catch(() => {});
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

  const handleLanguageChange = async (lang: string) => {
    setLangOpen(false);
    if (lang === locale) return;
    try {
      await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language: lang }),
      });
      document.cookie = `fdm-locale=${lang};path=/;max-age=${86400 * 365};SameSite=Lax`;
      window.location.reload();
    } catch {
      feedimAlert("error", t("settingUpdateFailed"));
    }
  };

  // Close language dropdown on outside click
  useEffect(() => {
    if (!langOpen) return;
    const handler = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) setLangOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [langOpen]);

  const displayName = profile?.full_name || profile?.username || "Kullanıcı";

  return (
    <AppLayout headerTitle={t("title")} hideRightSidebar>
      <div className="py-2">
        {loading ? (
          <div className="flex justify-center py-8"><span className="loader" style={{ width: 22, height: 22 }} /></div>
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
            <Link href="/coins" className="mx-4 mt-3 mb-1 flex items-center justify-between px-4 py-3.5 rounded-[13px] bg-bg-secondary hover:bg-bg-tertiary transition-colors">
              <div className="flex items-center gap-3">
                <Wallet className="h-5 w-5 text-text-muted" />
                <div>
                  <span className="text-sm font-medium">{t("balance")}</span>
                  <p className="text-xs text-text-muted">{profile?.coin_balance?.toLocaleString() || 0} {t("tokens")}</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-text-muted" />
            </Link>

            {/* Abonelik — admin için gizle */}
            {profile?.role !== "admin" && (
              profile?.is_premium ? (
                <Link href="/settings/premium" className={`mx-4 mt-3 mb-1 flex items-center gap-3 px-4 py-3.5 rounded-[13px] transition-colors ${getBadgeVariant(profile.premium_plan) === "max" ? "bg-verified-max/[0.06] hover:bg-verified-max/[0.1]" : "bg-accent-main/[0.06] hover:bg-accent-main/[0.1]"}`}>
                  <VerifiedBadge size="lg" variant={getBadgeVariant(profile.premium_plan)} role={profile?.role} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold">Feedim {(profile.premium_plan || "").charAt(0).toUpperCase() + (profile.premium_plan || "").slice(1)}</p>
                    <p className="text-xs text-text-muted mt-0.5">{t("premiumActive")}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-text-muted shrink-0" />
                </Link>
              ) : (
                <Link href="/settings/premium" className="mx-4 mt-3 mb-1 flex items-center gap-3 px-4 py-3.5 rounded-[13px] bg-bg-secondary hover:bg-bg-tertiary transition-colors">
                  <VerifiedBadge size="lg" className="opacity-50" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold">{t("upgradeToPremium")}</p>
                    <p className="text-xs text-text-muted mt-0.5">{t("premiumDesc")}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-text-muted shrink-0" />
                </Link>
              )
            )}

            {/* Hesap */}
            <h3 className="px-4 pt-6 pb-1 text-xs font-semibold text-text-muted uppercase tracking-wider">{t("account")}</h3>
            <Link href="/profile" className="flex items-center justify-between px-4 py-3.5 rounded-[13px] hover:bg-bg-tertiary transition-colors">
              <div className="flex items-center gap-3">
                <User className="h-5 w-5 text-text-muted" />
                <span className="text-sm font-medium">{t("profile")}</span>
              </div>
              <ChevronRight className="h-4 w-4 text-text-muted" />
            </Link>
            {(profile?.role === "admin" || profile?.role === "moderator") && (
              <Link href="/moderation" className="flex items-center justify-between px-4 py-3.5 rounded-[13px] hover:bg-bg-tertiary transition-colors">
                <div className="flex items-center gap-3">
                  <Shield className="h-5 w-5 text-text-muted" />
                  <span className="text-sm font-medium">{t("moderation")}</span>
                </div>
                <ChevronRight className="h-4 w-4 text-text-muted" />
              </Link>
            )}
            <Link href="/transactions" className="flex items-center justify-between px-4 py-3.5 rounded-[13px] hover:bg-bg-tertiary transition-colors">
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-text-muted" />
                <span className="text-sm font-medium">{t("transactionHistory")}</span>
              </div>
              <ChevronRight className="h-4 w-4 text-text-muted" />
            </Link>
            <Link href="/bookmarks" className="flex items-center justify-between px-4 py-3.5 rounded-[13px] hover:bg-bg-tertiary transition-colors">
              <div className="flex items-center gap-3">
                <Bookmark className="h-5 w-5 text-text-muted" />
                <span className="text-sm font-medium">{t("bookmarks")}</span>
              </div>
              <ChevronRight className="h-4 w-4 text-text-muted" />
            </Link>
            <Link href="/withdrawal" className="flex items-center justify-between px-4 py-3.5 rounded-[13px] hover:bg-bg-tertiary transition-colors">
              <div className="flex items-center gap-3">
                <Wallet className="h-5 w-5 text-text-muted" />
                <span className="text-sm font-medium">{t("withdrawal")}</span>
              </div>
              <ChevronRight className="h-4 w-4 text-text-muted" />
            </Link>
            <Link href="/settings/invite" className="flex items-center justify-between px-4 py-3.5 rounded-[13px] hover:bg-bg-tertiary transition-colors">
              <div className="flex items-center gap-3">
                <ShareIcon className="h-5 w-5 text-text-muted" />
                <span className="text-sm font-medium">{t("inviteFriends")}</span>
              </div>
              <ChevronRight className="h-4 w-4 text-text-muted" />
            </Link>

            {/* Görünüm */}
            <h3 className="px-4 pt-6 pb-1 text-xs font-semibold text-text-muted uppercase tracking-wider">{t("appearance")}</h3>
            <button
              onClick={() => setDarkModeOpen(true)}
              className="flex items-center justify-between w-full px-4 py-3.5 rounded-[13px] hover:bg-bg-tertiary transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                {currentTheme === "dark" ? <Moon className="h-5 w-5 text-text-muted" /> : currentTheme === "dim" ? <CloudMoon className="h-5 w-5 text-text-muted" /> : currentTheme === "light" ? <Sun className="h-5 w-5 text-text-muted" /> : <Monitor className="h-5 w-5 text-text-muted" />}
                <div>
                  <span className="text-sm font-medium">{t("theme")}</span>
                  <p className="text-xs text-text-muted mt-0.5">{tTheme(currentTheme === "light" ? "light" : currentTheme === "dark" ? "dark" : currentTheme === "dim" ? "dim" : "system")}</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-text-muted" />
            </button>

            <div className="flex items-center justify-between px-4 py-3.5 rounded-[13px]">
              <div className="flex items-center gap-3">
                <Sparkles className="h-5 w-5 text-text-muted" />
                <div>
                  <span className="text-sm font-medium">{t("ambientLight")}</span>
                  <p className="text-xs text-text-muted mt-0.5">{t("ambientLightDesc")}</p>
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

            {/* Language selector */}
            <div className="relative" ref={langRef}>
              <button
                onClick={() => setLangOpen(!langOpen)}
                className="flex items-center justify-between w-full px-4 py-3.5 rounded-[13px] hover:bg-bg-tertiary transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <Globe className="h-5 w-5 text-text-muted" />
                  <div>
                    <span className="text-sm font-medium">{t("language")}</span>
                    <p className="text-xs text-text-muted mt-0.5">{tLang(locale)}</p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-text-muted" />
              </button>

              {langOpen && (
                <div className="absolute left-4 right-4 mt-1 bg-bg-secondary rounded-[13px] border border-border-primary shadow-lg z-20 overflow-hidden">
                  {(["tr", "en", "az"] as const).map(lang => (
                    <button
                      key={lang}
                      onClick={() => handleLanguageChange(lang)}
                      className={`flex items-center justify-between w-full px-4 py-3 text-sm hover:bg-bg-tertiary transition-colors ${lang === locale ? "text-accent-main font-semibold" : ""}`}
                    >
                      {tLang(lang)}
                      {lang === locale && <Check className="h-4 w-4 text-accent-main" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Gizlilik */}
            <h3 className="px-4 pt-6 pb-1 text-xs font-semibold text-text-muted uppercase tracking-wider">{t("privacy")}</h3>
            <div className="flex items-center justify-between px-4 py-3.5 rounded-[13px]">
              <div className="flex items-center gap-3">
                <Lock className="h-5 w-5 text-text-muted" />
                <div>
                  <span className="text-sm font-medium">{t("privateAccount")}</span>
                  <p className="text-xs text-text-muted mt-0.5">{t("privateAccountDesc")}</p>
                </div>
              </div>
              <button
                onClick={handlePrivacyToggle}
                className={`relative w-11 h-6 rounded-full transition-colors duration-200 shrink-0 ${isPrivate ? "bg-accent-main" : "bg-bg-tertiary"}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${isPrivate ? "translate-x-5" : "translate-x-0"}`} />
              </button>
            </div>
            <Link href="/settings/blocked-users" className="flex items-center justify-between px-4 py-3.5 rounded-[13px] hover:bg-bg-tertiary transition-colors">
              <div className="flex items-center gap-3">
                <Ban className="h-5 w-5 text-text-muted" />
                <span className="text-sm font-medium">{t("blockedUsers")}</span>
              </div>
              <ChevronRight className="h-4 w-4 text-text-muted" />
            </Link>
            <Link href="/settings/blocked-words" className="flex items-center justify-between px-4 py-3.5 rounded-[13px] hover:bg-bg-tertiary transition-colors">
              <div className="flex items-center gap-3">
                <EyeOff className="h-5 w-5 text-text-muted" />
                <div>
                  <span className="text-sm font-medium">{t("blockedWords")}</span>
                  <p className="text-xs text-text-muted mt-0.5">{t("blockedWordsDesc")}</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-text-muted" />
            </Link>

            {/* Bildirimler */}
            <h3 className="px-4 pt-6 pb-1 text-xs font-semibold text-text-muted uppercase tracking-wider">{t("notifications")}</h3>
            <Link href="/settings/notifications" className="flex items-center justify-between px-4 py-3.5 rounded-[13px] hover:bg-bg-tertiary transition-colors">
              <div className="flex items-center gap-3">
                <Bell className="h-5 w-5 text-text-muted" />
                <span className="text-sm font-medium">{t("notificationSettings")}</span>
              </div>
              <ChevronRight className="h-4 w-4 text-text-muted" />
            </Link>

            {/* Hesap Türü */}
            <h3 className="px-4 pt-6 pb-1 text-xs font-semibold text-text-muted uppercase tracking-wider">{t("accountType")}</h3>
            {isProfessional(accountType) ? (
              <>
                <button
                  onClick={() => setProModalOpen(true)}
                  className="flex items-center justify-between w-full px-4 py-3.5 rounded-[13px] hover:bg-bg-tertiary transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <Briefcase className="h-5 w-5 text-accent-main" />
                    <div>
                      <span className="text-sm font-medium">{accountType === "creator" ? t("creator") : t("business")}</span>
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
                    <span className="text-sm font-medium text-text-muted">{t("switchToPersonal")}</span>
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
                    <span className="text-sm font-medium">{t("switchToPro")}</span>
                    <p className="text-xs text-text-muted mt-0.5">{t("proDesc")}</p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-text-muted" />
              </button>
            )}

            {/* Hesap Sağlığı */}
            <h3 className="px-4 pt-6 pb-1 text-xs font-semibold text-text-muted uppercase tracking-wider">{t("accountHealth")}</h3>
            <Link href="/settings/health" className="flex items-center justify-between px-4 py-3.5 rounded-[13px] hover:bg-bg-tertiary transition-colors">
              <div className="flex items-center gap-3">
                <Shield className="h-5 w-5 text-text-muted" />
                <div>
                  <span className="text-sm font-medium">{t("accountHealth")}</span>
                  <p className="text-xs text-text-muted mt-0.5">{t("accountHealthDesc")}</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-text-muted" />
            </Link>

            {/* Telif Hakkı Koruması */}
            <h3 className="px-4 pt-6 pb-1 text-xs font-semibold text-text-muted uppercase tracking-wider">{t("copyrightProtection")}</h3>
            <Link href="/settings/copyright" className="flex items-center justify-between px-4 py-3.5 rounded-[13px] hover:bg-bg-tertiary transition-colors">
              <div className="flex items-center gap-3">
                <Shield className="h-5 w-5 text-text-muted" />
                <div>
                  <span className="text-sm font-medium">{t("copyrightProtection")}</span>
                  <p className="text-xs text-text-muted mt-0.5">
                    {copyrightEligible
                      ? (copyrightEligibleSince ? `${new Date(copyrightEligibleSince).toLocaleDateString(locale === "az" ? "az-AZ" : locale === "en" ? "en-US" : "tr-TR", { year: "numeric", month: "long", day: "numeric" })}` : "")
                      : copyrightApplicationStatus === "pending"
                        ? t("applicationUnderReview")
                        : t("copyrightAutoDesc")}
                  </p>
                </div>
              </div>
              {copyrightEligible ? (
                <span className="flex items-center gap-1 text-xs text-success font-semibold"><Check className="h-3.5 w-3.5" />{t("copyrightActive")}</span>
              ) : (
                <ChevronRight className="h-4 w-4 text-text-muted" />
              )}
            </Link>

            {/* Güvenlik */}
            <h3 className="px-4 pt-6 pb-1 text-xs font-semibold text-text-muted uppercase tracking-wider">{t("security")}</h3>
            <Link href="/security" className="flex items-center justify-between px-4 py-3.5 rounded-[13px] hover:bg-bg-tertiary transition-colors">
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-text-muted" />
                <div>
                  <span className="text-sm">{t("email")}</span>
                  <p className="text-xs text-text-muted mt-0.5">{user?.email}</p>
                </div>
              </div>
              {emailVerified ? (
                <span className="flex items-center gap-1 text-xs text-accent-main font-semibold"><Check className="h-3.5 w-3.5" />{t("emailVerifiedLabel")}</span>
              ) : (
                <span className="text-xs text-accent-main font-semibold">{t("verifyEmailLabel")}</span>
              )}
            </Link>
            <Link href="/security" className="flex items-center justify-between px-4 py-3.5 rounded-[13px] hover:bg-bg-tertiary transition-colors">
              <div className="flex items-center gap-3">
                <Shield className="h-5 w-5 text-text-muted" />
                <span className="text-sm font-medium">{t("securitySettings")}</span>
              </div>
              <ChevronRight className="h-4 w-4 text-text-muted" />
            </Link>
            <Link href="/settings/connected" className="flex items-center justify-between px-4 py-3.5 rounded-[13px] hover:bg-bg-tertiary transition-colors">
              <div className="flex items-center gap-3">
                <Link2 className="h-5 w-5 text-text-muted" />
                <span className="text-sm font-medium">{t("connectedAccounts")}</span>
              </div>
              <ChevronRight className="h-4 w-4 text-text-muted" />
            </Link>
            <Link href="/settings/sessions" className="flex items-center justify-between px-4 py-3.5 rounded-[13px] hover:bg-bg-tertiary transition-colors">
              <div className="flex items-center gap-3">
                <Smartphone className="h-5 w-5 text-text-muted" />
                <span className="text-sm font-medium">{t("activeSessions")}</span>
              </div>
              <ChevronRight className="h-4 w-4 text-text-muted" />
            </Link>

            {/* Bilgiler */}
            <h3 className="px-4 pt-6 pb-1 text-xs font-semibold text-text-muted uppercase tracking-wider">{t("information")}</h3>
            <div className="flex items-center justify-between px-4 py-3.5 rounded-[13px]">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-text-muted" />
                <span className="text-sm text-text-muted">{t("joinDate")}</span>
              </div>
              <span className="text-xs">{user?.created_at ? new Date(user.created_at).toLocaleDateString(locale === "az" ? "az-AZ" : locale === "en" ? "en-US" : "tr-TR", { year: "numeric", month: "long", day: "numeric" }) : "-"}</span>
            </div>
            <div className="flex items-center justify-between px-4 py-3.5 rounded-[13px]">
              <div className="flex items-center gap-3">
                <MapPin className="h-5 w-5 text-text-muted" />
                <span className="text-sm text-text-muted">{t("location")}</span>
              </div>
              <span className="text-xs">{locationText || t("locationUnknown")}</span>
            </div>
            <button
              onClick={() => { if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("fdm-open-hotkeys")); }}
              className="flex items-center justify-between w-full px-4 py-3.5 rounded-[13px] hover:bg-bg-tertiary transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <Keyboard className="h-5 w-5 text-text-muted" />
                <span className="text-sm font-medium">{t("keyboardShortcuts")}</span>
              </div>
              <ChevronRight className="h-4 w-4 text-text-muted" />
            </button>

            {/* Destek & Yasal */}
            <h3 className="px-4 pt-6 pb-1 text-xs font-semibold text-text-muted uppercase tracking-wider">{t("supportLegal")}</h3>
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
                <Link href="/settings/freeze" className="text-xs text-text-muted hover:text-accent-main transition">
                  Hesabı dondur
                </Link>
                <span className="text-text-muted">|</span>
                <Link href="/settings/delete-account" className="text-xs text-text-muted hover:text-error transition">
                  Hesabı sil
                </Link>
              </div>
            </div>
          </>
        )}
      </div>

      <DarkModeModal open={darkModeOpen} onClose={() => { setDarkModeOpen(false); setCurrentTheme(localStorage.getItem("fdm-theme") || "dark"); }} />

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
