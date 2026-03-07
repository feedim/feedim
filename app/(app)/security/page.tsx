"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Shield, Check, Lock } from "lucide-react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { feedimAlert } from "@/components/FeedimAlert";
import PuzzleCaptcha from "@/components/PuzzleCaptcha";
import PasswordInput from "@/components/PasswordInput";
import AppLayout from "@/components/AppLayout";
import DigitInput from "@/components/DigitInput";
import { useUser } from "@/components/UserContext";

async function serverSendOtp(captchaToken: string) {
  const res = await fetch("/api/auth/send-otp", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-puzzle-token": captchaToken,
    },
    body: JSON.stringify({}),
  });
  return res.ok;
}

const UI_MIN_DELAY_MS = 100;
const minDelay = (ms: number) => new Promise(r => setTimeout(r, ms));
type CaptchaFlow = "email_send" | "email_resend" | "mfa_enable_send" | "mfa_disable_send" | "mfa_resend";

export default function SecurityPage() {
  useSearchParams();
  const t = useTranslations("security");
  const [loading, setLoading] = useState(true);
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [emailVerified, setEmailVerified] = useState(false);
  const [verifyingEmail, setVerifyingEmail] = useState(false);
  const [emailCode, setEmailCode] = useState("");
  const [sendingCode, setSendingCode] = useState(false);
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [emailCooldown, setEmailCooldown] = useState(0);
  const [editEmail, setEditEmail] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [enableStep, setEnableStep] = useState(0);
  const [enablePassword, setEnablePassword] = useState("");
  const [enableCode, setEnableCode] = useState("");
  const [enabling, setEnabling] = useState(false);
  const [enableSending, setEnableSending] = useState(false);
  const [disableStep, setDisableStep] = useState(0);
  const [disablePassword, setDisablePassword] = useState("");
  const [disableCode, setDisableCode] = useState("");
  const [disabling, setDisabling] = useState(false);
  const [disableSending, setDisableSending] = useState(false);
  const [mfaCooldown, setMfaCooldown] = useState(0);
  const [mfaHasResent, setMfaHasResent] = useState(false);
  const [emailHasResent, setEmailHasResent] = useState(false);
  const [captchaOpen, setCaptchaOpen] = useState(false);
  const [captchaFlow, setCaptchaFlow] = useState<CaptchaFlow | null>(null);

  const router = useRouter();
  const supabase = createClient();
  const { user: currentUser } = useUser();
  const isAdmin = currentUser?.role === "admin";
  const canUseMfa = isAdmin || ["basic", "pro", "max", "business"].includes(currentUser?.premiumPlan || "");

  useEffect(() => { loadData(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (emailCooldown <= 0) return;
    const timer = setTimeout(() => setEmailCooldown(emailCooldown - 1), 1000);
    return () => clearTimeout(timer);
  }, [emailCooldown]);

  useEffect(() => {
    if (mfaCooldown <= 0) return;
    const timer = setTimeout(() => setMfaCooldown(mfaCooldown - 1), 1000);
    return () => clearTimeout(timer);
  }, [mfaCooldown]);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setUserEmail(user.email || "");
      const { data: profile } = await supabase
        .from("profiles")
        .select("email_verified")
        .eq("user_id", user.id)
        .single();
      setEmailVerified(profile?.email_verified || false);
      const res = await fetch("/api/auth/mfa");
      if (res.ok) {
        const data = await res.json();
        setMfaEnabled(data.enabled);
      }
    } catch { /* silent */ } finally { setLoading(false); }
  };

  const openCaptchaFor = (flow: CaptchaFlow) => {
    if (isAdmin) {
      if (flow === "email_send") { void sendEmailOtpWithCaptcha("", false); return; }
      if (flow === "email_resend") { void sendEmailOtpWithCaptcha("", true); return; }
      if (flow === "mfa_enable_send") { void sendMfaOtpWithCaptcha("", "enable"); return; }
      if (flow === "mfa_disable_send") { void sendMfaOtpWithCaptcha("", "disable"); return; }
      void sendMfaOtpWithCaptcha("", "resend");
      return;
    }
    if (flow === "email_send" || flow === "email_resend") {
      setEmailCode("");
    }
    if (flow === "mfa_enable_send" || flow === "mfa_resend") {
      setEnableCode("");
    }
    if (flow === "mfa_disable_send" || flow === "mfa_resend") {
      setDisableCode("");
    }
    setCaptchaFlow(flow);
    setCaptchaOpen(true);
  };

  const sendEmailOtpWithCaptcha = async (captchaToken: string, isResend: boolean) => {
    if (!userEmail) return false;
    setSendingCode(true);
    try {
      const sent = await serverSendOtp(captchaToken);
      if (!sent) { feedimAlert("error", t("codeSendFailed")); return false; }
      setVerifyingEmail(true);
      setEditEmail(false);
      setNewEmail("");
      setEmailCode("");
      setEmailCooldown(60);
      if (isResend) {
        setEmailHasResent(true);
        feedimAlert("success", t("codeResent"));
      } else {
        setEmailHasResent(false);
      }
      return true;
    } catch {
      feedimAlert("error", t("genericError"));
      return false;
    } finally {
      setSendingCode(false);
    }
  };

  const sendMfaOtpWithCaptcha = async (captchaToken: string, mode: "enable" | "disable" | "resend") => {
    if (!userEmail) return false;
    try {
      const sent = await serverSendOtp(captchaToken);
      if (!sent) { feedimAlert("error", t("codeSendFailed")); return false; }
      setMfaCooldown(60);
      if (mode === "enable") {
        setEnableCode("");
        setEnableStep(2);
        setMfaHasResent(false);
      } else if (mode === "disable") {
        setDisableCode("");
        setDisableStep(2);
        setMfaHasResent(false);
      } else {
        setEnableCode("");
        setDisableCode("");
        setMfaHasResent(true);
        feedimAlert("success", t("codeResent"));
      }
      return true;
    } catch {
      feedimAlert("error", t("genericError"));
      return false;
    }
  };

  const handleCaptchaVerify = async (token: string) => {
    setCaptchaOpen(false);
    const flow = captchaFlow;
    setCaptchaFlow(null);
    if (!flow) return;
    if (flow === "email_send") {
      await sendEmailOtpWithCaptcha(token, false);
      return;
    }
    if (flow === "email_resend") {
      await sendEmailOtpWithCaptcha(token, true);
      return;
    }
    if (flow === "mfa_enable_send") {
      await sendMfaOtpWithCaptcha(token, "enable");
      return;
    }
    if (flow === "mfa_disable_send") {
      await sendMfaOtpWithCaptcha(token, "disable");
      return;
    }
    await sendMfaOtpWithCaptcha(token, "resend");
  };

  const handleEnablePasswordStep = async () => {
    if (!enablePassword.trim()) { feedimAlert("error", t("enterPassword")); return; }
    setEnableSending(true);
    try {
      const [{ error: authError }] = await Promise.all([
        supabase.auth.signInWithPassword({ email: userEmail, password: enablePassword }),
        minDelay(UI_MIN_DELAY_MS),
      ]);
      if (authError) { feedimAlert("error", t("wrongPassword")); return; }
      openCaptchaFor("mfa_enable_send");
    } catch { feedimAlert("error", t("genericError")); } finally { setEnableSending(false); }
  };

  const handleEnableOtpStep = async () => {
    if (enableCode.length < 6) return;
    setEnabling(true);
    try {
      const [res] = await Promise.all([
        fetch("/api/auth/mfa", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "enable", code: enableCode }),
        }),
        minDelay(UI_MIN_DELAY_MS),
      ]);
      const data = await res.json();
      if (!res.ok) {
        feedimAlert("error",data.error || t("mfaEnableFailed"));
        setEnableCode("");
        return;
      }
      feedimAlert("success", t("mfaEnabled"));
      setMfaEnabled(true); setEnableStep(0); setEnablePassword(""); setEnableCode("");
    } catch { feedimAlert("error", t("genericError")); } finally { setEnabling(false); }
  };

  const handleDisablePasswordStep = async () => {
    if (!disablePassword.trim()) { feedimAlert("error", t("enterPassword")); return; }
    setDisableSending(true);
    try {
      const [{ error: authError }] = await Promise.all([
        supabase.auth.signInWithPassword({ email: userEmail, password: disablePassword }),
        minDelay(UI_MIN_DELAY_MS),
      ]);
      if (authError) { feedimAlert("error", t("wrongPassword")); return; }
      openCaptchaFor("mfa_disable_send");
    } catch { feedimAlert("error", t("genericError")); } finally { setDisableSending(false); }
  };

  const handleDisableOtpStep = async () => {
    if (disableCode.length < 6) return;
    setDisabling(true);
    try {
      const [res] = await Promise.all([
        fetch("/api/auth/mfa", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: disableCode }),
        }),
        minDelay(UI_MIN_DELAY_MS),
      ]);
      const data = await res.json();
      if (!res.ok) {
        feedimAlert("error",data.error || t("mfaDisableFailed"));
        setDisableCode("");
        return;
      }
      feedimAlert("success", t("mfaDisabled"));
      setMfaEnabled(false); setDisableStep(0); setDisablePassword(""); setDisableCode("");
    } catch { feedimAlert("error", t("genericError")); } finally { setDisabling(false); }
  };

  const handleResendMfaOtp = () => {
    if (mfaCooldown > 0 || mfaHasResent || !userEmail) return;
    openCaptchaFor("mfa_resend");
  };

  const handleChangePassword = async () => {
    if (!currentPassword.trim()) { feedimAlert("error", t("enterCurrentPassword")); return; }
    if (newPassword.length < 8) { feedimAlert("error", t("passwordMinLength")); return; }
    if (newPassword !== confirmNewPassword) { feedimAlert("error", t("passwordsNoMatch")); return; }
    setChangingPassword(true);
    try {
      const [{ error: authError }] = await Promise.all([
        supabase.auth.signInWithPassword({ email: userEmail, password: currentPassword }),
        minDelay(UI_MIN_DELAY_MS),
      ]);
      if (authError) { feedimAlert("error", t("currentPasswordWrong")); return; }
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      feedimAlert("success", t("passwordChanged"));
      setShowChangePassword(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
    } catch { feedimAlert("error", t("passwordChangeFailed")); } finally { setChangingPassword(false); }
  };

  const [updatingEmail, setUpdatingEmail] = useState(false);

  const handleUpdateEmail = async () => {
    if (!newEmail.trim()) return;
    setUpdatingEmail(true);
    try {
      const [{ error }] = await Promise.all([
        supabase.auth.updateUser({ email: newEmail }),
        minDelay(UI_MIN_DELAY_MS),
      ]);
      if (error) throw error;
      feedimAlert("success", t("emailUpdateLinkSent"));
      setEditEmail(false); setNewEmail("");
    } catch { feedimAlert("error", t("emailUpdateFailed")); } finally { setUpdatingEmail(false); }
  };

  const handleSendEmailCode = () => {
    if (!userEmail) return;
    openCaptchaFor("email_send");
  };

  const handleVerifyEmailCode = async () => {
    if (emailCode.length < 6 || !userEmail) return;
    setVerifyingCode(true);
    try {
      const [res] = await Promise.all([
        fetch("/api/auth/verify-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: emailCode }),
        }),
        minDelay(UI_MIN_DELAY_MS),
      ]);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        feedimAlert("error", data.error || t("codeInvalidOrExpired"));
        setEmailCode("");
        return;
      }
      setEmailVerified(true); setVerifyingEmail(false); setEmailCode("");
      feedimAlert("success", t("emailVerified"));
    } catch { feedimAlert("error", t("genericError")); } finally { setVerifyingCode(false); }
  };

  return (
    <AppLayout hideRightSidebar>
      <div className="px-4 py-4 space-y-4">
        {loading ? (
          <div className="space-y-4">
            {[1,2,3].map(i => (
              <div key={i} className="h-[62px] rounded-[13px] bg-bg-secondary animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            {/* Email Verification */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <h2 className="font-semibold text-[0.95rem]">{t("emailVerification")}</h2>
              </div>
              <p className="text-xs text-text-muted mb-3">
                {t("emailVerificationDesc")}
              </p>

              <div className="flex items-center justify-between p-3.5 bg-bg-secondary rounded-[15px]">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{userEmail}</p>
                    {emailVerified ? (
                      <p className="text-xs text-accent-main font-semibold flex items-center gap-1 mt-0.5">
                        <Check className="h-3 w-3" /> {t("verified")}
                      </p>
                    ) : (
                      <p className="text-xs text-accent-main mt-0.5">{t("notVerified")}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {!emailVerified && (
                    <button
                      onClick={handleSendEmailCode}
                      disabled={sendingCode || verifyingEmail}
                      className="text-xs text-accent-main font-semibold transition flex items-center justify-center min-w-[40px] disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {t("verify")}
                    </button>
                  )}
                  <button onClick={() => { setEditEmail(!editEmail); if (!editEmail) { setVerifyingEmail(false); setEmailCode(""); } }} className="text-xs text-text-muted hover:text-text-primary font-semibold transition">
                    {t("change")}
                  </button>
                </div>
              </div>

              {editEmail && (
                <div className="mt-3 space-y-3">
                  <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value.replace(/\s/g, ""))} className="input-modern w-full" placeholder={t("newEmailPlaceholder")} maxLength={255} />
                  <div className="flex gap-2">
                    <button onClick={() => { setEditEmail(false); setNewEmail(""); }} className="flex-1 t-btn cancel py-2 text-sm">{t("cancel")}</button>
                    <button onClick={handleUpdateEmail} disabled={!newEmail.trim() || updatingEmail} className="flex-1 t-btn accept py-2 text-sm flex items-center justify-center gap-2" aria-label={t("saveEmail")}>
                      {updatingEmail ? <span className="loader" style={{ width: 19, height: 19 }} /> : t("save")}
                    </button>
                  </div>
                </div>
              )}

              {verifyingEmail && !emailVerified && (
                <div className="mt-3 space-y-3">
                  <p className="text-xs text-text-muted">{t("enterCodeSent")}</p>
                  <DigitInput value={emailCode} onChange={setEmailCode} autoFocus />
                  <button onClick={handleVerifyEmailCode} disabled={verifyingCode || emailCode.length < 6} className="t-btn accept w-full py-2.5 text-sm flex items-center justify-center" aria-label={t("verifyEmailCode")}>
                    {verifyingCode ? <span className="loader" style={{ width: 19, height: 19 }} /> : t("verify")}
                  </button>
                  <div className="text-center">
                    <button onClick={() => { if (!emailHasResent) openCaptchaFor("email_resend"); }} disabled={emailHasResent || emailCooldown > 0 || sendingCode} className="text-sm font-semibold text-text-muted hover:text-text-primary transition hover:underline disabled:opacity-50">
                      {emailCooldown > 0 ? t("resendCodeTimer", { seconds: emailCooldown }) : t("resendCode")}
                    </button>
                  </div>
                  <p className="text-center text-text-muted text-[0.68rem] mt-1">
                    {t("emailExpiry")}
                    <br />
                    {t("checkSpam")}
                  </p>
                </div>
              )}
            </section>

            <div className="border-t border-border-primary" />

            {/* Change Password */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Lock className="h-4.5 w-4.5 text-accent-main" />
                <h2 className="font-semibold text-[0.95rem]">{t("changePassword")}</h2>
              </div>

              {!showChangePassword ? (
                <button onClick={() => setShowChangePassword(true)} className="t-btn cancel w-full py-3 flex items-center justify-center gap-2 text-sm">
                  <Lock className="h-4 w-4" />
                  {t("changeMyPassword")}
                </button>
              ) : (
                <div className="space-y-3 bg-bg-secondary rounded-[28px] p-4">
                  <PasswordInput
                    placeholder={t("currentPasswordPlaceholder")}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value.replace(/\s/g, ""))}
                    maxLength={128}
                    autoComplete="current-password"
                    className="input-modern w-full"
                  />
                  <PasswordInput
                    placeholder={t("newPasswordPlaceholder")}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value.replace(/\s/g, ""))}
                    maxLength={128}
                    autoComplete="new-password"
                    className="input-modern w-full"
                  />
                  <PasswordInput
                    placeholder={t("confirmPasswordPlaceholder")}
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value.replace(/\s/g, ""))}
                    maxLength={128}
                    autoComplete="new-password"
                    className="input-modern w-full"
                  />
                  <div className="flex gap-2">
                    <button onClick={() => { setShowChangePassword(false); setCurrentPassword(""); setNewPassword(""); setConfirmNewPassword(""); }} className="flex-1 t-btn cancel py-2.5 text-sm">
                      {t("cancel")}
                    </button>
                    <button onClick={handleChangePassword} disabled={changingPassword || !currentPassword || !newPassword || !confirmNewPassword} className="flex-1 t-btn accept py-2.5 text-sm flex items-center justify-center gap-2" aria-label={t("changePassword")}>
                      {changingPassword ? <span className="loader" style={{ width: 19, height: 19 }} /> : t("change")}
                    </button>
                  </div>
                </div>
              )}
            </section>

            <div className="border-t border-border-primary" />

            {/* Two-Factor Authentication */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Shield className="h-4.5 w-4.5 text-accent-main" />
                <h2 className="font-semibold text-[0.95rem]">{t("twoFactorAuth")}</h2>
              </div>
              <p className="text-xs text-text-muted mb-4">
                {t("twoFactorDesc")}
              </p>

              {!canUseMfa && !mfaEnabled ? (
                <div className="bg-bg-secondary rounded-2xl p-5 text-center space-y-3">
                  <div className="w-14 h-14 rounded-full bg-accent-main/10 flex items-center justify-center mx-auto">
                    <Lock className="h-7 w-7 text-accent-main" />
                  </div>
                  <p className="text-sm font-semibold">{t("mfaRequiresPremium")}</p>
                  <p className="text-xs text-text-muted">{t("mfaPremiumDesc")}</p>
                  <Link
                    href="/premium"
                    className="block w-full t-btn accept !text-[0.84rem]"
                  >
                    {t("browsePremium")}
                  </Link>
                </div>
              ) : mfaEnabled ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-bg-secondary rounded-[15px]">
                    <div className="flex items-center gap-3">
                      <Check className="h-4.5 w-4.5 text-accent-main shrink-0" />
                      <div>
                        <p className="text-sm font-semibold text-accent-main">{t("mfaActive")}</p>
                        <p className="text-xs text-text-muted">{t("mfaActiveDesc")}</p>
                      </div>
                    </div>
                    {disableStep === 0 && (
                      <button onClick={() => setDisableStep(1)} className="text-xs text-text-muted hover:text-text-primary font-semibold transition shrink-0 ml-3">{t("turnOff")}</button>
                    )}
                  </div>

                  {disableStep === 1 && (
                    <div className="space-y-3 bg-bg-secondary rounded-[15px] p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <Lock className="h-4 w-4 text-text-muted" />
                        <p className="text-sm font-medium">{t("enterYourPassword")}</p>
                      </div>
                      <PasswordInput placeholder={t("password")} value={disablePassword} onChange={(e) => setDisablePassword(e.target.value.replace(/\s/g, ""))} maxLength={128} autoComplete="current-password" className="input-modern w-full" />
                      <div className="flex gap-2">
                        <button onClick={() => { setDisableStep(0); setDisablePassword(""); }} className="flex-1 t-btn cancel py-2.5 text-sm">{t("cancel")}</button>
                        <button onClick={handleDisablePasswordStep} disabled={disableSending || !disablePassword.trim()} className="flex-1 t-btn accept py-2.5 text-sm flex items-center justify-center gap-2" aria-label={t("continue")}>
                          {disableSending ? <span className="loader" style={{ width: 19, height: 19 }} /> : t("continue")}
                        </button>
                      </div>
                    </div>
                  )}

                  {disableStep === 2 && (
                    <div className="space-y-3 bg-bg-secondary rounded-[15px] p-4">
                      <p className="text-xs text-text-muted">{t("enterCodeSent")}</p>
                      <DigitInput value={disableCode} onChange={setDisableCode} autoFocus />
                      <button onClick={handleDisableOtpStep} disabled={disabling || disableCode.length < 6} className="t-btn accept w-full py-2.5 text-sm flex items-center justify-center" aria-label={t("disableMfa")}>
                        {disabling ? <span className="loader" style={{ width: 19, height: 19 }} /> : t("turnOff")}
                      </button>
                      <div className="text-center">
                        <button onClick={handleResendMfaOtp} disabled={mfaHasResent || mfaCooldown > 0} className="text-sm font-semibold text-text-muted hover:text-text-primary transition hover:underline disabled:opacity-50">
                          {mfaCooldown > 0 ? t("resendCodeTimer", { seconds: mfaCooldown }) : t("resendCode")}
                        </button>
                      </div>
                      <p className="text-center text-text-muted text-[0.68rem] mt-1">
                        {t("emailExpiry")}
                        <br />
                        {t("checkSpam")}
                      </p>
                      <div className="text-center">
                        <button onClick={() => { setDisableStep(0); setDisablePassword(""); setDisableCode(""); }} className="text-xs text-text-muted hover:text-text-primary transition hover:underline">{t("cancel")}</button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {enableStep === 0 && canUseMfa && (
                    <button onClick={() => setEnableStep(1)} className="t-btn accept w-full py-3 flex items-center justify-center gap-2">
                      <Shield className="h-4 w-4" />
                      {t("enableMfa")}
                    </button>
                  )}

                  {enableStep === 1 && (
                    <div className="space-y-3 bg-bg-secondary rounded-[15px] p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <Lock className="h-4 w-4 text-text-muted" />
                        <p className="text-sm font-medium">{t("enterAccountPassword")}</p>
                      </div>
                      <PasswordInput placeholder={t("password")} value={enablePassword} onChange={(e) => setEnablePassword(e.target.value.replace(/\s/g, ""))} maxLength={128} autoComplete="current-password" className="input-modern w-full" />
                      <div className="flex gap-2">
                        <button onClick={() => { setEnableStep(0); setEnablePassword(""); }} className="flex-1 t-btn cancel py-2.5 text-sm">{t("cancel")}</button>
                        <button onClick={handleEnablePasswordStep} disabled={enableSending || !enablePassword.trim()} className="flex-1 t-btn accept py-2.5 text-sm flex items-center justify-center gap-2" aria-label={t("continue")}>
                          {enableSending ? <span className="loader" style={{ width: 19, height: 19 }} /> : t("continue")}
                        </button>
                      </div>
                    </div>
                  )}

                  {enableStep === 2 && (
                    <div className="space-y-3 bg-bg-secondary rounded-[15px] p-4">
                      <p className="text-xs text-text-muted">{t("enterCodeSent")}</p>
                      <DigitInput value={enableCode} onChange={setEnableCode} autoFocus />
                      <button onClick={handleEnableOtpStep} disabled={enabling || enableCode.length < 6} className="t-btn accept w-full py-2.5 text-sm flex items-center justify-center" aria-label={t("enableMfa")}>
                        {enabling ? <span className="loader" style={{ width: 19, height: 19 }} /> : t("enable")}
                      </button>
                      <div className="text-center">
                        <button onClick={handleResendMfaOtp} disabled={mfaHasResent || mfaCooldown > 0} className="text-sm font-semibold text-text-muted hover:text-text-primary transition hover:underline disabled:opacity-50">
                          {mfaCooldown > 0 ? t("resendCodeTimer", { seconds: mfaCooldown }) : t("resendCode")}
                        </button>
                      </div>
                      <p className="text-center text-text-muted text-[0.68rem] mt-1">
                        {t("emailExpiry")}
                        <br />
                        {t("checkSpam")}
                      </p>
                      <div className="text-center">
                        <button onClick={() => { setEnableStep(0); setEnablePassword(""); setEnableCode(""); }} className="text-xs text-text-muted hover:text-text-primary transition hover:underline">{t("cancel")}</button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </section>

            <div className="border-t border-border-primary" />

            {/* Info */}
            <section className="pb-4">
              <h3 className="font-semibold text-[0.95rem] mb-3">{t("mfaHowItWorks")}</h3>
              <ul className="space-y-2 text-sm text-text-muted">
                <li className="flex items-start gap-2"><span className="text-accent-main mt-0.5">&#8226;</span>{t("mfaHow1")}</li>
                <li className="flex items-start gap-2"><span className="text-accent-main mt-0.5">&#8226;</span>{t("mfaHow2")}</li>
                <li className="flex items-start gap-2"><span className="text-accent-main mt-0.5">&#8226;</span>{t("mfaHow3")}</li>
              </ul>
            </section>
          </>
        )}
      </div>
      <PuzzleCaptcha
        open={captchaOpen}
        onClose={() => setCaptchaOpen(false)}
        onVerify={handleCaptchaVerify}
      />
    </AppLayout>
  );
}
