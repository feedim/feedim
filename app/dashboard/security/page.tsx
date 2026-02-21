"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Shield, Mail, Check, Lock } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { feedimAlert } from "@/components/FeedimAlert";
import PasswordInput from "@/components/PasswordInput";
import AppLayout from "@/components/AppLayout";
import { useUser } from "@/components/UserContext";
import { SettingsItemSkeleton } from "@/components/Skeletons";

const minDelay = (ms: number) => new Promise(r => setTimeout(r, ms));

export default function SecurityPage() {
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
    if (!enablePassword.trim()) { feedimAlert("error", "Şifrenizi girin"); return; }
    setEnableSending(true);
    try {
      const [{ error: authError }] = await Promise.all([
        supabase.auth.signInWithPassword({ email: userEmail, password: enablePassword }),
        minDelay(2000),
      ]);
      if (authError) { feedimAlert("error", "Şifre yanlış"); return; }
      const { error } = await supabase.auth.signInWithOtp({ email: userEmail, options: { shouldCreateUser: false } });
      if (error) { feedimAlert("error", "Kod gönderilemedi, lütfen daha sonra tekrar deneyin"); return; }
      setEnableStep(2);
      setMfaCooldown(60);
    } catch { feedimAlert("error", "Bir hata oluştu, lütfen daha sonra tekrar deneyin"); } finally { setEnableSending(false); }
  };

  const handleEnableOtpStep = async () => {
    if (enableCode.length < 6) return;
    setEnabling(true);
    try {
      const [{ error }] = await Promise.all([
        supabase.auth.verifyOtp({ email: userEmail, token: enableCode, type: "email" }),
        minDelay(2000),
      ]);
      if (error) { feedimAlert("error", "Kod geçersiz veya süresi dolmuş"); return; }
      const res = await fetch("/api/auth/mfa", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "enable" }) });
      const data = await res.json();
      if (!res.ok) { feedimAlert("error",data.error || "İki faktörlü doğrulama etkinleştirilemedi, lütfen daha sonra tekrar deneyin"); return; }
      feedimAlert("success", "İki faktörlü doğrulama etkinleştirildi");
      setMfaEnabled(true); setEnableStep(0); setEnablePassword(""); setEnableCode("");
    } catch { feedimAlert("error", "Bir hata oluştu, lütfen daha sonra tekrar deneyin"); } finally { setEnabling(false); }
  };

  const handleDisablePasswordStep = async () => {
    if (!disablePassword.trim()) { feedimAlert("error", "Şifrenizi girin"); return; }
    setDisableSending(true);
    try {
      const [{ error: authError }] = await Promise.all([
        supabase.auth.signInWithPassword({ email: userEmail, password: disablePassword }),
        minDelay(2000),
      ]);
      if (authError) { feedimAlert("error", "Şifre yanlış"); return; }
      const { error } = await supabase.auth.signInWithOtp({ email: userEmail, options: { shouldCreateUser: false } });
      if (error) { feedimAlert("error", "Kod gönderilemedi, lütfen daha sonra tekrar deneyin"); return; }
      setDisableStep(2);
      setMfaCooldown(60);
    } catch { feedimAlert("error", "Bir hata oluştu, lütfen daha sonra tekrar deneyin"); } finally { setDisableSending(false); }
  };

  const handleDisableOtpStep = async () => {
    if (disableCode.length < 6) return;
    setDisabling(true);
    try {
      const [{ error }] = await Promise.all([
        supabase.auth.verifyOtp({ email: userEmail, token: disableCode, type: "email" }),
        minDelay(2000),
      ]);
      if (error) { feedimAlert("error", "Kod geçersiz veya süresi dolmuş"); return; }
      const res = await fetch("/api/auth/mfa", { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) { feedimAlert("error",data.error || "İki faktörlü doğrulama kapatılamadı, lütfen daha sonra tekrar deneyin"); return; }
      feedimAlert("success", "İki faktörlü doğrulama kapatıldı");
      setMfaEnabled(false); setDisableStep(0); setDisablePassword(""); setDisableCode("");
    } catch { feedimAlert("error", "Bir hata oluştu, lütfen daha sonra tekrar deneyin"); } finally { setDisabling(false); }
  };

  const handleResendMfaOtp = async () => {
    if (mfaCooldown > 0 || !userEmail) return;
    try {
      const { error } = await supabase.auth.signInWithOtp({ email: userEmail, options: { shouldCreateUser: false } });
      if (error) { feedimAlert("error", "Kod gönderilemedi, lütfen daha sonra tekrar deneyin"); return; }
      feedimAlert("success", "Kod tekrar gönderildi");
      setMfaCooldown(60);
    } catch { feedimAlert("error", "Bir hata oluştu, lütfen daha sonra tekrar deneyin"); }
  };

  const handleChangePassword = async () => {
    if (!currentPassword.trim()) { feedimAlert("error", "Mevcut şifrenizi girin"); return; }
    if (newPassword.length < 8) { feedimAlert("error", "Yeni şifre en az 8 karakter olmalı"); return; }
    if (newPassword !== confirmNewPassword) { feedimAlert("error", "Şifreler eşleşmiyor"); return; }
    setChangingPassword(true);
    try {
      const [{ error: authError }] = await Promise.all([
        supabase.auth.signInWithPassword({ email: userEmail, password: currentPassword }),
        minDelay(2000),
      ]);
      if (authError) { feedimAlert("error", "Mevcut şifre yanlış"); return; }
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      feedimAlert("success", "Şifreniz başarıyla değiştirildi");
      setShowChangePassword(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
    } catch { feedimAlert("error", "Şifre değiştirilemedi, lütfen daha sonra tekrar deneyin"); } finally { setChangingPassword(false); }
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
      feedimAlert("success", "E-posta güncelleme linki gönderildi");
      setEditEmail(false); setNewEmail("");
    } catch { feedimAlert("error", "E-posta güncellenemedi, lütfen daha sonra tekrar deneyin"); } finally { setUpdatingEmail(false); }
  };

  const handleSendEmailCode = async () => {
    if (!userEmail) return;
    setSendingCode(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({ email: userEmail, options: { shouldCreateUser: false } });
      if (error) { feedimAlert("error", "Kod gönderilemedi, lütfen daha sonra tekrar deneyin"); return; }
      setVerifyingEmail(true);
      setEditEmail(false); setNewEmail("");
      setEmailCooldown(60);
    } catch { feedimAlert("error", "Bir hata oluştu, lütfen daha sonra tekrar deneyin"); } finally { setSendingCode(false); }
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
      if (!res.ok) { feedimAlert("error",data.error || "Kod geçersiz veya süresi dolmuş"); return; }
      setEmailVerified(true); setVerifyingEmail(false); setEmailCode("");
      feedimAlert("success", "E-posta adresiniz doğrulandı");
    } catch { feedimAlert("error", "Bir hata oluştu, lütfen daha sonra tekrar deneyin"); } finally { setVerifyingCode(false); }
  };

  return (
    <AppLayout hideRightSidebar>
      <div className="px-4 py-4 space-y-4">
        {loading ? (
          <SettingsItemSkeleton count={4} />
        ) : (
          <>
            {/* Email Verification */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Mail className="h-4.5 w-4.5 text-accent-main" />
                <h2 className="font-semibold text-[0.95rem]">E-posta Doğrulaması</h2>
              </div>
              <p className="text-xs text-text-muted mb-3">
                E-posta adresinizi doğrulayarak hesabınızın güvenliğini artırın.
              </p>

              <div className="flex items-center justify-between p-3 bg-bg-secondary rounded-[15px]">
                <div className="flex items-center gap-3 min-w-0">
                  <Mail className="h-4.5 w-4.5 text-text-muted shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{userEmail}</p>
                    {emailVerified ? (
                      <p className="text-xs text-accent-main font-semibold flex items-center gap-1 mt-0.5">
                        <Check className="h-3 w-3" /> Onaylandı
                      </p>
                    ) : (
                      <p className="text-xs text-accent-main mt-0.5">Onaylanmadı</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {!emailVerified && !verifyingEmail && (
                    <button onClick={handleSendEmailCode} disabled={sendingCode} className="text-xs text-accent-main font-semibold transition">
                      {sendingCode ? "..." : "Doğrula"}
                    </button>
                  )}
                  <button onClick={() => { setEditEmail(!editEmail); if (!editEmail) { setVerifyingEmail(false); setEmailCode(""); } }} className="text-xs text-text-muted hover:text-text-primary font-semibold transition">
                    Değiştir
                  </button>
                </div>
              </div>

              {editEmail && (
                <div className="mt-3 space-y-3">
                  <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value.replace(/\s/g, ""))} className="input-modern w-full" placeholder="Yeni e-posta adresiniz" maxLength={255} />
                  <div className="flex gap-2">
                    <button onClick={() => { setEditEmail(false); setNewEmail(""); }} className="flex-1 t-btn cancel py-2 text-sm">İptal</button>
                    <button onClick={handleUpdateEmail} disabled={!newEmail.trim() || updatingEmail} className="flex-1 t-btn accept py-2 text-sm flex items-center justify-center gap-2">
                      {updatingEmail ? <span className="loader" style={{ width: 16, height: 16 }} /> : "Kaydet"}
                    </button>
                  </div>
                </div>
              )}

              {verifyingEmail && !emailVerified && (
                <div className="mt-3 space-y-3">
                  <p className="text-xs text-text-muted">E-postanıza gönderilen 8 haneli kodu girin.</p>
                  <div className="flex gap-2">
                    <input type="text" inputMode="numeric" value={emailCode} onChange={(e) => setEmailCode(e.target.value.replace(/\D/g, "").slice(0, 8))} placeholder="00000000" maxLength={8} className="input-modern flex-1 text-center font-mono tracking-[0.3em]" />
                    <button onClick={handleVerifyEmailCode} disabled={verifyingCode || emailCode.length < 6} className="t-btn accept px-4 py-2 text-sm flex items-center justify-center gap-1.5 min-w-[90px]">
                      {verifyingCode ? <span className="loader" style={{ width: 14, height: 14 }} /> : <><Check className="h-3.5 w-3.5" /> Doğrula</>}
                    </button>
                  </div>
                  <button onClick={handleSendEmailCode} disabled={emailCooldown > 0 || sendingCode} className="text-xs text-text-muted hover:text-text-primary transition disabled:opacity-50">
                    {emailCooldown > 0 ? `Tekrar gönder (${emailCooldown}s)` : "Kodu Tekrar Gönder"}
                  </button>
                </div>
              )}
            </section>

            <div className="border-t border-border-primary" />

            {/* Change Password */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Lock className="h-4.5 w-4.5 text-accent-main" />
                <h2 className="font-semibold text-[0.95rem]">Şifre Değiştir</h2>
              </div>

              {!showChangePassword ? (
                <button onClick={() => setShowChangePassword(true)} className="t-btn cancel w-full py-3 flex items-center justify-center gap-2 text-sm">
                  <Lock className="h-4 w-4" />
                  Şifremi Değiştir
                </button>
              ) : (
                <div className="space-y-3 bg-bg-secondary rounded-xl p-4">
                  <PasswordInput
                    placeholder="Mevcut şifre"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value.replace(/\s/g, ""))}
                    maxLength={128}
                    autoComplete="current-password"
                    className="input-modern w-full"
                  />
                  <PasswordInput
                    placeholder="Yeni şifre (en az 8 karakter)"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value.replace(/\s/g, ""))}
                    maxLength={128}
                    autoComplete="new-password"
                    className="input-modern w-full"
                  />
                  <PasswordInput
                    placeholder="Yeni şifre tekrar"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value.replace(/\s/g, ""))}
                    maxLength={128}
                    autoComplete="new-password"
                    className="input-modern w-full"
                  />
                  <div className="flex gap-2">
                    <button onClick={() => { setShowChangePassword(false); setCurrentPassword(""); setNewPassword(""); setConfirmNewPassword(""); }} className="flex-1 t-btn cancel py-2.5 text-sm">
                      İptal
                    </button>
                    <button onClick={handleChangePassword} disabled={changingPassword || !currentPassword || !newPassword || !confirmNewPassword} className="flex-1 t-btn accept py-2.5 text-sm flex items-center justify-center gap-2">
                      {changingPassword ? <span className="loader" style={{ width: 16, height: 16 }} /> : "Değiştir"}
                    </button>
                  </div>
                </div>
              )}
            </section>

            <div className="border-t border-border-primary" />

            {/* İki Faktörlü Doğrulama */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Shield className="h-4.5 w-4.5 text-accent-main" />
                <h2 className="font-semibold text-[0.95rem]">İki Faktörlü Doğrulama</h2>
              </div>
              <p className="text-xs text-text-muted mb-4">
                Hesabınızı ekstra güvenlik katmanıyla koruyun. Her girişte e-postanıza doğrulama kodu gönderilir.
              </p>

              {!canUseMfa && !mfaEnabled ? (
                <Link
                  href="/premium"
                  className="flex items-center gap-3 p-4 bg-bg-secondary rounded-xl hover:bg-bg-tertiary transition-colors"
                >
                  <Lock className="h-5 w-5 text-text-muted shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold">Pro veya Max abonelik gerekli</p>
                    <p className="text-xs text-text-muted mt-0.5">İki faktörlü doğrulama Pro ve Max abonelere özel bir özelliktir.</p>
                  </div>
                  <svg className="h-4 w-4 text-text-muted shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
                </Link>
              ) : mfaEnabled ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-bg-secondary rounded-xl">
                    <div className="flex items-center gap-3">
                      <Check className="h-4.5 w-4.5 text-accent-main shrink-0" />
                      <div>
                        <p className="text-sm font-semibold text-accent-main">İki Faktörlü Doğrulama Etkin</p>
                        <p className="text-xs text-text-muted">Her girişte doğrulama kodu gönderilecek.</p>
                      </div>
                    </div>
                    {disableStep === 0 && (
                      <button onClick={() => setDisableStep(1)} className="text-xs text-text-muted hover:text-text-primary font-semibold transition shrink-0 ml-3">Kapat</button>
                    )}
                  </div>

                  {disableStep === 1 && (
                    <div className="space-y-3 bg-bg-secondary rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <Lock className="h-4 w-4 text-text-muted" />
                        <p className="text-sm font-medium">Şifrenizi girin</p>
                      </div>
                      <PasswordInput placeholder="Şifre" value={disablePassword} onChange={(e) => setDisablePassword(e.target.value.replace(/\s/g, ""))} maxLength={128} autoComplete="current-password" className="input-modern w-full" />
                      <div className="flex gap-2">
                        <button onClick={() => { setDisableStep(0); setDisablePassword(""); }} className="flex-1 t-btn cancel py-2.5 text-sm">İptal</button>
                        <button onClick={handleDisablePasswordStep} disabled={disableSending || !disablePassword.trim()} className="flex-1 t-btn accept py-2.5 text-sm flex items-center justify-center gap-2">
                          {disableSending ? <span className="loader" style={{ width: 16, height: 16 }} /> : "Devam"}
                        </button>
                      </div>
                    </div>
                  )}

                  {disableStep === 2 && (
                    <div className="space-y-3 bg-bg-secondary rounded-xl p-4">
                      <p className="text-xs text-text-muted">E-postanıza gönderilen 8 haneli kodu girin.</p>
                      <div className="flex gap-2">
                        <input type="text" inputMode="numeric" value={disableCode} onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, "").slice(0, 8))} placeholder="00000000" maxLength={8} className="input-modern flex-1 text-center font-mono tracking-[0.3em]" />
                        <button onClick={handleDisableOtpStep} disabled={disabling || disableCode.length < 6} className="t-btn accept px-4 py-2.5 text-sm flex items-center justify-center gap-1.5 min-w-[80px]">
                          {disabling ? <span className="loader" style={{ width: 14, height: 14 }} /> : <><Check className="h-3.5 w-3.5" /> Kapat</>}
                        </button>
                      </div>
                      <div className="flex items-center justify-between">
                        <button onClick={handleResendMfaOtp} disabled={mfaCooldown > 0} className="text-xs text-text-muted hover:text-text-primary transition disabled:opacity-50">
                          {mfaCooldown > 0 ? `Tekrar gönder (${mfaCooldown}s)` : "Kodu Tekrar Gönder"}
                        </button>
                        <button onClick={() => { setDisableStep(0); setDisablePassword(""); setDisableCode(""); }} className="text-xs text-text-muted hover:text-text-primary transition">İptal</button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {enableStep === 0 && canUseMfa && (
                    <button onClick={() => setEnableStep(1)} className="t-btn accept w-full py-3 flex items-center justify-center gap-2">
                      <Shield className="h-4 w-4" />
                      İki Faktörlü Doğrulamayı Etkinleştir
                    </button>
                  )}

                  {enableStep === 1 && (
                    <div className="space-y-3 bg-bg-secondary rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <Lock className="h-4 w-4 text-text-muted" />
                        <p className="text-sm font-medium">Hesap şifrenizi girin</p>
                      </div>
                      <PasswordInput placeholder="Şifre" value={enablePassword} onChange={(e) => setEnablePassword(e.target.value.replace(/\s/g, ""))} maxLength={128} autoComplete="current-password" className="input-modern w-full" />
                      <div className="flex gap-2">
                        <button onClick={() => { setEnableStep(0); setEnablePassword(""); }} className="flex-1 t-btn cancel py-2.5 text-sm">İptal</button>
                        <button onClick={handleEnablePasswordStep} disabled={enableSending || !enablePassword.trim()} className="flex-1 t-btn accept py-2.5 text-sm flex items-center justify-center gap-2">
                          {enableSending ? <span className="loader" style={{ width: 16, height: 16 }} /> : "Devam"}
                        </button>
                      </div>
                    </div>
                  )}

                  {enableStep === 2 && (
                    <div className="space-y-3 bg-bg-secondary rounded-xl p-4">
                      <p className="text-xs text-text-muted">E-postanıza gönderilen 8 haneli kodu girin.</p>
                      <div className="flex gap-2">
                        <input type="text" inputMode="numeric" value={enableCode} onChange={(e) => setEnableCode(e.target.value.replace(/\D/g, "").slice(0, 8))} placeholder="00000000" maxLength={8} className="input-modern flex-1 text-center font-mono tracking-[0.3em]" />
                        <button onClick={handleEnableOtpStep} disabled={enabling || enableCode.length < 6} className="t-btn accept px-4 py-2.5 text-sm flex items-center justify-center gap-1.5 min-w-[110px]">
                          {enabling ? <span className="loader" style={{ width: 14, height: 14 }} /> : <><Shield className="h-3.5 w-3.5" /> Etkinleştir</>}
                        </button>
                      </div>
                      <div className="flex items-center justify-between">
                        <button onClick={handleResendMfaOtp} disabled={mfaCooldown > 0} className="text-xs text-text-muted hover:text-text-primary transition disabled:opacity-50">
                          {mfaCooldown > 0 ? `Tekrar gönder (${mfaCooldown}s)` : "Kodu Tekrar Gönder"}
                        </button>
                        <button onClick={() => { setEnableStep(0); setEnablePassword(""); setEnableCode(""); }} className="text-xs text-text-muted hover:text-text-primary transition">İptal</button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </section>

            <div className="border-t border-border-primary" />

            {/* Info */}
            <section className="pb-4">
              <h3 className="font-semibold text-[0.95rem] mb-3">İki Faktörlü Doğrulama Nasıl Çalışır?</h3>
              <ul className="space-y-2 text-sm text-text-muted">
                <li className="flex items-start gap-2"><span className="text-accent-main mt-0.5">&#8226;</span>Her girişte e-postanıza 8 haneli kod gönderilir.</li>
                <li className="flex items-start gap-2"><span className="text-accent-main mt-0.5">&#8226;</span>Kodu girerek giriş işleminizi tamamlarsınız.</li>
                <li className="flex items-start gap-2"><span className="text-accent-main mt-0.5">&#8226;</span>Hesabınızı yetkisiz erişimlere karşı korur.</li>
              </ul>
            </section>
          </>
        )}
      </div>
    </AppLayout>
  );
}
