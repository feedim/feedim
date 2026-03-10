"use client";

import { useState, useEffect, memo, lazy, Suspense, useMemo, type ComponentType } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  Home, Search, Plus, Bell, Bookmark, User, Users, Settings,
  Sun, Moon, CloudMoon, Monitor, LogIn, BarChart3, Wallet, Film, Clapperboard, Keyboard,
  BookOpen, ChevronDown, LayoutGrid
} from "lucide-react";
const DarkModeModal = lazy(() => import("@/components/modals/DarkModeModal"));
const CreateMenuModal = lazy(() => import("@/components/modals/CreateMenuModal"));
import { FeedimIcon } from "@/components/FeedimLogo";
import PublicFooter from "@/components/PublicFooter";
import { useUser } from "@/components/UserContext";
import { useNotificationCount } from "@/lib/useNotificationCount";
import VerifiedBadge, { getBadgeVariant } from "@/components/VerifiedBadge";
import { useLocale, useTranslations } from "next-intl";
import { formatCount } from "@/lib/utils";
import { useHydrated } from "@/lib/useHydrated";
import LazyAvatar from "@/components/LazyAvatar";

export default memo(function Sidebar() {
  const pathname = usePathname();
  const { user, isLoggedIn } = useUser();
  const t = useTranslations();
  const locale = useLocale();
  const hydrated = useHydrated();

  const contentNavItems = [
    { href: "/posts", icon: BookOpen, label: t("nav.posts") },
    { href: "/notes", icon: Users, label: t("nav.communityNotes") },
    { href: "/video", icon: Film, label: t("nav.video") },
    { href: "/moments", icon: Clapperboard, label: t("nav.moments") },
  ];

  const contentPaths = contentNavItems.map(i => i.href);

  const [themeVersion, setThemeVersion] = useState(0);
  const [darkModeOpen, setDarkModeOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const unreadCount = useNotificationCount(isLoggedIn, user?.id);
  const [contentExpanded, setContentExpanded] = useState(() =>
    contentPaths.some(p => pathname === p || pathname.startsWith(p + "/"))
  );
  const theme = useMemo(() => {
    if (!hydrated) return "system";
    try {
      return localStorage.getItem("fdm-theme") || "dark";
    } catch {
      return "dark";
    }
  }, [hydrated, themeVersion]);
  const pendingCreateIntent = useMemo(() => {
    if (!hydrated) return false;
    try {
      return sessionStorage.getItem("fdm-open-create-modal") === "1";
    } catch {
      return false;
    }
  }, [createModalOpen, hydrated]);
  const createModalVisible = createModalOpen || pendingCreateIntent;

  useEffect(() => {
    const handler = () => setDarkModeOpen(true);
    window.addEventListener("fdm-open-darkmode", handler);
    return () => window.removeEventListener("fdm-open-darkmode", handler);
  }, []);

  const themeIcon = () => {
    if (theme === "dark") return <Moon className="h-5 w-5" />;
    if (theme === "dim") return <CloudMoon className="h-5 w-5" />;
    if (theme === "light") return <Sun className="h-5 w-5" />;
    return <Monitor className="h-5 w-5" />;
  };

  const topNavItems = [
    { href: "/dashboard", icon: Home, label: t("nav.home") },
  ];

  const afterContentNavItems = [
    { href: "/notifications", icon: Bell, label: t("nav.notifications") },
    { href: "/bookmarks", icon: Bookmark, label: t("nav.bookmarks") },
    { href: "/analytics", icon: BarChart3, label: t("nav.analytics") },
    { href: "/coins", icon: Wallet, label: t("nav.balance") },
  ];

  const isActive = (href: string) => pathname === href;
  const publicPaths = ["/", "/explore", "/moments", "/video", "/notes", "/posts"];

  const notificationsLabel = t("nav.notifications");

  // Tooltip map — show keyboard shortcut hints on hover
  const tooltipMap: Record<string, string> = {
    "/dashboard": t("tooltip.home"),
    "/explore": t("tooltip.explore"),
    "/notifications": t("tooltip.notifications"),
    "/profile": t("tooltip.profile"),
    "/settings": t("tooltip.settings"),
    "/moments": t("tooltip.moments"),
  };

  const renderNavItem = (item: { href: string; icon: ComponentType<{ className?: string }>; label: string }, indent?: boolean) => {
    const Icon = item.icon;
    const active = isActive(item.href);
    const resolvedHref = !isLoggedIn && !publicPaths.includes(item.href) ? "/login" : item.href;
    const tip = tooltipMap[item.href];
    return (
      <Link
        key={item.href}
        href={resolvedHref}
        {...(tip ? { "data-tooltip": tip } : {})}
        className={`flex items-center gap-3 px-3 py-3 rounded-[10px] transition-all text-[0.93rem] font-medium ${
          indent ? "pl-7" : ""
        } ${
          active
            ? "bg-bg-secondary text-text-primary font-semibold"
            : "text-text-muted hover:text-text-primary hover:bg-bg-tertiary"
        }`}
      >
        {indent && <span className="w-[2px] h-3.5 rounded-full bg-border-primary shrink-0 -ml-1" />}
        <div className="relative shrink-0">
          <Icon className="h-5 w-5" />
          {item.label === notificationsLabel && unreadCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-[16px] rounded-full bg-error text-white text-[9px] font-bold flex items-center justify-center px-0.5">
              {formatCount(unreadCount, locale)}
            </span>
          )}
        </div>
        <span>{item.label}</span>
      </Link>
    );
  };

  const themeLabel = theme === "system" ? t("theme.system") : theme === "light" ? t("theme.light") : theme === "dark" ? t("theme.dark") : t("theme.dim");

  return (
    <aside className="hidden md:flex flex-col fixed left-0 top-0 bottom-0 z-40 w-[240px] select-none">
      {/* Logo */}
      <div className="pt-5 pb-1 px-4">
        <Link href="/" className="flex items-center gap-2.5 rounded-full hover:bg-bg-secondary transition w-max">
          <FeedimIcon className="h-[56px] w-[56px]" />
        </Link>
      </div>


      {/* Nav items */}
      <nav className="flex-1 px-2 py-2 space-y-[3px] overflow-y-auto">
        {topNavItems.map(item => renderNavItem(item))}

        {renderNavItem({ href: "/explore", icon: Search, label: t("nav.explore") })}

        {/* Content accordion */}
        <button
          onClick={() => setContentExpanded(prev => !prev)}
          className={`flex items-center gap-3 w-full px-3 py-3 rounded-[10px] transition-all text-[0.93rem] font-medium ${
            contentExpanded && contentPaths.some(p => pathname === p || pathname.startsWith(p + "/"))
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
            {contentNavItems.map(item => renderNavItem(item, true))}
          </div>
        )}

        {isLoggedIn && afterContentNavItems.map(item => renderNavItem(item))}

        {isLoggedIn && (
          <Link
            href="/settings"
            data-tooltip={t("tooltip.settings")}
            className={`flex items-center gap-3 px-3 py-3 rounded-[10px] transition-all text-[0.93rem] font-medium ${
              isActive("/settings")
                ? "bg-bg-secondary text-text-primary font-semibold"
                : "text-text-muted hover:text-text-primary hover:bg-bg-tertiary"
            }`}
          >
            <Settings className="h-5 w-5 shrink-0" />
            <span>{t("nav.settings")}</span>
          </Link>
        )}

        {isLoggedIn && renderNavItem({ href: "/profile", icon: User, label: t("nav.profile") })}

        {/* Theme toggle */}
        <button
          onClick={() => setDarkModeOpen(true)}
          aria-label={t("tooltip.theme")}
          data-tooltip={t("tooltip.theme")}
          onPointerDown={() => { void import("@/components/modals/DarkModeModal"); }}
          onMouseEnter={() => { void import("@/components/modals/DarkModeModal"); }}
          className="flex items-center gap-3 w-full px-3 py-3 rounded-[10px] text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-all text-[0.93rem] font-medium"
        >
          {themeIcon()}
          <span className="capitalize">{themeLabel}</span>
        </button>

        {/* Shortcuts */}
        <button
          onClick={() => { if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("fdm-open-hotkeys")); }}
          aria-label={t("tooltip.shortcuts")}
          data-tooltip={t("tooltip.shortcuts")}
          className="flex items-center gap-3 w-full px-3 py-3 rounded-[10px] text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-all text-[0.93rem] font-medium text-left"
        >
          <Keyboard className="h-5 w-5 shrink-0" />
          <span>{t("nav.shortcuts")}</span>
        </button>
      </nav>

      {/* Bottom: Write + User */}
      <div className="px-2 py-3 space-y-2 border-t border-border-primary">
        {isLoggedIn ? (
          <>
            {/* Create post button */}
            <button
              onClick={() => setCreateModalOpen(true)}
              data-tooltip={t("tooltip.create")}
              aria-label={t("tooltip.create")}
              onPointerDown={() => { void import("@/components/modals/CreateMenuModal"); }}
              onMouseEnter={() => { void import("@/components/modals/CreateMenuModal"); }}
              className="flex items-center gap-3 transition-all px-2 w-full"
            >
              <div className="flex items-center gap-2 w-full h-[44px] rounded-full bg-bg-inverse text-bg-primary justify-center font-semibold text-[0.91rem]">
                <Plus className="shrink-0 h-4 w-4" />
                <span>{t("common.create")}</span>
              </div>
            </button>

            {/* User info */}
            <Link href="/profile" className="flex items-center gap-[7px] py-2 px-2 rounded-[10px] hover:bg-bg-tertiary transition">
              <LazyAvatar src={user?.avatarUrl} alt="" sizeClass="w-9 h-9" className="shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <p className="text-[0.87rem] font-semibold truncate">{user?.fullName || t("common.user")}</p>
                  {(user?.role === "admin" || user?.isVerified) && (
                    <VerifiedBadge size="sm" variant={getBadgeVariant(user.premiumPlan)} role={user.role} />
                  )}
                </div>
                <p className="text-[0.7rem] text-text-muted truncate -mt-[2px]">@{user?.username}</p>
              </div>
            </Link>
          </>
        ) : (
          <Link
            href="/login"
            className="flex items-center gap-3 transition-all px-2"
          >
            <div className="flex items-center gap-2 w-full h-[44px] rounded-full bg-accent-main text-white justify-center font-semibold text-[0.91rem]">
              <LogIn className="shrink-0 h-4 w-4" />
              <span>{t("common.login")}</span>
            </div>
          </Link>
        )}
      </div>
      {/* Footer Links — SEO */}
      <PublicFooter variant="compact" />

      {/* Modals */}
      <Suspense fallback={null}>
        <DarkModeModal open={darkModeOpen} onClose={() => { setDarkModeOpen(false); setThemeVersion((version) => version + 1); }} />
      </Suspense>
      <Suspense fallback={null}>
        <CreateMenuModal open={createModalVisible} onClose={() => {
          try {
            sessionStorage.removeItem("fdm-open-create-modal");
          } catch {}
          setCreateModalOpen(false);
        }} />
      </Suspense>
    </aside>
  );
})
