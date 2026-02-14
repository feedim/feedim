"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Shield, Smartphone, Check, Loader2, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import MobileBottomNav from "@/components/MobileBottomNav";

export default function SecurityPage() {
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<string | null>(null);
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [factors, setFactors] = useState<any[]>([]);
  const [enrolling, setEnrolling] = useState(false);
  const [enrollData, setEnrollData] = useState<{ factorId: string; qr: string; secret: string } | null>(null);
  const [verifyCode, setVerifyCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [removing, setRemoving] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    loadData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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

      setRole(profile.role);

      const res = await fetch("/api/auth/mfa");
      if (res.ok) {
        const data = await res.json();
        setMfaEnabled(data.enabled);
        setFactors(data.factors || []);
      }
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  };

  const handleEnroll = async () => {
    setEnrolling(true);
    try {
      const res = await fetch("/api/auth/mfa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "enroll" }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "2FA başlatılamadı");
        return;
      }
      setEnrollData({ factorId: data.factorId, qr: data.qr, secret: data.secret });
    } catch {
      toast.error("Bir hata oluştu");
    } finally {
      setEnrolling(false);
    }
  };

  const handleVerify = async () => {
    if (!enrollData || verifyCode.length !== 6) return;
    setVerifying(true);
    try {
      const res = await fetch("/api/auth/mfa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify", factorId: enrollData.factorId, code: verifyCode }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Doğrulama başarısız");
        return;
      }
      toast.success("İki faktörlü doğrulama etkinleştirildi!");
      setEnrollData(null);
      setVerifyCode("");
      loadData();
    } catch {
      toast.error("Bir hata oluştu");
    } finally {
      setVerifying(false);
    }
  };

  const handleRemove = async (factorId: string) => {
    setRemoving(true);
    try {
      const res = await fetch("/api/auth/mfa", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ factorId }),
      });
      if (!res.ok) {
        toast.error("2FA kaldırılamadı");
        return;
      }
      toast.success("İki faktörlü doğrulama kaldırıldı");
      loadData();
    } catch {
      toast.error("Bir hata oluştu");
    } finally {
      setRemoving(false);
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
                Hesabınızı ekstra güvenlik katmanıyla koruyun. Google Authenticator veya benzeri bir uygulama kullanarak 2FA etkinleştirin.
              </p>

              {mfaEnabled ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 bg-pink-500/10 border border-pink-500/20 rounded-xl p-4">
                    <Check className="h-5 w-5 text-pink-500 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-pink-400">2FA Etkin</p>
                      <p className="text-xs text-zinc-400">Hesabınız iki faktörlü doğrulama ile korunuyor.</p>
                    </div>
                  </div>

                  {factors.filter(f => f.status === "verified").map((factor) => (
                    <div key={factor.id} className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                      <div className="flex items-center gap-3">
                        <Smartphone className="h-5 w-5 text-zinc-400" />
                        <div>
                          <p className="text-sm font-medium">{factor.friendly_name || "Authenticator App"}</p>
                          <p className="text-xs text-zinc-500">Doğrulanmış</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemove(factor.id)}
                        disabled={removing}
                        className="p-2 text-zinc-500 hover:text-red-400 transition"
                        title="Kaldır"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : enrollData ? (
                <div className="space-y-4">
                  <div className="bg-white/5 rounded-xl p-4 text-center">
                    <p className="text-sm text-zinc-400 mb-3">Google Authenticator veya benzeri bir uygulama ile QR kodu tarayın:</p>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={enrollData.qr} alt="QR Code" className="mx-auto w-48 h-48 rounded-xl" />
                    <div className="mt-3">
                      <p className="text-[10px] text-zinc-500 mb-1">Manuel giriş kodu:</p>
                      <p className="text-xs font-mono bg-black/50 rounded-lg px-3 py-2 select-all break-all">{enrollData.secret}</p>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm text-zinc-400 mb-2">Doğrulama Kodu (6 haneli)</label>
                    <input
                      type="text"
                      value={verifyCode}
                      onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      placeholder="000000"
                      maxLength={6}
                      inputMode="numeric"
                      className="input-modern w-full text-center text-2xl font-mono tracking-[0.5em]"
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => { setEnrollData(null); setVerifyCode(""); }}
                      className="flex-1 btn-secondary py-3"
                    >
                      İptal
                    </button>
                    <button
                      onClick={handleVerify}
                      disabled={verifying || verifyCode.length !== 6}
                      className="flex-1 btn-primary py-3 flex items-center justify-center gap-2"
                    >
                      {verifying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                      Doğrula
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {role === "affiliate" && (
                    <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4">
                      <p className="text-xs text-yellow-400">
                        Affiliate olarak IBAN bilgisi eklemek ve indirim linki oluşturmak için 2FA etkinleştirmeniz zorunludur.
                      </p>
                    </div>
                  )}
                  <button
                    onClick={handleEnroll}
                    disabled={enrolling}
                    className="btn-primary w-full py-3 flex items-center justify-center gap-2"
                  >
                    {enrolling ? <Loader2 className="h-4 w-4 animate-spin" /> : <Smartphone className="h-4 w-4" />}
                    2FA Etkinleştir
                  </button>
                </div>
              )}
            </div>

            {/* Info */}
            <div className="bg-zinc-900 rounded-2xl p-6">
              <h3 className="font-semibold mb-3">2FA Hakkında</h3>
              <ul className="space-y-2 text-sm text-zinc-400">
                <li>• Google Authenticator, Authy veya benzeri TOTP uygulamaları desteklenir.</li>
                <li>• 2FA etkinleştirildiğinde giriş yaparken ek doğrulama kodu istenir.</li>
                <li>• Affiliate hesapları için 2FA zorunludur.</li>
                <li>• Uygulamayı kaybederseniz destek ekibimizle iletişime geçin.</li>
              </ul>
            </div>
          </>
        )}
      </main>

      <MobileBottomNav />
    </div>
  );
}
