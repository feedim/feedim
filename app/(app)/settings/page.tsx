"use client";

import { useState, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import {useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import NewTabLink from "@/components/NewTabLink";
import {
  User, LogOut, Clock, Calendar, Wallet, Bookmark,
  Shield, HelpCircle, FileText, MessageCircle, ScrollText,
  ChevronRight, Check, Lock, Briefcase, Ban, Bell,
  Smartphone, Link2, EyeOff, MapPin, Coins,
  Sun, Moon, CloudMoon, Monitor, Sparkles, Keyboard, Globe
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { feedimAlert } from "@/components/FeedimAlert";
import AppLayout from "@/components/AppLayout";
import ShareIcon from "@/components/ShareIcon";
import ProfessionalAccountModal from "@/components/modals/ProfessionalAccountModal";
import DarkModeModal from "@/components/modals/DarkModeModal";
import { isProfessional, getCategoryLabelKey } from "@/lib/professional";
import VerifiedBadge, { getBadgeVariant } from "@/components/VerifiedBadge";
import { fetchWithCache, withCacheScope } from "@/lib/fetchWithCache";
import { FRESHNESS_WINDOWS } from "@/lib/freshnessPolicy";

const minDelay = (ms: number) => new Promise(r => setTimeout(r, ms));
const SETTINGS_PROFILE_SELECT = [
  "full_name",
  "username",
  "avatar_url",
  "coin_balance",
  "role",
  "is_premium",
  "premium_plan",
  "email_verified",
  "account_private",
  "account_type",
  "professional_category",
  "contact_email",
  "contact_phone",
  "copyright_eligible",
  "copyright_eligible_since",
].join(", ");

interface SettingsAuthUser {
  email?: string | null;
  created_at?: string | null;
}

interface SettingsProfile {
  full_name?: string | null;
  username?: string | null;
  avatar_url?: string | null;
  coin_balance?: number | null;
  role?: string | null;
  is_premium?: boolean | null;
  premium_plan?: string | null;
  email_verified?: boolean | null;
  account_private?: boolean | null;
  account_type?: string | null;
  professional_category?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  copyright_eligible?: boolean | null;
  copyright_eligible_since?: string | null;
}

export default function SettingsPage() {
  useSearchParams();
  const t = useTranslations("settings");
  const tTheme = useTranslations("theme");
  const tProf = useTranslations("professional");
  const locale = useLocale();
  const [user, setUser] = useState<SettingsAuthUser | null>(null);
  const [profile, setProfile] = useState<SettingsProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [emailVerified, setEmailVerified] = useState(false);
  const [isPrivate, setIsPrivate] = useState(false);
  const [accountType, setAccountType] = useState("personal");
  const [professionalCategory, setProfessionalCategory] = useState("");
  const [proModalOpen, setProModalOpen] = useState(false);
  const [darkModeOpen, setDarkModeOpen] = useState(false);
  const [copyrightEligible, setCopyrightEligible] = useState(false);
  const [copyrightEligibleSince, setCopyrightEligibleSince] = useState<string | null>(null);
  const [copyrightApplicationStatus, setCopyrightApplicationStatus] = useState<string | null>(null);
  const [monetizationEnabled, setMonetizationEnabled] = useState(false);
  const [monetizationStatus, setMonetizationStatus] = useState<string | null>(null);
  const [currentTheme, setCurrentTheme] = useState("system");
  const [ambientLight, setAmbientLight] = useState("on");
  const [locationText, setLocationText] = useState<string | null>(null);
  const [locationUpdating, setLocationUpdating] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setCurrentTheme(localStorage.getItem("fdm-theme") || "dark");
    setAmbientLight(localStorage.getItem("fdm-ambient-light") || "off");
    let cancelled = false;

    const loadProfile = async () => {
      setLoading(true);
      try {
        const supabase = createClient();
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) {
          if (!cancelled) router.push("/login");
          return;
        }

        if (cancelled) return;
        setUser(authUser);
        const settingsCacheScope = `settings:${authUser.id}`;

        const [{ data }, appData, monData] = await Promise.all([
          supabase
            .from("profiles")
            .select(SETTINGS_PROFILE_SELECT)
            .eq("user_id", authUser.id)
            .single(),
          fetchWithCache(withCacheScope("/api/copyright-applications", settingsCacheScope), {
            ttlSeconds: FRESHNESS_WINDOWS.settingsDerivedPanel,
          }).catch(() => null),
          fetchWithCache(withCacheScope("/api/monetization", settingsCacheScope), {
            ttlSeconds: FRESHNESS_WINDOWS.settingsDerivedPanel,
          }).catch(() => null),
        ]);

        if (cancelled) return;

        if (data) {
          const p = data as SettingsProfile;
          setProfile(p);
          setEmailVerified(p.email_verified || false);
          setIsPrivate(p.account_private || false);
          setAccountType(p.account_type || "personal");
          setProfessionalCategory(p.professional_category || "");
          setCopyrightEligible(p.copyright_eligible || false);
          setCopyrightEligibleSince(p.copyright_eligible_since || null);
        }

        // Fetch location after auth is confirmed (avoids 401 race condition)
        fetch("/api/location")
          .then(r => { if (!r.ok) return null; return r.json(); })
          .then(d => {
            if (cancelled || !d?.location) return;
            const parts = [d.location.city, d.location.region, d.location.country_code].filter(Boolean);
            if (parts.length > 0) setLocationText(parts.join(", "));
          })
          .catch(() => {});

        if (appData && typeof appData === "object" && "application" in appData) {
          const application = (appData as { application?: { status?: string | null } }).application;
          if (application) setCopyrightApplicationStatus(application.status || null);
        }

        if (monData && typeof monData === "object") {
          const monetization = monData as {
            monetization_enabled?: boolean;
            monetization_status?: string | null;
          };
          setMonetizationEnabled(!!monetization.monetization_enabled);
          setMonetizationStatus(monetization.monetization_status || null);
        }

      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void loadProfile();

    return () => {
      cancelled = true;
    };
  }, [router]);

  const updateLocation = async () => {
    if (!navigator.geolocation) {
      feedimAlert("error", t("locationNotSupported"));
      return;
    }
    setLocationUpdating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await fetch("/api/location", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
          });
          const data = await res.json();
          if (data.location) {
            const parts = [data.location.city, data.location.region, data.location.country_code].filter(Boolean);
            if (parts.length > 0) setLocationText(parts.join(", "));
            feedimAlert("success", t("locationUpdated"));
          }
        } catch {} finally {
          setLocationUpdating(false);
        }
      },
      () => {
        feedimAlert("error", t("locationPermissionDenied"));
        setLocationUpdating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handlePrivacyToggle = async () => {
    const newValue = !isPrivate;

    // Professional accounts cannot be made private
    if (newValue && isProfessional(accountType)) {
      feedimAlert("question", t("proAccountPrivateConfirm"), {
        showYesNo: true,
        onYes: async () => {
          await handleSwitchToPersonal(true);
        },
      });
      return;
    }

    const message = newValue
      ? t("makePrivateConfirm")
      : t("makePublicConfirm");

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
            minDelay(100),
          ]);
          if (!res.ok) {
            setIsPrivate(!newValue);
            feedimAlert("error", t("settingUpdateFailed"));
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
        const body: Record<string, string | boolean> = { account_type: "personal" };
        if (makePrivate) body.account_private = true;
        const [res] = await Promise.all([
          fetch("/api/profile", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          }),
          minDelay(100),
        ]);
        if (res.ok) {
          setAccountType("personal");
          setProfessionalCategory("");
          if (makePrivate) setIsPrivate(true);
          // silent
        } else {
          feedimAlert("error", t("accountTypeChangeFailed"));
        }
      } catch {
        feedimAlert("error", t("genericErrorRetry"));
      }
    };

    if (!makePrivate) {
      feedimAlert("question", t("switchToPersonalConfirm"), {
        showYesNo: true,
        onYes: doSwitch,
      });
    } else {
      await doSwitch();
    }
  };

  const handleSignOut = async () => {
    const { signOutCleanup } = await import("@/lib/authClient");
    await signOutCleanup();
    window.location.replace("/");
  };

  const handleLanguageChange = async (lang: string) => {
    if (lang === locale) return;
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language: lang }),
      });
      if (!res.ok) {
        feedimAlert("error", t("settingUpdateFailed"));
        return;
      }
      document.cookie = `fdm-locale=${lang};path=/;max-age=${86400 * 365};SameSite=Lax`;
      window.location.reload();
    } catch {
      feedimAlert("error", t("settingUpdateFailed"));
    }
  };

  const displayName = profile?.full_name || profile?.username || t("user");

  return (
    <AppLayout headerTitle={t("title")} hideRightSidebar>
      <div className="py-2">
        {loading ? (
          <div>
            <div className="flex items-center gap-3 px-4 py-4">
              <div className="w-14 h-14 rounded-full bg-bg-secondary shrink-0 animate-pulse" />
              <div className="flex-1 min-w-0 space-y-[7px]">
                <div className="h-[12px] w-28 bg-bg-secondary rounded-[5px] animate-pulse" />
                <div className="h-[9px] w-40 bg-bg-secondary rounded-[5px] animate-pulse" />
              </div>
            </div>
            <div className="mx-4 mt-3 mb-1 h-[62px] rounded-[13px] bg-bg-secondary animate-pulse" />
            <div className="mx-4 mt-3 mb-1 h-[62px] rounded-[13px] bg-bg-secondary animate-pulse" />
            <div className="mx-4 mt-3 mb-1 h-[62px] rounded-[13px] bg-bg-secondary animate-pulse" />
            <div className="mx-4 mt-3 mb-1 h-[62px] rounded-[13px] bg-bg-secondary animate-pulse" />
          </div>
        ) : (
          <>
            {/* Profile Header */}
            <div className="flex items-center gap-3 px-4 py-4">
              {profile?.avatar_url ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img suppressHydrationWarning data-src={profile.avatar_url} alt="" className="lazyload w-14 h-14 rounded-full object-cover bg-bg-tertiary border border-border-primary" />
                </>
              ) : (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img className="default-avatar-auto bg-bg-tertiary w-14 h-14 rounded-full object-cover border border-border-primary" alt="" />
                </>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-[1.05rem] truncate">{displayName}</p>
                <p className="text-[0.78rem] text-text-muted truncate">{user?.email}</p>
              </div>
            </div>

            {/* Coin Balance */}
            <Link href="/coins" className="mx-4 mt-3 mb-1 flex items-center justify-between px-4 py-3.5 rounded-[13px] bg-bg-secondary hover:bg-bg-tertiary transition-colors">
              <div className="flex items-center gap-3">
                <Wallet className="h-5 w-5 text-text-muted" />
                <div>
                  <span className="text-[0.88rem] font-medium">{t("balance")}</span>
                  <p className="text-[0.78rem] text-text-muted">{profile?.coin_balance?.toLocaleString(locale) || 0} {t("tokens")}</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-text-muted" />
            </Link>

            {/* Abonelik — admin için gizle */}
            {profile?.role !== "admin" && (
              profile?.is_premium ? (
                <Link href="/settings/premium" className={`mx-4 mt-3 mb-1 flex items-center gap-3 px-4 py-3.5 rounded-[13px] transition-colors ${getBadgeVariant(profile.premium_plan) === "max" ? "bg-verified-max/[0.06] hover:bg-verified-max/[0.1]" : "bg-accent-main/[0.06] hover:bg-accent-main/[0.1]"}`}>
                  <VerifiedBadge size="lg" variant={getBadgeVariant(profile.premium_plan)} role={profile?.role ?? undefined} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[0.88rem] font-semibold">Feedim {(profile.premium_plan || "").charAt(0).toUpperCase() + (profile.premium_plan || "").slice(1)}</p>
                    <p className="text-[0.78rem] text-text-muted mt-0.5">{t("premiumActive")}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-text-muted shrink-0" />
                </Link>
              ) : (
                <Link href="/settings/premium" className="mx-4 mt-3 mb-1 flex items-center gap-3 px-4 py-3.5 rounded-[13px] bg-bg-secondary hover:bg-bg-tertiary transition-colors">
                  <VerifiedBadge size="lg" className="opacity-50" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[0.88rem] font-semibold">{t("upgradeToPremium")}</p>
                    <p className="text-[0.78rem] text-text-muted mt-0.5">{t("premiumDesc")}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-text-muted shrink-0" />
                </Link>
              )
            )}

            {/* Hesap */}
            <h3 className="px-4 pt-6 pb-1 text-[0.7rem] font-semibold text-text-muted uppercase tracking-wider">{t("account")}</h3>
            <Link href="/profile" className="flex items-center justify-between px-4 py-3.5 rounded-[13px] hover:bg-bg-tertiary transition-colors">
              <div className="flex items-center gap-3">
                <User className="h-5 w-5 text-text-muted" />
                <span className="text-[0.88rem] font-medium">{t("profile")}</span>
              </div>
              <ChevronRight className="h-4 w-4 text-text-muted" />
            </Link>
            {(profile?.role === "admin" || profile?.role === "moderator") && (
              <Link href="/moderation" className="flex items-center justify-between px-4 py-3.5 rounded-[13px] hover:bg-bg-tertiary transition-colors">
                <div className="flex items-center gap-3">
                  <Shield className="h-5 w-5 text-text-muted" />
                  <span className="text-[0.88rem] font-medium">{t("moderation")}</span>
                </div>
                <ChevronRight className="h-4 w-4 text-text-muted" />
              </Link>
            )}
            <Link href="/transactions" className="flex items-center justify-between px-4 py-3.5 rounded-[13px] hover:bg-bg-tertiary transition-colors">
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-text-muted" />
                <span className="text-[0.88rem] font-medium">{t("transactionHistory")}</span>
              </div>
              <ChevronRight className="h-4 w-4 text-text-muted" />
            </Link>
            <Link href="/bookmarks" className="flex items-center justify-between px-4 py-3.5 rounded-[13px] hover:bg-bg-tertiary transition-colors">
              <div className="flex items-center gap-3">
                <Bookmark className="h-5 w-5 text-text-muted" />
                <span className="text-[0.88rem] font-medium">{t("bookmarks")}</span>
              </div>
              <ChevronRight className="h-4 w-4 text-text-muted" />
            </Link>
            <Link href="/withdrawal" className="flex items-center justify-between px-4 py-3.5 rounded-[13px] hover:bg-bg-tertiary transition-colors">
              <div className="flex items-center gap-3">
                <Wallet className="h-5 w-5 text-text-muted" />
                <span className="text-[0.88rem] font-medium">{t("withdrawal")}</span>
              </div>
              <ChevronRight className="h-4 w-4 text-text-muted" />
            </Link>
            <Link href="/settings/invite" className="flex items-center justify-between px-4 py-3.5 rounded-[13px] hover:bg-bg-tertiary transition-colors">
              <div className="flex items-center gap-3">
                <ShareIcon className="h-5 w-5 text-text-muted" />
                <span className="text-[0.88rem] font-medium">{t("inviteFriends")}</span>
              </div>
              <ChevronRight className="h-4 w-4 text-text-muted" />
            </Link>

            {/* Görünüm */}
            <h3 className="px-4 pt-6 pb-1 text-[0.7rem] font-semibold text-text-muted uppercase tracking-wider">{t("appearance")}</h3>
            <button
              onClick={() => setDarkModeOpen(true)}
              className="flex items-center justify-between w-full px-4 py-3.5 rounded-[13px] hover:bg-bg-tertiary transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                {currentTheme === "dark" ? <Moon className="h-5 w-5 text-text-muted" /> : currentTheme === "dim" ? <CloudMoon className="h-5 w-5 text-text-muted" /> : currentTheme === "light" ? <Sun className="h-5 w-5 text-text-muted" /> : <Monitor className="h-5 w-5 text-text-muted" />}
                <div>
                  <span className="text-[0.88rem] font-medium">{t("theme")}</span>
                  <p className="text-[0.78rem] text-text-muted mt-0.5">{tTheme(currentTheme === "light" ? "light" : currentTheme === "dark" ? "dark" : currentTheme === "dim" ? "dim" : "system")}</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-text-muted" />
            </button>

            <div className="flex items-center justify-between px-4 py-3.5 rounded-[13px]">
              <div className="flex items-center gap-3">
                <Sparkles className="h-5 w-5 text-text-muted" />
                <div>
                  <span className="text-[0.88rem] font-medium">{t("ambientLight")}</span>
                  <p className="text-[0.78rem] text-text-muted mt-0.5">{t("ambientLightDesc")}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  const next = ambientLight === "on" ? "off" : "on";
                  setAmbientLight(next);
                  localStorage.setItem("fdm-ambient-light", next);
                  window.dispatchEvent(new Event("fdm-ambient-toggle"));
                }}
                className={`relative w-11 h-6 rounded-full transition-colors duration-200 shrink-0 ${ambientLight === "on" ? "bg-accent-main" : "bg-bg-tertiary"}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${ambientLight === "on" ? "translate-x-5" : "translate-x-0"}`} />
              </button>
            </div>

            {/* Language selector */}
            <div className="flex items-center justify-between px-4 py-3.5 rounded-[13px]">
              <div className="flex items-center gap-3">
                <Globe className="h-5 w-5 text-text-muted" />
                <span className="text-[0.88rem] font-medium">{t("language")}</span>
              </div>
              <select
                value={locale}
                onChange={(e) => handleLanguageChange(e.target.value)}
                className="select-modern !w-auto !py-1.5 !px-3 !text-sm !rounded-[10px] min-w-[130px]"
              >
                <option value="tr">Türkçe</option>
                <option value="en">English</option>
                <option value="az">Azərbaycanca</option>
              </select>
            </div>

            {/* Gizlilik */}
            <h3 className="px-4 pt-6 pb-1 text-[0.7rem] font-semibold text-text-muted uppercase tracking-wider">{t("privacy")}</h3>
            <div className="flex items-center justify-between px-4 py-3.5 rounded-[13px]">
              <div className="flex items-center gap-3">
                <Lock className="h-5 w-5 text-text-muted" />
                <div>
                  <span className="text-[0.88rem] font-medium">{t("privateAccount")}</span>
                  <p className="text-[0.78rem] text-text-muted mt-0.5">{t("privateAccountDesc")}</p>
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
                <span className="text-[0.88rem] font-medium">{t("blockedUsers")}</span>
              </div>
              <ChevronRight className="h-4 w-4 text-text-muted" />
            </Link>
            <Link href="/settings/blocked-words" className="flex items-center justify-between px-4 py-3.5 rounded-[13px] hover:bg-bg-tertiary transition-colors">
              <div className="flex items-center gap-3">
                <EyeOff className="h-5 w-5 text-text-muted" />
                <div>
                  <span className="text-[0.88rem] font-medium">{t("blockedWords")}</span>
                  <p className="text-[0.78rem] text-text-muted mt-0.5">{t("blockedWordsDesc")}</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-text-muted" />
            </Link>

            {/* Bildirimler */}
            <h3 className="px-4 pt-6 pb-1 text-[0.7rem] font-semibold text-text-muted uppercase tracking-wider">{t("notifications")}</h3>
            <Link href="/settings/notifications" className="flex items-center justify-between px-4 py-3.5 rounded-[13px] hover:bg-bg-tertiary transition-colors">
              <div className="flex items-center gap-3">
                <Bell className="h-5 w-5 text-text-muted" />
                <span className="text-[0.88rem] font-medium">{t("notificationSettings")}</span>
              </div>
              <ChevronRight className="h-4 w-4 text-text-muted" />
            </Link>

            {/* Hesap Türü */}
            <h3 className="px-4 pt-6 pb-1 text-[0.7rem] font-semibold text-text-muted uppercase tracking-wider">{t("accountType")}</h3>
            {isProfessional(accountType) ? (
              <>
                <button
                  onClick={() => setProModalOpen(true)}
                  className="flex items-center justify-between w-full px-4 py-3.5 rounded-[13px] hover:bg-bg-tertiary transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <Briefcase className="h-5 w-5 text-accent-main" />
                    <div>
                      <span className="text-[0.88rem] font-medium">{accountType === "creator" ? t("creator") : t("business")}</span>
                      {professionalCategory && (
                        <p className="text-[0.78rem] text-text-muted mt-0.5">{tProf(getCategoryLabelKey(accountType, professionalCategory))}</p>
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
                    <span className="text-[0.88rem] font-medium text-text-muted">{t("switchToPersonal")}</span>
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
                    <span className="text-[0.88rem] font-medium">{t("switchToPro")}</span>
                    <p className="text-[0.78rem] text-text-muted mt-0.5">{t("proDesc")}</p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-text-muted" />
              </button>
            )}

            {/* Hesap Sağlığı */}
            <h3 className="px-4 pt-6 pb-1 text-[0.7rem] font-semibold text-text-muted uppercase tracking-wider">{t("accountHealth")}</h3>
            <Link href="/settings/health" className="flex items-center justify-between px-4 py-3.5 rounded-[13px] hover:bg-bg-tertiary transition-colors">
              <div className="flex items-center gap-3">
                <Shield className="h-5 w-5 text-text-muted" />
                <div>
                  <span className="text-[0.88rem] font-medium">{t("accountHealth")}</span>
                  <p className="text-[0.78rem] text-text-muted mt-0.5">{t("accountHealthDesc")}</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-text-muted" />
            </Link>

            {/* Telif Hakkı Koruması */}
            <h3 className="px-4 pt-6 pb-1 text-[0.7rem] font-semibold text-text-muted uppercase tracking-wider">{t("copyrightProtection")}</h3>
            <Link href="/settings/copyright" className="flex items-center justify-between px-4 py-3.5 rounded-[13px] hover:bg-bg-tertiary transition-colors">
              <div className="flex items-center gap-3">
                <Shield className="h-5 w-5 text-text-muted" />
                <div>
                  <span className="text-[0.88rem] font-medium">{t("copyrightProtection")}</span>
                  <p className="text-[0.78rem] text-text-muted mt-0.5">
                    {copyrightEligible
                      ? (copyrightEligibleSince ? `${new Date(copyrightEligibleSince).toLocaleDateString(locale, { year: "numeric", month: "long", day: "numeric" })}` : "")
                      : copyrightApplicationStatus === "pending"
                        ? t("applicationUnderReview")
                        : t("copyrightAutoDesc")}
                  </p>
                </div>
              </div>
              {copyrightEligible ? (
                <span className="flex items-center gap-1 text-[0.78rem] text-accent-main font-semibold"><Check className="h-3.5 w-3.5" />{t("copyrightActive")}</span>
              ) : (
                <ChevronRight className="h-4 w-4 text-text-muted" />
              )}
            </Link>

            {/* Para Kazanma */}
            <h3 className="px-4 pt-6 pb-1 text-[0.7rem] font-semibold text-text-muted uppercase tracking-wider">{t("monetization")}</h3>
            <Link href="/settings/monetization" className="flex items-center justify-between px-4 py-3.5 rounded-[13px] hover:bg-bg-tertiary transition-colors">
              <div className="flex items-center gap-3">
                <Coins className="h-5 w-5 text-text-muted" />
                <div>
                  <span className="text-[0.88rem] font-medium">{t("monetization")}</span>
                  <p className="text-[0.78rem] text-text-muted mt-0.5">
                    {monetizationEnabled
                      ? ""
                      : monetizationStatus === "pending"
                        ? t("monetizationUnderReview")
                        : t("monetizationAutoDesc")}
                  </p>
                </div>
              </div>
              {monetizationEnabled ? (
                <span className="flex items-center gap-1 text-[0.78rem] text-accent-main font-semibold"><Check className="h-3.5 w-3.5" />{t("monetizationActive")}</span>
              ) : (
                <ChevronRight className="h-4 w-4 text-text-muted" />
              )}
            </Link>

            {/* Güvenlik */}
            <h3 className="px-4 pt-6 pb-1 text-[0.7rem] font-semibold text-text-muted uppercase tracking-wider">{t("security")}</h3>
            <Link href="/security" className="flex items-center justify-between px-4 py-3.5 rounded-[13px] hover:bg-bg-tertiary transition-colors">
                <div className="flex items-center gap-3">
                  <div>
                    <span className="text-[0.88rem] font-medium">{t("email")}</span>
                    <p className="text-[0.78rem] text-text-muted mt-0.5">{user?.email}</p>
                  </div>
                </div>
              {emailVerified ? (
                <span className="flex items-center gap-1 text-[0.78rem] text-accent-main font-semibold"><Check className="h-3.5 w-3.5" />{t("emailVerifiedLabel")}</span>
              ) : (
                <span className="text-[0.78rem] text-accent-main font-semibold">{t("verifyEmailLabel")}</span>
              )}
            </Link>
            <Link href="/security" className="flex items-center justify-between px-4 py-3.5 rounded-[13px] hover:bg-bg-tertiary transition-colors">
              <div className="flex items-center gap-3">
                <Shield className="h-5 w-5 text-text-muted" />
                <span className="text-[0.88rem] font-medium">{t("securitySettings")}</span>
              </div>
              <ChevronRight className="h-4 w-4 text-text-muted" />
            </Link>
            <Link href="/settings/connected" className="flex items-center justify-between px-4 py-3.5 rounded-[13px] hover:bg-bg-tertiary transition-colors">
              <div className="flex items-center gap-3">
                <Link2 className="h-5 w-5 text-text-muted" />
                <span className="text-[0.88rem] font-medium">{t("connectedAccounts")}</span>
              </div>
              <ChevronRight className="h-4 w-4 text-text-muted" />
            </Link>
            <Link href="/settings/sessions" className="flex items-center justify-between px-4 py-3.5 rounded-[13px] hover:bg-bg-tertiary transition-colors">
              <div className="flex items-center gap-3">
                <Smartphone className="h-5 w-5 text-text-muted" />
                <span className="text-[0.88rem] font-medium">{t("activeSessions")}</span>
              </div>
              <ChevronRight className="h-4 w-4 text-text-muted" />
            </Link>

            {/* Bilgiler */}
            <h3 className="px-4 pt-6 pb-1 text-[0.7rem] font-semibold text-text-muted uppercase tracking-wider">{t("information")}</h3>
            <div className="flex items-center justify-between px-4 py-3.5 rounded-[13px]">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-text-muted" />
                <span className="text-sm text-text-muted">{t("joinDate")}</span>
              </div>
              <span className="text-[0.78rem]">{user?.created_at ? new Date(user.created_at).toLocaleDateString(locale, { year: "numeric", month: "long", day: "numeric" }) : "-"}</span>
            </div>
            <div className="flex items-center justify-between px-4 py-3.5 rounded-[13px]">
              <div className="flex items-center gap-3">
                <MapPin className="h-5 w-5 text-text-muted" />
                <span className="text-sm text-text-muted">{t("location")}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[0.78rem]">{locationText || t("locationUnknown")}</span>
                <button
                  onClick={updateLocation}
                  disabled={locationUpdating}
                  className="text-[0.7rem] font-medium text-accent-main hover:opacity-80 transition disabled:opacity-50"
                >
                  {locationUpdating ? <span className="loader" style={{ width: 12, height: 12 }} /> : t("changeLocation")}
                </button>
              </div>
            </div>
            <button
              onClick={() => { if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("fdm-open-hotkeys")); }}
              className="flex items-center justify-between w-full px-4 py-3.5 rounded-[13px] hover:bg-bg-tertiary transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <Keyboard className="h-5 w-5 text-text-muted" />
                <span className="text-[0.88rem] font-medium">{t("keyboardShortcuts")}</span>
              </div>
              <ChevronRight className="h-4 w-4 text-text-muted" />
            </button>

            {/* Destek & Yasal */}
            <h3 className="px-4 pt-6 pb-1 text-[0.7rem] font-semibold text-text-muted uppercase tracking-wider">{t("supportLegal")}</h3>
            <NewTabLink href="/help" className="flex items-center justify-between px-4 py-3.5 rounded-[13px] hover:bg-bg-tertiary transition-colors">
              <div className="flex items-center gap-3">
                <HelpCircle className="h-5 w-5 text-text-muted" />
                <span className="text-[0.88rem] font-medium">{t("helpCenter")}</span>
              </div>
              <ChevronRight className="h-4 w-4 text-text-muted" />
            </NewTabLink>
            <NewTabLink href="/contact" className="flex items-center justify-between px-4 py-3.5 rounded-[13px] hover:bg-bg-tertiary transition-colors">
              <div className="flex items-center gap-3">
                <MessageCircle className="h-5 w-5 text-text-muted" />
                <span className="text-[0.88rem] font-medium">{t("contactUs")}</span>
              </div>
              <ChevronRight className="h-4 w-4 text-text-muted" />
            </NewTabLink>
            <NewTabLink href="/terms" className="flex items-center justify-between px-4 py-3.5 rounded-[13px] hover:bg-bg-tertiary transition-colors">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-text-muted" />
                <span className="text-[0.88rem] font-medium">{t("termsOfService")}</span>
              </div>
              <ChevronRight className="h-4 w-4 text-text-muted" />
            </NewTabLink>
            <NewTabLink href="/privacy" className="flex items-center justify-between px-4 py-3.5 rounded-[13px] hover:bg-bg-tertiary transition-colors">
              <div className="flex items-center gap-3">
                <ScrollText className="h-5 w-5 text-text-muted" />
                <span className="text-[0.88rem] font-medium">{t("privacyPolicy")}</span>
              </div>
              <ChevronRight className="h-4 w-4 text-text-muted" />
            </NewTabLink>

            {/* Çıkış */}
            <div className="px-4 pt-6">
              <button onClick={handleSignOut} className="t-btn cancel w-full">
                <LogOut className="h-4 w-4" /> {t("signOut")}
              </button>
            </div>

            {/* Hesap Dondurma & Silme */}
            <div className="px-4 pt-4 pb-8 text-center">
              <div className="flex items-center justify-center gap-3">
                <Link href="/settings/freeze" className="text-[0.78rem] text-text-muted font-medium hover:text-accent-main transition">
                  {t("freezeAccount")}
                </Link>
                <span className="text-text-muted">|</span>
                <Link href="/settings/delete-account" className="text-[0.78rem] text-text-muted font-medium hover:text-error transition">
                  {t("deleteAccount")}
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
            feedimAlert("error", t("settingUpdateFailed"));
            return false;
          } catch {
            return false;
          }
        }}
      />
    </AppLayout>
  );
}
