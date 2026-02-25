"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useTranslations } from "next-intl";
import { feedimAlert } from "@/components/FeedimAlert";
import AuthLayout from "@/components/AuthLayout";

type Step = "email" | "code";

export default function ForgotPasswordPage() {
  const t = useTranslations("auth");
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const router = useRouter();
  const supabase = createClient();

  // Cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const sendOtp = async () => {
    setLoading(true);
    const start = Date.now();

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: false },
      });

      const elapsed = Date.now() - start;
      if (elapsed < 3000) await new Promise((r) => setTimeout(r, 3000 - elapsed));

      if (error) {
        feedimAlert("error", t("mfaCodeSendFailed"));
        if (process.env.NODE_ENV === "development") console.log("OTP error:", error.message);
        return;
      }

      setCooldown(60);
      setStep("code");
    } catch {
      const elapsed = Date.now() - start;
      if (elapsed < 3000) await new Promise((r) => setTimeout(r, 3000 - elapsed));
      feedimAlert("error", t("forgotGenericError"));
    } finally {
      setLoading(false);
    }
  };

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    await sendOtp();
  };

  const handleResend = async () => {
    if (cooldown > 0) return;
    setCode("");
    await sendOtp();
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length < 6) {
      feedimAlert("error", t("mfaEnterCode"));
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
        feedimAlert("error", t("mfaCodeInvalidOrExpired"));
        if (process.env.NODE_ENV === "development") console.log("Verify error:", error.message);
        return;
      }

      // Şifre sıfırlama sayfasına email bilgisini taşı (auto-login için)
      try { sessionStorage.setItem("fdm-reset-email", email); } catch {}
      router.push("/reset-password");
    } catch {
      feedimAlert("error", t("forgotGenericError"));
    } finally {
      setLoading(false);
    }
  };

  const subtitle =
    step === "email"
      ? t("forgotSubtitle")
      : t("mfaEmailHint", { email });

  return (
    <AuthLayout title={t("forgotTitle")} subtitle={subtitle}>
      {step === "email" ? (
        <form onSubmit={handleSendCode} className="space-y-4">
          <input
            type="email"
            placeholder={t("email")}
            value={email}
            onChange={(e) => setEmail(e.target.value.replace(/\s/g, ""))}
            required
            maxLength={60}
            className="input-modern w-full"
          />
          <button
            type="submit"
            className="t-btn accept w-full relative"
            disabled={loading}
            aria-label={t("forgotSendCode")}
          >
            {loading ? <span className="loader" /> : t("forgotSendCode")}
          </button>
          <div className="text-center">
            <Link
              href="/login"
              className="text-sm text-text-muted hover:text-text-primary transition font-semibold"
            >
              {t("backToLogin")}
            </Link>
          </div>
        </form>
      ) : (
        <form onSubmit={handleVerify} className="space-y-4">
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
              className="w-full text-center bg-transparent border-none outline-none focus:ring-0"
              style={{ height: 50, fontSize: 50, fontWeight: 700, fontFamily: "sans-serif", letterSpacing: "0.3em" }}
            />
          </div>

          <button
            type="submit"
            className="t-btn accept w-full relative"
            disabled={loading || code.length < 6}
            aria-label={t("mfaVerify")}
          >
            {loading ? <span className="loader" /> : t("mfaVerify")}
          </button>

          <div className="text-center">
            <button
              type="button"
              onClick={handleResend}
              disabled={cooldown > 0 || loading}
              className="text-sm text-text-muted hover:text-text-primary transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {cooldown > 0
                ? t("mfaResendCountdown", { seconds: cooldown })
                : t("mfaResend")}
            </button>
          </div>

          <div className="flex items-center justify-center gap-3 text-sm">
            <button
              type="button"
              onClick={() => {
                setStep("email");
                setCode("");
              }}
              className="text-text-muted hover:text-text-primary transition font-semibold"
            >
              {t("forgotDifferentEmail")}
            </button>
            <span className="text-border-main">|</span>
            <Link
              href="/login"
              className="text-text-muted hover:text-text-primary transition font-semibold"
            >
              {t("backToLogin")}
            </Link>
          </div>

          <p className="text-center text-text-muted text-xs mt-2">
            {t("mfaEmailExpiry")}
            <br />
            {t("mfaCheckSpam")}
          </p>
        </form>
      )}
    </AuthLayout>
  );
}
