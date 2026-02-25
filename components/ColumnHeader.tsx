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
import { useTranslations } from "next-intl";

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
  const t = useTranslations();

  const pageTitles: Record<string, string> = {
    "/": t("nav.home"),
    "/explore": t("nav.explore"),
    "/notifications": t("nav.notifications"),
    "/bookmarks": t("nav.bookmarks"),
    "/create": t("columnHeader.newPost"),
    "/coins": t("nav.balance"),
    "/coins/buy": t("columnHeader.buyTokens"),
    "/security": t("columnHeader.security"),
    "/app-payment": t("columnHeader.buyTokens"),
    "/subscription-payment": t("columnHeader.subscription"),
    "/transactions": t("columnHeader.transactionHistory"),
    "/withdrawal": t("columnHeader.withdrawal"),
    "/video": t("nav.video"),
    "/create/video": t("nav.video"),
  };

  const mobileTopItems = [
    { href: "/", icon: Home, label: t("nav.home") },
    { href: "/explore", icon: Search, label: t("nav.explore") },
  ];

  const mobileContentItems = [
    { href: "/posts", icon: BookOpen, label: t("nav.posts") },
    { href: "/notes", icon: Users, label: t("nav.communityNotes") },
    { href: "/video", icon: Film, label: t("nav.video") },
    { href: "/moments", icon: Clapperboard, label: t("nav.moments") },
  ];

  const mobileContentPaths = mobileContentItems.map(i => i.href);

  const mobileAuthNavItems = [
    { href: "/notifications", icon: Bell, label: t("nav.notifications") },
    { href: "/bookmarks", icon: Bookmark, label: t("nav.bookmarks") },
    { href: "/analytics", icon: BarChart3, label: t("nav.analytics") },
    { href: "/coins", icon: Wallet, label: t("nav.balance") },
    { href: "/settings", icon: Settings, label: t("nav.settings") },
    { href: "/profile", icon: User, label: t("nav.profile") },
  ];

  const [contentExpanded, setContentExpanded] = useState(() =>
    mobileContentPaths.some(p => pathname === p || pathname.startsWith(p + "/"))
  );
  const [theme, setTheme] = useState("system");

  useEffect(() => {
    const saved = localStorage.getItem("fdm-theme") || "dark";
    setTheme(saved);
  }, []);

  const isHome = pathname === "/";
  const pageTitle = customTitle || pageTitles[pathname] || (pathname.startsWith("/u/") ? t("nav.profile") : null);

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

  const themeLabel = theme === "system" ? t("theme.system") : theme === "light" ? t("theme.light") : theme === "dark" ? t("theme.dark") : t("theme.dim");

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
            <span className="hidden md:block text-[1.5rem] font-bold">{t("nav.home")}</span>
          </>
        ) : (
          <div className="flex items-center gap-2.5">
            <button onClick={handleBack} className="i-btn !w-8 !h-8 text-text-primary" aria-label={t("common.back")}>
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
              aria-label={t("nav.menu")}
            >
              <Menu className="h-5 w-5" />
            </button>
          ) : null}
        </div>
      </nav>
    </header>

    {/* Mobile navigation modal */}
    <Modal open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} title={t("nav.menu")} size="sm" hideHeader>
      <div className="pt-[3px] pb-2 px-2 space-y-[5px]">
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

        {/* Content accordion */}
        <button
          onClick={() => setContentExpanded(prev => !prev)}
          className={`flex items-center gap-3 w-full px-3 py-3 rounded-[10px] transition-all text-[0.93rem] font-medium ${
            contentExpanded && mobileContentPaths.some(p => pathname === p || pathname.startsWith(p + "/"))
              ? "text-text-primary"
              : "text-text-muted hover:text-text-primary hover:bg-bg-tertiary"
          }`}
        >
          <LayoutGrid className="h-5 w-5 shrink-0" />
          <span className="flex-1 text-left">{t("common.more")}</span>
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

        {/* Bottom: Theme */}
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
              <span>{t("common.login")}</span>
            </Link>
          </>
        )}
      </div>
    </Modal>
    </>
  );
})
