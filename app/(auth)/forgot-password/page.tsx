"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useTranslations } from "next-intl";
import { feedimAlert } from "@/components/FeedimAlert";
import AuthLayout from "@/components/AuthLayout";
import DigitInput from "@/components/DigitInput";

type Step = "email" | "code";

export default function ForgotPasswordPage() {
  const t = useTranslations("auth");
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [hasResent, setHasResent] = useState(false);
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
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const elapsed = Date.now() - start;
      if (elapsed < 3000) await new Promise((r) => setTimeout(r, 3000 - elapsed));

      if (res.status === 429) {
        feedimAlert("error", t("otpRateLimited"));
        return;
      }

      if (!res.ok) {
        feedimAlert("error", t("mfaCodeSendFailed"));
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
    if (cooldown > 0 || hasResent) return;
    setHasResent(true);
    setCode("");
    await sendOtp();
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length < 6) {
      feedimAlert("error", t("mfaEnterCode"));
      return;
    }

    const savedCode = code;
    setLoading(true);
    let success = false;
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

      success = true;
      // Şifre sıfırlama sayfasına email bilgisini taşı (auto-login için)
      try { sessionStorage.setItem("fdm-reset-email", email); } catch {}
      router.push("/reset-password");
    } catch {
      feedimAlert("error", t("forgotGenericError"));
    } finally {
      setLoading(false);
      if (!success) setCode(savedCode);
    }
  };

  const maskEmail = (e: string) => {
    const [local, domain] = e.split("@");
    if (!domain) return e;
    const [domName, ...ext] = domain.split(".");
    const ml = local.length <= 2 ? local : local.slice(0, 2) + "****";
    const md = domName.length <= 1 ? domName : domName.slice(0, 1) + "***";
    return `${ml}@${md}.${ext.join(".")}`;
  };

  const subtitle =
    step === "email"
      ? t("forgotSubtitle")
      : t("mfaEmailHint", { email: maskEmail(email) });

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
          <DigitInput value={code} onChange={setCode} autoFocus />

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
              disabled={hasResent || cooldown > 0 || loading}
              className="text-sm font-semibold text-text-muted hover:text-text-primary transition disabled:opacity-50 disabled:cursor-not-allowed"
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

          <p className="text-center text-text-muted text-[0.68rem] mt-2">
            {t("mfaEmailExpiry")}
            <br />
            {t("mfaCheckSpam")}
          </p>
        </form>
      )}
    </AuthLayout>
  );
}
