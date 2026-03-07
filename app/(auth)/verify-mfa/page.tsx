"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AuthLayout from "@/components/AuthLayout";
import { isSafeRedirectUrl } from "@/lib/utils";
import { useTranslations } from "next-intl";

export default function VerifyMfaRedirectPage() {
  const t = useTranslations("auth");
  const tc = useTranslations("common");
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const rawNext = searchParams.get("next");
    const nextUrl = isSafeRedirectUrl(rawNext) ? rawNext : null;
    const target = nextUrl ? `/login?next=${encodeURIComponent(nextUrl)}` : "/login";
    router.replace(target);
  }, [router, searchParams]);

  return (
    <AuthLayout title={t("mfaCode")} subtitle={tc("loading")}>
      <div className="flex justify-center py-8">
        <span className="loader" />
      </div>
    </AuthLayout>
  );
}
