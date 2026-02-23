"use client";

import { useState, useEffect, memo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, Bell, User } from "lucide-react";
import { useUser } from "@/components/UserContext";
import CreateMenuModal from "@/components/modals/CreateMenuModal";

export default memo(function MobileBottomNav() {
  const pathname = usePathname();
  const { user, isLoggedIn } = useUser();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (sessionStorage.getItem("fdm-open-create-modal")) {
      sessionStorage.removeItem("fdm-open-create-modal");
      setCreateModalOpen(true);
    }
  }, []);

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

  const navItems = [
    { href: "/dashboard", icon: Home, label: "Ana Sayfa", active: pathname === "/dashboard" },
    { href: "/dashboard/explore", icon: Search, label: "Keşfet", active: pathname === "/dashboard/explore" },
    { href: "/dashboard/notifications", icon: Bell, label: "Bildirimler", active: pathname === "/dashboard/notifications" },
    { href: "/dashboard/profile", icon: User, label: "Profil", active: pathname === "/dashboard/profile" },
  ];

  const publicPaths = ["/dashboard", "/dashboard/explore"];

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
              <Icon className="h-6 w-6" strokeWidth={item.active ? 2.3 : 2} aria-hidden="true" />
            </Link>
          );
        })}

        {/* Center: Create button */}
        <button
          onClick={() => isLoggedIn ? setCreateModalOpen(true) : window.location.href = "/login"}
          className="flex items-center justify-center flex-1 h-full transition-colors text-text-primary"
          aria-label="Oluştur"
        >
          <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M4 12H20M12 4V20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
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
                    className={`h-7 w-7 rounded-full object-cover ${item.active ? "ring-2 ring-accent-main" : ""}`}
                  />
                ) : item.icon === User && isLoggedIn && !user?.avatarUrl ? (
                  <img className={`default-avatar-auto h-7 w-7 rounded-full object-cover ${item.active ? "ring-2 ring-accent-main" : ""}`} alt="" />
                ) : (
                  <Icon className="h-6 w-6" strokeWidth={item.active ? 2.3 : 2} aria-hidden="true" />
                )}
                {item.label === "Bildirimler" && unreadCount > 0 && (
                  <span className="absolute -top-1 -right-2 min-w-[14px] h-[14px] rounded-full bg-error text-white text-[8px] font-bold flex items-center justify-center px-0.5">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </div>
      <CreateMenuModal open={createModalOpen} onClose={() => setCreateModalOpen(false)} />
    </nav>
  );
})
