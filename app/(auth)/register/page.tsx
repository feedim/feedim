"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { feedimAlert } from "@/components/FeedimAlert";
import AuthLayout from "@/components/AuthLayout";
import PasswordInput from "@/components/PasswordInput";
import { VALIDATION } from "@/lib/constants";
import { normalizeUsername, filterNameInput, isValidEmail } from "@/lib/utils";
import { isDisposableEmail } from "@/lib/disposableEmails";
import PuzzleCaptcha from "@/components/PuzzleCaptcha";
import { getDeviceHash } from "@/lib/deviceHash";
import { useTranslations } from "next-intl";

export default function RegisterPage() {
  const t = useTranslations('auth');
  const tc = useTranslations('common');
  return (
    <Suspense fallback={<AuthLayout title={t('createAccount')} subtitle={tc('loading')} showRulesModal><div className="flex justify-center py-8"><span className="loader" /></div></AuthLayout>}>
      <RegisterForm />
    </Suspense>
  );
}

// Simple gibberish detection
function isGibberish(text: string): boolean {
  if (text.length < 2) return false;
  const consonants = text.toLowerCase().replace(/[aeiouöüıə\s]/g, "");
  if (consonants.length > text.length * 0.85) return true;
  // Check for repeating chars
  if (/(.)\1{3,}/.test(text)) return true;
  return false;
}

function generateUsernameSuggestions(name: string, surname: string): string[] {
  const base = normalizeUsername(name + surname);
  if (base.length < 3) return [];
  const suggestions = [
    base,
    `${base}${Math.floor(Math.random() * 99)}`,
    ...(surname ? [`${normalizeUsername(name)}.${normalizeUsername(surname)}`] : []),
    `${base}_${new Date().getFullYear() % 100}`,
  ].filter(s => s.length >= 3 && s.length <= 15);
  return [...new Set(suggestions)].slice(0, 3);
}

