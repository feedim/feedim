"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Wallet, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import MobileBottomNav from "@/components/MobileBottomNav";
import { translateError } from "@/lib/utils/translateError";

export default function AffiliatePaymentPage() {
  const [loading, setLoading] = useState(true);
  const [iban, setIban] = useState("");
  const [holderName, setHolderName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const load = async () => {
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

        // Load existing payment info
        const res = await fetch("/api/affiliate/promos");
        if (res.ok) {
          const data = await res.json();
          if (data.paymentInfo) {
            setIban(data.paymentInfo.iban || "");
            setHolderName(data.paymentInfo.holderName || "");
          }
        }
      } catch (e) {
        if (process.env.NODE_ENV === "development") console.warn(e);
      } finally {
        setLoading(false);
      }
    };
    load();
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
      toast.success("Odeme bilgileri kaydedildi");
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      toast.error("Bir hata olustu");
    } finally {
      setSaving(false);
    }
  };

  // Format IBAN with spaces for display
  const formatIban = (val: string) => {
    const clean = val.replace(/\s/g, "").toUpperCase().replace(/[^A-Z0-9]/g, "");
    return clean.replace(/(.{4})/g, "$1 ").trim();
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="sticky top-0 z-50 bg-black/90 backdrop-blur-xl min-h-[73px]">
        <nav className="container mx-auto px-6 flex items-center justify-between min-h-[73px]">
          <button onClick={() => router.back()} className="flex items-center gap-2 transition-colors">
            <ArrowLeft className="h-5 w-5" />
            <span className="font-medium">Geri</span>
          </button>
          <h1 className="text-lg font-semibold">Odeme Bilgileri</h1>
          <div className="w-16" />
        </nav>
      </header>

      <main className="container mx-auto px-3 sm:px-6 py-4 sm:py-8 pb-24 md:pb-16 max-w-2xl">
        {loading ? (
          <div className="space-y-4">
            <div className="bg-zinc-900 rounded-2xl p-6 animate-pulse h-40" />
          </div>
        ) : (
          <>
            <div className="bg-zinc-900 rounded-2xl p-6 mb-6">
              <div className="flex items-center gap-2 mb-2">
                <Wallet className="h-5 w-5 text-pink-500" />
                <h2 className="font-semibold text-lg">Odeme Bilgileri</h2>
              </div>
              <p className="text-xs text-gray-500 mb-6">Kazanclariniz bu hesaba aktarilacaktir.</p>

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
                  ) : saving ? "Kaydediliyor..." : "Kaydet"}
                </button>
              </div>
            </div>

            <div className="bg-zinc-900 rounded-2xl p-6">
              <h3 className="font-semibold mb-3">Odeme Bilgilendirmesi</h3>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>• Ilk 24 saat icindeki satislardan elde edilen kazanclar pesin olarak odenir.</li>
                <li>• Sonrasinda odemeler haftada bir (7 gunde bir) yapilir.</li>
                <li>• Minimum odeme tutari 100 TRY&apos;dir.</li>
                <li>• IBAN bilginizin dogru oldugundan emin olun.</li>
                <li>• Odeme bilgilerinizi istediginiz zaman güncelleyebilirsiniz.</li>
              </ul>
            </div>
          </>
        )}
      </main>

      <MobileBottomNav />
    </div>
  );
}
