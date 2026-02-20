"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Snowflake, Info } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { feedimAlert } from "@/components/FeedimAlert";
import AppLayout from "@/components/AppLayout";

const minDelay = (ms: number) => new Promise(r => setTimeout(r, ms));

const REASONS = [
  "Bir süre ara vermek istiyorum",
  "Güvenlik endişem var",
  "Çok fazla bildirim alıyorum",
  "Hesabımı silmeyi düşünüyorum",
  "Diğer",
];

export default function FreezeAccountPage() {
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [otherText, setOtherText] = useState("");
  const [freezing, setFreezing] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleFreeze = async () => {
    if (!selectedReason) {
      feedimAlert("error", "Lütfen bir neden seçin");
      return;
    }

    setFreezing(true);
    try {
      const reason = selectedReason === "Diğer" ? otherText.trim() || "Diğer" : selectedReason;
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
        router.push("/");
      } else {
        const data = await res.json();
        feedimAlert("error", data.error || "Hesap dondurulamadı, lütfen daha sonra tekrar deneyin");
      }
    } catch {
      feedimAlert("error", "Bir hata oluştu, lütfen daha sonra tekrar deneyin");
    } finally {
      setFreezing(false);
    }
  };

  return (
    <AppLayout headerTitle="Hesabı Dondur" hideRightSidebar>
      <div className="py-4 px-4 sm:px-5 max-w-xl mx-auto">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-16 h-16 rounded-full bg-accent-main/10 flex items-center justify-center mb-4">
            <Snowflake className="h-8 w-8 text-accent-main" />
          </div>
          <h1 className="text-xl font-bold mb-2">Hesabı Dondur</h1>
          <p className="text-sm text-text-muted">
            Hesabınızı dondurduğunuzda profiliniz geçici olarak devre dışı bırakılır. İstediğiniz zaman tekrar giriş yaparak aktifleştirebilirsiniz.
          </p>
        </div>

        {/* Neden Seçimi */}
        <div className="mb-5">
          <p className="text-sm font-semibold mb-3">Neden dondurmak istiyorsunuz?</p>
          <div className="flex flex-wrap gap-2">
            {REASONS.map((reason) => (
              <button
                key={reason}
                onClick={() => setSelectedReason(reason)}
                className={`px-3.5 py-2 rounded-full text-sm font-medium transition-all ${
                  selectedReason === reason
                    ? "bg-accent-main text-white"
                    : "bg-bg-secondary text-text-muted hover:bg-bg-tertiary"
                }`}
              >
                {reason}
              </button>
            ))}
          </div>
          {selectedReason === "Diğer" && (
            <textarea
              value={otherText}
              onChange={(e) => setOtherText(e.target.value)}
              placeholder="Nedeninizi yazın..."
              maxLength={500}
              className="input-modern w-full mt-3 min-h-[80px] resize-none"
            />
          )}
        </div>

        {/* Bilgilendirme Kutusu */}
        <div className="bg-bg-secondary rounded-2xl p-4 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Info className="h-4 w-4 text-accent-main shrink-0" />
            <p className="text-sm font-semibold">Hesabınız dondurulduğunda:</p>
          </div>
          <ul className="space-y-2 text-sm text-text-muted">
            <li className="flex items-start gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-text-muted/40 shrink-0" />
              Profiliniz diğer kullanıcılara görünmez olur
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-text-muted/40 shrink-0" />
              Gönderileriniz keşfetten kaldırılır
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-text-muted/40 shrink-0" />
              Bildirim almazsınız
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-text-muted/40 shrink-0" />
              Giriş yaparak istediğiniz zaman tekrar aktifleştirebilirsiniz
            </li>
          </ul>
        </div>

        {/* Butonlar */}
        <div className="space-y-3">
          <button
            onClick={handleFreeze}
            disabled={!selectedReason || freezing}
            className="w-full py-3.5 rounded-2xl font-bold text-sm transition-all disabled:opacity-50 bg-accent-main text-white hover:opacity-90 active:scale-[0.98]"
          >
            {freezing ? <span className="loader" /> : "Hesabı Dondur"}
          </button>
          <Link
            href="/dashboard/settings"
            className="block w-full py-3.5 rounded-2xl font-bold text-sm text-center bg-bg-secondary text-text-primary hover:bg-bg-tertiary transition"
          >
            Vazgeç
          </Link>
        </div>
      </div>
    </AppLayout>
  );
}
