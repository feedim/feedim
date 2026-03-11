"use client";

import { useState, memo, useMemo } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, Search, Bell, User, BookOpen, Users, Film, Clapperboard, LayoutGrid, Bookmark, BarChart3, Wallet, Settings, Sun, Moon, CloudMoon, Monitor, LogIn } from "lucide-react";
import { useUser } from "@/components/UserContext";
import { useNotificationCount } from "@/lib/useNotificationCount";
import Modal from "@/components/modals/Modal";
import { useLocale, useTranslations } from "next-intl";
import { emitNavigationStart } from "@/lib/navigationProgress";
import { formatCount } from "@/lib/utils";
import LazyAvatar from "@/components/LazyAvatar";
import { useHydrated } from "@/lib/useHydrated";

export default memo(function MobileBottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoggedIn } = useUser();
  const [moreOpen, setMoreOpen] = useState(false);
  const unreadCount = useNotificationCount(isLoggedIn, user?.id);
  const t = useTranslations();
  const locale = useLocale();
  const hydrated = useHydrated();

  const notificationsLabel = t("nav.notifications");

  const navItems = [
    { href: "/dashboard", icon: Home, label: t("nav.home"), active: pathname === "/dashboard" },
    { href: "/explore", icon: Search, label: t("nav.explore"), active: pathname === "/explore" },
    { href: "/notifications", icon: Bell, label: notificationsLabel, active: pathname === "/notifications" },
    { href: "/profile", icon: User, label: t("nav.profile"), active: pathname === "/profile" },
  ];

  const contentItems = [
    { href: "/notes", icon: Users, label: t("nav.communityNotes") },
    { href: "/moments", icon: Clapperboard, label: t("nav.moments") },
    { href: "/video", icon: Film, label: t("nav.video") },
    { href: "/posts", icon: BookOpen, label: t("nav.posts") },
  ];

  const quickAccessItems = [
    { href: "/bookmarks", icon: Bookmark, label: t("nav.bookmarks") },
    { href: "/analytics", icon: BarChart3, label: t("nav.analytics") },
    { href: "/coins", icon: Wallet, label: t("nav.balance") },
    { href: "/settings", icon: Settings, label: t("nav.settings") },
  ];

  const publicPaths = ["/", "/explore", "/moments", "/video"];
  const morePaths = ["/posts", "/notes", "/video", "/moments", "/bookmarks", "/analytics", "/coins", "/settings"];
  const moreActive = morePaths.some(p => pathname === p || pathname.startsWith(p + "/"));

  const theme = useMemo(() => {
    if (!hydrated) return "system";
    try {
      return localStorage.getItem("fdm-theme") || "dark";
    } catch {
      return "dark";
    }
  }, [hydrated]);

  const handleContentNav = (href: string) => {
    setMoreOpen(false);
    emitNavigationStart();
    router.push(href);
  };

  const themeLabel = theme === "system"
    ? t("theme.system")
    : theme === "light"
      ? t("theme.light")
      : theme === "dark"
        ? t("theme.dark")
        : t("theme.dim");

  const themeIcon = () => {
    if (theme === "dark") return <Moon className="h-5 w-5 shrink-0" />;
    if (theme === "dim") return <CloudMoon className="h-5 w-5 shrink-0" />;
    if (theme === "light") return <Sun className="h-5 w-5 shrink-0" />;
    return <Monitor className="h-5 w-5 shrink-0" />;
  };

  const itemClass = (active: boolean) =>
    `w-full flex items-center justify-between px-3 py-3.5 rounded-[13px] transition text-left ${
      active ? "bg-bg-secondary text-text-primary font-semibold" : "text-text-muted hover:text-text-primary hover:bg-bg-tertiary"
    }`;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-bg-primary bg-solid-primary border-t border-border-primary/30 md:hidden select-none">
      <div className="flex items-center justify-around h-14 px-1">
        {/* First two nav items */}
        {navItems.slice(0, 2).map((item) => {
          const Icon = item.icon;
          const resolvedHref = !isLoggedIn && !publicPaths.includes(item.href) ? "/login" : item.href;
          return (
            <Link
              key={item.href}
              href={resolvedHref}
              className={`flex items-center justify-center flex-1 h-full transition-colors ${
                item.active ? "text-accent-main" : "text-text-primary"
              }`}
              aria-label={item.label}
            >
              <Icon className="h-[26px] w-[26px]" strokeWidth={item.active ? 2.3 : 2} aria-hidden="true" />
            </Link>
          );
        })}

        {/* Center: More button */}
        <button
          onClick={() => setMoreOpen(true)}
          className={`flex items-center justify-center flex-1 h-full transition-colors ${
            moreActive ? "text-accent-main" : "text-text-primary"
          }`}
          aria-label={t("common.more")}
        >
          <LayoutGrid className="h-[26px] w-[26px]" strokeWidth={moreActive ? 2.3 : 2} aria-hidden="true" />
        </button>

        {/* Last two nav items */}
        {navItems.slice(2).map((item) => {
          const Icon = item.icon;
          const resolvedHref = !isLoggedIn && !publicPaths.includes(item.href) ? "/login" : item.href;
          return (
            <Link
              key={item.href}
              href={resolvedHref}
              className={`flex items-center justify-center flex-1 h-full transition-colors ${
                item.active ? "text-accent-main" : "text-text-primary"
              }`}
              aria-label={item.label}
            >
              <div className="relative">
                {item.icon === User && isLoggedIn ? (
                  <LazyAvatar src={user?.avatarUrl} alt="" sizeClass="h-8 w-8" borderClass="" className={item.active ? "ring-2 ring-accent-main" : ""} />
                ) : (
                  <Icon className="h-[26px] w-[26px]" strokeWidth={item.active ? 2.3 : 2} aria-hidden="true" />
                )}
                {item.label === notificationsLabel && unreadCount > 0 && (
                  <span className="absolute -top-1 -right-0.5 min-w-[14px] h-[14px] rounded-full bg-error text-white text-[8px] font-bold flex items-center justify-center px-0.5">
                    {formatCount(unreadCount, locale)}
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </div>

      {/* More modal */}
      <Modal open={moreOpen} onClose={() => setMoreOpen(false)} title={t("common.more")} size="sm">
        <div className="py-2 px-2 space-y-[2px]">
          <div className="px-3 pt-1 pb-1.5">
            <p className="text-[0.68rem] font-bold uppercase tracking-[0.08em] text-text-muted/75">
              {t("common.contentTypesSection")}
            </p>
          </div>
          {contentItems.map(item => {
            const Icon = item.icon;
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <button
                key={item.href}
                onClick={() => handleContentNav(item.href)}
                className={itemClass(active)}
              >
                <span className="text-[0.93rem] font-semibold">{item.label}</span>
                <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                  active ? "bg-accent-main/15" : "bg-bg-tertiary"
                }`}>
                  <Icon className={`h-[18px] w-[18px] ${active ? "text-accent-main" : "text-text-muted"}`} />
                </div>
              </button>
            );
          })}

          {isLoggedIn && (
            <>
              <div className="border-t border-border-primary/50 !my-1.5" />
              <div className="px-3 pt-1 pb-1.5">
                <p className="text-[0.68rem] font-bold uppercase tracking-[0.08em] text-text-muted/75">
                  {t("common.quickAccessSection")}
                </p>
              </div>
              {quickAccessItems.map(item => {
                const Icon = item.icon;
                const active = pathname === item.href || pathname.startsWith(item.href + "/");
                return (
                  <button
                    key={item.href}
                    onClick={() => handleContentNav(item.href)}
                    className={itemClass(active)}
                  >
                    <span className="text-[0.93rem] font-semibold">{item.label}</span>
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                      active ? "bg-accent-main/15" : "bg-bg-tertiary"
                    }`}>
                      <Icon className={`h-[18px] w-[18px] ${active ? "text-accent-main" : "text-text-muted"}`} />
                    </div>
                  </button>
                );
              })}
            </>
          )}

          <div className="border-t border-border-primary/50 !my-1.5" />
          <div className="px-3 pt-1 pb-1.5">
            <p className="text-[0.68rem] font-bold uppercase tracking-[0.08em] text-text-muted/75">
              {t("common.appearanceSection")}
            </p>
          </div>
          <button
            onClick={() => {
              setMoreOpen(false);
              setTimeout(() => {
                if (typeof window !== "undefined") {
                  window.dispatchEvent(new CustomEvent("fdm-open-darkmode"));
                }
              }, 160);
            }}
            className="w-full flex items-center gap-3 px-3 py-3.5 rounded-[13px] transition text-left text-text-muted hover:text-text-primary hover:bg-bg-tertiary"
          >
            {themeIcon()}
            <span className="text-[0.93rem] font-medium capitalize">{themeLabel}</span>
          </button>

          {!isLoggedIn && (
            <Link
              href="/login"
              onClick={() => setMoreOpen(false)}
              className="w-full flex items-center gap-3 px-3 py-3.5 rounded-[13px] transition text-left text-accent-main hover:bg-accent-main/10 font-semibold"
            >
              <LogIn className="h-5 w-5 shrink-0" />
              <span className="text-[0.93rem]">{t("common.login")}</span>
            </Link>
          )}
        </div>
      </Modal>
    </nav>
  );
})
