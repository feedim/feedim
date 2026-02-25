"use client";

import Link from "next/link";
import { FeedimIcon } from "@/components/FeedimLogo";
import PublicFooter from "@/components/PublicFooter";
import { useTranslations } from "next-intl";

export default function NotFound() {
  const t = useTranslations("errors");
  const tNav = useTranslations("nav");

  return (
    <div className="min-h-screen text-text-primary flex flex-col">
      <header className="flex items-center justify-center py-8">
        <Link href="/">
          <FeedimIcon className="h-[4.5rem] w-[4.5rem]" />
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 pb-24">
        <div className="text-center max-w-sm">
          <p className="text-[7rem] font-bold leading-none tracking-tight text-text-primary select-none mb-4">
            404
          </p>
          <h1 className="text-xl font-semibold mb-2">{t("pageNotExist")}</h1>
          <p className="text-sm text-text-muted mb-8 leading-relaxed">
            {t("pageNotExistDesc")}
          </p>
          <div className="flex flex-col sm:flex-row gap-2.5 justify-center">
            <button
              onClick={() => window.history.back()}
              className="t-btn cancel"
            >
              {t("goBack")}
            </button>
            <Link href="/" className="t-btn accept">
              {tNav("home")}
            </Link>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
