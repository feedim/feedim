"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import PuzzleCaptcha from "@/components/PuzzleCaptcha";
import { useTranslations } from "next-intl";
import { useUser } from "@/components/UserContext";

export default function UnfreezeButton() {
  const t = useTranslations("admin");
  const router = useRouter();
  const { user } = useUser();
  const isAdmin = user?.role === "admin";
  const [loading, setLoading] = useState(false);
  const [captchaOpen, setCaptchaOpen] = useState(false);

  const handleUnfreeze = async (captchaToken: string) => {
    setLoading(true);
    try {
      const res = await fetch("/api/account/unfreeze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ captchaToken }),
      });
      if (res.ok) {
        document.cookie = "fdm-status=; Max-Age=0; Path=/;";
        router.replace("/");
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => {
          if (isAdmin) {
            void handleUnfreeze("");
            return;
          }
          setCaptchaOpen(true);
        }}
        disabled={loading}
        className="t-btn bg-text-primary text-bg-primary flex items-center justify-center w-full"
        aria-label={t("unfreezeAccount")}
      >
        {loading ? (
          <span className="loader !w-5 !h-5" style={{ borderColor: "var(--bg-primary)", borderTopColor: "transparent" }} />
        ) : (
          t("unfreezeAccount")
        )}
      </button>
      <PuzzleCaptcha
        open={captchaOpen}
        onClose={() => setCaptchaOpen(false)}
        onVerify={(token) => {
          setCaptchaOpen(false);
          handleUnfreeze(token);
        }}
      />
    </>
  );
}
