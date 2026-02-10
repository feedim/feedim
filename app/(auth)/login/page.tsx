"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import AuthLayout from "@/components/AuthLayout";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const saved = localStorage.getItem("forilove_remember_email");
    if (saved) {
      setEmail(saved);
      setRememberMe(true);
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        // Sadece geliştirme ortamında log'la (production'da görünmez)
        if (process.env.NODE_ENV === 'development') {
          console.log('Login error:', error.message);
        }

        // Kullanıcı dostu hata mesajları
        if (error.message === 'Invalid login credentials') {
          toast.error("E-posta veya şifre yanlış. Tekrar deneyin.");
        } else if (error.message.includes('Email not confirmed')) {
          toast.error("E-posta adresinizi onaylamanız gerekiyor.");
        } else {
          toast.error("Giriş yapılamadı. Lütfen tekrar deneyin.");
        }
        return;
      }

      if (rememberMe) {
        localStorage.setItem("forilove_remember_email", email);
      } else {
        localStorage.removeItem("forilove_remember_email");
      }

      toast.success("Giriş başarılı!");

      // Wait a bit for session to be set
      await new Promise(resolve => setTimeout(resolve, 500));

      router.push("/dashboard");
      router.refresh();
    } catch (error: any) {
      if (process.env.NODE_ENV === 'development') {
        console.log('Login exception:', error);
      }
      toast.error("Bir hata oluştu. Lütfen tekrar deneyin.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Giriş yap" subtitle="Hesabınıza giriş yapın">
      <form onSubmit={handleLogin} className="space-y-4">
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
                placeholder="Şifre"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                maxLength={128}
                className="input-modern w-full"
              />
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded border-white/20 accent-pink-500 cursor-pointer"
                />
                <span className="text-sm text-gray-400">Beni hatırla</span>
              </label>
              <Link href="/forgot-password" className="text-sm text-gray-400 hover:text-white transition font-semibold">
                Şifremi unuttum?
              </Link>
            </div>

            <button
              type="submit"
              className="btn-primary w-full text-lg h-12"
              disabled={loading}
            >
              {loading ? "Giriş yapılıyor..." : "Giriş yap"}
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
              disabled
              className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white text-black rounded-lg hover:bg-gray-100 transition font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Google ile devam et
            </button>

            <button
              type="button"
              disabled
              className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-black text-white border border-white/10 rounded-lg hover:bg-white/5 transition font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
              </svg>
              Apple ile devam et
            </button>

            <button
              type="button"
              disabled
              className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-black text-white border border-white/10 rounded-lg hover:bg-white/5 transition font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M11.4 24H0V12.6h11.4V24zM24 24H12.6V12.6H24V24zM11.4 11.4H0V0h11.4v11.4zm12.6 0H12.6V0H24v11.4z"/>
              </svg>
              Microsoft ile devam et
            </button>
          </div>

          <p className="text-center text-gray-400 text-sm mt-6">
            Hesabınız yok mu?{" "}
            <Link href="/register" className="text-pink-500 hover:text-pink-400 font-semibold">
              Kayıt ol
            </Link>
          </p>
    </AuthLayout>
  );
}
