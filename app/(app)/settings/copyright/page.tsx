"use client";

import { useState, useEffect } from "react";
import {useRouter, useSearchParams } from "next/navigation";
import { Check } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import CopyrightApplicationForm from "@/components/CopyrightApplicationForm";
import ModerationContent from "@/app/[slug]/moderation/ModerationContent";
import { createClient } from "@/lib/supabase/client";
import { useTranslations, useLocale } from "next-intl";

export default function CopyrightSettingsPage() {
  const t = useTranslations("settings");
  const locale = useLocale();
  useSearchParams();
  const [loading, setLoading] = useState(true);
  const [copyrightEligible, setCopyrightEligible] = useState(false);
  const [copyrightEligibleSince, setCopyrightEligibleSince] = useState<string | null>(null);
  const [applicationStatus, setApplicationStatus] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState<string | null>(null);
  const [decisionCode, setDecisionCode] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.push("/login"); return; }

        const { data: profile } = await supabase
          .from("profiles")
          .select("copyright_eligible, copyright_eligible_since")
          .eq("user_id", user.id)
          .single();

        if (profile) {
          setCopyrightEligible(profile.copyright_eligible || false);
          setCopyrightEligibleSince(profile.copyright_eligible_since || null);
        }

        const appRes = await fetch("/api/copyright-applications");
        const appData = await appRes.json();
        if (appData.application) {
          setApplicationStatus(appData.application.status);
          if (appData.application.status === 'rejected') {
            setRejectNote(appData.application.reviewer_note || null);
          }
        }
        if (appData.decisionCode) {
          setDecisionCode(appData.decisionCode);
        }
      } catch {} finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <AppLayout headerTitle={t("copyrightTitle")} hideRightSidebar>
      <div className="px-4 py-4">
        {loading ? (
          <div className="flex justify-center py-8"><span className="loader" style={{ width: 22, height: 22 }} /></div>
        ) : copyrightEligible ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-accent-main font-bold">
              <Check className="h-4 w-4" />
              <span>{t("copyrightEnabledLabel")}{copyrightEligibleSince ? ` (${new Date(copyrightEligibleSince).toLocaleDateString(locale, { year: "numeric", month: "long", day: "numeric" })})` : ""}</span>
            </div>
            <p className="text-xs text-text-muted">
              {t("copyrightEnabledDesc")}
            </p>
          </div>
        ) : applicationStatus === "pending" ? (
          <div className="space-y-3">
            <div className="bg-accent-main/10 rounded-[13px] p-4">
              <p className="text-sm font-medium text-accent-main">{t("applicationPendingLabel")}</p>
              <p className="text-xs text-text-muted mt-1">{t("applicationPendingDesc")}</p>
            </div>
          </div>
        ) : applicationStatus === "approved" ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-success">
              <Check className="h-4 w-4" />
              <span>{t("applicationApprovedLabel")}</span>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-bg-secondary rounded-[15px] p-4 space-y-3">
              <p className="text-sm text-text-primary">
                {t("copyrightAutoExplanation")}
              </p>
              <p className="text-xs text-text-muted">
                {t("copyrightConditionsIntro")}
              </p>
              <ul className="space-y-1.5 text-xs text-text-muted">
                <li className="flex items-start gap-2"><span className="text-accent-main mt-0.5">&#8226;</span>{t("copyrightCond1")}</li>
                <li className="flex items-start gap-2"><span className="text-accent-main mt-0.5">&#8226;</span>{t("copyrightCond2")}</li>
                <li className="flex items-start gap-2"><span className="text-accent-main mt-0.5">&#8226;</span>{t("copyrightCond3")}</li>
                <li className="flex items-start gap-2"><span className="text-accent-main mt-0.5">&#8226;</span>{t("copyrightCond4")}</li>
                <li className="flex items-start gap-2"><span className="text-accent-main mt-0.5">&#8226;</span>{t("copyrightCond5")}</li>
                <li className="flex items-start gap-2"><span className="text-accent-main mt-0.5">&#8226;</span>{t("copyrightCond6")}</li>
              </ul>
              <p className="text-xs text-text-muted">
                {t("copyrightConditionsFooter")}
              </p>
            </div>

            {applicationStatus === "rejected" && (
              <div className="space-y-3">
                <div className="bg-error/5 rounded-[10px] p-3 space-y-2">
                  <p className="text-xs font-medium text-error">{t("applicationRejectedLabel")}</p>
                  {rejectNote && (
                    <p className="text-xs text-text-primary">{rejectNote}</p>
                  )}
                </div>
                <ModerationContent decisionCode={decisionCode} />
              </div>
            )}

            <CopyrightApplicationForm onSubmit={() => setApplicationStatus("pending")} />
          </div>
        )}
      </div>
    </AppLayout>
  );
}
