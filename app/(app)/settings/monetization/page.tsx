"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, X, Clock, Coins } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import AppLayout from "@/components/AppLayout";
import { feedimAlert } from "@/components/FeedimAlert";

interface Requirements {
  business: boolean;
  score: boolean;
  followers: boolean;
  views: boolean;
  accountAge: boolean;
  spam: boolean;
  email: boolean;
}

interface CurrentValues {
  profileScore: number;
  premiumFollowers: number;
  recentViews: number;
  accountAgeDays: number;
  spamScore: number;
}

export default function MonetizationSettingsPage() {
  useSearchParams();
  const t = useTranslations("monetization");
  const locale = useLocale();
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [monetizationEnabled, setMonetizationEnabled] = useState(false);
  const [monetizationStatus, setMonetizationStatus] = useState<string | null>(null);
  const [approvedAt, setApprovedAt] = useState<string | null>(null);
  const [requirements, setRequirements] = useState<Requirements | null>(null);
  const [currentValues, setCurrentValues] = useState<CurrentValues | null>(null);
  const [allMet, setAllMet] = useState(false);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/monetization");
        if (res.status === 401) { router.push("/login"); return; }
        if (res.ok) {
          const data = await res.json();
          setMonetizationEnabled(data.monetization_enabled || false);
          setMonetizationStatus(data.monetization_status || null);
          setApprovedAt(data.monetization_approved_at || null);
          setRequirements(data.requirements || null);
          setCurrentValues(data.currentValues || null);
          setAllMet(data.allRequirementsMet || false);
        }
      } catch {} finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleApply = async () => {
    setApplying(true);
    try {
      const res = await fetch("/api/monetization", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        feedimAlert("error", data.error || "Bir hata oluştu");
        return;
      }
      setMonetizationStatus("pending");
      feedimAlert("success", t("applicationSent"));
    } catch {
      feedimAlert("error", "Bir hata oluştu");
    } finally {
      setApplying(false);
    }
  };

  const requirementItems = requirements ? [
    { key: "business", met: requirements.business, label: t("requirementBusiness"), current: null },
    { key: "score", met: requirements.score, label: t("requirementScore"), current: currentValues ? `%${currentValues.profileScore}` : null },
    { key: "followers", met: requirements.followers, label: t("requirementFollowers"), current: currentValues ? String(currentValues.premiumFollowers) : null },
    { key: "views", met: requirements.views, label: t("requirementViews"), current: currentValues ? currentValues.recentViews.toLocaleString() : null },
    { key: "accountAge", met: requirements.accountAge, label: t("requirementAge"), current: currentValues ? `${currentValues.accountAgeDays}` : null },
    { key: "spam", met: requirements.spam, label: t("requirementSpam"), current: currentValues ? String(currentValues.spamScore) : null },
    { key: "email", met: requirements.email, label: t("requirementEmail"), current: null },
  ] : [];

  const dateLocale = locale === "az" ? "az-AZ" : locale === "en" ? "en-US" : "tr-TR";

  return (
    <AppLayout headerTitle={t("title")} hideRightSidebar>
      <div className="px-4 py-4">
        {loading ? (
          <div className="flex justify-center py-8"><span className="loader" style={{ width: 22, height: 22 }} /></div>
        ) : monetizationEnabled ? (
          /* Active state */
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-accent-main font-bold">
              <Check className="h-4 w-4" />
              <span>{t("statusActive")}</span>
            </div>
            {approvedAt && (
              <p className="text-xs text-text-muted">
                {t("approvedSince", { date: new Date(approvedAt).toLocaleDateString(dateLocale, { year: "numeric", month: "long", day: "numeric" }) })}
              </p>
            )}
          </div>
        ) : monetizationStatus === "pending" ? (
          /* Pending state */
          <div className="space-y-3">
            <div className="bg-accent-main/10 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="h-4 w-4 text-accent-main" />
                <p className="text-sm font-semibold text-accent-main">{t("statusPending")}</p>
              </div>
              <p className="text-xs text-text-muted mt-1">
                {t("statusPending")}
              </p>
            </div>
          </div>
        ) : (
          /* Apply state */
          <div className="space-y-4">
            {monetizationStatus === "rejected" && (
              <div className="bg-error/10 rounded-xl p-3">
                <p className="text-xs font-medium text-error">{t("statusRejected")}</p>
              </div>
            )}

            <div className="bg-bg-secondary rounded-[15px] p-4">
              <div className="flex items-center gap-2 mb-3">
                <Coins className="h-5 w-5 text-accent-main" />
                <p className="text-[0.9rem] font-bold">{t("applyTitle")}</p>
              </div>
              <p className="text-[0.82rem] text-text-secondary font-medium mb-4">{t("applyDesc")}</p>

              <ul className="space-y-2.5">
                {requirementItems.map((req) => (
                  <li key={req.key} className="flex items-center gap-2.5">
                    {req.met ? (
                      <div className="w-7 h-7 rounded-full bg-accent-main/10 flex items-center justify-center shrink-0">
                        <Check className="h-4 w-4 text-accent-main" />
                      </div>
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-bg-tertiary flex items-center justify-center shrink-0">
                        <X className="h-4 w-4 text-text-muted" />
                      </div>
                    )}
                    <span className={`text-[0.85rem] font-semibold ${req.met ? "text-text-primary" : "text-text-muted"}`}>
                      {req.label}
                    </span>
                    {req.current !== null && (
                      <span className={`text-[0.75rem] font-bold ml-auto shrink-0 ${req.met ? "text-accent-main" : "text-text-muted"}`}>
                        {req.current}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            <button
              onClick={handleApply}
              disabled={!allMet || applying}
              className="t-btn accept w-full"
            >
              {applying ? <span className="loader" style={{ width: 16, height: 16 }} /> : t("applyButton")}
            </button>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
