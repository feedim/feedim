"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowLeft } from "lucide-react";
import { smartBack } from "@/lib/smartBack";

const RULES_DISMISSED_KEY = "fdm_rules_seen";

interface AuthLayoutProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  showRulesModal?: boolean;
}

export default function AuthLayout({ title, subtitle, children, showRulesModal }: AuthLayoutProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations("auth");
  const tNav = useTranslations("nav");
  const [rulesOpen, setRulesOpen] = useState(false);

  useEffect(() => {
    if (!showRulesModal) return;
    try {
      if (!sessionStorage.getItem(RULES_DISMISSED_KEY)) {
        const timer = setTimeout(() => setRulesOpen(true), 700);
        return () => clearTimeout(timer);
      }
    } catch {}
  }, [showRulesModal]);

  const dismissRules = () => {
    setRulesOpen(false);
    try { sessionStorage.setItem(RULES_DISMISSED_KEY, "1"); } catch {}
  };

  const navigated = !!searchParams.get("next");

  const handleBack = () => smartBack(router, "/");

  return (
    <div className="min-h-screen px-4 py-12 relative">
      <button
        onClick={handleBack}
        className="absolute top-6 left-4 flex items-center gap-2 text-text-muted hover:text-text-primary transition-colors hover:underline"
        aria-label={navigated ? t("goBack") : tNav("home")}
      >
        <ArrowLeft className="h-5 w-5" />
        <span className="text-sm font-medium">{navigated ? t("goBack") : tNav("home")}</span>
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

      {/* Rules Modal */}
      {rulesOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 px-4">
          <div className="bg-bg-primary rounded-2xl w-full max-w-md p-6 shadow-xl">
            <h2 className="text-[1.3rem] font-extrabold text-center mb-5 text-accent-main">
              {t("rulesTitle")}
            </h2>
            <div className="space-y-3 text-[0.88rem] font-bold uppercase leading-relaxed max-h-[220px] overflow-y-auto px-2">
              <div>
                <p className="text-[0.78rem] font-semibold text-accent-main">GELİN TÜRKİYE'NİN SOSYAL İÇERİK PROJESİNİ BİRLİKTE İNŞA EDELİM.</p>
                <div className="h-[1.5px] bg-accent-main/40 mt-2 rounded-full" />
              </div>
              <p>1. {t("rule1")}</p>
              <p>2. {t("rule2")}</p>
              <p>3. {t("rule3")}</p>
              <p>4. {t("rule4")}</p>
              <p>5. {t("rule5")}</p>
              <p>6. PAYLAŞTIĞINIZ İÇERİKLER SİZİN SORUMLULUĞUNUZDADIR.</p>
            </div>
            <button
              onClick={dismissRules}
              className="t-btn accept w-full mt-6"
            >
              {t("rulesUnderstood")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
