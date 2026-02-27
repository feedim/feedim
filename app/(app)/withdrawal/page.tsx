"use client";

import { useState, useEffect } from "react";
import {useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Wallet, Check, Shield, Send, Coins,
  AlertTriangle, Lock,
} from "lucide-react";
import { feedimAlert } from "@/components/FeedimAlert";
import { COIN_MIN_WITHDRAWAL, COIN_TO_TRY_RATE, COIN_COMMISSION_RATE } from "@/lib/constants";
import AppLayout from "@/components/AppLayout";

import VerifiedBadge from "@/components/VerifiedBadge";
import { useUser } from "@/components/UserContext";
import { useTranslations } from "next-intl";

interface WithdrawalRequest {
  id: number;
  amount: number;
  amount_try: number;
  iban: string;
  iban_holder: string;
  status: string;
  rejection_reason?: string;
  created_at: string;
  completed_at?: string;
}

interface ProfileInfo {
  coin_balance: number;
  mfa_enabled: boolean;
  is_premium: boolean;
  premium_plan: string | null;
  withdrawal_iban: string;
  withdrawal_holder_name: string;
  monetization_enabled: boolean;
  account_type: string;
  account_private: boolean;
}

const ALLOWED_PLANS = ["pro", "max", "business"];

export default function WithdrawalPage() {
  useSearchParams();
  const t = useTranslations("withdrawal");
  const [profile, setProfile] = useState<ProfileInfo | null>(null);
  const [requests, setRequests] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);

  // IBAN form
  const [iban, setIban] = useState("");
  const [holderName, setHolderName] = useState("");
  const [savingIban, setSavingIban] = useState(false);
  const [ibanSaved, setIbanSaved] = useState(false);

  // Withdrawal form
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const router = useRouter();
  const { user: currentUser } = useUser();

  const loadData = async () => {
    try {
      const res = await fetch("/api/withdrawal");
      if (!res.ok) { router.push("/login"); return; }
      const data = await res.json();
      setProfile(data.profile);
      setRequests(data.requests || []);
      if (data.profile) {
        setIban(data.profile.withdrawal_iban || "");
        setHolderName(data.profile.withdrawal_holder_name || "");
      }
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const balance = profile?.coin_balance || 0;
  const isPremiumAllowed = profile
    ? (ALLOWED_PLANS.includes(profile.premium_plan || "") || profile.is_premium || ALLOWED_PLANS.includes(currentUser?.premiumPlan || ""))
    : ALLOWED_PLANS.includes(currentUser?.premiumPlan || "");
  const isMfaEnabled = profile?.mfa_enabled || false;
  const hasIban = !!(profile?.withdrawal_iban && profile?.withdrawal_holder_name);
  const isMonetizationEnabled = profile?.monetization_enabled || false;
  const isProfessionalAccount = profile?.account_type === "creator" || profile?.account_type === "business";
  const isPrivateAccount = profile?.account_private || false;
  const amountNum = Number(amount) || 0;
  const grossTry = amountNum * COIN_TO_TRY_RATE;
  const commissionTry = Math.round(grossTry * COIN_COMMISSION_RATE * 100) / 100;
  const netTry = Math.round((grossTry - commissionTry) * 100) / 100;

  // IBAN formatting
  const formatIban = (val: string) => {
    let clean = val.replace(/\s/g, "").toUpperCase();
    if (!clean.startsWith("TR")) clean = "TR" + clean.replace(/[^0-9]/g, "");
    else clean = "TR" + clean.slice(2).replace(/[^0-9]/g, "");
    clean = clean.slice(0, 26);
    return clean.replace(/(.{4})/g, "$1 ").trim();
  };

  const handleIbanChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value.replace(/\s/g, "").toUpperCase();
    if (raw.startsWith("TR")) raw = raw.slice(2);
    raw = raw.replace(/[^0-9]/g, "");
    setIban("TR" + raw.slice(0, 24));
  };

  const handleSaveIban = async () => {
    if (!iban.trim() || !holderName.trim()) {
      feedimAlert("error", t("ibanAndNameRequired"));
      return;
    }
    setSavingIban(true);
    try {
      const [res] = await Promise.all([
        fetch("/api/withdrawal", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ iban, holder_name: holderName }),
        }),
        new Promise(r => setTimeout(r, 2000)),
      ]);
      const data = await res.json();
      if (!res.ok) {
        feedimAlert("error", data.error || t("saveFailed"));
        return;
      }
      feedimAlert("success", t("ibanSaved"));
      setIbanSaved(true);
      setTimeout(() => setIbanSaved(false), 3000);
      loadData();
    } catch {
      feedimAlert("error", t("genericError"));
    } finally { setSavingIban(false); }
  };

  const handleSubmitWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amountNum < COIN_MIN_WITHDRAWAL) {
      feedimAlert("error", t("minimumTokensRequired", { amount: COIN_MIN_WITHDRAWAL }));
      return;
    }
    if (amountNum > balance) {
      feedimAlert("error", t("insufficientBalance"));
      return;
    }
    setSubmitting(true);
    try {
      const [res] = await Promise.all([
        fetch("/api/withdrawal", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ amount: amountNum }),
        }),
        new Promise(r => setTimeout(r, 2000)),
      ]);
      const data = await res.json();
      if (res.ok && data.success) {
        feedimAlert("success", t("withdrawalRequestCreated", { amount: amountNum }));
        setAmount("");
        loadData();
      } else {
        feedimAlert("error", data.error || t("operationFailed"));
      }
    } catch {
      feedimAlert("error", t("serverError"));
    } finally { setSubmitting(false); }
  };

  const hasPendingRequest = requests.some(r => r.status === "pending" || r.status === "processing");

  return (
    <AppLayout headerTitle={t("title")} hideRightSidebar>
      <div className="py-4 px-3 sm:px-4 max-w-xl mx-auto space-y-5">
        {loading ? (
          <div className="flex items-center justify-center py-32"><span className="loader" style={{ width: 22, height: 22 }} /></div>
        ) : (
          <>
            {/* Mevcut Bakiye */}
            <div className="bg-bg-secondary rounded-2xl p-5 text-center">
              <p className="text-sm text-text-muted mb-2">{t("currentBalance")}</p>
              <div className="flex items-center justify-center gap-2 mb-1">
                <Coins className="h-7 w-7 text-accent-main" />
                <span className="text-3xl font-bold text-accent-main">{balance.toLocaleString()}</span>
              </div>
              <p className="text-sm text-text-muted">
                ≈ {(balance * COIN_TO_TRY_RATE * (1 - COIN_COMMISSION_RATE)).toFixed(2)} TL <span className="text-xs">(net)</span>
              </p>
            </div>

            {/* 0. Monetization / Professional / Private Gate */}
            {!isMonetizationEnabled || !isProfessionalAccount || isPrivateAccount ? (
              <div className="px-4 py-6 text-center space-y-4">
                <div className="w-14 h-14 rounded-full bg-accent-main/10 flex items-center justify-center mx-auto">
                  <Lock className="h-7 w-7 text-accent-main" />
                </div>
                <h3 className="text-lg font-bold">
                  {!isProfessionalAccount
                    ? t("professionalRequired")
                    : isPrivateAccount
                      ? t("privateAccountWarning")
                      : t("monetizationRequired")}
                </h3>
                <p className="text-sm text-text-muted leading-relaxed">
                  {!isProfessionalAccount
                    ? t("professionalRequiredDesc")
                    : isPrivateAccount
                      ? t("privateAccountWarningDesc")
                      : t("monetizationRequiredDesc")}
                </p>
                <div className="space-y-2 pt-2">
                  {!isProfessionalAccount ? (
                    <Link href="/settings" className="block w-full t-btn accept">
                      {t("goToSettings")}
                    </Link>
                  ) : isPrivateAccount ? (
                    <Link href="/settings" className="block w-full t-btn accept">
                      {t("goToSettings")}
                    </Link>
                  ) : (
                    <Link href="/settings/monetization" className="block w-full t-btn accept">
                      {t("goToMonetization")}
                    </Link>
                  )}
                </div>
              </div>
            ) : (
            <>
            {/* 1. Premium Gate */}
            {!isPremiumAllowed && (
              <div className="bg-bg-secondary rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-2">
                  <VerifiedBadge size="md" />
                  <h3 className="font-semibold">{t("premiumRequired")}</h3>
                </div>
                <p className="text-sm text-text-muted mb-4">
                  {t("premiumRequiredDesc")}
                </p>
                <Link
                  href="/settings/premium"
                  className="w-full py-3 flex items-center justify-center bg-accent-main text-white font-bold rounded-2xl transition hover:opacity-90"
                >
                  {t("goPremium")}
                </Link>
              </div>
            )}

            {/* 2. İki Faktörlü Doğrulama Gate */}
            {isPremiumAllowed && !isMfaEnabled && (
              <div className="bg-bg-secondary rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="h-5 w-5 text-accent-main" />
                  <h3 className="font-semibold">{t("mfaRequired")}</h3>
                </div>
                <p className="text-sm text-text-muted mb-4">
                  {t("mfaRequiredDesc")}
                </p>
                <Link
                  href="/security"
                  className="w-full py-3 flex items-center justify-center gap-2 bg-accent-main text-white font-bold rounded-2xl transition hover:opacity-90"
                >
                  <Shield className="h-4 w-4" />
                  {t("enableMfa")}
                </Link>
              </div>
            )}

            {/* 3. IBAN Formu */}
            <div className={`bg-bg-secondary rounded-2xl p-5 ${(!isPremiumAllowed || !isMfaEnabled) ? "opacity-50 pointer-events-none" : ""}`}>
              <div className="flex items-center gap-2 mb-1">
                <Wallet className="h-5 w-5 text-accent-main" />
                <h2 className="font-semibold text-lg">{t("ibanDetails")}</h2>
              </div>
              <p className="text-xs text-text-muted mb-5">{t("ibanDetailsDesc")}</p>
              {hasPendingRequest && (
                <div className="bg-warning/10 text-warning text-xs font-medium px-3 py-2 rounded-xl mb-4">
                  {t("ibanLockedPending")}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-text-muted mb-1.5">IBAN</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={formatIban(iban)}
                    onChange={handleIbanChange}
                    placeholder="TR00 0000 0000 0000 0000 0000 00"
                    maxLength={32}
                    className="input-modern w-full font-mono tracking-wider text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm text-text-muted mb-1.5">{t("accountHolder")}</label>
                  <input
                    type="text"
                    value={holderName}
                    onChange={(e) => setHolderName(e.target.value)}
                    placeholder={t("fullName")}
                    maxLength={100}
                    className="input-modern w-full"
                  />
                </div>
                <button
                  onClick={handleSaveIban}
                  disabled={savingIban || !iban.trim() || !holderName.trim() || hasPendingRequest}
                  className="w-full py-3 flex items-center justify-center gap-2 bg-accent-main text-white font-bold rounded-2xl transition hover:opacity-90 disabled:opacity-50"
                >
                  {savingIban ? <span className="loader" /> : ibanSaved ? (
                    <><Check className="h-5 w-5" /> {t("saved")}</>
                  ) : t("saveIban")}
                </button>
              </div>
            </div>

            {/* 4. Cekim Formu */}
            <div className={`bg-bg-secondary rounded-2xl p-5 ${(!isPremiumAllowed || !isMfaEnabled || !hasIban) ? "opacity-50 pointer-events-none" : ""}`}>
              <div className="flex items-center gap-2 mb-1">
                <Send className="h-5 w-5 text-accent-main" />
                <h2 className="font-semibold text-lg">{t("withdrawalRequest")}</h2>
              </div>
              <p className="text-xs text-text-muted mb-5">
                {t("minimumWithdrawal", { amount: COIN_MIN_WITHDRAWAL, amountTry: (COIN_MIN_WITHDRAWAL * COIN_TO_TRY_RATE).toFixed(0) })}
              </p>

              <form onSubmit={handleSubmitWithdrawal} className="space-y-4">
                <div>
                  <label className="block text-sm text-text-muted mb-1.5">{t("withdrawalAmount")}</label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    min={COIN_MIN_WITHDRAWAL}
                    max={balance}
                    placeholder={`Min ${COIN_MIN_WITHDRAWAL}`}
                    required
                    className="input-modern w-full"
                  />
                  {amountNum > 0 && (
                    <div className="mt-2 space-y-1 text-sm">
                      <div className="flex justify-between text-text-muted">
                        <span>{t("grossAmount")}</span>
                        <span>{grossTry.toFixed(2)} TL</span>
                      </div>
                      <div className="flex justify-between text-text-muted">
                        <span>{t("feedimCommission", { rate: COIN_COMMISSION_RATE * 100 })}</span>
                        <span>-{commissionTry.toFixed(2)} TL</span>
                      </div>
                      <div className="flex justify-between font-semibold text-text-primary pt-1 border-t border-border-primary">
                        <span>{t("netPayment")}</span>
                        <span>{netTry.toFixed(2)} TL</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Tumu cek butonu */}
                {balance >= COIN_MIN_WITHDRAWAL && (
                  <button
                    type="button"
                    onClick={() => setAmount(String(balance))}
                    className="text-xs text-accent-main font-medium hover:underline"
                  >
                    {t("withdrawAll", { amount: balance.toLocaleString() })}
                  </button>
                )}

                <button
                  type="submit"
                  disabled={submitting || amountNum < COIN_MIN_WITHDRAWAL || amountNum > balance}
                  className="w-full py-3.5 flex items-center justify-center gap-2 bg-text-primary text-bg-primary font-bold rounded-2xl transition disabled:opacity-50"
                >
                  {submitting ? (
                    <span className="loader" />
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      {amountNum > 0 ? `${netTry.toFixed(2)} TL ${t("withdrawBtn")}` : t("withdrawBtn")}
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* 6. Bilgilendirme */}
            <div className="bg-bg-secondary rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="h-5 w-5 text-accent-main" />
                <h3 className="font-semibold">{t("paymentInfo")}</h3>
              </div>
              <ul className="space-y-2 text-sm text-text-muted">
                <li>• {t("infoProPlan")}</li>
                <li>• {t("infoMinWithdrawal", { amount: COIN_MIN_WITHDRAWAL, amountTry: (COIN_MIN_WITHDRAWAL * COIN_TO_TRY_RATE).toFixed(0) })}</li>
                <li>• {t("infoCommission", { rate: COIN_COMMISSION_RATE * 100 })}</li>
                <li>• {t("infoMfaRequired")}</li>
                <li>• {t("infoProcessingTime", { amount: COIN_MIN_WITHDRAWAL })}</li>
                <li>• {t("infoCorrectIban")}</li>
                <li>• {t("infoPendingIban")}</li>
              </ul>
            </div>
            </>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}
