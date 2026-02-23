"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { feedimAlert } from "@/components/FeedimAlert";
import AuthLayout from "@/components/AuthLayout";
import { Shield } from "lucide-react";

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
        feedimAlert("error", "Kod gönderilemedi, lütfen daha sonra tekrar deneyin");
        if (process.env.NODE_ENV === "development") console.log("OTP error:", error.message);
      } else {
        feedimAlert("success", "Doğrulama kodu e-postanıza gönderildi");
        setCooldown(60);
      }
    } catch {
      feedimAlert("error", "Bir hata oluştu, lütfen daha sonra tekrar deneyin");
    } finally {
      setSending(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length < 6) {
      feedimAlert("error", "Doğrulama kodunu girin");
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
        feedimAlert("error", "Kod geçersiz veya süresi dolmuş");
        if (process.env.NODE_ENV === "development") console.log("Verify error:", error.message);
        return;
      }

      sessionStorage.removeItem("mfa_email");

      // Record session
      try {
        const { getDeviceHash } = await import("@/lib/deviceHash");
        await fetch("/api/account/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ device_hash: getDeviceHash(), user_agent: navigator.userAgent }),
        });
      } catch {}

      router.push("/dashboard");
      router.refresh();
    } catch {
      feedimAlert("error", "Bir hata oluştu, lütfen daha sonra tekrar deneyin");
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
        <div className="flex items-center justify-center gap-2 text-accent-main mb-2">
          <Shield className="h-5 w-5" />
          <span className="text-sm font-semibold">İki Faktörlü Doğrulama</span>
        </div>

        <div>
          <input
            type="text"
            inputMode="numeric"
            placeholder="00000000"
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
          className="t-btn accept w-full relative"
          disabled={loading || code.length < 6}
          aria-label="MFA Kodunu Doğrula"
        >
          {loading ? <span className="loader" /> : "Doğrula"}
        </button>
      </form>

      <div className="text-center mt-4">
        {sending ? (
          <p className="text-sm text-text-muted">Kod gönderiliyor...</p>
        ) : (
          <button
            onClick={handleResend}
            disabled={cooldown > 0}
            className="text-sm text-text-muted hover:text-text-primary transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {cooldown > 0
              ? `Tekrar gönder (${cooldown}s)`
              : "Kodu Tekrar Gönder"}
          </button>
        )}
      </div>

      <p className="text-center text-text-muted text-xs mt-4">
        E-postanızı kontrol edin. Kod 60 saniye geçerlidir.
        <br />
        Spam/gereksiz klasörünü de kontrol etmeyi unutmayın.
      </p>
    </AuthLayout>
  );
}
