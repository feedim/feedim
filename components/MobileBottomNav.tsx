"use client";

import { useState, useEffect, memo } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, Search, Bell, User, BookOpen, Users, Film, Clapperboard, LayoutGrid } from "lucide-react";
import { useUser } from "@/components/UserContext";
import Modal from "@/components/modals/Modal";
import { useTranslations } from "next-intl";
import { emitNavigationStart } from "@/lib/navigationProgress";

export default memo(function MobileBottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoggedIn } = useUser();
  const [moreOpen, setMoreOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const t = useTranslations();

  useEffect(() => {
    if (!isLoggedIn) return;

    const load = () => {
      fetch("/api/notifications?count=true")
        .then(r => r.json())
        .then(d => setUnreadCount(d.unread_count || 0))
        .catch(() => {});
    };
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [isLoggedIn]);

  const notificationsLabel = t("nav.notifications");

  const navItems = [
    { href: "/dashboard", icon: Home, label: t("nav.home"), active: pathname === "/dashboard" },
    { href: "/explore", icon: Search, label: t("nav.explore"), active: pathname === "/explore" },
    { href: "/notifications", icon: Bell, label: notificationsLabel, active: pathname === "/notifications" },
    { href: "/profile", icon: User, label: t("nav.profile"), active: pathname === "/profile" },
  ];

  const contentItems = [
    { href: "/posts", icon: BookOpen, label: t("nav.posts") },
    { href: "/notes", icon: Users, label: t("nav.communityNotes") },
    { href: "/video", icon: Film, label: t("nav.video") },
    { href: "/moments", icon: Clapperboard, label: t("nav.moments") },
  ];

  const publicPaths = ["/", "/explore", "/moments", "/video"];
  const moreActive = ["/posts", "/notes", "/video", "/moments"].some(p => pathname === p || pathname.startsWith(p + "/"));

  const handleContentNav = (href: string) => {
    setMoreOpen(false);
    emitNavigationStart();
    router.push(href);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-bg-primary bg-solid-primary border-t border-border-primary/30 md:hidden">
      <div className="flex items-center justify-around h-14 px-0">
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
                {item.icon === User && isLoggedIn && user?.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt=""
                    className={`h-8 w-8 rounded-full object-cover ${item.active ? "ring-2 ring-accent-main" : ""}`}
                  />
                ) : item.icon === User && isLoggedIn && !user?.avatarUrl ? (
                  <img className={`default-avatar-auto h-8 w-8 rounded-full object-cover ${item.active ? "ring-2 ring-accent-main" : ""}`} alt="" />
                ) : (
                  <Icon className="h-[26px] w-[26px]" strokeWidth={item.active ? 2.3 : 2} aria-hidden="true" />
                )}
                {item.label === notificationsLabel && unreadCount > 0 && (
                  <span className="absolute -top-1 -right-0.5 min-w-[14px] h-[14px] rounded-full bg-error text-white text-[8px] font-bold flex items-center justify-center px-0.5">
                    {unreadCount > 99 ? "99+" : unreadCount}
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
          {contentItems.map(item => {
            const Icon = item.icon;
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <button
                key={item.href}
                onClick={() => handleContentNav(item.href)}
                className={`w-full flex items-center gap-3 px-3 py-3.5 rounded-[13px] transition text-left ${
                  active ? "bg-bg-secondary text-text-primary font-semibold" : "text-text-muted hover:text-text-primary hover:bg-bg-tertiary"
                }`}
              >
                <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                  active ? "bg-accent-main/15" : "bg-bg-tertiary"
                }`}>
                  <Icon className={`h-[18px] w-[18px] ${active ? "text-accent-main" : "text-text-muted"}`} />
                </div>
                <span className="text-[0.93rem] font-medium">{item.label}</span>
              </button>
            );
          })}
        </div>
      </Modal>
    </nav>
  );
})
