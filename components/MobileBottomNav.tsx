"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Heart, User, Bookmark, Compass } from "lucide-react";

export default function MobileBottomNav() {
  const pathname = usePathname();

  const navItems = [
    {
      href: "/dashboard",
      icon: Home,
      label: "Ana Sayfa",
      active: pathname === "/dashboard",
    },
    {
      href: "/dashboard/saved",
      icon: Bookmark,
      label: "Kaydedilenler",
      active: pathname === "/dashboard/saved",
    },
    {
      href: "/dashboard/explore",
      icon: Compass,
      label: "Keşfet",
      active: pathname === "/dashboard/explore",
    },
    {
      href: "/dashboard/my-pages",
      icon: Heart,
      label: "Sayfalarım",
      active: pathname === "/dashboard/my-pages",
    },
    {
      href: "/dashboard/profile",
      icon: User,
      label: "Profil",
      active: pathname === "/dashboard/profile",
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-black/95 backdrop-blur-xl border-t border-white/10 md:hidden">
      <div className="flex items-center justify-around h-16 px-0">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors ${
                item.active
                  ? "text-pink-500"
                  : "text-zinc-400 hover:text-white"
              }`}
              aria-label={item.label}
            >
              <Icon className="h-[22px] w-[22px]" aria-hidden="true" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
