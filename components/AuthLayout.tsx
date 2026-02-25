"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowLeft } from "lucide-react";

interface AuthLayoutProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}

export default function AuthLayout({ title, subtitle, children }: AuthLayoutProps) {
  const router = useRouter();
  const t = useTranslations("auth");

  return (
    <div className="min-h-screen px-4 py-12 relative">
      <button
        onClick={() => router.back()}
        className="absolute top-6 left-4 flex items-center gap-2 text-text-muted hover:text-text-primary transition-colors"
        aria-label={t("goBack")}
      >
        <ArrowLeft className="h-5 w-5" />
        <span className="text-sm font-medium">{t("goBack")}</span>
      </button>

      <div className="flex items-center justify-center min-h-[calc(100vh-96px)] pb-[18vh] sm:pb-0">
        <div className="w-full max-w-md">
          <div className="space-y-3">
            <div className="text-left">
              <h1 className="text-[1.6rem] font-bold mb-[5px]">{title}</h1>
              <p className="text-text-muted text-sm">{subtitle}</p>
            </div>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
