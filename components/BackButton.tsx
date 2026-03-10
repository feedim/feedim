"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { smartBack } from "@/lib/smartBack";
import { useTranslations } from "next-intl";

interface BackButtonProps {
  fallback?: string;
  variant?: "default" | "overlay";
  className?: string;
  onClick?: () => void;
}

export default function BackButton({ fallback = "/dashboard", variant = "default", className, onClick }: BackButtonProps) {
  const router = useRouter();
  const t = useTranslations("common");

  const handleClick = onClick || (() => smartBack(router, fallback));

  if (variant === "overlay") {
    return (
      <button
        onClick={handleClick}
        className={className || "w-10 h-10 rounded-full flex items-center justify-center pointer-events-auto"}
        aria-label={t("back")}
      >
        <ArrowLeft className="h-5 w-5 text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.6)]" />
      </button>
    );
  }

  return (
    <button
      onClick={handleClick}
      className={className || "i-btn !w-8 !h-8 text-text-muted"}
      aria-label={t("back")}
    >
      <ArrowLeft className="h-5 w-5" />
    </button>
  );
}
