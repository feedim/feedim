"use client";

import { memo, useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { emitNavigationStart } from "@/lib/navigationProgress";
import {
  ArrowLeft, Menu, Home, Search, BookOpen, Users, Film, Clapperboard,
  Bell, Bookmark, BarChart3, Wallet, Settings, User,
  LayoutGrid, ChevronDown, Sun, Moon, CloudMoon, Monitor, LogIn
} from "lucide-react";
import { FeedimIcon } from "@/components/FeedimLogo";
import { useUser } from "@/components/UserContext";
import Modal from "@/components/modals/Modal";

const pageTitles: Record<string, string> = {
  "/": "Ana Sayfa",
  "/explore": "Keşfet",
  "/notifications": "Bildirimler",
  "/bookmarks": "Kaydedilenler",
  "/create": "Yeni Gönderi",
  "/coins": "Bakiye",
  "/coins/buy": "Jeton Satın Al",
  "/security": "Güvenlik",
  "/app-payment": "Jeton Satın Al",
  "/subscription-payment": "Abonelik",
  "/transactions": "İşlem Geçmişi",
  "/withdrawal": "Ödeme Alma",
  "/video": "Video",
  "/create/video": "Video",
};

const mobileTopItems = [
  { href: "/", icon: Home, label: "Ana Sayfa" },
  { href: "/explore", icon: Search, label: "Keşfet" },
];

const mobileContentItems = [
  { href: "/posts", icon: BookOpen, label: "Gönderiler" },
  { href: "/notes", icon: Users, label: "Topluluk Notları" },
  { href: "/video", icon: Film, label: "Video" },
  { href: "/moments", icon: Clapperboard, label: "Moments" },
];

const mobileContentPaths = mobileContentItems.map(i => i.href);

const mobileAuthNavItems = [
  { href: "/notifications", icon: Bell, label: "Bildirimler" },
  { href: "/bookmarks", icon: Bookmark, label: "Kaydedilenler" },
  { href: "/analytics", icon: BarChart3, label: "Analitik" },
  { href: "/coins", icon: Wallet, label: "Bakiye" },
  { href: "/settings", icon: Settings, label: "Ayarlar" },
  { href: "/profile", icon: User, label: "Profil" },
];

interface ColumnHeaderProps {
  rightAction?: React.ReactNode;
  onBack?: () => void;
  customTitle?: string;
  scrollable?: boolean;
}

export default memo(function ColumnHeader({ rightAction, onBack, customTitle, scrollable }: ColumnHeaderProps = {}) {
  const { user, isLoggedIn } = useUser();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [contentExpanded, setContentExpanded] = useState(() =>
    mobileContentPaths.some(p => pathname === p || pathname.startsWith(p + "/"))
  );
  const [theme, setTheme] = useState("system");

  useEffect(() => {
    const saved = localStorage.getItem("fdm-theme") || "dark";
    setTheme(saved);
  }, []);

  const isHome = pathname === "/";
  const pageTitle = customTitle || pageTitles[pathname] || (pathname.startsWith("/u/") ? "Profil" : null);

  const handleBack = onBack || (() => {
    try {
      const ref = document.referrer;
      if (ref && new URL(ref).origin === window.location.origin) {
        router.back();
        return;
      }
    } catch {}
    emitNavigationStart();
    router.push("/");
  });

  const themeIcon = () => {
    if (theme === "dark") return <Moon className="h-5 w-5" />;
    if (theme === "dim") return <CloudMoon className="h-5 w-5" />;
    if (theme === "light") return <Sun className="h-5 w-5" />;
    return <Monitor className="h-5 w-5" />;
  };

  const themeLabel = theme === "system" ? "Sistem" : theme === "light" ? "Açık" : theme === "dark" ? "Koyu" : "Dim";

  const navItemClass = (active: boolean) =>
    `flex items-center gap-3 px-3 py-3 rounded-[10px] transition-all text-[0.93rem] font-medium ${
      active ? "bg-bg-secondary text-text-primary font-semibold" : "text-text-muted hover:text-text-primary hover:bg-bg-tertiary"
    }`;

  return (
    <>
    <header className={`${scrollable ? "" : "sticky top-0"} z-50 sticky-ambient mt-[4px]`}>
      <nav className="relative flex items-center justify-between px-4 h-[53px]">
        {/* Left */}
        {isHome && !customTitle ? (
          <>
            <Link href="/" aria-label="Feedim" className="md:hidden absolute left-1/2 -translate-x-1/2 rounded-full hover:bg-bg-secondary transition">
              <FeedimIcon className="h-14 w-14" />
            </Link>
            <span className="hidden md:block text-[1.5rem] font-bold">Ana Sayfa</span>
          </>
        ) : (
          <div className="flex items-center gap-2.5">
            <button onClick={handleBack} className="i-btn !w-8 !h-8 text-text-primary" aria-label="Geri">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <span className={`text-[1.1rem] font-bold ${!pageTitle ? "hidden" : ""}`}>{pageTitle || ""}</span>
          </div>
        )}

        {/* Right */}
        <div className="flex items-center gap-2.5 ml-auto">
          <div id="header-right-slot" />
          {rightAction ? (
            <>{rightAction}</>
          ) : isHome && !customTitle ? (
            <button
              onClick={() => setMobileNavOpen(true)}
              className="i-btn !w-8 !h-8 text-text-muted hover:text-text-primary md:hidden"
              aria-label="Menü"
            >
              <Menu className="h-5 w-5" />
            </button>
          ) : null}
        </div>
      </nav>
    </header>

    {/* Mobile navigation modal */}
    <Modal open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} title="Menü" size="sm" hideHeader>
      <div className="pt-[3px] pb-2 px-2 space-y-[5px]">
        {/* Ana Sayfa, Keşfet */}
        {mobileTopItems.map(item => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <Link key={item.href} href={item.href} onClick={() => setMobileNavOpen(false)} className={navItemClass(active)}>
              <Icon className="h-5 w-5 shrink-0" />
              <span>{item.label}</span>
            </Link>
          );
        })}

        {/* Daha Fazla accordion */}
        <button
          onClick={() => setContentExpanded(prev => !prev)}
          className={`flex items-center gap-3 w-full px-3 py-3 rounded-[10px] transition-all text-[0.93rem] font-medium ${
            contentExpanded && mobileContentPaths.some(p => pathname === p || pathname.startsWith(p + "/"))
              ? "text-text-primary"
              : "text-text-muted hover:text-text-primary hover:bg-bg-tertiary"
          }`}
        >
          <LayoutGrid className="h-5 w-5 shrink-0" />
          <span className="flex-1 text-left">Daha Fazla</span>
          <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${contentExpanded ? "rotate-180" : ""}`} />
        </button>
        {contentExpanded && (
          <div className="space-y-[2px]">
            {mobileContentItems.map(item => {
              const Icon = item.icon;
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileNavOpen(false)}
                  className={`flex items-center gap-3 pl-7 px-3 py-3 rounded-[10px] transition-all text-[0.93rem] font-medium ${
                    active ? "bg-bg-secondary text-text-primary font-semibold" : "text-text-muted hover:text-text-primary hover:bg-bg-tertiary"
                  }`}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        )}

        {/* Auth items */}
        {isLoggedIn && (
          <>
            <div className="border-t border-border-primary !my-1.5" />
            {mobileAuthNavItems.map(item => {
              const Icon = item.icon;
              const active = pathname === item.href;
              return (
                <Link key={item.href} href={item.href} onClick={() => setMobileNavOpen(false)} className={navItemClass(active)}>
                  <Icon className="h-5 w-5 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </>
        )}

        {/* Bottom: Theme + Shortcuts */}
        <div className="border-t border-border-primary !my-1.5" />
        <button
          onClick={() => {
            setMobileNavOpen(false);
            setTimeout(() => {
              if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("fdm-open-darkmode"));
            }, 200);
          }}
          className="flex items-center gap-3 w-full px-3 py-3 rounded-[10px] text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-all text-[0.93rem] font-medium"
        >
          {themeIcon()}
          <span className="capitalize">{themeLabel}</span>
        </button>
        {/* Login button for non-authenticated users */}
        {!isLoggedIn && (
          <>
            <div className="border-t border-border-primary !my-1.5" />
            <Link
              href="/login"
              onClick={() => setMobileNavOpen(false)}
              className="flex items-center gap-3 px-3 py-3 rounded-[10px] transition text-[0.93rem] font-semibold text-accent-main hover:bg-accent-main/10"
            >
              <LogIn className="h-5 w-5 shrink-0" />
              <span>Giriş Yap</span>
            </Link>
          </>
        )}
      </div>
    </Modal>
    </>
  );
})
