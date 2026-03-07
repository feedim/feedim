"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { feedimAlert } from "@/components/FeedimAlert";
import AuthLayout from "@/components/AuthLayout";
import DigitInput from "@/components/DigitInput";
import PuzzleCaptcha from "@/components/PuzzleCaptcha";

type Step = "email" | "code";
type CaptchaAction = "send" | "resend";

export default function ForgotPasswordPage() {
  const t = useTranslations("auth");
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [hasResent, setHasResent] = useState(false);
  const [captchaOpen, setCaptchaOpen] = useState(false);
  const [captchaAction, setCaptchaAction] = useState<CaptchaAction>("send");
  const router = useRouter();

  // Cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const sendOtp = async (token: string, purpose: "forgot-password" | "resend") => {
    setLoading(true);
    const start = Date.now();
    const MIN_FEEDBACK_MS = 500;

    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-puzzle-token": token,
        },
        body: JSON.stringify({ email, purpose }),
      });

      const elapsed = Date.now() - start;
      if (elapsed < MIN_FEEDBACK_MS) await new Promise((r) => setTimeout(r, MIN_FEEDBACK_MS - elapsed));

      if (res.status === 429) {
        feedimAlert("error", t("otpRateLimited"));
        return;
      }

      if (res.status === 400) {
        const data = await res.json().catch(() => ({}));
        if (data.error === "disposable_email") {
          feedimAlert("error", t("disposableEmailBlocked"));
          return;
        }
        feedimAlert("error", t("mfaCodeSendFailed"));
        return;
      }

      if (!res.ok) {
        feedimAlert("error", t("mfaCodeSendFailed"));
        return;
      }

      setCooldown(60);
      setStep("code");
      if (purpose === "resend") {
        setHasResent(true);
        feedimAlert("success", t("mfaCodeSent"));
      } else {
        setHasResent(false);
        setCode("");
      }
    } catch {
      const elapsed = Date.now() - start;
      if (elapsed < MIN_FEEDBACK_MS) await new Promise((r) => setTimeout(r, MIN_FEEDBACK_MS - elapsed));
      feedimAlert("error", t("forgotGenericError"));
    } finally {
      setLoading(false);
    }
  };

  const handleSendCode = (e: React.FormEvent) => {
    e.preventDefault();
    setCaptchaAction("send");
    setCaptchaOpen(true);
  };

  const handleCaptchaVerify = async (token: string) => {
    setCaptchaOpen(false);
    if (captchaAction === "resend") {
      setCode("");
      await sendOtp(token, "resend");
      return;
    }
    await sendOtp(token, "forgot-password");
  };

  const handleResend = () => {
    if (cooldown > 0 || hasResent) return;
    setCode("");
    setCaptchaAction("resend");
    setCaptchaOpen(true);
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length < 6) {
      feedimAlert("error", t("mfaEnterCode"));
      return;
    }

    setLoading(true);
    try {
      const verifyRes = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });

      if (!verifyRes.ok) {
        feedimAlert("error", t("mfaCodeInvalidOrExpired"));
        setCode("");
        return;
      }

      const data = await verifyRes.json();

      // Set client-side session so reset-password page finds an active session
      if (data.access_token && data.refresh_token) {
        const supabase = createClient();
        await supabase.auth.setSession({
          access_token: data.access_token,
          refresh_token: data.refresh_token,
        });
      }

      try { sessionStorage.setItem("fdm-reset-email", email); } catch {}
      router.push("/reset-password");
    } catch {
      feedimAlert("error", t("forgotGenericError"));
    } finally {
      setLoading(false);
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
            className="text-sm text-text-muted hover:text-text-primary transition hover:underline font-semibold"
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
              className="text-sm font-semibold text-text-muted hover:text-text-primary transition hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {cooldown > 0
                ? t("resendCountdown", { seconds: cooldown })
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
              className="text-text-muted hover:text-text-primary transition hover:underline font-semibold"
            >
              {t("forgotDifferentEmail")}
            </button>
            <span className="text-border-main">|</span>
            <Link
              href="/login"
              className="text-text-muted hover:text-text-primary transition hover:underline font-semibold"
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
      <PuzzleCaptcha open={captchaOpen} onClose={() => setCaptchaOpen(false)} onVerify={handleCaptchaVerify} />
    </AuthLayout>
  );
}
