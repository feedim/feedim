"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useTranslations } from "next-intl";
import { feedimAlert } from "@/components/FeedimAlert";
import AuthLayout from "@/components/AuthLayout";
import PasswordInput from "@/components/PasswordInput";
import { translateError } from "@/lib/utils/translateError";
import { VALIDATION } from "@/lib/constants";

export default function ResetPasswordPage() {
  const t = useTranslations("auth");
  const tErrors = useTranslations("errors");
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
        feedimAlert("error", t("passwordsNoMatch"));
        return;
      }

      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) throw error;

      // Şifre değişti — yeni şifreyle otomatik giriş yap
      try {
        const resetEmail = sessionStorage.getItem("fdm-reset-email");
        if (resetEmail) {
          sessionStorage.removeItem("fdm-reset-email");
          await supabase.auth.signInWithPassword({ email: resetEmail, password });
        }
      } catch {}

      await waitMin();
      feedimAlert("success", t("resetPasswordChanged"));
      window.location.replace("/");
    } catch (error: any) {
      await waitMin();
      feedimAlert("error", translateError(error.message, tErrors) || t("resetPasswordFailed"));
    } finally {
      setLoading(false);
    }
  };

  if (!authChecked) {
    return (
      <AuthLayout title={t("resetPasswordTitle")} subtitle={t("resetPasswordLoading")}>
        <div className="flex justify-center py-8">
          <span className="loader" />
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title={t("resetPasswordTitle")} subtitle={t("resetPasswordSubtitle")}>
      <form onSubmit={handleReset} className="space-y-4">
        <PasswordInput
          placeholder={t("resetNewPassword")}
          value={password}
          onChange={(e) => setPassword(e.target.value.replace(/\s/g, ""))}
          required
          minLength={VALIDATION.password.min}
          maxLength={VALIDATION.password.max}
          className="input-modern w-full"
          style={{ height: 50, fontSize: 16, fontWeight: 600 }}
        />
        <PasswordInput
          placeholder={t("resetNewPasswordConfirm")}
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
          aria-label={t("resetChangePassword")}
        >
          {loading ? <span className="loader" /> : t("resetChangePassword")}
        </button>
        <div className="text-center">
          <Link href="/login" className="text-sm text-text-muted hover:text-text-primary transition font-semibold">
            {t("backToLogin")}
          </Link>
        </div>
      </form>
    </AuthLayout>
  );
}
