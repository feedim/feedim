"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { feedimAlert } from "@/components/FeedimAlert";
import AuthLayout from "@/components/AuthLayout";
import { Shield } from "lucide-react";
import { useTranslations } from "next-intl";

export default function VerifyMfaPage() {
  const t = useTranslations('auth');
  const te = useTranslations('errors');
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
        feedimAlert("error", t('mfaCodeSendFailed'));
        if (process.env.NODE_ENV === "development") console.log("OTP error:", error.message);
      } else {
        feedimAlert("success", t('mfaCodeSent'));
        setCooldown(60);
      }
    } catch {
      feedimAlert("error", te('generic'));
    } finally {
      setSending(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length < 6) {
      feedimAlert("error", t('mfaEnterCode'));
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
        feedimAlert("error", t('mfaCodeInvalidOrExpired'));
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

      window.location.href = "/";
    } catch {
      feedimAlert("error", te('generic'));
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
      title={t('mfaCode')}
      subtitle={email ? t('mfaEmailHint', { email }) : t('mfaWaiting')}
    >
      <form onSubmit={handleVerify} className="space-y-4">
        <div className="flex items-center justify-center gap-2 text-accent-main mb-2">
          <Shield className="h-5 w-5" />
          <span className="text-sm font-semibold">{t('mfaTitle')}</span>
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
          aria-label={t('mfaVerify')}
        >
          {loading ? <span className="loader" /> : t('mfaVerify')}
        </button>
      </form>

      <div className="text-center mt-4">
        {sending ? (
          <p className="text-sm text-text-muted">{t('mfaSending')}</p>
        ) : (
          <button
            onClick={handleResend}
            disabled={cooldown > 0}
            className="text-sm text-text-muted hover:text-text-primary transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {cooldown > 0
              ? t('mfaResendCountdown', { seconds: cooldown })
              : t('mfaResend')}
          </button>
        )}
      </div>

      <p className="text-center text-text-muted text-xs mt-4">
        {t('mfaEmailExpiry')}
        <br />
        {t('mfaCheckSpam')}
      </p>
    </AuthLayout>
  );
}
