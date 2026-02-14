"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Wallet, Check, Clock, CheckCircle, XCircle, Send } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import MobileBottomNav from "@/components/MobileBottomNav";

export default function AffiliatePaymentPage() {
  const [loading, setLoading] = useState(true);
  const [iban, setIban] = useState("");
  const [holderName, setHolderName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [balance, setBalance] = useState<any>(null);
  const [payouts, setPayouts] = useState<any[]>([]);
  const [requesting, setRequesting] = useState(false);
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

      // Load payment info
      const promoRes = await fetch("/api/affiliate/promos");
      if (promoRes.ok) {
        const data = await promoRes.json();
        if (data.paymentInfo) {
          setIban(data.paymentInfo.iban || "");
          setHolderName(data.paymentInfo.holderName || "");
        }
      }

      // Load payout data
      const payoutRes = await fetch("/api/affiliate/payouts");
      if (payoutRes.ok) {
        const data = await payoutRes.json();
        setBalance(data.balance || null);
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
    const clean = val.replace(/\s/g, "").toUpperCase().replace(/[^A-Z0-9]/g, "");
    return clean.replace(/(.{4})/g, "$1 ").trim();
  };

  const statusLabel = (status: string) => {
    switch (status) {
      case "pending": return { text: "Bekliyor", color: "text-yellow-500", icon: Clock };
      case "approved": return { text: "Onaylandı", color: "text-green-500", icon: CheckCircle };
      case "rejected": return { text: "Reddedildi", color: "text-red-500", icon: XCircle };
      default: return { text: status, color: "text-gray-400", icon: Clock };
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="sticky top-0 z-50 bg-black/90 backdrop-blur-xl min-h-[73px]">
        <nav className="container mx-auto px-6 flex items-center justify-between min-h-[73px]">
          <button onClick={() => router.back()} className="flex items-center gap-2 transition-colors">
            <ArrowLeft className="h-5 w-5" />
            <span className="font-medium">Geri</span>
          </button>
          <h1 className="text-lg font-semibold">Ödeme Bilgileri</h1>
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
            {/* Bakiye Özeti */}
            {balance && (
              <div className="bg-zinc-900 rounded-2xl p-6 mb-6">
                <div className="flex items-center gap-2 mb-4">
                  <Wallet className="h-5 w-5 text-pink-500" />
                  <h2 className="font-semibold text-lg">Bakiye</h2>
                </div>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-white/5 rounded-xl p-3">
                    <p className="text-xs text-gray-400 mb-1">Toplam Kazanç</p>
                    <p className="text-xl font-bold">{balance.totalEarnings.toLocaleString('tr-TR')} <span className="text-xs text-gray-400">TRY</span></p>
                  </div>
                  <div className="bg-white/5 rounded-xl p-3">
                    <p className="text-xs text-gray-400 mb-1">Çekilebilir Bakiye</p>
                    <p className="text-xl font-bold text-pink-500">{balance.available.toLocaleString('tr-TR')} <span className="text-xs text-gray-400">TRY</span></p>
                  </div>
                  <div className="bg-white/5 rounded-xl p-3">
                    <p className="text-xs text-gray-400 mb-1">Ödenen</p>
                    <p className="text-lg font-bold text-green-500">{balance.totalPaidOut.toLocaleString('tr-TR')} <span className="text-xs text-gray-400">TRY</span></p>
                  </div>
                  <div className="bg-white/5 rounded-xl p-3">
                    <p className="text-xs text-gray-400 mb-1">Bekleyen Talep</p>
                    <p className="text-lg font-bold text-yellow-500">{balance.totalPending.toLocaleString('tr-TR')} <span className="text-xs text-gray-400">TRY</span></p>
                  </div>
                </div>

                {/* Ödeme Talebi Butonu */}
                {balance.canRequestPayout ? (
                  <button
                    onClick={handleRequestPayout}
                    disabled={requesting}
                    className="btn-primary w-full py-3 flex items-center justify-center gap-2"
                  >
                    <Send className="h-4 w-4" />
                    {requesting ? "Talep oluşturuluyor..." : `Ödeme Talep Et (${balance.available.toLocaleString('tr-TR')} TRY)`}
                  </button>
                ) : (
                  <p className="text-xs text-gray-500 text-center">
                    Minimum ödeme tutarı {balance.minPayout} TRY&apos;dir. Mevcut bakiye: {balance.available.toLocaleString('tr-TR')} TRY
                  </p>
                )}
              </div>
            )}

            {/* IBAN Bilgileri */}
            <div className="bg-zinc-900 rounded-2xl p-6 mb-6">
              <div className="flex items-center gap-2 mb-2">
                <Wallet className="h-5 w-5 text-pink-500" />
                <h2 className="font-semibold text-lg">IBAN Bilgileri</h2>
              </div>
              <p className="text-xs text-gray-500 mb-6">Kazançlarınız bu hesaba aktarılacaktır.</p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">IBAN</label>
                  <input
                    type="text"
                    value={formatIban(iban)}
                    onChange={(e) => setIban(e.target.value.replace(/\s/g, "").toUpperCase().replace(/[^A-Z0-9]/g, ""))}
                    placeholder="TR00 0000 0000 0000 0000 0000 00"
                    maxLength={40}
                    className="input-modern w-full font-mono tracking-wider"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Hesap Sahibi (Ad Soyad)</label>
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

            {/* Ödeme Geçmişi */}
            <div className="bg-zinc-900 rounded-2xl p-6 mb-6">
              <h3 className="font-semibold mb-4">Ödeme Geçmişi</h3>
              {payouts.length > 0 ? (
                <div className="space-y-3">
                  {payouts.map((payout) => {
                    const status = statusLabel(payout.status);
                    const StatusIcon = status.icon;
                    return (
                      <div key={payout.id} className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
                        <div className="flex items-center gap-3 min-w-0">
                          <StatusIcon className={`h-5 w-5 shrink-0 ${status.color}`} />
                          <div className="min-w-0">
                            <p className="text-sm font-medium">{Number(payout.amount).toLocaleString('tr-TR')} TRY</p>
                            <p className="text-xs text-gray-500">
                              {new Date(payout.requested_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </p>
                            {payout.admin_note && (
                              <p className="text-xs text-gray-400 mt-1">Not: {payout.admin_note}</p>
                            )}
                          </div>
                        </div>
                        <span className={`text-xs font-medium ${status.color} shrink-0`}>{status.text}</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-gray-500">Henüz ödeme talebi yok.</p>
              )}
            </div>

            {/* Bilgilendirme */}
            <div className="bg-zinc-900 rounded-2xl p-6">
              <h3 className="font-semibold mb-3">Ödeme Bilgilendirmesi</h3>
              <ul className="space-y-2 text-sm text-gray-400">
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
