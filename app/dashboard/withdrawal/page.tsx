"use client";

import { useState, useEffect } from "react";
import {useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Wallet, Check, Shield, Send, Coins,
  AlertTriangle,
} from "lucide-react";
import { feedimAlert } from "@/components/FeedimAlert";
import { COIN_MIN_WITHDRAWAL, COIN_TO_TRY_RATE, COIN_COMMISSION_RATE } from "@/lib/constants";
import AppLayout from "@/components/AppLayout";
import LoadingShell from "@/components/LoadingShell";
import VerifiedBadge from "@/components/VerifiedBadge";
import { useUser } from "@/components/UserContext";

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
}

const ALLOWED_PLANS = ["pro", "max", "business"];

export default function WithdrawalPage() {
  useSearchParams();
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
      feedimAlert("error", "IBAN ve ad soyad gerekli");
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
        feedimAlert("error", data.error || "Kaydedilemedi, lütfen daha sonra tekrar deneyin");
        return;
      }
      feedimAlert("success", "IBAN bilgileri kaydedildi");
      setIbanSaved(true);
      setTimeout(() => setIbanSaved(false), 3000);
      loadData();
    } catch {
      feedimAlert("error", "Bir hata oluştu, lütfen daha sonra tekrar deneyin");
    } finally { setSavingIban(false); }
  };

  const handleSubmitWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amountNum < COIN_MIN_WITHDRAWAL) {
      feedimAlert("error", `Minimum ${COIN_MIN_WITHDRAWAL} jeton gerekli`);
      return;
    }
    if (amountNum > balance) {
      feedimAlert("error", "Yetersiz bakiye");
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
        feedimAlert("success", `${amountNum} jeton çekim talebi oluşturuldu!`);
        setAmount("");
        loadData();
      } else {
        feedimAlert("error", data.error || "İşlem başarısız, lütfen daha sonra tekrar deneyin");
      }
    } catch {
      feedimAlert("error", "Sunucu hatası, lütfen daha sonra tekrar deneyin");
    } finally { setSubmitting(false); }
  };

  const hasPendingRequest = requests.some(r => r.status === "pending" || r.status === "processing");

  return (
    <AppLayout headerTitle="Ödeme Alma" hideRightSidebar>
      <div className="py-4 px-3 sm:px-4 max-w-xl mx-auto space-y-5">
        {loading ? (
          <LoadingShell>
            <div className="space-y-4">
              <div className="skeleton h-32 rounded-2xl" />
              <div className="skeleton h-48 rounded-2xl" />
              <div className="skeleton h-32 rounded-2xl" />
            </div>
          </LoadingShell>
        ) : (
          <>
            {/* Mevcut Bakiye */}
            <div className="bg-bg-secondary rounded-2xl p-5 text-center">
              <p className="text-sm text-text-muted mb-2">Mevcut Bakiye</p>
              <div className="flex items-center justify-center gap-2 mb-1">
                <Coins className="h-7 w-7 text-accent-main" />
                <span className="text-3xl font-bold text-accent-main">{balance.toLocaleString()}</span>
              </div>
              <p className="text-sm text-text-muted">
                ≈ {(balance * COIN_TO_TRY_RATE * (1 - COIN_COMMISSION_RATE)).toFixed(2)} TL <span className="text-xs">(net)</span>
              </p>
            </div>

            {/* 1. Premium Gate */}
            {!isPremiumAllowed && (
              <div className="bg-bg-secondary rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-2">
                  <VerifiedBadge size="md" />
                  <h3 className="font-semibold">Premium Gerekli</h3>
                </div>
                <p className="text-sm text-text-muted mb-4">
                  Ödeme almak için Pro veya üzeri bir plan gereklidir. Premium'a yükselterek jetonlarınızı nakde çevirebilirsiniz.
                </p>
                <Link
                  href="/dashboard/settings/premium"
                  className="w-full py-3 flex items-center justify-center bg-accent-main text-white font-bold rounded-2xl transition hover:opacity-90"
                >
                  Premium'a Geç
                </Link>
              </div>
            )}

            {/* 2. İki Faktörlü Doğrulama Gate */}
            {isPremiumAllowed && !isMfaEnabled && (
              <div className="bg-bg-secondary rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="h-5 w-5 text-accent-main" />
                  <h3 className="font-semibold">İki Faktörlü Doğrulama Zorunlu</h3>
                </div>
                <p className="text-sm text-text-muted mb-4">
                  IBAN bilgisi eklemek ve ödeme talebi oluşturmak için iki faktörlü doğrulamayı etkinleştirmeniz gerekmektedir.
                </p>
                <Link
                  href="/dashboard/security"
                  className="w-full py-3 flex items-center justify-center gap-2 bg-accent-main text-white font-bold rounded-2xl transition hover:opacity-90"
                >
                  <Shield className="h-4 w-4" />
                  İki Faktörlü Doğrulamayı Etkinleştir
                </Link>
              </div>
            )}

            {/* 3. IBAN Formu */}
            <div className={`bg-bg-secondary rounded-2xl p-5 ${(!isPremiumAllowed || !isMfaEnabled) ? "opacity-50 pointer-events-none" : ""}`}>
              <div className="flex items-center gap-2 mb-1">
                <Wallet className="h-5 w-5 text-accent-main" />
                <h2 className="font-semibold text-lg">IBAN Bilgileri</h2>
              </div>
              <p className="text-xs text-text-muted mb-5">Kazançlarınız bu hesaba aktarılacaktır.</p>
              {hasPendingRequest && (
                <div className="bg-warning/10 text-warning text-xs font-medium px-3 py-2 rounded-xl mb-4">
                  Bekleyen çekim talebi varken IBAN bilgileri güncellenemez.
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
                  <label className="block text-sm text-text-muted mb-1.5">Hesap Sahibi (Ad Soyad)</label>
                  <input
                    type="text"
                    value={holderName}
                    onChange={(e) => setHolderName(e.target.value)}
                    placeholder="Ad Soyad"
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
                    <><Check className="h-5 w-5" /> Kaydedildi</>
                  ) : "IBAN Kaydet"}
                </button>
              </div>
            </div>

            {/* 4. Cekim Formu */}
            <div className={`bg-bg-secondary rounded-2xl p-5 ${(!isPremiumAllowed || !isMfaEnabled || !hasIban) ? "opacity-50 pointer-events-none" : ""}`}>
              <div className="flex items-center gap-2 mb-1">
                <Send className="h-5 w-5 text-accent-main" />
                <h2 className="font-semibold text-lg">Cekim Talebi</h2>
              </div>
              <p className="text-xs text-text-muted mb-5">
                Minimum {COIN_MIN_WITHDRAWAL} jeton ({(COIN_MIN_WITHDRAWAL * COIN_TO_TRY_RATE).toFixed(0)} TL)
              </p>

              <form onSubmit={handleSubmitWithdrawal} className="space-y-4">
                <div>
                  <label className="block text-sm text-text-muted mb-1.5">Cekim Miktari (jeton)</label>
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
                        <span>Brüt tutar</span>
                        <span>{grossTry.toFixed(2)} TL</span>
                      </div>
                      <div className="flex justify-between text-text-muted">
                        <span>Feedim komisyonu (%{COIN_COMMISSION_RATE * 100})</span>
                        <span>-{commissionTry.toFixed(2)} TL</span>
                      </div>
                      <div className="flex justify-between font-semibold text-text-primary pt-1 border-t border-border-primary">
                        <span>Net ödeme</span>
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
                    Tumunu cek ({balance.toLocaleString()} jeton)
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
                      {amountNum > 0 ? `${netTry.toFixed(2)} TL Çek` : "Çek"}
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* 6. Bilgilendirme */}
            <div className="bg-bg-secondary rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="h-5 w-5 text-accent-main" />
                <h3 className="font-semibold">Ödeme Bilgilendirmesi</h3>
              </div>
              <ul className="space-y-2 text-sm text-text-muted">
                <li>• Ödeme almak için en az Pro plan gereklidir.</li>
                <li>• Minimum çekim miktarı {COIN_MIN_WITHDRAWAL} jetondur ({(COIN_MIN_WITHDRAWAL * COIN_TO_TRY_RATE).toFixed(0)} TL).</li>
                <li>• Çekim işlemlerinde %{COIN_COMMISSION_RATE * 100} Feedim komisyonu uygulanır.</li>
                <li>• İki faktörlü doğrulama zorunludur.</li>
                <li>• Ödemeler {COIN_MIN_WITHDRAWAL} jeton üzerinde, 1-5 iş günü içinde yapılır.</li>
                <li>• IBAN bilginizin doğru olduğundan emin olun.</li>
                <li>• Bekleyen çekim talebi varken IBAN bilgilerinizi güncelleyemezsiniz. Önce mevcut talebi iptal etmeniz gerekir.</li>
              </ul>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}
