"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import AuthLayout from "@/components/AuthLayout";

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  );
}

function RegisterForm() {
  const [name, setName] = useState("");
  const [surname, setSurname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  useEffect(() => {
    // Get referral code from URL (alphanumeric only, max 20 chars)
    const refCode = searchParams.get('ref');
    if (refCode && /^[a-zA-Z0-9]{1,20}$/.test(refCode)) {
      setReferralCode(refCode);
      toast.success(`Referans kodu uygulandı: ${refCode}`);
    }
  }, [searchParams]);

  const handleOAuthLogin = async (provider: 'google') => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      toast.error("Giriş yapılamadı. Lütfen tekrar deneyin.");
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: name,
            surname: surname,
            full_name: `${name} ${surname}`,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        // Kullanıcı dostu hata mesajları
        if (error.message.includes('User already registered')) {
          toast.error("Bu e-posta adresi zaten kullanılıyor.");
        } else if (error.message.includes('Password')) {
          toast.error("Şifre en az 6 karakter olmalıdır.");
        } else if (error.message.includes('Email')) {
          toast.error("Geçerli bir e-posta adresi girin.");
        } else {
          toast.error("Kayıt oluşturulamadı. Lütfen tekrar deneyin.");
        }
        setLoading(false);
        return;
      }

      // Wait for trigger to create profile
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Update profile with name and surname (trigger might not have user metadata)
      if (data.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            name: name,
            surname: surname,
          })
          .eq('user_id', data.user.id);

        // Process referral if code was provided
        if (referralCode) {
          try {
            // Wait a bit more to ensure profile is fully created
            await new Promise(resolve => setTimeout(resolve, 500));

            const { data: referralData, error: referralError } = await supabase.rpc(
              'process_referral_signup',
              {
                p_new_user_id: data.user.id,
                p_referral_code: referralCode
              }
            );

            if (referralError) {
              // Referans hatası kayıt işlemini engellemesin
            } else if (referralData?.success) {
              toast.success("Referans bağlantısı kaydedildi! Sizi davet eden kişi, bakiye aldığınızda %5 bonus kazanacak.");
            }
          } catch (err: any) {
            // Referans hatası kayıt işlemini engellemesin
          }
        }
      }

      // Check if email confirmation is required
      if (data.user && !data.session) {
        toast.success("Kayıt başarılı! Lütfen e-postanızı kontrol edin ve doğrulayın.");
        router.push("/login");
      } else if (data.session) {
        // User is automatically logged in with session
        toast.success("Kayıt başarılı! Hoş geldiniz!");

        // Wait a bit for session to be fully set
        await new Promise(resolve => setTimeout(resolve, 500));

        router.push("/dashboard");
        router.refresh();
      } else {
        // No session but user exists - redirect to login
        toast.success("Kayıt başarılı! Şimdi giriş yapabilirsiniz.");
        router.push("/login");
      }
    } catch (error: any) {
      toast.error("Bir hata oluştu. Lütfen tekrar deneyin.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Hesap Oluştur" subtitle="Forilove oluşturmaya başlayın">
      <form onSubmit={handleRegister} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <input
                  type="text"
                  placeholder="Ad"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  maxLength={50}
                  className="input-modern w-full"
                />
              </div>
              <div>
                <input
                  type="text"
                  placeholder="Soyad"
                  value={surname}
                  onChange={(e) => setSurname(e.target.value)}
                  required
                  maxLength={50}
                  className="input-modern w-full"
                />
              </div>
            </div>

            <div>
              <input
                type="email"
                placeholder="E-posta"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                maxLength={255}
                className="input-modern w-full"
              />
            </div>

            <div>
              <input
                type="password"
                placeholder="Şifre (en az 6 karakter)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                maxLength={128}
                className="input-modern w-full"
              />
            </div>

            <label className="flex items-start gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-white/20 accent-pink-500 cursor-pointer"
              />
              <span className="text-sm text-gray-400 leading-snug">
                <Link href="/terms" target="_blank" className="text-pink-500 hover:text-pink-400 underline">
                  Kullanım Koşulları
                </Link>
                &apos;nı ve{" "}
                <Link href="/privacy" target="_blank" className="text-pink-500 hover:text-pink-400 underline">
                  Gizlilik Politikası
                </Link>
                &apos;nı kabul ediyorum.
              </span>
            </label>

            <button
              type="submit"
              className="btn-primary w-full text-lg h-12"
              disabled={loading || !termsAccepted}
            >
              {loading ? "Hesap oluşturuluyor..." : "Kayıt Ol"}
            </button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-black text-gray-400">veya</span>
            </div>
          </div>

          <div className="space-y-3">
            <button
              type="button"
              onClick={() => handleOAuthLogin('google')}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white text-black rounded-lg hover:bg-gray-100 transition font-semibold"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Google ile devam et
            </button>

          </div>

          <p className="text-center text-gray-400 text-sm mt-6">
            Zaten hesabınız var mı?{" "}
            <Link href="/login" className="text-pink-500 hover:text-pink-400 font-semibold">
              Giriş yap
            </Link>
          </p>
    </AuthLayout>
  );
}
