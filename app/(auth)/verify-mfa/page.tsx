"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import AuthLayout from "@/components/AuthLayout";
import { Shield, Loader2 } from "lucide-react";

export default function VerifyMfaPage() {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(true);
  const [cooldown, setCooldown] = useState(0);
  const [email, setEmail] = useState("");
  const router = useRouter();
  const supabase = createClient();
  const otpSent = useRef(false);

  useEffect(() => {
    const storedEmail = sessionStorage.getItem("mfa_email");
    if (!storedEmail) {
      router.push("/login");
      return;
    }
    setEmail(storedEmail);

    // Send OTP on mount (only once)
    if (!otpSent.current) {
      otpSent.current = true;
      sendOtp(storedEmail);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const sendOtp = async (targetEmail: string) => {
    setSending(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: targetEmail,
        options: { shouldCreateUser: false },
      });
      if (error) {
        toast.error("Kod gönderilemedi. Lütfen tekrar deneyin.");
        if (process.env.NODE_ENV === "development") console.log("OTP error:", error.message);
      } else {
        toast.success("Doğrulama kodu e-postanıza gönderildi");
        setCooldown(60);
      }
    } catch {
      toast.error("Bir hata oluştu");
    } finally {
      setSending(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length < 6) {
      toast.error("Doğrulama kodunu girin");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email,
        token: code,
        type: "email",
      });

      if (error) {
        toast.error("Kod geçersiz veya süresi dolmuş");
        if (process.env.NODE_ENV === "development") console.log("Verify error:", error.message);
        return;
      }

      // Clean up
      sessionStorage.removeItem("mfa_email");
      toast.success("Doğrulama başarılı!");

      await new Promise((resolve) => setTimeout(resolve, 500));
      router.push("/dashboard");
      router.refresh();
    } catch {
      toast.error("Bir hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = () => {
    if (cooldown > 0 || !email) return;
    sendOtp(email);
  };

  return (
    <AuthLayout
      title="Doğrulama Kodu"
      subtitle={email ? `${email} adresine gönderilen 8 haneli kodu girin.` : "Doğrulama kodu bekleniyor..."}
    >
      <form onSubmit={handleVerify} className="space-y-4">
        <div className="flex items-center justify-center gap-2 text-pink-500 mb-2">
          <Shield className="h-5 w-5" />
          <span className="text-sm font-semibold">İki Faktörlü Doğrulama</span>
        </div>

        <div>
          <input
            type="text"
            inputMode="numeric"
            placeholder="000000"
            value={code}
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, "").slice(0, 8);
              setCode(val);
            }}
            maxLength={8}
            autoFocus
            className="input-modern w-full text-center text-2xl font-mono tracking-[0.5em]"
          />
        </div>

        <button
          type="submit"
          className="btn-primary w-full text-lg h-12"
          disabled={loading || code.length < 6}
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Doğrulanıyor...
            </span>
          ) : (
            "Doğrula"
          )}
        </button>
      </form>

      <div className="text-center mt-4">
        {sending ? (
          <p className="text-sm text-zinc-500">Kod gönderiliyor...</p>
        ) : (
          <button
            onClick={handleResend}
            disabled={cooldown > 0}
            className="text-sm text-zinc-400 hover:text-white transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {cooldown > 0
              ? `Tekrar gönder (${cooldown}s)`
              : "Kodu Tekrar Gönder"}
          </button>
        )}
      </div>

      <p className="text-center text-zinc-500 text-xs mt-4">
        E-postanızı kontrol edin. Kod 60 saniye geçerlidir.
        <br />
        Spam/gereksiz klasörünü de kontrol etmeyi unutmayın.
      </p>
    </AuthLayout>
  );
}
