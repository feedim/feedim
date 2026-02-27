"use client";

import { useState, useEffect } from "react";
import {useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import AppLayout from "@/components/AppLayout";
import { createClient } from "@/lib/supabase/client";

export default function AccountHealthPage() {
  useSearchParams();
  const t = useTranslations("settings");
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [health, setHealth] = useState<any>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.push("/login"); return; }

        const [profileRes, healthRes] = await Promise.all([
          supabase
            .from("profiles")
            .select("profile_score, copyright_strike_count, status, created_at")
            .eq("user_id", user.id)
            .single(),
          fetch("/api/account/health"),
        ]);

        if (profileRes.data) setProfile(profileRes.data);

        if (healthRes.ok) {
          const healthData = await healthRes.json();
          setHealth(healthData);
        }
      } catch {} finally {
        setLoading(false);
      }
    })();
  }, []);

  const rawScore = Math.min(100, Math.max(0, profile?.profile_score || 0));
  const trustScore = Math.round(rawScore * 10) / 10;

  const categories = [
    { labelKey: "healthCopyright" as const, count: health?.copyright_strikes ?? (profile?.copyright_strike_count || 0), max: 10, descKey: "healthCopyrightDesc" as const },
    { labelKey: "healthCopyContent" as const, count: health?.copy_content_strikes ?? 0, max: 10, descKey: "healthCopyContentDesc" as const },
    { labelKey: "healthNsfw" as const, count: health?.nsfw_strikes ?? 0, max: 10, descKey: "healthNsfwDesc" as const },
    { labelKey: "healthSpam" as const, count: health?.spam_strikes ?? 0, max: 10, descKey: "healthSpamDesc" as const },
  ];

  const totalStrikes = categories.reduce((sum, c) => sum + c.count, 0);

  const getScoreColor = (score: number) => {
    if (score >= 70) return "text-success";
    if (score >= 40) return "text-accent-main";
    return "text-error";
  };

  const getScoreBarColor = (score: number) => {
    if (score >= 70) return "bg-success";
    if (score >= 40) return "bg-accent-main";
    return "bg-error";
  };

  return (
    <AppLayout headerTitle={t("healthTitle")} hideRightSidebar>
      <div className="px-4 py-4 space-y-5">
        {loading ? (
          <div className="flex justify-center py-8"><span className="loader" style={{ width: 22, height: 22 }} /></div>
        ) : (
          <>
            {/* Trust Score */}
            <div className="bg-bg-secondary rounded-[15px] p-5">
              <div className="flex flex-col items-center text-center space-y-2">
                <span className="text-5xl font-bold text-text-primary">%{trustScore}</span>
                <p className="text-sm font-medium text-text-primary">{t("healthTrustScore")}</p>
                <p className="text-[0.72rem] text-text-muted">
                  {trustScore >= 70
                    ? t("healthScoreHealthy")
                    : trustScore >= 40
                      ? t("healthScoreMedium")
                      : t("healthScoreRisk")}
                </p>
                <Link href="/help/profile-score" className="text-[0.72rem] text-accent-main hover:underline mt-2 inline-block">
                  {t("healthLearnMore")} &rarr;
                </Link>
              </div>
              <div className="flex items-center justify-center gap-4 mt-4 pt-3 border-t border-border-primary">
                <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-success" /><span className="text-[0.65rem] text-text-muted">{t("healthLabelHealthy")}</span></div>
                <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-accent-main" /><span className="text-[0.65rem] text-text-muted">{t("healthLabelMedium")}</span></div>
                <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-error" /><span className="text-[0.65rem] text-text-muted">{t("healthLabelRisk")}</span></div>
              </div>
            </div>

            {/* Strike Rights */}
            <div className="bg-bg-secondary rounded-[15px] p-4 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-text-primary">{t("healthStrikeRights")}</p>
                {totalStrikes > 0 && (
                  <span className="text-xs text-error font-medium">{t("healthTotalStrikes", { count: totalStrikes })}</span>
                )}
              </div>

              {categories.map((item) => (
                <div key={item.labelKey} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-text-primary">{t(item.labelKey)}</p>
                    <span className={`text-xs ${item.count > 0 ? "text-error font-medium" : "text-text-muted"}`}>{item.count}/{item.max}</span>
                  </div>
                  <div className="flex gap-1">
                    {Array.from({ length: item.max }).map((_, i) => (
                      <div
                        key={i}
                        className={`flex-1 h-1.5 rounded-full ${i < item.count ? "bg-error" : "bg-border-primary"}`}
                      />
                    ))}
                  </div>
                  <p className="text-[0.65rem] text-text-muted">{t(item.descKey)}</p>
                </div>
              ))}
            </div>

            {/* Rules */}
            <div className="bg-bg-secondary rounded-[15px] p-4 space-y-2">
              <p className="text-xs font-medium text-text-primary">{t("healthHowItWorks")}</p>
              <ul className="space-y-1.5 text-[0.72rem] text-text-muted">
                <li>{t("healthRule1")}</li>
                <li>{t("healthRule2")}</li>
                <li>{t("healthRule3")}</li>
              </ul>
            </div>

            {/* Links */}
            <div className="space-y-2">
              <Link href="/help/moderation" className="block text-xs text-accent-main hover:underline">
                {t("healthCopyrightLink")} &rarr;
              </Link>
              <Link href="/help/community-guidelines" className="block text-xs text-accent-main hover:underline">
                {t("healthGuidelinesLink")} &rarr;
              </Link>
              <Link href="/help/contact" className="block text-xs text-accent-main hover:underline">
                {t("healthSupportLink")} &rarr;
              </Link>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}
