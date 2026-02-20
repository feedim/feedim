"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { feedimAlert } from "@/components/FeedimAlert";
import AuthLayout from "@/components/AuthLayout";
import PasswordInput from "@/components/PasswordInput";
import { VALIDATION } from "@/lib/constants";
import { normalizeUsername, filterNameInput } from "@/lib/utils";
import Turnstile from "@/components/Turnstile";

export default function RegisterPage() {
  return (
    <Suspense fallback={<AuthLayout title="Hesap Oluştur" subtitle="Yükleniyor..."><div className="flex justify-center py-8"><span className="loader" /></div></AuthLayout>}>
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
    `${normalizeUsername(name)}.${normalizeUsername(surname)}`,
    `${base}_${new Date().getFullYear() % 100}`,
  ].filter(s => s.length >= 3 && s.length <= 15);
  return [...new Set(suggestions)].slice(0, 3);
}

function RegisterForm() {
  const [name, setName] = useState("");
  const [surname, setSurname] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [usernameChecking, setUsernameChecking] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) router.replace("/dashboard");
    });
  }, [supabase, router]);

  // Auto-suggest usernames when name/surname change
  useEffect(() => {
    if (name && surname && !username) {
      setSuggestions(generateUsernameSuggestions(name, surname));
    }
  }, [name, surname]);

  // Check username availability
  useEffect(() => {
    if (!username || username.length < 3) {
      setUsernameAvailable(null);
      return;
    }
    if (!VALIDATION.username.pattern.test(username)) {
      setUsernameAvailable(false);
      return;
    }
    setUsernameChecking(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/users/check-username?username=${encodeURIComponent(username)}`);
        const data = await res.json();
        setUsernameAvailable(data.available);
      } catch {
        setUsernameAvailable(null);
      } finally {
        setUsernameChecking(false);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [username]);

  const handleOAuthLogin = async (provider: 'google') => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) feedimAlert("error", "Giriş yapılamadı, lütfen daha sonra tekrar deneyin");
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const start = Date.now();

    const waitMin = async () => {
      const elapsed = Date.now() - start;
      if (elapsed < 3000) await new Promise(r => setTimeout(r, 3000 - elapsed));
    };

    try {
      // Client-side validation
      if (!VALIDATION.name.pattern.test(name) || !VALIDATION.name.pattern.test(surname)) {
        await waitMin();
        feedimAlert("error", "Ad ve soyad sadece harf ve boşluk içerebilir.");
        return;
      }

      if (isGibberish(name) || isGibberish(surname)) {
        await waitMin();
        feedimAlert("error", "Lütfen geçerli bir ad ve soyad girin.");
        return;
      }

      if (password !== confirmPassword) {
        await waitMin();
        feedimAlert("error", "Şifreler eşleşmiyor.");
        return;
      }

      if (username && !VALIDATION.username.pattern.test(username)) {
        await waitMin();
        feedimAlert("error", "Geçersiz kullanıcı adı formatı.");
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name, surname, full_name: `${name} ${surname}`, username: username || undefined },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        await waitMin();
        if (error.message.includes('User already registered')) {
          feedimAlert("error", "Bu e-posta adresi zaten kullanılıyor.");
        } else if (error.message.includes('Password')) {
          feedimAlert("error", "Şifre en az 6 karakter olmalıdır.");
        } else if (error.message.includes('Email')) {
          feedimAlert("error", "Geçerli bir e-posta adresi girin.");
        } else {
          feedimAlert("error", "Kayıt oluşturulamadı, lütfen daha sonra tekrar deneyin");
        }
        return;
      }

      if (data.user) {
        const updates: Record<string, any> = { name, surname };
        if (username) updates.username = username;
        await supabase.from('profiles').update(updates).eq('user_id', data.user.id);
      }

      await waitMin();

      if (data.user && !data.session) {
        feedimAlert("info", "Lütfen e-postanızı kontrol edin ve doğrulayın.");
        router.push("/login");
      } else if (data.session) {
        router.replace("/dashboard");
      } else {
        router.push("/login");
      }
    } catch {
      await waitMin();
      feedimAlert("error", "Bir hata oluştu, lütfen daha sonra tekrar deneyin");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Hesap Oluştur" subtitle="Hemen ücretsiz bir hesap oluşturun.">
      <form onSubmit={handleRegister} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <input type="text" placeholder="Ad" value={name} onChange={(e) => setName(filterNameInput(e.target.value))} required minLength={VALIDATION.name.min} maxLength={VALIDATION.name.max} autoComplete="given-name" className="input-modern w-full" />
          <input type="text" placeholder="Soyad" value={surname} onChange={(e) => setSurname(filterNameInput(e.target.value))} required minLength={VALIDATION.name.min} maxLength={VALIDATION.name.max} autoComplete="family-name" className="input-modern w-full" />
        </div>

        {/* Username */}
        <div>
          <div className="relative">
            <input
              type="text"
              placeholder="Kullanıcı adı (3-15 karakter)"
              value={username}
              onChange={(e) => setUsername(normalizeUsername(e.target.value))}
              maxLength={VALIDATION.username.max}
              autoComplete="username"
              className="input-modern w-full"
            />
            {username.length >= 3 && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2">
                {usernameChecking ? (
                  <span className="text-xs text-text-muted">...</span>
                ) : usernameAvailable ? (
                  <svg className="h-5 w-5 text-text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
                ) : (
                  <svg className="h-5 w-5 text-error" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                )}
              </span>
            )}
          </div>
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

        <input type="email" placeholder="E-posta" value={email} onChange={(e) => setEmail(e.target.value.replace(/\s/g, ""))} required maxLength={VALIDATION.email.max} autoComplete="email" className="input-modern w-full" />
        <PasswordInput placeholder={`Şifre (en az ${VALIDATION.password.min} karakter)`} value={password} onChange={(e) => setPassword(e.target.value.replace(/\s/g, ""))} required minLength={VALIDATION.password.min} maxLength={VALIDATION.password.max} autoComplete="new-password" className="input-modern w-full" />
        <PasswordInput placeholder="Şifre tekrar" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value.replace(/\s/g, ""))} required minLength={VALIDATION.password.min} maxLength={VALIDATION.password.max} autoComplete="new-password" className="input-modern w-full" />

        <label className="flex items-start gap-3 cursor-pointer select-none">
          <input type="checkbox" checked={termsAccepted} onChange={(e) => setTermsAccepted(e.target.checked)} className="mt-0.5 cursor-pointer" />
          <span className="text-sm text-text-muted leading-snug">
            <Link href="/help/terms" target="_blank" className="text-accent-main hover:opacity-80 underline">Kullanım Koşulları</Link>&apos;nı ve{" "}
            <Link href="/help/privacy" target="_blank" className="text-accent-main hover:opacity-80 underline">Gizlilik Politikası</Link>&apos;nı kabul ediyorum.
          </span>
        </label>
        <Turnstile onVerify={setCaptchaToken} onExpire={() => setCaptchaToken(null)} className="flex justify-center" />
        <button type="submit" className="t-btn accept w-full relative" disabled={loading || !termsAccepted || (password !== confirmPassword)}>
          {loading ? <span className="loader" /> : "Kayıt Ol"}
        </button>
      </form>

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border-primary"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-4 text-text-muted">veya</span>
        </div>
      </div>

      <button type="button" onClick={() => handleOAuthLogin('google')} className="w-full flex items-center justify-center gap-2.5 px-4 py-2.5 border border-border-primary bg-white text-black rounded-full hover:bg-gray-50 transition text-[0.88rem] font-medium">
        <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        Google ile devam et
      </button>

      <p className="text-center text-text-muted text-sm mt-6">
        Zaten hesabınız var mı?{" "}
        <Link href="/login" className="text-accent-main hover:opacity-80 font-semibold">Giriş yap</Link>
      </p>
    </AuthLayout>
  );
}
