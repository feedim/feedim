"use client";

import { useState } from "react";
import {useRouter, useSearchParams } from "next/navigation";
import { emitNavigationStart } from "@/lib/navigationProgress";
import Link from "next/link";
import { Trash2, AlertTriangle } from "lucide-react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { feedimAlert } from "@/components/FeedimAlert";
import AppLayout from "@/components/AppLayout";
import PasswordInput from "@/components/PasswordInput";

const minDelay = (ms: number) => new Promise(r => setTimeout(r, ms));

const DELETE_REASON_KEYS = [
  "deleteReason1",
  "deleteReason2",
  "deleteReason3",
  "deleteReason4",
  "deleteReasonOther",
] as const;

export default function DeleteAccountPage() {
  useSearchParams();
  const t = useTranslations("settings");
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [otherText, setOtherText] = useState("");
  const [password, setPassword] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleDelete = async () => {
    if (!selectedReason) {
      feedimAlert("error", t("pleaseSelectReason"));
      return;
    }
    if (!password) {
      feedimAlert("error", t("pleaseEnterPassword"));
      return;
    }
    if (confirmText !== "DELETE") {
      feedimAlert("error", t("pleaseTypeDelete"));
      return;
    }

    setDeleting(true);
    try {
      // Verify password
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) {
        feedimAlert("error", t("sessionNotFound"));
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password,
      });

      if (signInError) {
        feedimAlert("error", t("wrongPassword"));
        setDeleting(false);
        return;
      }

      const reason = selectedReason === t("deleteReasonOther") ? otherText.trim() || t("deleteReasonOther") : selectedReason;
      const [res] = await Promise.all([
        fetch("/api/account/delete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason }),
        }),
        minDelay(2000),
      ]);

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || t("deleteAccountFailed"));
      }

      await supabase.auth.signOut();
      emitNavigationStart();
      router.push("/");
    } catch (error: any) {
      feedimAlert("error", error.message || t("genericError"));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AppLayout headerTitle={t("deleteAccountTitle")} hideRightSidebar>
      <div className="py-4 px-4 sm:px-5 max-w-xl mx-auto">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-16 h-16 rounded-full bg-error/10 flex items-center justify-center mb-4">
            <Trash2 className="h-8 w-8 text-error" />
          </div>
          <h1 className="text-xl font-bold mb-2">{t("deleteAccountTitle")}</h1>
          <p className="text-sm text-text-muted">
            {t("deleteAccountDesc")}
          </p>
        </div>

        {/* Reason Selection */}
        <div className="mb-5">
          <p className="text-sm font-semibold mb-3">{t("deleteWhyQuestion")}</p>
          <div className="flex flex-wrap gap-2">
            {DELETE_REASON_KEYS.map((key) => {
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
          {selectedReason === t("deleteReasonOther") && (
            <textarea
              value={otherText}
              onChange={(e) => setOtherText(e.target.value)}
              placeholder={t("writeReasonPlaceholder")}
              maxLength={500}
              className="input-modern w-full mt-3 min-h-[80px] resize-none"
            />
          )}
        </div>

        {/* Warning Box */}
        <div className="rounded-2xl p-4 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-4 w-4 text-error shrink-0" />
            <p className="text-sm font-semibold text-error">{t("deleteWarningTitle")}</p>
          </div>
          <ul className="space-y-2 text-sm text-text-muted">
            <li className="flex items-start gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-text-muted/40 shrink-0" />
              {t("deleteWarning1")}
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-text-muted/40 shrink-0" />
              {t("deleteWarning2")}
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-text-muted/40 shrink-0" />
              {t("deleteWarning3")}
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-text-muted/40 shrink-0" />
              {t("deleteWarning4")}
            </li>
          </ul>
        </div>

        {/* Password & Confirmation */}
        <div className="space-y-3 mb-6">
          <div>
            <label className="text-sm font-medium mb-1.5 block">{t("verifyPassword")}</label>
            <PasswordInput
              value={password}
              onChange={(e) => setPassword(e.target.value.replace(/\s/g, ""))}
              placeholder={t("passwordPlaceholder")}
              className="input-modern w-full"
              autoComplete="current-password"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">
              {t("typeDeleteLabel")}
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="DELETE"
              className="input-modern w-full"
            />
          </div>
        </div>

        {/* Buttons */}
        <div className="space-y-3">
          <button
            onClick={handleDelete}
            disabled={!selectedReason || !password || confirmText !== "DELETE" || deleting}
            className="t-btn accept w-full disabled:opacity-50"
            aria-label={t("deleteAccountTitle")}
          >
            {deleting ? <span className="loader" /> : t("deleteAccountTitle")}
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
