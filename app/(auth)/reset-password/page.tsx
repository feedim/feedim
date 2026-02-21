"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { feedimAlert } from "@/components/FeedimAlert";
import AuthLayout from "@/components/AuthLayout";
import PasswordInput from "@/components/PasswordInput";
import { translateError } from "@/lib/utils/translateError";
import { VALIDATION } from "@/lib/constants";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.push("/forgot-password");
        return;
      }
      setAuthChecked(true);
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const start = Date.now();

    const waitMin = async () => {
      const elapsed = Date.now() - start;
      if (elapsed < 3000) await new Promise(r => setTimeout(r, 3000 - elapsed));
    };

    try {
      if (password !== confirmPassword) {
        await waitMin();
        feedimAlert("error", "Şifreler eşleşmiyor");
        return;
      }

      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) throw error;

      await waitMin();
      feedimAlert("success", "Şifreniz değiştirildi");
      await supabase.auth.signOut();
      router.push("/login");
    } catch (error: any) {
      await waitMin();
      feedimAlert("error", translateError(error.message) || "Şifre güncellenemedi");
    } finally {
      setLoading(false);
    }
  };

  if (!authChecked) {
    return (
      <AuthLayout title="Yeni Şifre Belirle" subtitle="Yükleniyor...">
        <div className="flex justify-center py-8">
          <span className="loader" />
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Yeni Şifre Belirle" subtitle="Yeni şifrenizi aşağıya girin.">
      <form onSubmit={handleReset} className="space-y-4">
        <PasswordInput
          placeholder="Yeni şifre"
          value={password}
          onChange={(e) => setPassword(e.target.value.replace(/\s/g, ""))}
          required
          minLength={VALIDATION.password.min}
          maxLength={VALIDATION.password.max}
          className="input-modern w-full"
          style={{ height: 50, fontSize: 16, fontWeight: 600 }}
        />
        <PasswordInput
          placeholder="Yeni şifre (tekrar)"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value.replace(/\s/g, ""))}
          required
          minLength={VALIDATION.password.min}
          maxLength={VALIDATION.password.max}
          className="input-modern w-full"
          style={{ height: 50, fontSize: 16, fontWeight: 600 }}
        />
        <button
          type="submit"
          className="t-btn accept w-full relative"
          disabled={loading}
        >
          {loading ? <span className="loader" /> : "Şifreyi değiştir"}
        </button>
        <div className="text-center">
          <Link href="/login" className="text-sm text-text-muted hover:text-text-primary transition font-semibold">
            Giriş sayfasına dön
          </Link>
        </div>
      </form>
    </AuthLayout>
  );
}
