"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Shield, Mail, Check, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import MobileBottomNav from "@/components/MobileBottomNav";

export default function SecurityPage() {
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<string | null>(null);
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [enabling, setEnabling] = useState(false);
  const [disabling, setDisabling] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    loadData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      setUserEmail(user.email || "");

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("user_id", user.id)
        .single();

      if (profile?.role !== "affiliate" && profile?.role !== "admin") {
        router.push("/dashboard/profile");
        return;
      }

      setRole(profile.role);

      const res = await fetch("/api/auth/mfa");
      if (res.ok) {
        const data = await res.json();
        setMfaEnabled(data.enabled);
      }
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  };

  const handleEnable = async () => {
    setEnabling(true);
    try {
      const res = await fetch("/api/auth/mfa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "enable" }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "2FA etkinleştirilemedi");
        return;
      }
      toast.success("İki faktörlü doğrulama etkinleştirildi! Bir sonraki girişte e-postanıza kod gelecek.");
      setMfaEnabled(true);
    } catch {
      toast.error("Bir hata oluştu");
    } finally {
      setEnabling(false);
    }
  };

  const handleDisable = async () => {
    setDisabling(true);
    try {
      const res = await fetch("/api/auth/mfa", { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "2FA kapatılamadı");
        return;
      }
      toast.success("İki faktörlü doğrulama kapatıldı");
      setMfaEnabled(false);
    } catch {
      toast.error("Bir hata oluştu");
    } finally {
      setDisabling(false);
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
          <h1 className="text-lg font-semibold">Güvenlik</h1>
          <div className="w-16" />
        </nav>
      </header>

      <main className="container mx-auto px-3 sm:px-6 py-4 sm:py-8 pb-24 md:pb-16 max-w-2xl">
        {loading ? (
          <div className="bg-zinc-900 rounded-2xl p-6 animate-pulse h-40" />
        ) : (
          <>
            {/* 2FA Status */}
            <div className="bg-zinc-900 rounded-2xl p-6 mb-6">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="h-5 w-5 text-pink-500" />
                <h2 className="font-semibold text-lg">İki Faktörlü Doğrulama (2FA)</h2>
              </div>
              <p className="text-xs text-zinc-500 mb-6">
                Hesabınızı ekstra güvenlik katmanıyla koruyun. 2FA etkinleştirildiğinde her girişte e-postanıza doğrulama kodu gönderilir.
              </p>

              {mfaEnabled ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 bg-pink-500/10 border border-pink-500/20 rounded-xl p-4">
                    <Check className="h-5 w-5 text-pink-500 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-pink-400">2FA Etkin</p>
                      <p className="text-xs text-zinc-400">Her girişte {userEmail} adresine doğrulama kodu gönderilecek.</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                    <div className="flex items-center gap-3">
                      <Mail className="h-5 w-5 text-zinc-400" />
                      <div>
                        <p className="text-sm font-medium">E-posta Doğrulaması</p>
                        <p className="text-xs text-zinc-500">{userEmail}</p>
                      </div>
                    </div>
                    {role !== "affiliate" && (
                      <button
                        onClick={handleDisable}
                        disabled={disabling}
                        className="text-xs text-zinc-500 hover:text-red-400 transition"
                      >
                        {disabling ? "..." : "Kapat"}
                      </button>
                    )}
                    {role === "affiliate" && (
                      <span className="text-xs text-zinc-600">Zorunlu</span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {role === "affiliate" && (
                    <div className="bg-pink-500/10 border border-pink-500/20 rounded-xl p-4">
                      <p className="text-xs text-pink-400">
                        Affiliate olarak IBAN bilgisi eklemek ve indirim linki oluşturmak için 2FA etkinleştirmeniz zorunludur.
                      </p>
                    </div>
                  )}

                  <button
                    onClick={handleEnable}
                    disabled={enabling}
                    className="btn-primary w-full py-3 flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {enabling ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
                    2FA Etkinleştir
                  </button>
                </div>
              )}
            </div>

            {/* Info */}
            <div className="bg-zinc-900 rounded-2xl p-6">
              <h3 className="font-semibold mb-3">2FA Nasıl Çalışır?</h3>
              <ul className="space-y-2 text-sm text-zinc-400">
                <li>• 2FA etkinleştirildiğinde her girişte e-postanıza 6 haneli kod gönderilir.</li>
                <li>• Kodu girerek giriş işleminizi tamamlarsınız.</li>
                <li>• Affiliate hesapları için 2FA zorunludur.</li>
                <li>• 2FA etkinleştirildikten sonra IBAN ve link işlemlerinizi yapabilirsiniz.</li>
              </ul>
            </div>
          </>
        )}
      </main>

      <MobileBottomNav />
    </div>
  );
}
