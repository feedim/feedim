"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Check } from "lucide-react";

export default function UnblockVerify() {
  const router = useRouter();
  const [step, setStep] = useState<"password" | "code">("password");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const sendOtp = useCallback(async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) return;
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: user.email,
      options: { shouldCreateUser: false },
    });
    if (otpError) {
      setError("Kod gönderilemedi, tekrar deneyin");
    } else {
      setCooldown(60);
    }
  }, []);

  const verifyPassword = async () => {
    if (password.length < 6) { setError("Şifrenizi girin"); return; }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/account/unblock-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify_password", password }),
      });
      const data = await res.json();
      if (res.ok) {
        setStep("code");
        setError("");
        await sendOtp();
      } else {
        setError(data.error || "Doğrulama başarısız");
      }
    } catch {
      setError("Bağlantı hatası");
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async () => {
    if (code.length < 6) { setError("Kodu girin"); return; }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/account/unblock-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify_code", token: code }),
      });
      const data = await res.json();
      if (res.ok) {
        document.cookie = "fdm-status=; Max-Age=0; Path=/;";
        router.replace("/dashboard");
      } else {
        setError(data.error || "Doğrulama başarısız");
      }
    } catch {
      setError("Bağlantı hatası");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      {step === "password" && (
        <>
          <p className="text-xs text-text-muted">Hesabınızı açmak için önce şifrenizi doğrulayın.</p>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === "Enter" && verifyPassword()}
            placeholder="Şifreniz"
            className="input-modern w-full"
          />
          <button
            onClick={verifyPassword}
            disabled={loading || password.length < 6}
            className="t-btn bg-text-primary text-bg-primary flex items-center justify-center w-full"
            aria-label="Devam Et"
          >
            {loading ? (
              <span className="loader !w-5 !h-5" style={{ borderColor: "var(--bg-primary)", borderTopColor: "transparent" }} />
            ) : (
              "Devam Et"
            )}
          </button>
        </>
      )}

      {step === "code" && (
        <>
          <p className="text-xs text-text-muted text-center">E-posta adresinize gönderilen doğrulama kodunu girin.</p>
          <div>
            <input
              type="text"
              inputMode="numeric"
              maxLength={8}
              value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0, 8))}
              onKeyDown={e => e.key === "Enter" && verifyCode()}
              placeholder="00000000"
              className="w-full text-center bg-transparent border-none outline-none focus:ring-0"
              style={{ height: 50, fontSize: 50, fontWeight: 700, fontFamily: "sans-serif", letterSpacing: "0.3em" }}
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={verifyCode}
              disabled={loading || code.length < 6}
              className="t-btn accept flex-1 py-2.5 text-sm flex items-center justify-center gap-1.5"
              aria-label="Kodu Doğrula"
            >
              {loading ? <span className="loader" style={{ width: 14, height: 14 }} /> : <><Check className="h-3.5 w-3.5" /> Doğrula</>}
            </button>
          </div>
          <button
            onClick={sendOtp}
            disabled={cooldown > 0}
            className="text-xs text-text-muted hover:text-text-primary transition disabled:opacity-50 text-center w-full"
          >
            {cooldown > 0 ? `Tekrar gönder (${cooldown}s)` : "Kodu Tekrar Gönder"}
          </button>
        </>
      )}

      {error && <p className="text-xs text-error text-center">{error}</p>}
    </div>
  );
}
