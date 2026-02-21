"use client";

import { memo } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { FeedimIcon } from "@/components/FeedimLogo";
import { useUser } from "@/components/UserContext";

const pageTitles: Record<string, string> = {
  "/dashboard": "Ana Sayfa",
  "/dashboard/explore": "Keşfet",
  "/dashboard/notifications": "Bildirimler",
  "/dashboard/bookmarks": "Kaydedilenler",
  "/dashboard/write": "Yeni Gönderi",
  "/dashboard/coins": "Bakiye",
  "/dashboard/coins/buy": "Jeton Satın Al",
  "/dashboard/security": "Güvenlik",
  "/dashboard/payment": "Jeton Satın Al",
  "/dashboard/subscription-payment": "Abonelik",
  "/dashboard/transactions": "İşlem Geçmişi",
  "/dashboard/withdrawal": "Ödeme Alma",
  "/dashboard/video": "Video",
  "/dashboard/write/video": "Video",
};

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

  const isHome = pathname === "/dashboard";
  const isPublicContent = pathname.startsWith("/post/") || pathname.startsWith("/u/");
  const pageTitle = customTitle || pageTitles[pathname] || (pathname.startsWith("/u/") ? "Profil" : null);

  const handleBack = onBack || (() => {
    try {
      const ref = document.referrer;
      if (ref && new URL(ref).origin === window.location.origin) {
        router.back();
        return;
      }
    } catch {}
    router.push("/dashboard");
  });

  return (
    <header className={`${scrollable ? "" : "sticky top-0"} z-50 bg-bg-primary sticky-ambient`}>
      <nav className="relative flex items-center justify-between px-4 h-[53px]">
        {/* Left */}
        {isHome && !customTitle ? (
          <>
            <Link href="/dashboard" aria-label="Feedim" className="md:hidden absolute left-1/2 -translate-x-1/2">
              <FeedimIcon className="h-14 w-14" />
            </Link>
            <span className="hidden md:block text-[1.22rem] font-bold">Ana Sayfa</span>
          </>
        ) : (
          <div className="flex items-center gap-2.5">
            <button onClick={handleBack} className="i-btn !w-8 !h-8 text-text-primary" aria-label="Geri">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <span className={`text-[1.22rem] font-bold ${!pageTitle ? "hidden" : ""}`}>{pageTitle || ""}</span>
          </div>
        )}

        {/* Right */}
        <div className="flex items-center gap-2.5 ml-auto">
          <div id="header-right-slot" />
          {rightAction ? (
            <>{rightAction}</>
          ) : isHome && !customTitle ? (
            <div className="flex items-center gap-2.5 md:hidden">
            <Link href="/dashboard/profile">
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt="Avatar" className="w-8 h-8 rounded-full object-cover" />
              ) : (
                <img className="default-avatar-auto w-8 h-8 rounded-full object-cover" alt="" />
              )}
            </Link>
            </div>
          ) : null}
        </div>
      </nav>
    </header>
  );
})
