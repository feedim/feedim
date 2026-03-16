"use client";

import { memo, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { smartBack } from "@/lib/smartBack";
import { Plus } from "lucide-react";
import BackButton from "@/components/BackButton";
import { FeedimIcon } from "@/components/FeedimLogo";
import { useUser } from "@/components/UserContext";
import CreateMenuModal from "@/components/modals/CreateMenuModal";
import { useTranslations } from "next-intl";

interface ColumnHeaderProps {
  rightAction?: React.ReactNode;
  onBack?: () => void;
  customTitle?: string;
  scrollable?: boolean;
}

export default memo(function ColumnHeader({ rightAction, onBack, customTitle, scrollable }: ColumnHeaderProps = {}) {
  const { isLoggedIn } = useUser();
  const pathname = usePathname();
  const router = useRouter();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const t = useTranslations();

  useEffect(() => {
    try {
      if (
        typeof window !== "undefined" &&
        window.matchMedia("(max-width: 1279px)").matches &&
        sessionStorage.getItem("fdm-open-create-modal") === "1"
      ) {
        setCreateModalOpen(true);
      } else {
        setCreateModalOpen(false);
      }
    } catch {}
  }, [pathname]);

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

  const isHome = pathname === "/" || pathname === "/dashboard" || pathname === "/notifications";
  const pageTitle = customTitle || pageTitles[pathname] || (pathname.startsWith("/u/") ? t("nav.profile") : null);

  const handleBack = onBack || (() => smartBack(router));

  return (
    <>
    <header className="z-50 mt-[4px] select-none">
      <nav className="relative flex items-center justify-between px-3 h-[53px]">
        {/* Left */}
        {isHome && !customTitle ? (
          <>
            <button
              onClick={() => isLoggedIn ? setCreateModalOpen(true) : router.push("/login")}
              className="i-btn !w-9 !h-9 text-text-primary md:!hidden"
              aria-label={t("common.create")}
            >
              <Plus className="h-7 w-7" strokeWidth={2.2} />
            </button>
            <Link href="/" aria-label="Feedim" className="md:hidden absolute left-1/2 -translate-x-1/2 rounded-full hover:bg-bg-secondary transition">
              <FeedimIcon className="h-12 w-12" />
            </Link>
            <span className="hidden md:block text-[1.5rem] font-bold">{t("nav.home")}</span>
          </>
        ) : (
          <div className="flex items-center gap-2.5">
            <BackButton onClick={handleBack} className="i-btn !w-8 !h-8 text-text-primary" />
            <span className={`text-[1.2rem] font-bold ${!pageTitle ? "hidden" : ""}`}>{pageTitle || ""}</span>
          </div>
        )}

        {/* Right */}
        <div className="flex items-center gap-2.5 ml-auto">
          <div id="header-right-slot" />
          {rightAction ? (
            <>{rightAction}</>
          ) : null}
        </div>
      </nav>
    </header>
    <CreateMenuModal open={createModalOpen} onClose={() => {
      try {
        sessionStorage.removeItem("fdm-open-create-modal");
      } catch {}
      setCreateModalOpen(false);
    }} />
    </>
  );
})
