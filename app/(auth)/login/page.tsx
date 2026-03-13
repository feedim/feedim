"use client";

import { Suspense, useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { feedimAlert } from "@/components/FeedimAlert";
import AuthLayout from "@/components/AuthLayout";
import PasswordInput from "@/components/PasswordInput";
import DigitInput from "@/components/DigitInput";
import { ArrowLeft } from "lucide-react";
import { VALIDATION } from "@/lib/constants";
import { isSafeRedirectUrl } from "@/lib/utils";
import { useTranslations } from "next-intl";
import LazyAvatar from "@/components/LazyAvatar";
import PuzzleCaptcha from "@/components/PuzzleCaptcha";
import SavedAccountCard, { type SavedAccountCardAccount } from "@/components/SavedAccountCard";

interface SavedAccount extends SavedAccountCardAccount {
  email: string;
  last_login: number;
}

const SAVED_ACCOUNTS_KEY = "fdm_saved_accounts";
const MAX_SAVED_ACCOUNTS = 1;
const ACCOUNT_LOGIN_ATTEMPT_TIMEOUT_MS = 5 * 60 * 1000;

function getSavedAccounts(): SavedAccount[] {
  try {
    const raw = localStorage.getItem(SAVED_ACCOUNTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Only keep the most recent account
    return parsed
      .sort((a: SavedAccount, b: SavedAccount) => b.last_login - a.last_login)
      .slice(0, MAX_SAVED_ACCOUNTS);
  } catch {
    return [];
  }
}

function saveSavedAccounts(accounts: SavedAccount[]) {
  localStorage.setItem(SAVED_ACCOUNTS_KEY, JSON.stringify(accounts));
}

function upsertSavedAccount(account: Omit<SavedAccount, "last_login">): SavedAccount[] {
  const accounts = getSavedAccounts();
  const filtered = accounts.filter((a) => a.email !== account.email);
  const updated: SavedAccount[] = [
    { ...account, last_login: Date.now() },
    ...filtered,
  ].slice(0, MAX_SAVED_ACCOUNTS);
  saveSavedAccounts(updated);
  return updated;
}

function removeSavedAccount(email: string): SavedAccount[] {
  const accounts = getSavedAccounts().filter((a) => a.email !== email);
  saveSavedAccounts(accounts);
  return accounts;
}

export default function LoginPage() {
  const t = useTranslations('auth');
  const tc = useTranslations('common');
  return (
    <Suspense fallback={<AuthLayout title={t('signIn')} subtitle={tc('loading')} showRulesModal><div className="flex justify-center py-8"><span className="loader" /></div></AuthLayout>}>
      <LoginPageContent />
    </Suspense>
  );
}

function LoginPageContent() {
  const t = useTranslations('auth');
  const tc = useTranslations('common');
  const te = useTranslations('errors');
  const [identifier, setIdentifier] = useState(""); // email OR username
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [captchaOpen, setCaptchaOpen] = useState(false);
  const [mfaEmail, setMfaEmail] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [mfaLoading, setMfaLoading] = useState(false);
  const [mfaSending, setMfaSending] = useState(false);
  const [mfaCooldown, setMfaCooldown] = useState(0);
  const [mfaHasResent, setMfaHasResent] = useState(false);
  const [authRedirecting, setAuthRedirecting] = useState(false);
  const [savedAccounts, setSavedAccounts] = useState<SavedAccount[]>(() => getSavedAccounts());
  const [selectedAccount, setSelectedAccount] = useState<SavedAccount | null>(null);
  const [showNormalForm, setShowNormalForm] = useState(() => {
    try { return sessionStorage.getItem("fdm_switch_account") === "1"; } catch { return false; }
  });
  const mfaOtpSentRef = useRef(false);
  const hasAccountLoginAttemptRef = useRef(false);

  // Landing page "Farklı hesapla giriş yap" sends ?switch=1 → skip saved accounts screen
  useEffect(() => {
    if (searchParams.get("switch") === "1" && !showNormalForm) {
      setShowNormalForm(true);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const [authChecked, setAuthChecked] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useMemo(() => createClient(), []);

  const rawNext = searchParams.get("next");
  const nextUrl = isSafeRedirectUrl(rawNext) ? rawNext : null;
  const accountParam = searchParams.get("account");
  const errorParam = searchParams.get("error");

  const cleanLoginUrl = useMemo(() => {
    const params = new URLSearchParams();
    if (nextUrl) params.set("next", nextUrl);
    const query = params.toString();
    return query ? `/login?${query}` : "/login";
  }, [nextUrl]);

  useEffect(() => {
    if (errorParam === "email_in_use") {
      feedimAlert("error", t("emailAlreadyInUse"));
    } else if (errorParam === "google_unlinked") {
      feedimAlert("error", t("googleNotLinked"));
    }
  }, [errorParam]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }: any) => {
      if (user) { window.location.replace(nextUrl || "/"); return; }
      setAuthChecked(true);
    }).catch(() => {
      setAuthChecked(true);
    });
  }, [supabase, router, nextUrl]);

  // Auto-select account from query param (landing page redirect)
  useEffect(() => {
    if (accountParam && savedAccounts.length > 0 && !selectedAccount) {
      const match = savedAccounts.find(a => a.email === accountParam);
      if (match) setSelectedAccount(match);
    }
  }, [accountParam, savedAccounts.length]);

  useEffect(() => {
    if (savedAccounts.length === 0 && !selectedAccount) {
      const saved = localStorage.getItem("fdm_remember_email");
      if (saved) {
        setIdentifier(saved);
        setRememberMe(true);
      }
    }
  }, [savedAccounts.length, selectedAccount]);

  useEffect(() => {
    try {
      const storedMfaEmail = sessionStorage.getItem("mfa_email");
      if (!storedMfaEmail) return;
      setMfaEmail(storedMfaEmail);
      setMfaCode("");
      setSelectedAccount(null);
      setShowNormalForm(true);
    } catch {}
  }, []);

  useEffect(() => {
    if (mfaCooldown <= 0) return;
    const timer = setTimeout(() => setMfaCooldown((prev) => Math.max(0, prev - 1)), 1000);
    return () => clearTimeout(timer);
  }, [mfaCooldown]);

  useEffect(() => {
    if (!accountParam || hasAccountLoginAttemptRef.current) return;
    const timer = window.setTimeout(() => {
      if (!hasAccountLoginAttemptRef.current) {
        router.replace(cleanLoginUrl);
      }
    }, ACCOUNT_LOGIN_ATTEMPT_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, [accountParam, cleanLoginUrl, router]);

  const maskEmail = (email: string) => {
    const [local, domain] = email.split("@");
    if (!domain) return email;
    const [domainName, ...ext] = domain.split(".");
    const maskedLocal = local.length <= 2 ? local : `${local.slice(0, 2)}****`;
    const maskedDomain = domainName.length <= 1 ? domainName : `${domainName.slice(0, 1)}***`;
    return `${maskedLocal}@${maskedDomain}.${ext.join(".")}`;
  };

  const sendMfaOtp = async (targetEmail: string, isResend = false): Promise<boolean> => {
    setMfaSending(true);
    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: targetEmail, purpose: "mfa" }),
      });

      if (res.status === 429) {
        feedimAlert("error", t("otpRateLimited"));
        return false;
      }
      if (!res.ok) {
        feedimAlert("error", t("mfaCodeSendFailed"));
        return false;
      }

      setMfaCooldown(60);
      if (isResend) {
        setMfaHasResent(true);
        feedimAlert("success", t("mfaCodeSent"));
      }
      return true;
    } catch {
      feedimAlert("error", te("generic"));
      return false;
    } finally {
      setMfaSending(false);
    }
  };

  useEffect(() => {
    if (!mfaEmail) {
      mfaOtpSentRef.current = false;
      return;
    }
    if (mfaOtpSentRef.current) return;
    mfaOtpSentRef.current = true;
    void sendMfaOtp(mfaEmail, false);
  }, [mfaEmail]);

  const handleMfaVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    hasAccountLoginAttemptRef.current = true;
    if (mfaCode.length < 6) {
      feedimAlert("error", t("mfaEnterCode"));
      return;
    }

    setMfaLoading(true);
    try {
      const verifyRes = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: mfaEmail, code: mfaCode }),
      });
      const data = await verifyRes.json().catch(() => null);

      if (!verifyRes.ok) {
        feedimAlert("error", t("mfaCodeInvalidOrExpired"));
        setMfaCode("");
        return;
      }

      if (!data?.access_token || !data?.refresh_token) {
        feedimAlert("error", t("signInFailed"));
        return;
      }

      setAuthRedirecting(true);
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: data.access_token,
        refresh_token: data.refresh_token,
      });
      if (sessionError) {
        setAuthRedirecting(false);
        feedimAlert("error", t("signInFailed"));
        return;
      }

      const storedNext = sessionStorage.getItem("mfa_next");
      sessionStorage.removeItem("mfa_email");
      sessionStorage.removeItem("mfa_next");
      setMfaEmail("");
      setMfaCode("");

      try {
        const { getDeviceHash } = await import("@/lib/deviceHash");
        await fetch("/api/account/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ device_hash: getDeviceHash(), user_agent: navigator.userAgent }),
        });
      } catch {}

      try {
        const { broadcastSignIn } = await import("@/lib/authClient");
        broadcastSignIn();
      } catch {}

      try {
        const prev = parseInt(localStorage.getItem("fdm-login-count") || "0", 10);
        const next = prev + 1;
        localStorage.setItem("fdm-login-count", String(next));
        if (next % 4 === 0) sessionStorage.setItem("fdm-request-location", "true");
      } catch {}

      window.location.replace(storedNext && isSafeRedirectUrl(storedNext) ? storedNext : "/");
    } catch {
      setAuthRedirecting(false);
      feedimAlert("error", te("generic"));
    } finally {
      setMfaLoading(false);
    }
  };

  const handleMfaResend = async () => {
    if (mfaCooldown > 0 || mfaHasResent || !mfaEmail) return;
    setMfaCode("");
    await sendMfaOtp(mfaEmail, true);
  };

  const handleCancelMfa = () => {
    sessionStorage.removeItem("mfa_email");
    sessionStorage.removeItem("mfa_next");
    setMfaEmail("");
    setMfaCode("");
    setMfaHasResent(false);
    setMfaCooldown(0);
    setMfaSending(false);
    setLoading(false);
    if (accountParam) {
      router.replace(cleanLoginUrl);
    }
  };

  const handleOAuthLogin = async (provider: 'google') => {
    hasAccountLoginAttemptRef.current = true;
    if (nextUrl && isSafeRedirectUrl(nextUrl)) localStorage.setItem("fdm_auth_return", nextUrl);
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) feedimAlert("error", t('signInFailed'));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    hasAccountLoginAttemptRef.current = true;
    setCaptchaOpen(true);
  };

  const handleCaptchaVerify = async (captchaToken: string) => {
    setCaptchaOpen(false);
    setLoading(true);

    const loginIdentifier = selectedAccount ? selectedAccount.email : identifier;
    const start = Date.now();
    const MIN_FEEDBACK_MS = 600;

    const waitMin = async () => {
      const elapsed = Date.now() - start;
      if (elapsed < MIN_FEEDBACK_MS) await new Promise(r => setTimeout(r, MIN_FEEDBACK_MS - elapsed));
    };

    try {
      // Sunucu tarafında CAPTCHA doğrulaması
      const preCheck = await fetch("/api/auth/login-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ captchaToken }),
      });
      if (!preCheck.ok) {
        await waitMin();
        feedimAlert("error", t('signInFailed'));
        return;
      }

      // Resolve username to email if needed
      let email = loginIdentifier;
      if (!loginIdentifier.includes("@")) {
        const res = await fetch("/api/users/resolve", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ identifier: loginIdentifier }),
        });
        const data = await res.json();
        if (!res.ok) {
          await waitMin();
          feedimAlert("error", t('invalidCredentials'));
          return;
        }
        email = data.email;
      }

      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        await waitMin();
        if (error.message === 'Invalid login credentials') {
          feedimAlert("error", t('invalidCredentials'));
        } else if (error.message.includes('Email not confirmed')) {
          feedimAlert("error", t('emailNotVerified'));
        } else {
          feedimAlert("error", t('signInFailed'));
        }
        return;
      }

      if (data.user) {
        try {
          const { data: profile } = await supabase
            .from("profiles")
            .select("username, full_name, avatar_url, mfa_enabled, status")
            .eq("user_id", data.user.id)
            .single();

          // MFA check
          if (profile?.mfa_enabled) {
            document.cookie = 'fdm-status=; Max-Age=0; Path=/;';
            await supabase.auth.signOut();
            sessionStorage.setItem("mfa_email", email);
            if (nextUrl) sessionStorage.setItem("mfa_next", nextUrl);
            else sessionStorage.removeItem("mfa_next");
            mfaOtpSentRef.current = false;
            setMfaEmail(email);
            setMfaCode("");
            setMfaHasResent(false);
            setMfaCooldown(0);
            setMfaSending(false);
            setSelectedAccount(null);
            setShowNormalForm(true);
            await waitMin();
            return;
          }

          // Frozen account — auto-reactivate and redirect
          if (profile?.status === "frozen") {
            await fetch("/api/account/unfreeze", { method: "POST" });
            window.location.href = nextUrl || "/";
            return;
          }

          // Deleted account (soft-delete, 14-day grace period) — auto-recover and redirect
          if (profile?.status === "deleted") {
            const res = await fetch("/api/account/delete", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "recover" }) });
            if (res.ok) {
              window.location.href = nextUrl || "/";
            } else {
              document.cookie = 'fdm-status=; Max-Age=0; Path=/;';
              await supabase.auth.signOut();
              feedimAlert("error", t('accountRecoveryFailed'));
            }
            setLoading(false);
            return;
          }

          // Disabled/blocked account check
          if (profile?.status === "disabled" || profile?.status === "blocked") {
            await waitMin();
            feedimAlert("error", t('accountDisabled'));
            document.cookie = 'fdm-status=; Max-Age=0; Path=/;';
            await supabase.auth.signOut();
            return;
          }

          // Save account for quick login (don't update React state — page is about to redirect)
          if (profile?.username) {
            upsertSavedAccount({
              email,
              username: profile.username,
              full_name: profile.full_name || "",
              avatar_url: profile.avatar_url || null,
            });
          }
        } catch {}
      }

      // Record session
      try {
        const { getDeviceHash } = await import("@/lib/deviceHash");
        await fetch("/api/account/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ device_hash: getDeviceHash(), user_agent: navigator.userAgent }),
        });
      } catch {}

      if (!selectedAccount) {
        if (rememberMe) {
          localStorage.setItem("fdm_remember_email", loginIdentifier);
        } else {
          localStorage.removeItem("fdm_remember_email");
        }
      }

      try { sessionStorage.removeItem("fdm_switch_account"); } catch {}

      // Broadcast sign-in to other tabs
      try {
        const { broadcastSignIn } = await import("@/lib/authClient");
        broadcastSignIn();
      } catch {}

      // Increment login counter and flag location request every 4th login
      try {
        const prev = parseInt(localStorage.getItem("fdm-login-count") || "0", 10);
        const next = prev + 1;
        localStorage.setItem("fdm-login-count", String(next));
        if (next % 4 === 0) {
          sessionStorage.setItem("fdm-request-location", "true");
        }
      } catch {}

      await waitMin();
      window.location.href = nextUrl || "/";
    } catch {
      await waitMin();
      feedimAlert("error", te('generic'));
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveAccount = (e: React.MouseEvent, email: string) => {
    e.stopPropagation();
    const updated = removeSavedAccount(email);
    setSavedAccounts(updated);
    if (selectedAccount?.email === email) {
      setSelectedAccount(null);
      setPassword("");
    }
  };

  const handleSelectAccount = (account: SavedAccount) => {
    setSelectedAccount(account);
    setPassword("");
  };

  const handleBackToList = () => {
    if (accountParam) {
      router.replace(cleanLoginUrl);
      return;
    }
    setSelectedAccount(null);
    setPassword("");
  };

  const handleSwitchToNormalForm = () => {
    setShowNormalForm(true);
    setSelectedAccount(null);
    setPassword("");
    setIdentifier("");
    try { sessionStorage.setItem("fdm_switch_account", "1"); } catch {}
  };

  const handleBackToSavedAccounts = () => {
    setShowNormalForm(false);
    setSelectedAccount(null);
    setPassword("");
    try { sessionStorage.removeItem("fdm_switch_account"); } catch {}
  };

  // Durum A: Kayıtlı hesap yok veya normal form göster
  const showMfaForm = !!mfaEmail;
  const showSavedAccountsList = savedAccounts.length > 0 && !selectedAccount && !showNormalForm;
  const showSelectedAccountForm = selectedAccount !== null;

  if (!authChecked) {
    return (
      <AuthLayout title={t('signIn')} subtitle="">
        <div className="flex justify-center py-8"><span className="loader" /></div>
      </AuthLayout>
    );
  }

  if (authRedirecting) {
    return (
      <AuthLayout title={t('signIn')} subtitle="">
        <div className="flex justify-center py-8"><span className="loader" /></div>
      </AuthLayout>
    );
  }

  if (showMfaForm) {
    return (
      <AuthLayout
        title={t("mfaCode")}
        subtitle={mfaEmail ? t("mfaEmailHint", { email: maskEmail(mfaEmail) }) : t("mfaWaiting")}
      >
        <form onSubmit={handleMfaVerify} className="space-y-4">
          <DigitInput value={mfaCode} onChange={setMfaCode} autoFocus />

          <button
            type="submit"
            className="t-btn accept w-full relative"
            disabled={mfaLoading || mfaCode.length < 6}
            aria-label={t("mfaVerify")}
          >
            {mfaLoading ? <span className="loader" /> : t("mfaVerify")}
          </button>
        </form>

        <div className="text-center mt-4">
          {mfaSending ? (
            <p className="text-sm text-text-muted">{t("mfaSending")}</p>
          ) : (
            <button
              type="button"
              onClick={handleMfaResend}
              disabled={mfaHasResent || mfaCooldown > 0}
              className="text-sm font-semibold text-text-muted hover:text-text-primary transition hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {mfaCooldown > 0 ? t("resendCountdown", { seconds: mfaCooldown }) : t("mfaResend")}
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={handleCancelMfa}
          className="w-full mt-3 flex items-center justify-center gap-1.5 text-sm text-accent-main hover:opacity-80 font-semibold transition py-2"
        >
          <ArrowLeft className="w-4 h-4" />
          {t("differentAccountShort")}
        </button>

        <p className="text-center text-text-muted text-[0.68rem] mt-2">
          {t("mfaEmailExpiry")}
          <br />
          {t("mfaCheckSpam")}
        </p>
      </AuthLayout>
    );
  }

  // --- Durum B: Kayıtlı hesap listesi ---
  if (showSavedAccountsList) {
    return (
      <AuthLayout
        title={savedAccounts.length === 1
          ? `${savedAccounts[0].full_name.split(" ")[0] || savedAccounts[0].username} ${t('continueAs')}`
          : t('continueWithAccount')}
        subtitle={t('selectAccount')}
      >
        <div className="space-y-2">
          {savedAccounts.map((account) => (
            <SavedAccountCard
              key={account.email}
              account={account}
              onSelect={() => handleSelectAccount(account)}
              onRemove={(e) => handleRemoveAccount(e, account.email)}
              removeLabel={t('removeAccount')}
            />
          ))}
        </div>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border-primary"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-4 bg-bg-primary text-text-muted">{tc('or')}</span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSwitchToNormalForm}
          className="t-btn accept w-full"
        >
          {t('differentAccount')}
        </button>

        <button
          type="button"
          onClick={() => handleOAuthLogin('google')}
          className="w-full flex items-center justify-center gap-2.5 px-4 py-2.5 mt-3 border border-border-primary bg-white text-black rounded-full hover:bg-gray-50 transition text-[0.88rem] font-[500]"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          {t('continueWithGoogle')}
        </button>

        <p className="text-center text-text-muted text-sm mt-6">
          {t('noAccount')}{" "}
          <Link href="/register" className="text-accent-main hover:opacity-80 font-semibold">
            {t('signUp')}
          </Link>
        </p>
      </AuthLayout>
    );
  }

  // --- Durum C: Hesap seçildi, şifre ekranı ---
  if (showSelectedAccountForm) {
    return (
      <AuthLayout
        title={`${selectedAccount.full_name.split(" ")[0] || selectedAccount.username} ${t('continueAs')}`}
        subtitle={t('enterPassword')}
      >
        <div className="flex flex-col items-center gap-2 mb-6">
          <LazyAvatar src={selectedAccount.avatar_url} alt={selectedAccount.username} sizeClass="w-16 h-16" />
          <p className="text-sm font-semibold text-text-primary">@{selectedAccount.username}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <PasswordInput
            placeholder={t('password')}
            value={password}
            onChange={(e) => setPassword(e.target.value.replace(/\s/g, ""))}
            required
            minLength={VALIDATION.password.min}
            maxLength={VALIDATION.password.max}
            autoComplete="current-password"
            className="input-modern w-full"
            autoFocus
          />
          <button type="submit" className="t-btn accept w-full relative" disabled={loading} aria-label={t('signIn')}>
            {loading ? <span className="loader" /> : t('signIn')}
          </button>
        </form>

        <div className="flex items-center justify-between mt-4">
          <button
            type="button"
            onClick={handleBackToList}
            className="flex items-center gap-1.5 text-sm text-text-muted hover:text-text-primary transition hover:underline font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('differentAccountShort')}
          </button>
          <Link href="/forgot-password" className="text-sm text-text-muted hover:text-text-primary transition hover:underline font-semibold">
            {t('forgotPassword')}
          </Link>
        </div>
        <PuzzleCaptcha open={captchaOpen} onClose={() => setCaptchaOpen(false)} onVerify={handleCaptchaVerify} />
      </AuthLayout>
    );
  }

  // --- Durum A: Normal giriş formu ---
  return (
    <AuthLayout title={t('signIn')} subtitle={t('emailOrUsernameDesc')} showRulesModal>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          placeholder={t('emailOrUsername')}
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value.replace(/\s/g, ""))}
          required
          maxLength={60}
          autoComplete="username"
          className="input-modern w-full"
        />
        <PasswordInput
          placeholder={t('password')}
          value={password}
          onChange={(e) => setPassword(e.target.value.replace(/\s/g, ""))}
          required
          minLength={VALIDATION.password.min}
          maxLength={VALIDATION.password.max}
          autoComplete="current-password"
          className="input-modern w-full"
        />
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="cursor-pointer"
            />
            <span className="text-sm text-text-muted">{t('rememberMe')}</span>
          </label>
          <Link href="/forgot-password" className="text-sm text-text-muted hover:text-text-primary transition hover:underline font-semibold">
            {t('forgotPassword')}
          </Link>
        </div>
        <button type="submit" className="t-btn accept w-full relative" disabled={loading} aria-label={t('signIn')}>
          {loading ? <span className="loader" /> : t('signIn')}
        </button>
      </form>

      {savedAccounts.length > 0 && (
        <button
          type="button"
          onClick={handleBackToSavedAccounts}
          className="w-full mt-3 flex items-center justify-center gap-1.5 text-sm text-accent-main hover:opacity-80 font-semibold transition py-2"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('savedAccounts')}
        </button>
      )}

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border-primary"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-4 bg-bg-primary text-text-muted">{tc('or')}</span>
        </div>
      </div>

      <button
        type="button"
        onClick={() => handleOAuthLogin('google')}
        className="w-full flex items-center justify-center gap-2.5 px-4 py-2.5 border border-border-primary bg-white text-black rounded-full hover:bg-gray-50 transition text-[0.88rem] font-medium"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        {t('continueWithGoogle')}
      </button>

      <p className="text-center text-text-muted text-sm mt-6">
        {t('noAccount')}{" "}
        <Link href="/register" className="text-accent-main hover:opacity-80 font-semibold">
          {t('signUp')}
        </Link>
      </p>
      <PuzzleCaptcha open={captchaOpen} onClose={() => setCaptchaOpen(false)} onVerify={handleCaptchaVerify} />
    </AuthLayout>
  );
}
