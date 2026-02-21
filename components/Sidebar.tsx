"use client";

import { useState, useEffect, memo } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Home, Search, Plus, Bell, Bookmark, User, Settings,
  Sun, Moon, CloudMoon, Monitor, LogIn, BarChart3, Wallet, Film, Clapperboard
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import DarkModeModal from "@/components/modals/DarkModeModal";
import CreateMenuModal from "@/components/modals/CreateMenuModal";
import { FeedimIcon } from "@/components/FeedimLogo";
import PublicFooter from "@/components/PublicFooter";
import { useUser } from "@/components/UserContext";
import VerifiedBadge, { getBadgeVariant } from "@/components/VerifiedBadge";

export default memo(function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const { user, isLoggedIn } = useUser();

  const [theme, setTheme] = useState("system");
  const [darkModeOpen, setDarkModeOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!isLoggedIn) return;

    const loadUnreadCount = () => {
      fetch("/api/notifications?count=true")
        .then(r => r.json())
        .then(d => setUnreadCount(d.unread_count || 0))
        .catch(() => {});
    };

    loadUnreadCount();
    const interval = setInterval(loadUnreadCount, 30000);

    return () => clearInterval(interval);
  }, [isLoggedIn]);

  useEffect(() => {
    const saved = localStorage.getItem("fdm-theme") || "system";
    setTheme(saved);
  }, []);

  const themeIcon = () => {
    if (theme === "dark") return <Moon className="h-5 w-5" />;
    if (theme === "dim") return <CloudMoon className="h-5 w-5" />;
    if (theme === "light") return <Sun className="h-5 w-5" />;
    return <Monitor className="h-5 w-5" />;
  };

  const navItems = [
    { href: "/dashboard", icon: Home, label: "Ana Sayfa" },
    { href: "/dashboard/explore", icon: Search, label: "Keşfet" },
    { href: "/dashboard/video", icon: Film, label: "Video" },
    { href: "/dashboard/moments", icon: Clapperboard, label: "Moments" },
    { href: "/dashboard/notifications", icon: Bell, label: "Bildirimler" },
    { href: "/dashboard/bookmarks", icon: Bookmark, label: "Kaydedilenler" },
    { href: "/dashboard/analytics", icon: BarChart3, label: "Analitik" },
    { href: "/dashboard/coins", icon: Wallet, label: "Bakiye" },
    { href: "/dashboard/profile", icon: User, label: "Profil" },
  ];

  const isActive = (href: string) => pathname === href;

  return (
    <aside className="hidden md:flex flex-col fixed left-0 top-0 bottom-0 z-40 w-[240px]">
      {/* Logo */}
      <div className="pt-5 pb-1 px-4">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <FeedimIcon className="h-[56px] w-[56px]" />
        </Link>
      </div>


      {/* Nav items */}
      <nav className="flex-1 px-2 py-2 space-y-[5px] overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          const publicPaths = ["/dashboard", "/dashboard/explore"];
          const resolvedHref = !isLoggedIn && !publicPaths.includes(item.href) ? "/login" : item.href;
          return (
            <Link
              key={item.href}
              href={resolvedHref}
              className={`flex items-center gap-3 px-3 py-3 rounded-[10px] transition-all text-[0.93rem] font-medium ${
                active
                  ? "bg-bg-secondary text-text-primary font-semibold"
                  : "text-text-muted hover:text-text-primary hover:bg-bg-tertiary"
              }`}
            >
              <div className="relative shrink-0">
                <Icon className="h-5 w-5" />
                {item.label === "Bildirimler" && unreadCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-[16px] rounded-full bg-error text-white text-[9px] font-bold flex items-center justify-center px-0.5">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </div>
              <span>{item.label}</span>
            </Link>
          );
        })}

        {/* Theme toggle */}
        <button
          onClick={() => setDarkModeOpen(true)}
          className="flex items-center gap-3 w-full px-3 py-3 rounded-[10px] text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-all text-[0.93rem] font-medium"
        >
          {themeIcon()}
          <span className="capitalize">{theme === "system" ? "Sistem" : theme === "light" ? "Açık" : theme === "dark" ? "Koyu" : "Dim"}</span>
        </button>

        {/* Settings */}
        <Link
          href={!isLoggedIn ? "/login" : "/dashboard/settings"}
          className={`flex items-center gap-3 px-3 py-3 rounded-[10px] transition-all text-[0.93rem] font-medium ${
            isActive("/dashboard/settings")
              ? "bg-bg-secondary text-text-primary font-semibold"
              : "text-text-muted hover:text-text-primary hover:bg-bg-tertiary"
          }`}
        >
          <Settings className="h-5 w-5 shrink-0" />
          <span>Ayarlar</span>
        </Link>
      </nav>

      {/* Bottom: Write + User */}
      <div className="px-2 py-3 space-y-2">
        {isLoggedIn ? (
          <>
            {/* Create post button */}
            <button
              onClick={() => setCreateModalOpen(true)}
              className="flex items-center gap-3 transition-all px-2 w-full"
            >
              <div className="flex items-center gap-2 w-full h-[44px] rounded-full bg-bg-inverse text-bg-primary justify-center font-semibold text-[0.91rem]">
                <Plus className="shrink-0 h-4 w-4" />
                <span>Oluştur</span>
              </div>
            </button>

            {/* User info */}
            <Link href="/dashboard/profile" className="flex items-center gap-2.5 py-2 px-2 rounded-[10px] hover:bg-bg-tertiary transition">
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt="" className="w-9 h-9 rounded-full object-cover shrink-0" />
              ) : (
                <img className="default-avatar-auto w-9 h-9 rounded-full object-cover shrink-0" alt="" />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <p className="text-sm font-semibold truncate">{user?.fullName || "Kullanıcı"}</p>
                  {user?.isVerified && (
                    <VerifiedBadge size="sm" variant={getBadgeVariant(user.premiumPlan)} />
                  )}
                </div>
                <p className="text-xs text-text-muted truncate">@{user?.username}</p>
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
              <span>Giriş Yap</span>
            </div>
          </Link>
        )}
      </div>
      {/* Footer Links — SEO */}
      <PublicFooter variant="compact" />

      {/* Modals */}
      <DarkModeModal open={darkModeOpen} onClose={() => { setDarkModeOpen(false); setTheme(localStorage.getItem("fdm-theme") || "system"); }} />
      <CreateMenuModal open={createModalOpen} onClose={() => setCreateModalOpen(false)} />
    </aside>
  );
})
