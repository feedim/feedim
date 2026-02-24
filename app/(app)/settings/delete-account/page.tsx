"use client";

import { useState } from "react";
import {useRouter, useSearchParams } from "next/navigation";
import { emitNavigationStart } from "@/lib/navigationProgress";
import Link from "next/link";
import { Trash2, AlertTriangle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { feedimAlert } from "@/components/FeedimAlert";
import AppLayout from "@/components/AppLayout";
import PasswordInput from "@/components/PasswordInput";

const minDelay = (ms: number) => new Promise(r => setTimeout(r, ms));

const REASONS = [
  "Platformu artık kullanmıyorum",
  "Başka bir hesap oluşturacağım",
  "Gizlilik endişem var",
  "İçeriklerden memnun değilim",
  "Diğer",
];

export default function DeleteAccountPage() {
  useSearchParams();
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [otherText, setOtherText] = useState("");
  const [password, setPassword] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleDelete = async () => {
    if (!selectedReason) {
      feedimAlert("error", "Lütfen bir neden seçin");
      return;
    }
    if (!password) {
      feedimAlert("error", "Lütfen şifrenizi girin");
      return;
    }
    if (confirmText !== "DELETE") {
      feedimAlert("error", "Lütfen 'DELETE' yazarak onaylayın");
      return;
    }

    setDeleting(true);
    try {
      // Verify password
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) {
        feedimAlert("error", "Oturum bulunamadı");
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password,
      });

      if (signInError) {
        feedimAlert("error", "Şifre yanlış");
        setDeleting(false);
        return;
      }

      const reason = selectedReason === "Diğer" ? otherText.trim() || "Diğer" : selectedReason;
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
        throw new Error(data.error || "Hesap silinemedi");
      }

      await supabase.auth.signOut();
      emitNavigationStart();
      router.push("/");
    } catch (error: any) {
      feedimAlert("error", error.message || "Bir hata oluştu, lütfen daha sonra tekrar deneyin");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AppLayout headerTitle="Hesabı Sil" hideRightSidebar>
      <div className="py-4 px-4 sm:px-5 max-w-xl mx-auto">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-16 h-16 rounded-full bg-error/10 flex items-center justify-center mb-4">
            <Trash2 className="h-8 w-8 text-error" />
          </div>
          <h1 className="text-xl font-bold mb-2">Hesabı Sil</h1>
          <p className="text-sm text-text-muted">
            Hesabınızı silmek geri dönüşü olmayan bir işlemdir. Lütfen aşağıdaki bilgileri dikkatlice okuyun.
          </p>
        </div>

        {/* Neden Seçimi */}
        <div className="mb-5">
          <p className="text-sm font-semibold mb-3">Neden silmek istiyorsunuz?</p>
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

        {/* Uyarı Kutusu */}
        <div className="rounded-2xl p-4 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-4 w-4 text-error shrink-0" />
            <p className="text-sm font-semibold text-error">Dikkat!</p>
          </div>
          <ul className="space-y-2 text-sm text-text-muted">
            <li className="flex items-start gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-text-muted/40 shrink-0" />
              Hesabınız hemen silinmez, 14 gün beklemeye alınır
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-text-muted/40 shrink-0" />
              14 gün içinde giriş yaparak silme işlemini iptal edebilirsiniz
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-text-muted/40 shrink-0" />
              14 gün sonra tüm verileriniz kalıcı olarak silinir
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-text-muted/40 shrink-0" />
              Gönderiler, yorumlar, takipçiler, jetonlar hepsi silinir
            </li>
          </ul>
        </div>

        {/* Şifre ve Onay */}
        <div className="space-y-3 mb-6">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Şifrenizi doğrulayın</label>
            <PasswordInput
              value={password}
              onChange={(e) => setPassword(e.target.value.replace(/\s/g, ""))}
              placeholder="Şifre"
              className="input-modern w-full"
              autoComplete="current-password"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">
              Onaylamak için <span className="font-bold">DELETE</span> yazın
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

        {/* Butonlar */}
        <div className="space-y-3">
          <button
            onClick={handleDelete}
            disabled={!selectedReason || !password || confirmText !== "DELETE" || deleting}
            className="t-btn accept w-full disabled:opacity-50"
            aria-label="Hesabı Sil"
          >
            {deleting ? <span className="loader" /> : "Hesabı Sil"}
          </button>
          <Link
            href="/settings"
            className="t-btn cancel w-full block text-center"
          >
            Vazgeç
          </Link>
        </div>
      </div>
    </AppLayout>
  );
}
