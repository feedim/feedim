"use client";

import { useEffect, useState } from "react";
import {useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Shield, Mail, Check, Lock } from "lucide-react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { feedimAlert } from "@/components/FeedimAlert";
import PasswordInput from "@/components/PasswordInput";
import AppLayout from "@/components/AppLayout";
import { useUser } from "@/components/UserContext";

const minDelay = (ms: number) => new Promise(r => setTimeout(r, ms));

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

  const router = useRouter();
  const supabase = createClient();
  const { user: currentUser } = useUser();
  const canUseMfa = currentUser?.premiumPlan === "pro" || currentUser?.premiumPlan === "max";

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

  const handleEnablePasswordStep = async () => {
    if (!enablePassword.trim()) { feedimAlert("error", t("enterPassword")); return; }
    setEnableSending(true);
    try {
      const [{ error: authError }] = await Promise.all([
        supabase.auth.signInWithPassword({ email: userEmail, password: enablePassword }),
        minDelay(2000),
      ]);
      if (authError) { feedimAlert("error", t("wrongPassword")); return; }
      const { error } = await supabase.auth.signInWithOtp({ email: userEmail, options: { shouldCreateUser: false } });
      if (error) { feedimAlert("error", t("codeSendFailed")); return; }
      setEnableStep(2);
      setMfaCooldown(60);
    } catch { feedimAlert("error", t("genericError")); } finally { setEnableSending(false); }
  };

  const handleEnableOtpStep = async () => {
    if (enableCode.length < 6) return;
    setEnabling(true);
    try {
      const [{ error }] = await Promise.all([
        supabase.auth.verifyOtp({ email: userEmail, token: enableCode, type: "email" }),
        minDelay(2000),
      ]);
      if (error) { feedimAlert("error", t("codeInvalidOrExpired")); return; }
      const res = await fetch("/api/auth/mfa", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "enable" }) });
      const data = await res.json();
      if (!res.ok) { feedimAlert("error",data.error || t("mfaEnableFailed")); return; }
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
        minDelay(2000),
      ]);
      if (authError) { feedimAlert("error", t("wrongPassword")); return; }
      const { error } = await supabase.auth.signInWithOtp({ email: userEmail, options: { shouldCreateUser: false } });
      if (error) { feedimAlert("error", t("codeSendFailed")); return; }
      setDisableStep(2);
      setMfaCooldown(60);
    } catch { feedimAlert("error", t("genericError")); } finally { setDisableSending(false); }
  };

  const handleDisableOtpStep = async () => {
    if (disableCode.length < 6) return;
    setDisabling(true);
    try {
      const [{ error }] = await Promise.all([
        supabase.auth.verifyOtp({ email: userEmail, token: disableCode, type: "email" }),
        minDelay(2000),
      ]);
      if (error) { feedimAlert("error", t("codeInvalidOrExpired")); return; }
      const res = await fetch("/api/auth/mfa", { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) { feedimAlert("error",data.error || t("mfaDisableFailed")); return; }
      feedimAlert("success", t("mfaDisabled"));
      setMfaEnabled(false); setDisableStep(0); setDisablePassword(""); setDisableCode("");
    } catch { feedimAlert("error", t("genericError")); } finally { setDisabling(false); }
  };

  const handleResendMfaOtp = async () => {
    if (mfaCooldown > 0 || !userEmail) return;
    try {
      const { error } = await supabase.auth.signInWithOtp({ email: userEmail, options: { shouldCreateUser: false } });
      if (error) { feedimAlert("error", t("codeSendFailed")); return; }
      feedimAlert("success", t("codeResent"));
      setMfaCooldown(60);
    } catch { feedimAlert("error", t("genericError")); }
  };

  const handleChangePassword = async () => {
    if (!currentPassword.trim()) { feedimAlert("error", t("enterCurrentPassword")); return; }
    if (newPassword.length < 8) { feedimAlert("error", t("passwordMinLength")); return; }
    if (newPassword !== confirmNewPassword) { feedimAlert("error", t("passwordsNoMatch")); return; }
    setChangingPassword(true);
    try {
      const [{ error: authError }] = await Promise.all([
        supabase.auth.signInWithPassword({ email: userEmail, password: currentPassword }),
        minDelay(2000),
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
        minDelay(2000),
      ]);
      if (error) throw error;
      feedimAlert("success", t("emailUpdateLinkSent"));
      setEditEmail(false); setNewEmail("");
    } catch { feedimAlert("error", t("emailUpdateFailed")); } finally { setUpdatingEmail(false); }
  };

  const handleSendEmailCode = async () => {
    if (!userEmail) return;
    setSendingCode(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({ email: userEmail, options: { shouldCreateUser: false } });
      if (error) { feedimAlert("error", t("codeSendFailed")); return; }
      setVerifyingEmail(true);
      setEditEmail(false); setNewEmail("");
      setEmailCooldown(60);
    } catch { feedimAlert("error", t("genericError")); } finally { setSendingCode(false); }
  };

  const handleVerifyEmailCode = async () => {
    if (emailCode.length < 6 || !userEmail) return;
    setVerifyingCode(true);
    try {
      const [res] = await Promise.all([
        fetch("/api/auth/verify-email", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token: emailCode }) }),
        minDelay(2000),
      ]);
      const data = await res.json();
      if (!res.ok) { feedimAlert("error",data.error || t("codeInvalidOrExpired")); return; }
      setEmailVerified(true); setVerifyingEmail(false); setEmailCode("");
      feedimAlert("success", t("emailVerified"));
    } catch { feedimAlert("error", t("genericError")); } finally { setVerifyingCode(false); }
  };

  return (
    <AppLayout hideRightSidebar>
      <div className="px-4 py-4 space-y-4">
        {loading ? (
          <div className="flex justify-center py-8"><span className="loader" style={{ width: 22, height: 22 }} /></div>
        ) : (
          <>
            {/* Email Verification */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Mail className="h-4.5 w-4.5 text-accent-main" />
                <h2 className="font-semibold text-[0.95rem]">{t("emailVerification")}</h2>
              </div>
              <p className="text-xs text-text-muted mb-3">
                {t("emailVerificationDesc")}
              </p>

              <div className="flex items-center justify-between p-3 bg-bg-secondary rounded-[15px]">
                <div className="flex items-center gap-3 min-w-0">
                  <Mail className="h-4.5 w-4.5 text-text-muted shrink-0" />
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
                  {!emailVerified && !verifyingEmail && (
                    <button onClick={handleSendEmailCode} disabled={sendingCode} className="text-xs text-accent-main font-semibold transition">
                      {sendingCode ? "..." : t("verify")}
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
                      {updatingEmail ? <span className="loader" style={{ width: 16, height: 16 }} /> : t("save")}
                    </button>
                  </div>
                </div>
              )}

              {verifyingEmail && !emailVerified && (
                <div className="mt-3 space-y-3">
                  <p className="text-xs text-text-muted">{t("enterCodeSent")}</p>
                  <div className="flex gap-2">
                    <input type="text" inputMode="numeric" value={emailCode} onChange={(e) => setEmailCode(e.target.value.replace(/\D/g, "").slice(0, 8))} placeholder="00000000" maxLength={8} className="input-modern flex-1 text-center font-mono tracking-[0.3em]" />
                    <button onClick={handleVerifyEmailCode} disabled={verifyingCode || emailCode.length < 6} className="t-btn accept px-4 py-2 text-sm flex items-center justify-center gap-1.5 min-w-[90px]" aria-label={t("verifyEmailCode")}>
                      {verifyingCode ? <span className="loader" style={{ width: 14, height: 14 }} /> : <><Check className="h-3.5 w-3.5" /> {t("verify")}</>}
                    </button>
                  </div>
                  <button onClick={handleSendEmailCode} disabled={emailCooldown > 0 || sendingCode} className="text-xs text-text-muted hover:text-text-primary transition disabled:opacity-50">
                    {emailCooldown > 0 ? t("resendCodeTimer", { seconds: emailCooldown }) : t("resendCode")}
                  </button>
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
                <div className="space-y-3 bg-bg-secondary rounded-[15px] p-4">
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
                      {changingPassword ? <span className="loader" style={{ width: 16, height: 16 }} /> : t("change")}
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
                          {disableSending ? <span className="loader" style={{ width: 16, height: 16 }} /> : t("continue")}
                        </button>
                      </div>
                    </div>
                  )}

                  {disableStep === 2 && (
                    <div className="space-y-3 bg-bg-secondary rounded-[15px] p-4">
                      <p className="text-xs text-text-muted">{t("enterCodeSent")}</p>
                      <div className="flex gap-2">
                        <input type="text" inputMode="numeric" value={disableCode} onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, "").slice(0, 8))} placeholder="00000000" maxLength={8} className="input-modern flex-1 text-center font-mono tracking-[0.3em]" />
                        <button onClick={handleDisableOtpStep} disabled={disabling || disableCode.length < 6} className="t-btn accept px-4 py-2.5 text-sm flex items-center justify-center gap-1.5 min-w-[80px]" aria-label={t("disableMfa")}>
                          {disabling ? <span className="loader" style={{ width: 14, height: 14 }} /> : <><Check className="h-3.5 w-3.5" /> {t("turnOff")}</>}
                        </button>
                      </div>
                      <div className="flex items-center justify-between">
                        <button onClick={handleResendMfaOtp} disabled={mfaCooldown > 0} className="text-xs text-text-muted hover:text-text-primary transition disabled:opacity-50">
                          {mfaCooldown > 0 ? t("resendCodeTimer", { seconds: mfaCooldown }) : t("resendCode")}
                        </button>
                        <button onClick={() => { setDisableStep(0); setDisablePassword(""); setDisableCode(""); }} className="text-xs text-text-muted hover:text-text-primary transition">{t("cancel")}</button>
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
                          {enableSending ? <span className="loader" style={{ width: 16, height: 16 }} /> : t("continue")}
                        </button>
                      </div>
                    </div>
                  )}

                  {enableStep === 2 && (
                    <div className="space-y-3 bg-bg-secondary rounded-[15px] p-4">
                      <p className="text-xs text-text-muted">{t("enterCodeSent")}</p>
                      <div className="flex gap-2">
                        <input type="text" inputMode="numeric" value={enableCode} onChange={(e) => setEnableCode(e.target.value.replace(/\D/g, "").slice(0, 8))} placeholder="00000000" maxLength={8} className="input-modern flex-1 text-center font-mono tracking-[0.3em]" />
                        <button onClick={handleEnableOtpStep} disabled={enabling || enableCode.length < 6} className="t-btn accept px-4 py-2.5 text-sm flex items-center justify-center gap-1.5 min-w-[110px]" aria-label={t("enableMfa")}>
                          {enabling ? <span className="loader" style={{ width: 14, height: 14 }} /> : <><Shield className="h-3.5 w-3.5" /> {t("enable")}</>}
                        </button>
                      </div>
                      <div className="flex items-center justify-between">
                        <button onClick={handleResendMfaOtp} disabled={mfaCooldown > 0} className="text-xs text-text-muted hover:text-text-primary transition disabled:opacity-50">
                          {mfaCooldown > 0 ? t("resendCodeTimer", { seconds: mfaCooldown }) : t("resendCode")}
                        </button>
                        <button onClick={() => { setEnableStep(0); setEnablePassword(""); setEnableCode(""); }} className="text-xs text-text-muted hover:text-text-primary transition">{t("cancel")}</button>
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
    </AppLayout>
  );
}
