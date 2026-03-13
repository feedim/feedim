"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Check } from "lucide-react";
import DigitInput from "@/components/DigitInput";
import PuzzleCaptcha from "@/components/PuzzleCaptcha";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/components/UserContext";

export default function UnblockVerify() {
  const t = useTranslations("moderation");
  const router = useRouter();
  const supabase = createClient();
  const { user } = useUser();
  const isAdmin = user?.role === "admin";
  const [step, setStep] = useState<"password" | "code">("password");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [hasResent, setHasResent] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [captchaOpen, setCaptchaOpen] = useState(false);
  const [captchaAction, setCaptchaAction] = useState<"send" | "resend">("send");

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }: any) => {
      if (user?.email) setUserEmail(user.email);
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const sendOtp = useCallback(async (captchaToken: string): Promise<boolean> => {
    if (!userEmail) return false;
    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-puzzle-token": captchaToken,
        },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        setError(t("codeSendFailed"));
        return false;
      } else {
        setCooldown(60);
        return true;
      }
    } catch {
      setError(t("codeSendFailed"));
      return false;
    }
  }, [t, userEmail]);

  const handleCaptchaVerify = useCallback(async (token: string) => {
    setCaptchaOpen(false);
    const action = captchaAction;
    if (action === "resend") {
      setCode("");
    }
    const sent = await sendOtp(token);
    if (action === "resend" && sent) {
      setHasResent(true);
    }
  }, [captchaAction, sendOtp]);

  const verifyPassword = async () => {
    if (password.length < 6) { setError(t("enterPassword")); return; }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/account/unblock-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify_password", password }),
      });
      const data = await res.json();
      if (res.ok) {
        setStep("code");
        setCode("");
        setError("");
        setCaptchaAction("send");
        if (isAdmin) {
          await handleCaptchaVerify("");
        } else {
          setCaptchaOpen(true);
        }
      } else {
        setError(data.error || t("verificationFailed"));
      }
    } catch {
      setError(t("connectionError"));
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async () => {
    if (code.length < 6 || !userEmail) { setError(t("enterCode")); return; }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/account/unblock-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify_code", code }),
      });
      const data = await res.json();
      if (res.ok) {
        document.cookie = "fdm-status=; Max-Age=0; Path=/;";
        router.replace("/");
      } else {
        setError(data.error || t("verificationFailed"));
        setCode("");
      }
    } catch {
      setError(t("connectionError"));
    } finally { setLoading(false); }
  };

  return (
    <div className="space-y-3">
      {step === "password" && (
        <>
          <p className="text-xs text-text-muted">{t("unblockPasswordPrompt")}</p>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === "Enter" && verifyPassword()}
            placeholder={t("yourPassword")}
            className="input-modern w-full"
          />
          <button
            onClick={verifyPassword}
            disabled={loading || password.length < 6}
            className="t-btn bg-text-primary text-bg-primary flex items-center justify-center w-full"
            aria-label={t("continue")}
          >
            {loading ? (
              <span className="loader !w-5 !h-5" style={{ borderColor: "var(--bg-primary)", borderTopColor: "transparent" }} />
            ) : (
              t("continue")
            )}
          </button>
        </>
      )}

      {step === "code" && (
        <>
          <p className="text-xs text-text-muted text-center">{t("enterEmailCode")}</p>
          <DigitInput value={code} onChange={setCode} autoFocus />
          <div className="flex gap-2">
            <button
              onClick={verifyCode}
              disabled={loading || code.length < 6}
              className="t-btn accept flex-1 py-2.5 text-sm flex items-center justify-center gap-1.5"
              aria-label={t("verifyCode")}
            >
              {loading ? <span className="loader" style={{ width: 14, height: 14 }} /> : <><Check className="h-3.5 w-3.5" /> {t("verify")}</>}
            </button>
          </div>
          <button
            onClick={() => {
              if (hasResent) return;
              setCode("");
              setCaptchaAction("resend");
              if (isAdmin) {
                void handleCaptchaVerify("");
              } else {
                setCaptchaOpen(true);
              }
            }}
            disabled={hasResent || cooldown > 0}
            className="text-xs text-text-muted hover:text-text-primary transition hover:underline disabled:opacity-50 text-center w-full"
          >
            {cooldown > 0 ? t("resendCountdown", { seconds: cooldown }) : t("resendCode")}
          </button>
        </>
      )}

      {error && <p className="text-xs text-error text-center">{error}</p>}
      <PuzzleCaptcha open={captchaOpen} onClose={() => setCaptchaOpen(false)} onVerify={handleCaptchaVerify} />
    </div>
  );
}
