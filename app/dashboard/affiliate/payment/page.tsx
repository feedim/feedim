"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Wallet, Check, Clock, CheckCircle, XCircle, Send, Calendar, Shield } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import MobileBottomNav from "@/components/MobileBottomNav";

type PeriodKey = "all" | "thisMonth" | "last3m" | "last6m";

const ITEMS_PER_PAGE = 10;

export default function AffiliatePaymentPage() {
  const [loading, setLoading] = useState(true);
  const [iban, setIban] = useState("");
  const [holderName, setHolderName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [balance, setBalance] = useState<any>(null);
  const [payouts, setPayouts] = useState<any[]>([]);
  const [requesting, setRequesting] = useState(false);
  const [visiblePayouts, setVisiblePayouts] = useState(ITEMS_PER_PAGE);
  const [historyPeriod, setHistoryPeriod] = useState<PeriodKey>("all");
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("user_id", user.id)
        .single();

      if (profile?.role !== "affiliate" && profile?.role !== "admin") {
        router.push("/dashboard/profile");
        return;
      }

      setUserRole(profile.role);

      // Check MFA status for affiliates
      if (profile.role === "affiliate") {
        const mfaRes = await fetch("/api/auth/mfa");
        if (mfaRes.ok) {
          const mfaData = await mfaRes.json();
          setMfaEnabled(mfaData.enabled);
        }
      } else {
        setMfaEnabled(true); // admin doesn't require MFA
      }

      // Load payment info + balance from promos API
      const promoRes = await fetch("/api/affiliate/promos");
      if (promoRes.ok) {
        const data = await promoRes.json();
        if (data.paymentInfo) {
          const loadedIban = data.paymentInfo.iban || "";
          setIban(loadedIban.startsWith("TR") ? loadedIban : loadedIban ? "TR" + loadedIban : "");
          setHolderName(data.paymentInfo.holderName || "");
        }
        if (data.balance) {
          setBalance(data.balance);
        }
      }

      // Load payout history
      const payoutRes = await fetch("/api/affiliate/payouts");
      if (payoutRes.ok) {
        const data = await payoutRes.json();
        setPayouts(data.payouts || []);
      }
    } catch (e) {
      if (process.env.NODE_ENV === "development") console.warn(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset visible count when period changes
  useEffect(() => {
    setVisiblePayouts(ITEMS_PER_PAGE);
  }, [historyPeriod]);

  const handleSave = async () => {
    if (!iban.trim() || !holderName.trim()) {
      toast.error("IBAN ve ad soyad gerekli");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/affiliate/promos", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ iban, holderName }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Kaydedilemedi");
        return;
      }
      toast.success("Ödeme bilgileri kaydedildi");
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      toast.error("Bir hata oluştu");
    } finally {
      setSaving(false);
    }
  };

  const handleRequestPayout = async () => {
    if (!iban.trim() || !holderName.trim()) {
      toast.error("Önce IBAN bilgilerinizi kaydedin");
      return;
    }
    setRequesting(true);
    try {
      const res = await fetch("/api/affiliate/payouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Talep oluşturulamadı");
        return;
      }
      toast.success("Ödeme talebi oluşturuldu!");
      loadData();
    } catch {
      toast.error("Bir hata oluştu");
    } finally {
      setRequesting(false);
    }
  };

  const formatIban = (val: string) => {
    // Ensure TR prefix + only digits
    let clean = val.replace(/\s/g, "").toUpperCase();
    if (!clean.startsWith("TR")) clean = "TR" + clean.replace(/[^0-9]/g, "");
    else clean = "TR" + clean.slice(2).replace(/[^0-9]/g, "");
    // TR IBAN = 26 chars total (TR + 24 digits)
    clean = clean.slice(0, 26);
    return clean.replace(/(.{4})/g, "$1 ").trim();
  };

  const handleIbanChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value.replace(/\s/g, "").toUpperCase();
    // Remove TR prefix for processing, keep only digits
    if (raw.startsWith("TR")) raw = raw.slice(2);
    raw = raw.replace(/[^0-9]/g, "");
    // Store as TR + digits, max 24 digits after TR
    setIban("TR" + raw.slice(0, 24));
  };

  const statusLabel = (status: string) => {
    switch (status) {
      case "pending": return { text: "Bekliyor", color: "text-pink-300", icon: Clock };
      case "approved": return { text: "Onaylandı", color: "text-pink-500", icon: CheckCircle };
      case "rejected": return { text: "Reddedildi", color: "text-red-500", icon: XCircle };
      default: return { text: status, color: "text-zinc-400", icon: Clock };
    }
  };

  // Filter payouts by period
  const filteredPayouts = useMemo(() => {
    if (historyPeriod === "all") return payouts;

    const now = new Date();
    let cutoff: Date;
    switch (historyPeriod) {
      case "thisMonth":
        cutoff = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case "last3m":
        cutoff = new Date(now.getTime() - 90 * 86400000);
        break;
      case "last6m":
        cutoff = new Date(now.getTime() - 180 * 86400000);
        break;
      default:
        return payouts;
    }

    return payouts.filter(p => new Date(p.requested_at) >= cutoff);
  }, [payouts, historyPeriod]);

  // Period summary
  const periodSummary = useMemo(() => {
    const approved = filteredPayouts.filter(p => p.status === "approved");
    const pending = filteredPayouts.filter(p => p.status === "pending");
    return {
      total: filteredPayouts.length,
      approvedAmount: Math.round(approved.reduce((s, p) => s + Number(p.amount), 0) * 100) / 100,
      pendingAmount: Math.round(pending.reduce((s, p) => s + Number(p.amount), 0) * 100) / 100,
    };
  }, [filteredPayouts]);

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="sticky top-0 z-50 bg-black/90 backdrop-blur-xl min-h-[73px]">
        <nav className="container mx-auto px-6 flex items-center justify-between min-h-[73px]">
          <button onClick={() => router.back()} className="flex items-center gap-2 transition-colors">
            <ArrowLeft className="h-5 w-5" />
            <span className="font-medium">Geri</span>
          </button>
          <h1 className="text-lg font-semibold">Ödeme</h1>
          <div className="w-16" />
        </nav>
      </header>

      <main className="container mx-auto px-3 sm:px-6 py-4 sm:py-8 pb-24 md:pb-16 max-w-2xl">
        {loading ? (
          <div className="space-y-4">
            <div className="bg-zinc-900 rounded-2xl p-6 animate-pulse h-40" />
            <div className="bg-zinc-900 rounded-2xl p-6 animate-pulse h-32" />
          </div>
        ) : (
          <>
            {/* Çekilebilir Bakiye */}
            {balance && (
              <div className="bg-zinc-900 rounded-2xl p-6 mb-6">
                <div className="flex items-center gap-2 mb-4">
                  <Wallet className="h-5 w-5 text-pink-500" />
                  <h2 className="font-semibold text-lg">Bakiye</h2>
                </div>

                {/* Çekilebilir + Çek Butonu */}
                <div className="flex items-center justify-between bg-pink-500/10 border border-pink-500/20 rounded-xl p-4 mb-3">
                  <div>
                    <p className="text-xs text-pink-300 mb-0.5">Çekilebilir Bakiye</p>
                    <p className="text-3xl font-bold text-pink-500">{balance.available.toLocaleString('tr-TR')} <span className="text-sm text-zinc-400">TRY</span></p>
                  </div>
                  <button
                    onClick={handleRequestPayout}
                    disabled={requesting || !balance.canRequestPayout}
                    className="px-5 py-2.5 bg-pink-600 hover:bg-pink-500 disabled:bg-zinc-700 disabled:text-zinc-500 rounded-xl text-sm font-bold transition flex items-center gap-2 shrink-0"
                  >
                    <Send className="h-4 w-4" />
                    {requesting ? "..." : "Çek"}
                  </button>
                </div>

                {/* Bekleyen + Ödenen */}
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div className="bg-white/5 rounded-xl p-3">
                    <p className="text-[10px] text-zinc-500">Bekleyen Talep</p>
                    <p className="text-lg font-bold text-pink-300">{balance.totalPending.toLocaleString('tr-TR')} <span className="text-xs text-zinc-500">TRY</span></p>
                  </div>
                  <div className="bg-white/5 rounded-xl p-3">
                    <p className="text-[10px] text-zinc-500">Toplam Ödenen</p>
                    <p className="text-lg font-bold text-pink-400">{balance.totalPaidOut.toLocaleString('tr-TR')} <span className="text-xs text-zinc-500">TRY</span></p>
                  </div>
                </div>

                {/* Otomatik çekim bilgisi */}
                <div className="bg-white/5 rounded-lg px-3 py-2">
                  <p className="text-xs text-zinc-400">
                    {balance.available >= balance.minPayout
                      ? balance.nextAutoDate
                        ? `Sonraki otomatik çekim: ${new Date(balance.nextAutoDate).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' })}`
                        : "Bakiye yeterli — 7 gün dolduğunda otomatik talep oluşur"
                      : `Min. 100 TRY bakiyeye ulaştığınızda 7 günde bir otomatik talep oluşur.`}
                    {" "}
                    <span className="text-pink-400">Manuel çekim için &quot;Çek&quot; butonunu kullanın.</span>
                  </p>
                </div>
              </div>
            )}

            {/* 2FA Gate for Affiliates */}
            {userRole === "affiliate" && !mfaEnabled && (
              <div className="bg-zinc-900 rounded-2xl p-6 mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="h-5 w-5 text-pink-500" />
                  <h3 className="font-semibold">2FA Zorunlu</h3>
                </div>
                <p className="text-sm text-zinc-400 mb-4">
                  IBAN bilgisi eklemek ve ödeme talebi oluşturmak için iki faktörlü doğrulamayı etkinleştirmeniz gerekmektedir.
                </p>
                <Link href="/dashboard/security" className="btn-primary w-full py-3 flex items-center justify-center gap-2">
                  <Shield className="h-4 w-4" />
                  2FA Etkinleştir
                </Link>
              </div>
            )}

            {/* IBAN Bilgileri */}
            <div className={`bg-zinc-900 rounded-2xl p-6 mb-6 ${userRole === "affiliate" && !mfaEnabled ? "opacity-50 pointer-events-none" : ""}`}>
              <div className="flex items-center gap-2 mb-2">
                <Wallet className="h-5 w-5 text-pink-500" />
                <h2 className="font-semibold text-lg">IBAN Bilgileri</h2>
              </div>
              <p className="text-xs text-zinc-500 mb-6">Kazançlarınız bu hesaba aktarılacaktır.</p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-zinc-400 mb-2">IBAN</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={formatIban(iban)}
                    onChange={handleIbanChange}
                    placeholder="TR00 0000 0000 0000 0000 0000 00"
                    maxLength={32}
                    className="input-modern w-full font-mono tracking-wider"
                  />
                </div>
                <div>
                  <label className="block text-sm text-zinc-400 mb-2">Hesap Sahibi (Ad Soyad)</label>
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
                  onClick={handleSave}
                  disabled={saving || !iban.trim() || !holderName.trim()}
                  className="btn-primary w-full py-3 flex items-center justify-center gap-2"
                >
                  {saved ? (
                    <>
                      <Check className="h-5 w-5" />
                      Kaydedildi
                    </>
                  ) : saving ? "Kaydediliyor..." : "IBAN Kaydet"}
                </button>
              </div>
            </div>

            {/* Ödeme Geçmişi - Tarih Filtreli */}
            <div className="bg-zinc-900 rounded-2xl p-6 mb-6">
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="h-5 w-5 text-pink-500" />
                <h3 className="font-semibold">Ödeme Geçmişi</h3>
              </div>

              {/* Dönem Seçici */}
              <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1">
                {([
                  { key: "all" as PeriodKey, label: "Tümü" },
                  { key: "thisMonth" as PeriodKey, label: "Bu Ay" },
                  { key: "last3m" as PeriodKey, label: "Son 3 Ay" },
                  { key: "last6m" as PeriodKey, label: "Son 6 Ay" },
                ]).map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setHistoryPeriod(key)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition shrink-0 ${
                      historyPeriod === key ? "bg-pink-500 text-white" : "bg-white/5 text-zinc-400 hover:text-white"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Dönem Özeti */}
              {filteredPayouts.length > 0 && (
                <div className="flex gap-3 mb-4">
                  <div className="flex-1 bg-white/5 rounded-xl p-3 text-center">
                    <p className="text-[10px] text-zinc-500">Onaylanan</p>
                    <p className="text-sm font-bold text-pink-500">{periodSummary.approvedAmount.toLocaleString('tr-TR')} TRY</p>
                  </div>
                  <div className="flex-1 bg-white/5 rounded-xl p-3 text-center">
                    <p className="text-[10px] text-zinc-500">Bekleyen</p>
                    <p className="text-sm font-bold text-pink-300">{periodSummary.pendingAmount.toLocaleString('tr-TR')} TRY</p>
                  </div>
                  <div className="flex-1 bg-white/5 rounded-xl p-3 text-center">
                    <p className="text-[10px] text-zinc-500">Talep</p>
                    <p className="text-sm font-bold">{periodSummary.total}</p>
                  </div>
                </div>
              )}

              {/* Liste */}
              {filteredPayouts.length > 0 ? (
                <div className="space-y-3">
                  {filteredPayouts.slice(0, visiblePayouts).map((payout) => {
                    const status = statusLabel(payout.status);
                    const StatusIcon = status.icon;
                    return (
                      <div key={payout.id} className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
                        <div className="flex items-center gap-3 min-w-0">
                          <StatusIcon className={`h-5 w-5 shrink-0 ${status.color}`} />
                          <div className="min-w-0">
                            <p className="text-sm font-medium">{Number(payout.amount).toLocaleString('tr-TR')} TRY</p>
                            <p className="text-xs text-zinc-500">
                              {new Date(payout.requested_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </p>
                            {payout.admin_note && (
                              <p className="text-xs text-zinc-400 mt-1">Not: {payout.admin_note}</p>
                            )}
                          </div>
                        </div>
                        <span className={`text-xs font-medium ${status.color} shrink-0`}>{status.text}</span>
                      </div>
                    );
                  })}
                  {visiblePayouts < filteredPayouts.length && (
                    <button
                      onClick={() => setVisiblePayouts(prev => prev + ITEMS_PER_PAGE)}
                      className="w-full py-2 text-sm text-pink-500 hover:text-pink-400 font-medium transition"
                    >
                      Daha Fazla Göster ({filteredPayouts.length - visiblePayouts} kalan)
                    </button>
                  )}
                </div>
              ) : (
                <p className="text-sm text-zinc-500 text-center py-4">
                  {historyPeriod === "all" ? "Henüz ödeme talebi yok." : "Bu dönemde ödeme talebi yok."}
                </p>
              )}
            </div>

            {/* Bilgilendirme */}
            <div className="bg-zinc-900 rounded-2xl p-6">
              <h3 className="font-semibold mb-3">Ödeme Bilgilendirmesi</h3>
              <ul className="space-y-2 text-sm text-zinc-400">
                <li>• İlk 24 saat içindeki satışlardan elde edilen kazançlar peşin olarak ödenir.</li>
                <li>• Sonrasında ödemeler haftada bir (7 günde bir) yapılır.</li>
                <li>• Minimum ödeme tutarı 100 TRY&apos;dir.</li>
                <li>• IBAN bilginizin doğru olduğundan emin olun.</li>
                <li>• Ödeme bilgilerinizi istediğiniz zaman güncelleyebilirsiniz.</li>
                <li>• Sorularınız için: <a href="mailto:affiliate@forilove.com" className="text-pink-500 hover:text-pink-400">affiliate@forilove.com</a></li>
              </ul>
            </div>
          </>
        )}
      </main>

      <MobileBottomNav />
    </div>
  );
}
