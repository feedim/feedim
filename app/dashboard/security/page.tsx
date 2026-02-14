"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Shield, Mail, Check, Loader2, Lock } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import MobileBottomNav from "@/components/MobileBottomNav";
import PasswordInput from "@/components/PasswordInput";

export default function SecurityPage() {
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<string | null>(null);
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [enabling, setEnabling] = useState(false);
  const [disabling, setDisabling] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [emailVerified, setEmailVerified] = useState(false);
  const [password, setPassword] = useState("");
  const [showPasswordInput, setShowPasswordInput] = useState(false);
  const [showDisablePassword, setShowDisablePassword] = useState(false);
  const [disablePassword, setDisablePassword] = useState("");
  // Email verification
  const [verifyingEmail, setVerifyingEmail] = useState(false);
  const [emailCode, setEmailCode] = useState("");
  const [sendingCode, setSendingCode] = useState(false);
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [emailCooldown, setEmailCooldown] = useState(0);
  // Email change
  const [editEmail, setEditEmail] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    loadData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (emailCooldown <= 0) return;
    const timer = setTimeout(() => setEmailCooldown(emailCooldown - 1), 1000);
    return () => clearTimeout(timer);
  }, [emailCooldown]);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      setUserEmail(user.email || "");

      const { data: profile } = await supabase
        .from("profiles")
        .select("role, email_verified")
        .eq("user_id", user.id)
        .single();

      setRole(profile?.role || null);
      setEmailVerified(profile?.email_verified || false);

      const res = await fetch("/api/auth/mfa");
      if (res.ok) {
        const data = await res.json();
        setMfaEnabled(data.enabled);
      }
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  };

  const handleEnable = async () => {
    if (!password.trim()) {
      toast.error("Şifrenizi girin");
      return;
    }

    setEnabling(true);
    try {
      // Verify password first
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: userEmail,
        password,
      });

      if (authError) {
        toast.error("Şifre yanlış");
        return;
      }

      const res = await fetch("/api/auth/mfa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "enable" }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "2FA etkinleştirilemedi");
        return;
      }
      toast.success("İki faktörlü doğrulama etkinleştirildi!");
      setMfaEnabled(true);
      setShowPasswordInput(false);
      setPassword("");
    } catch {
      toast.error("Bir hata oluştu");
    } finally {
      setEnabling(false);
    }
  };

  const handleDisable = async () => {
    if (!disablePassword.trim()) {
      toast.error("Şifrenizi girin");
      return;
    }

    setDisabling(true);
    try {
      // Verify password first
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: userEmail,
        password: disablePassword,
      });

      if (authError) {
        toast.error("Şifre yanlış");
        return;
      }

      const res = await fetch("/api/auth/mfa", { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "2FA kapatılamadı");
        return;
      }
      toast.success("İki faktörlü doğrulama kapatıldı");
      setMfaEnabled(false);
      setShowDisablePassword(false);
      setDisablePassword("");
    } catch {
      toast.error("Bir hata oluştu");
    } finally {
      setDisabling(false);
    }
  };

  const handleUpdateEmail = async () => {
    if (!newEmail.trim()) return;
    try {
      const { error } = await supabase.auth.updateUser({ email: newEmail });
      if (error) throw error;
      toast.success("E-posta güncelleme linki gönderildi! Lütfen e-postanızı kontrol edin.");
      setEditEmail(false);
      setNewEmail("");
    } catch {
      toast.error("E-posta güncellenemedi");
    }
  };

  const handleSendEmailCode = async () => {
    if (!userEmail) return;
    setSendingCode(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: userEmail,
        options: { shouldCreateUser: false },
      });
      if (error) {
        toast.error("Kod gönderilemedi");
        return;
      }
      toast.success("Doğrulama kodu e-postanıza gönderildi");
      setVerifyingEmail(true);
      setEmailCooldown(60);
    } catch {
      toast.error("Bir hata oluştu");
    } finally {
      setSendingCode(false);
    }
  };

  const handleVerifyEmailCode = async () => {
    if (emailCode.length < 6 || !userEmail) return;
    setVerifyingCode(true);
    try {
      // Send OTP to server for verification (prevents client-side bypass)
      const res = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: emailCode }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Kod geçersiz veya süresi dolmuş");
        return;
      }
      setEmailVerified(true);
      setVerifyingEmail(false);
      setEmailCode("");
      toast.success("E-posta adresiniz doğrulandı!");
    } catch {
      toast.error("Bir hata oluştu");
    } finally {
      setVerifyingCode(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="sticky top-0 z-50 bg-black/90 backdrop-blur-xl min-h-[73px]">
        <nav className="container mx-auto px-6 flex items-center justify-between min-h-[73px]">
          <button onClick={() => router.back()} className="flex items-center gap-2 transition-colors">
            <ArrowLeft className="h-5 w-5" />
            <span className="font-medium">Geri</span>
          </button>
          <h1 className="text-lg font-semibold">Güvenlik</h1>
          <div className="w-16" />
        </nav>
      </header>

      <main className="container mx-auto px-3 sm:px-6 py-4 sm:py-8 pb-24 md:pb-16 max-w-2xl">
        {loading ? (
          <div className="bg-zinc-900 rounded-2xl p-6 animate-pulse h-40" />
        ) : (
          <>
            {/* Email Verification */}
            <div className="bg-zinc-900 rounded-2xl p-6 mb-6">
              <div className="flex items-center gap-2 mb-2">
                <Mail className="h-5 w-5 text-pink-500" />
                <h2 className="font-semibold text-lg">E-posta Doğrulaması</h2>
              </div>
              <p className="text-xs text-zinc-500 mb-4">
                E-posta adresinizi doğrulayarak hesabınızın güvenliğini artırın.
              </p>

              <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-zinc-400" />
                  <div>
                    <p className="text-sm font-medium">{userEmail}</p>
                    {emailVerified ? (
                      <p className="text-xs text-pink-400 font-semibold flex items-center gap-1 mt-0.5">
                        <Check className="h-3 w-3" /> Onaylandı
                      </p>
                    ) : (
                      <p className="text-xs text-pink-400 mt-0.5">Onaylanmadı</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {!emailVerified && !verifyingEmail && (
                    <button
                      onClick={handleSendEmailCode}
                      disabled={sendingCode}
                      className="text-xs text-pink-500 hover:text-pink-400 font-semibold transition"
                    >
                      {sendingCode ? "..." : "Doğrula"}
                    </button>
                  )}
                  <button
                    onClick={() => setEditEmail(!editEmail)}
                    className="text-xs text-zinc-400 hover:text-white font-semibold transition"
                  >
                    Değiştir
                  </button>
                </div>
              </div>

              {/* Email change form */}
              {editEmail && (
                <div className="mt-4 space-y-3">
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="input-modern w-full"
                    placeholder="Yeni e-posta adresiniz"
                    maxLength={255}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setEditEmail(false); setNewEmail(""); }}
                      className="flex-1 btn-secondary py-2 text-sm"
                    >
                      İptal
                    </button>
                    <button
                      onClick={handleUpdateEmail}
                      disabled={!newEmail.trim()}
                      className="flex-1 btn-primary py-2 text-sm"
                    >
                      Kaydet
                    </button>
                  </div>
                </div>
              )}

              {/* Inline code verification */}
              {verifyingEmail && !emailVerified && (
                <div className="mt-4 space-y-3">
                  <p className="text-xs text-zinc-400">E-postanıza gönderilen 8 haneli kodu girin.</p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={emailCode}
                      onChange={(e) => setEmailCode(e.target.value.replace(/\D/g, "").slice(0, 8))}
                      placeholder="00000000"
                      maxLength={8}
                      className="input-modern flex-1 text-center font-mono tracking-[0.3em]"
                    />
                    <button
                      onClick={handleVerifyEmailCode}
                      disabled={verifyingCode || emailCode.length < 6}
                      className="btn-primary px-4 py-2 text-sm flex items-center gap-1.5"
                    >
                      {verifyingCode ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                      Doğrula
                    </button>
                  </div>
                  <button
                    onClick={handleSendEmailCode}
                    disabled={emailCooldown > 0 || sendingCode}
                    className="text-xs text-zinc-500 hover:text-white transition disabled:opacity-50"
                  >
                    {emailCooldown > 0 ? `Tekrar gönder (${emailCooldown}s)` : "Kodu Tekrar Gönder"}
                  </button>
                </div>
              )}
            </div>

            {/* 2FA Status - only for affiliate/admin */}
            {(role === "affiliate" || role === "admin") && <div className="bg-zinc-900 rounded-2xl p-6 mb-6">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="h-5 w-5 text-pink-500" />
                <h2 className="font-semibold text-lg">İki Faktörlü Doğrulama (2FA)</h2>
              </div>
              <p className="text-xs text-zinc-500 mb-6">
                Hesabınızı ekstra güvenlik katmanıyla koruyun. 2FA etkinleştirildiğinde her girişte e-postanıza doğrulama kodu gönderilir.
              </p>

              {mfaEnabled ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 bg-pink-500/10 border border-pink-500/20 rounded-xl p-4">
                    <Check className="h-5 w-5 text-pink-500 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-pink-400">2FA Etkin</p>
                      <p className="text-xs text-zinc-400">Her girişte {userEmail} adresine doğrulama kodu gönderilecek.</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                    <div className="flex items-center gap-3">
                      <Mail className="h-5 w-5 text-zinc-400" />
                      <div>
                        <p className="text-sm font-medium">E-posta Doğrulaması</p>
                        <p className="text-xs text-zinc-500">{userEmail}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowDisablePassword(!showDisablePassword)}
                      className="text-xs text-zinc-500 hover:text-red-400 transition"
                    >
                      Kapat
                    </button>
                  </div>

                  {/* Disable 2FA - password required */}
                  {showDisablePassword && (
                    <div className="space-y-3 bg-white/5 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <Lock className="h-4 w-4 text-zinc-400" />
                        <p className="text-sm font-medium">2FA kapatmak için şifrenizi girin</p>
                      </div>
                      <PasswordInput
                        placeholder="Şifre"
                        value={disablePassword}
                        onChange={(e) => setDisablePassword(e.target.value)}
                        maxLength={128}
                        autoComplete="current-password"
                        className="input-modern w-full"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => { setShowDisablePassword(false); setDisablePassword(""); }}
                          className="flex-1 btn-secondary py-2.5 text-sm"
                        >
                          İptal
                        </button>
                        <button
                          onClick={handleDisable}
                          disabled={disabling || !disablePassword.trim()}
                          className="flex-1 py-2.5 text-sm bg-red-600 hover:bg-red-500 text-white rounded-xl font-semibold transition flex items-center justify-center gap-2"
                        >
                          {disabling ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                          2FA Kapat
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {role === "affiliate" && (
                    <div className="bg-pink-500/10 border border-pink-500/20 rounded-xl p-4">
                      <p className="text-xs text-pink-400">
                        Affiliate olarak IBAN bilgisi eklemek ve indirim linki oluşturmak için 2FA etkinleştirmeniz zorunludur.
                      </p>
                    </div>
                  )}

                  {!showPasswordInput ? (
                    <button
                      onClick={() => setShowPasswordInput(true)}
                      className="btn-primary w-full py-3 flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      <Shield className="h-4 w-4" />
                      2FA Etkinleştir
                    </button>
                  ) : (
                    <div className="space-y-3 bg-white/5 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <Lock className="h-4 w-4 text-zinc-400" />
                        <p className="text-sm font-medium">Hesap şifrenizi girin</p>
                      </div>
                      <PasswordInput
                        placeholder="Şifre"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        maxLength={128}
                        autoComplete="current-password"
                        className="input-modern w-full"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => { setShowPasswordInput(false); setPassword(""); }}
                          className="flex-1 btn-secondary py-2.5 text-sm"
                        >
                          İptal
                        </button>
                        <button
                          onClick={handleEnable}
                          disabled={enabling || !password.trim()}
                          className="flex-1 btn-primary py-2.5 text-sm flex items-center justify-center gap-2"
                        >
                          {enabling ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
                          Onayla
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>}

            {/* Info - only for affiliate/admin */}
            {(role === "affiliate" || role === "admin") && (
              <div className="bg-zinc-900 rounded-2xl p-6">
                <h3 className="font-semibold mb-3">2FA Nasıl Çalışır?</h3>
                <ul className="space-y-2 text-sm text-zinc-400">
                  <li>• 2FA etkinleştirildiğinde her girişte e-postanıza 8 haneli kod gönderilir.</li>
                  <li>• Kodu girerek giriş işleminizi tamamlarsınız.</li>
                  <li>• Affiliate hesapları için 2FA zorunludur.</li>
                  <li>• 2FA etkinleştirildikten sonra IBAN ve link işlemlerinizi yapabilirsiniz.</li>
                </ul>
              </div>
            )}
          </>
        )}
      </main>

      <MobileBottomNav />
    </div>
  );
}
