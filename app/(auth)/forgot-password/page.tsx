"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import AuthLayout from "@/components/AuthLayout";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const supabase = createClient();

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      setSent(true);
      toast.success("Şifre sıfırlama e-postası gönderildi!");
    } catch (error: any) {
      toast.error("E-posta gönderilemedi, lütfen tekrar deneyin");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Şifre Sıfırlama"
      subtitle={sent ? "Sıfırlama bağlantısı için e-postanızı kontrol edin." : "E-postanızı girin ve sıfırlama bağlantısı alın."}
    >
      {!sent ? (
        <form onSubmit={handleReset} className="space-y-4">
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

              <button
                type="submit"
                className="btn-primary w-full text-lg h-12"
                disabled={loading}
              >
                {loading ? "Gönderiliyor..." : "Sıfırlama Bağlantısı Gönder"}
              </button>

              <div className="text-center">
                <Link href="/login" className="text-sm text-gray-400 hover:text-white transition font-semibold">
                  Giriş sayfasına dön
                </Link>
              </div>
            </form>
          ) : (
            <div className="text-center space-y-4">
              <p className="text-sm font-semibold" style={{ color: 'lab(49.5493% 79.8381 2.31768)' }}>
                Sıfırlama bağlantısı {email} adresine gönderildi
              </p>
              <Link href="/login">
                <button className="btn-primary w-full text-lg h-12">
                  Giriş Sayfasına Dön
                </button>
              </Link>
            </div>
          )}
    </AuthLayout>
  );
}
