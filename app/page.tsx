"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { FeedimIcon } from "@/components/FeedimLogo";
import PublicFooter from "@/components/PublicFooter";
import { X } from "lucide-react";

interface SavedAccount {
  email: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
  last_login: number;
}

const SAVED_ACCOUNTS_KEY = "fdm_saved_accounts";

function getSavedAccounts(): SavedAccount[] {
  try {
    const raw = localStorage.getItem(SAVED_ACCOUNTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .sort((a: SavedAccount, b: SavedAccount) => b.last_login - a.last_login)
      .slice(0, 1);
  } catch {
    return [];
  }
}

function removeSavedAccount(email: string): SavedAccount[] {
  const accounts = getSavedAccounts().filter((a) => a.email !== email);
  localStorage.setItem(SAVED_ACCOUNTS_KEY, JSON.stringify(accounts));
  return accounts;
}

export default function Home() {
  const router = useRouter();
  const supabase = createClient();
  const [savedAccounts, setSavedAccounts] = useState<SavedAccount[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) { router.replace("/dashboard"); return; }
      setSavedAccounts(getSavedAccounts());
      setMounted(true);
    });
  }, [supabase, router]);

  const handleOAuth = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  };

  const handleRemoveAccount = (e: React.MouseEvent, email: string) => {
    e.preventDefault();
    e.stopPropagation();
    const updated = removeSavedAccount(email);
    setSavedAccounts(updated);
  };

  const hasSavedAccounts = savedAccounts.length > 0;

  return (
    <div className="min-h-[100dvh] text-text-primary flex flex-col">
      <div className="flex-1 lg:min-h-0 flex flex-col lg:flex-row">
        {/* Left — Logo */}
        <div className="hidden lg:flex flex-1 items-center justify-center p-16">
          <FeedimIcon className="h-[300px] w-[300px] opacity-90" />
        </div>

        {/* Right — CTA */}
        <div className="flex-1 lg:flex-none lg:w-[440px] xl:w-[480px] shrink-0 flex flex-col px-6 py-8 sm:p-10 lg:py-6 lg:border-l border-border-primary">
          <div className="w-full sm:max-w-[400px] sm:mx-auto lg:max-w-none lg:mx-0 my-auto">
            {/* Mobile logo — top left */}
            <div className="lg:hidden mb-4">
              <FeedimIcon className="h-[4.5rem] w-[4.5rem] opacity-90" />
            </div>

            <h1 className="text-[1.3rem] sm:text-[1.5rem] lg:text-[1.7rem] font-extrabold leading-[1.15] mb-1.5">
              Keşfet ve Paylaş.
            </h1>
            <p className="text-[0.85rem] text-text-muted leading-relaxed mb-4">
              İlham veren içerikler keşfet, düşüncelerini paylaş ve gündemi sen belirle.
            </p>

            {!mounted && (
              <div className="flex justify-center py-6">
                <span className="loader" />
              </div>
            )}

            {/* Saved Accounts Section */}
            {mounted && hasSavedAccounts && (
              <>
                <p className="text-sm font-semibold text-text-primary mb-2">
                  {savedAccounts.length === 1
                    ? `${savedAccounts[0].full_name.split(" ")[0] || savedAccounts[0].username} olarak devam et`
                    : "Hesabınızla devam edin"}
                </p>
                <div className="space-y-2 mb-3">
                  {savedAccounts.map((account) => (
                    <Link
                      key={account.email}
                      href={`/login?account=${encodeURIComponent(account.email)}`}
                      className="w-full flex items-center gap-3 p-2.5 rounded-xl border border-border-primary hover:bg-bg-tertiary transition cursor-pointer text-left group"
                    >
                      {account.avatar_url ? (
                        <img src={account.avatar_url} alt={account.username} className="w-10 h-10 rounded-full object-cover shrink-0" />
                      ) : (
                        <img className="default-avatar-auto w-10 h-10 rounded-full object-cover shrink-0" alt="" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-text-primary truncate">@{account.username}</p>
                        <p className="text-xs text-text-muted truncate">{account.full_name}</p>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => handleRemoveAccount(e, account.email)}
                        className="p-1.5 rounded-full hover:bg-bg-tertiary transition opacity-0 group-hover:opacity-100 shrink-0"
                        aria-label="Hesabı kaldır"
                      >
                        <X className="w-4 h-4 text-text-muted" />
                      </button>
                    </Link>
                  ))}
                </div>

                <Link href="/login" className="t-btn accept w-full mt-2">
                  Farklı hesapla giriş yap
                </Link>

                <Link href="/dashboard" className="t-btn cancel w-full mt-2">
                  Giriş yapmadan göz at
                </Link>

                {/* Divider */}
                <div className="relative my-3">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border-primary" />
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="px-3 text-text-muted">veya</span>
                  </div>
                </div>

                {/* Google */}
                <button
                  type="button"
                  onClick={handleOAuth}
                  className="w-full flex items-center justify-center gap-2.5 px-4 py-2.5 border border-border-primary bg-white text-black rounded-full hover:bg-gray-50 transition text-[0.88rem] font-medium"
                >
                  <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Google ile devam et
                </button>

                {/* Create Account */}
                <Link
                  href="/register"
                  className="w-full flex items-center justify-center px-4 py-2.5 mt-2.5 bg-accent-main text-white rounded-full font-bold text-[0.88rem] hover:opacity-90 transition"
                >
                  Hesap oluştur
                </Link>

                <p className="text-[0.68rem] text-text-muted mt-2 leading-relaxed">
                  Kaydolarak{" "}
                  <Link href="/help/terms" className="text-accent-main hover:underline">Kullanım Koşulları</Link>&apos;nı ve{" "}
                  <Link href="/help/privacy" className="text-accent-main hover:underline">Gizlilik Politikası</Link>&apos;nı kabul etmiş olursunuz.
                </p>
              </>
            )}

            {/* No saved accounts — normal flow */}
            {mounted && !hasSavedAccounts && (
              <>
                {/* Google */}
                <button
                  type="button"
                  onClick={handleOAuth}
                  className="w-full flex items-center justify-center gap-2.5 px-4 py-2.5 border border-border-primary bg-white text-black rounded-full hover:bg-gray-50 transition text-[0.88rem] font-medium"
                >
                  <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Google ile devam et
                </button>

                {/* Divider */}
                <div className="relative my-3">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border-primary" />
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="px-3 text-text-muted">veya</span>
                  </div>
                </div>

                {/* Create Account */}
                <Link
                  href="/register"
                  className="w-full flex items-center justify-center px-4 py-2.5 bg-accent-main text-white rounded-full font-bold text-[0.88rem] hover:opacity-90 transition"
                >
                  Hesap oluştur
                </Link>

                <p className="text-[0.68rem] text-text-muted mt-2 leading-relaxed">
                  Kaydolarak{" "}
                  <Link href="/help/terms" className="text-accent-main hover:underline">Kullanım Koşulları</Link>&apos;nı ve{" "}
                  <Link href="/help/privacy" className="text-accent-main hover:underline">Gizlilik Politikası</Link>&apos;nı kabul etmiş olursunuz.
                </p>

                <div className="mt-5">
                  <p className="font-bold text-[0.95rem] mb-2">Zaten hesabınız var mı?</p>
                  <Link href="/login" className="t-btn accept w-full">
                    Giriş yap
                  </Link>
                </div>

                <Link href="/dashboard" className="t-btn cancel w-full mt-3">
                  Giriş yapmadan göz at
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <PublicFooter variant="inline" />
    </div>
  );
}
