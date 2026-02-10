"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import AuthLayout from "@/components/AuthLayout";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error("Şifreler eşleşmiyor");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) throw error;

      toast.success("Şifre başarıyla güncellendi!");
      router.push("/login");
    } catch (error: any) {
      toast.error(error.message || "Şifre güncellenemedi");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Yeni Şifre Belirle" subtitle="Yeni şifrenizi aşağıya girin">
      <form onSubmit={handleReset} className="space-y-4">
            <div>
              <input
                type="password"
                placeholder="Yeni şifre"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                maxLength={128}
                className="input-modern w-full"
              />
            </div>

            <div>
              <input
                type="password"
                placeholder="Yeni şifre (tekrar)"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                maxLength={128}
                className="input-modern w-full"
              />
            </div>

            <button
              type="submit"
              className="btn-primary w-full text-lg h-12"
              disabled={loading}
            >
              {loading ? "Güncelleniyor..." : "Şifreyi Güncelle"}
            </button>
          </form>
    </AuthLayout>
  );
}
