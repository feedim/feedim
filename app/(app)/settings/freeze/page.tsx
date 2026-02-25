"use client";

import { useState } from "react";
import {useRouter, useSearchParams } from "next/navigation";
import { emitNavigationStart } from "@/lib/navigationProgress";
import Link from "next/link";
import { Snowflake, Info } from "lucide-react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { feedimAlert } from "@/components/FeedimAlert";
import AppLayout from "@/components/AppLayout";

const minDelay = (ms: number) => new Promise(r => setTimeout(r, ms));

const REASON_KEYS = [
  "freezeReason1",
  "freezeReason2",
  "freezeReason3",
  "freezeReason4",
  "freezeReasonOther",
] as const;

export default function FreezeAccountPage() {
  useSearchParams();
  const t = useTranslations("settings");
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [otherText, setOtherText] = useState("");
  const [freezing, setFreezing] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleFreeze = async () => {
    if (!selectedReason) {
      feedimAlert("error", t("pleaseSelectReason"));
      return;
    }

    setFreezing(true);
    try {
      const reason = selectedReason === t("freezeReasonOther") ? otherText.trim() || t("freezeReasonOther") : selectedReason;
      const [res] = await Promise.all([
        fetch("/api/account/freeze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason }),
        }),
        minDelay(2000),
      ]);

      if (res.ok) {
        await supabase.auth.signOut();
        emitNavigationStart();
        router.push("/");
      } else {
        const data = await res.json();
        feedimAlert("error", data.error || t("freezeFailed"));
      }
    } catch {
      feedimAlert("error", t("genericError"));
    } finally {
      setFreezing(false);
    }
  };

  return (
    <AppLayout headerTitle={t("freezeAccountTitle")} hideRightSidebar>
      <div className="py-4 px-4 sm:px-5 max-w-xl mx-auto">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-16 h-16 rounded-full bg-accent-main/10 flex items-center justify-center mb-4">
            <Snowflake className="h-8 w-8 text-accent-main" />
          </div>
          <h1 className="text-xl font-bold mb-2">{t("freezeAccountTitle")}</h1>
          <p className="text-sm text-text-muted">
            {t("freezeDesc")}
          </p>
        </div>

        {/* Reason Selection */}
        <div className="mb-5">
          <p className="text-sm font-semibold mb-3">{t("freezeWhyQuestion")}</p>
          <div className="flex flex-wrap gap-2">
            {REASON_KEYS.map((key) => {
              const label = t(key);
              return (
                <button
                  key={key}
                  onClick={() => setSelectedReason(label)}
                  className={`px-3.5 py-2 rounded-full text-sm font-medium transition-all ${
                    selectedReason === label
                      ? "bg-accent-main text-white"
                      : "bg-bg-secondary text-text-muted hover:bg-bg-tertiary"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
          {selectedReason === t("freezeReasonOther") && (
            <textarea
              value={otherText}
              onChange={(e) => setOtherText(e.target.value)}
              placeholder={t("writeReasonPlaceholder")}
              maxLength={500}
              className="input-modern w-full mt-3 min-h-[80px] resize-none"
            />
          )}
        </div>

        {/* Info Box */}
        <div className="bg-bg-secondary rounded-2xl p-4 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Info className="h-4 w-4 text-accent-main shrink-0" />
            <p className="text-sm font-semibold">{t("freezeInfoTitle")}</p>
          </div>
          <ul className="space-y-2 text-sm text-text-muted">
            <li className="flex items-start gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-text-muted/40 shrink-0" />
              {t("freezeInfo1")}
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-text-muted/40 shrink-0" />
              {t("freezeInfo2")}
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-text-muted/40 shrink-0" />
              {t("freezeInfo3")}
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-text-muted/40 shrink-0" />
              {t("freezeInfo4")}
            </li>
          </ul>
        </div>

        {/* Buttons */}
        <div className="space-y-3">
          <button
            onClick={handleFreeze}
            disabled={!selectedReason || freezing}
            className="t-btn accept w-full disabled:opacity-50"
            aria-label={t("freezeAccountTitle")}
          >
            {freezing ? <span className="loader" /> : t("freezeAccountTitle")}
          </button>
          <Link
            href="/settings"
            className="t-btn cancel w-full block text-center"
          >
            {t("cancelAction")}
          </Link>
        </div>
      </div>
    </AppLayout>
  );
}