function RegisterForm() {
  const t = useTranslations('auth');
  const tc = useTranslations('common');
  const te = useTranslations('errors');
  const [name, setName] = useState("");
  const [surname, setSurname] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [captchaOpen, setCaptchaOpen] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }: any) => {
      if (user) { window.location.href = "/"; return; }
    }).catch(() => {});
  }, [supabase]);

  // Auto-suggest usernames when name/surname change
  useEffect(() => {
    if (name && !username) {
      setSuggestions(generateUsernameSuggestions(name, surname || ""));
    }
  }, [name, surname, username]);

  const handleOAuthLogin = async (provider: 'google') => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) feedimAlert("error", t('signInFailed'));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Client-side validation before opening captcha modal
    if (!VALIDATION.name.pattern.test(name) || (surname && !VALIDATION.name.pattern.test(surname))) {
      feedimAlert("error", t('nameLettersOnly'));
      return;
    }
    if (isGibberish(name) || (surname && isGibberish(surname))) {
      feedimAlert("error", t('validNameRequired'));
      return;
    }
    if (!isValidEmail(email)) {
      feedimAlert("error", t('validEmailRequired'));
      return;
    }
    if (isDisposableEmail(email)) {
      feedimAlert("error", t('disposableEmailBlocked'));
      return;
    }
    if (password !== confirmPassword) {
      feedimAlert("error", t('passwordsNoMatch'));
      return;
    }
    if (username && !VALIDATION.username.pattern.test(username)) {
      feedimAlert("error", t('invalidUsername'));
      return;
    }
    setCaptchaOpen(true);
  };

  const handleCaptchaVerify = async (captchaToken: string) => {
    setCaptchaOpen(false);
    setLoading(true);
    const start = Date.now();
    const MIN_FEEDBACK_MS = 600;

    const waitMin = async () => {
      const elapsed = Date.now() - start;
      if (elapsed < MIN_FEEDBACK_MS) await new Promise(r => setTimeout(r, MIN_FEEDBACK_MS - elapsed));
    };

    try {
      const deviceHash = getDeviceHash();
      let registrationProof = "";

      // Kayıt öncesi CAPTCHA + IP + cihaz limiti kontrolü
      const preCheck = await fetch("/api/auth/register-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceHash, captchaToken }),
      });
      if (preCheck.status === 429) {
        await waitMin();
        feedimAlert("error", t("registrationLimitReached"));
        return;
      }
      if (!preCheck.ok) {
        await waitMin();
        feedimAlert("error", t("registrationFailed"));
        return;
      }

      const preCheckData = await preCheck.json().catch(() => ({}));
      registrationProof = typeof preCheckData.registrationProof === "string" ? preCheckData.registrationProof : "";
      if (!registrationProof) {
        await waitMin();
        feedimAlert("error", t("registrationFailed"));
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name, surname: surname || undefined, full_name: surname ? `${name} ${surname}` : name, username: username || undefined },
        },
      });

      if (error) {
        await waitMin();
        if (error.message.includes('User already registered')) {
          feedimAlert("error", t('emailInUse'));
        } else if (error.message.includes('Password')) {
          feedimAlert("error", t('passwordMin'));
        } else if (error.message.includes('Email')) {
          feedimAlert("error", t('validEmailRequired'));
        } else {
          feedimAlert("error", t('registrationFailed'));
        }
        return;
      }

      if (data.user) {
        const updates: { name: string; surname?: string; username?: string } = { name };
        if (surname) updates.surname = surname;
        if (username) updates.username = username;
        await supabase.from('profiles').update(updates).eq('user_id', data.user.id);
      }

      await waitMin();

      // Record session helper
      const recordSession = () => {
        try {
          fetch("/api/account/sessions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ device_hash: deviceHash, user_agent: navigator.userAgent }),
          }).then(() => {
            try { sessionStorage.setItem("fdm-session-registered", "1"); } catch {}
          }).catch(() => {});
        } catch {}
      };

      if (data.user && !data.session) {
        // E-posta onayını otomatik atla ve giriş yap (captcha token ile güvenli)
        try {
          await fetch("/api/auth/auto-confirm", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ user_id: data.user.id, registrationProof, deviceHash }),
          });
          // Kısa bekleme — Supabase'in email_confirmed_at güncellemesini işlemesi için
          await new Promise(r => setTimeout(r, 300));
          const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });
          if (!loginError) {
            recordSession();
            window.location.href = "/onboarding";
            return;
          }
          // İlk deneme başarısız olduysa bir kez daha dene
          await new Promise(r => setTimeout(r, 500));
          const { error: retryError } = await supabase.auth.signInWithPassword({ email, password });
          if (!retryError) {
            recordSession();
            window.location.href = "/onboarding";
            return;
          }
        } catch {}
        // Fallback: session oluşturulamadıysa login'e yönlendir
        window.location.href = "/login";
      } else if (data.session) {
        recordSession();
        window.location.href = "/onboarding";
      } else {
        window.location.href = "/login";
      }
    } catch {
      await waitMin();
      feedimAlert("error", te('generic'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title={t('createAccount')} subtitle={t('createAccountDesc')} showRulesModal>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <input type="text" placeholder={t('firstName')} value={name} onChange={(e) => setName(filterNameInput(e.target.value))} required minLength={VALIDATION.name.min} maxLength={VALIDATION.name.max} autoComplete="given-name" className="input-modern w-full" />
          <input type="text" placeholder={t('lastNameOptional')} value={surname} onChange={(e) => setSurname(filterNameInput(e.target.value))} maxLength={VALIDATION.name.max} autoComplete="family-name" className="input-modern w-full" />
        </div>

        {/* Username */}
        <div>
          <input
            type="text"
            placeholder={t('usernameHint')}
            value={username}
            onChange={(e) => setUsername(normalizeUsername(e.target.value))}
            maxLength={VALIDATION.username.max}
            autoComplete="username"
            className="input-modern w-full"
          />
          {/* Suggestions */}
          {suggestions.length > 0 && !username && (
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {suggestions.map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setUsername(s)}
                  className="text-xs px-2.5 py-1 bg-accent-main/10 text-accent-main rounded-full hover:bg-accent-main/20 transition"
                >
                  @{s}
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <input type="email" placeholder={t('email')} value={email} onChange={(e) => setEmail(e.target.value.replace(/\s/g, "").toLowerCase())} required maxLength={VALIDATION.email.max} autoComplete="email" className="input-modern w-full" />
        </div>
        <PasswordInput placeholder={t('passwordHintDynamic', { min: VALIDATION.password.min })} value={password} onChange={(e) => setPassword(e.target.value.replace(/\s/g, ""))} required minLength={VALIDATION.password.min} maxLength={VALIDATION.password.max} autoComplete="new-password" className="input-modern w-full" />
        <PasswordInput placeholder={t('confirmPassword')} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value.replace(/\s/g, ""))} required minLength={VALIDATION.password.min} maxLength={VALIDATION.password.max} autoComplete="new-password" className="input-modern w-full" />

        <label className="flex items-start gap-3 cursor-pointer select-none">
          <input type="checkbox" checked={termsAccepted} onChange={(e) => setTermsAccepted(e.target.checked)} className="mt-0.5 cursor-pointer" />
          <span className="text-sm text-text-muted leading-snug">
            {t.rich('termsAndPrivacy', {
              terms: (chunks) => <Link href="/help/terms" target="_blank" className="text-accent-main hover:opacity-80 underline">{chunks}</Link>,
              privacy: (chunks) => <Link href="/help/privacy" target="_blank" className="text-accent-main hover:opacity-80 underline">{chunks}</Link>,
            })}
          </span>
        </label>
        <button type="submit" className="t-btn accept w-full relative" disabled={loading || !termsAccepted || (password !== confirmPassword)} aria-label={t('signUp')}>
          {loading ? <span className="loader" /> : t('signUp')}
        </button>
      </form>
      <PuzzleCaptcha open={captchaOpen} onClose={() => setCaptchaOpen(false)} onVerify={handleCaptchaVerify} />

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border-primary"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-4 bg-bg-primary text-text-muted">{tc('or')}</span>
        </div>
      </div>

      <button type="button" onClick={() => handleOAuthLogin('google')} className="w-full flex items-center justify-center gap-2.5 px-4 py-2.5 border border-border-primary bg-white text-black rounded-full hover:bg-gray-50 transition text-[0.88rem] font-[500]">
        <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        {t('continueWithGoogle')}
      </button>

      <p className="text-center text-text-muted text-sm mt-6">
        {t('hasAccount')}{" "}
        <Link href="/login" className="text-accent-main hover:opacity-80 font-semibold">{t('signIn')}</Link>
      </p>
    </AuthLayout>
  );
}
