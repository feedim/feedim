"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { XCircle, ArrowLeft, RefreshCw } from "lucide-react";
import { useTranslations } from "next-intl";

export default function PaymentFailedPage() {
  const t = useTranslations("payment");
  const router = useRouter();
  const [countdown, setCountdown] = useState(10);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          router.push("/coins");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [router]);

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary flex items-center justify-center px-6 py-12">
      <div className="max-w-md w-full text-center space-y-8">
        {/* Error Icon */}
        <div className="flex justify-center">
          <div className="relative">
            <div className="absolute inset-0 bg-error/20 rounded-full blur-2xl animate-pulse" />
            <XCircle className="h-24 w-24 text-error relative" />
          </div>
        </div>

        {/* Error Message */}
        <div className="space-y-4">
          <h1 className="text-4xl font-bold text-error">
            {t("paymentFailed")}
          </h1>
          <p className="text-xl text-text-muted">
            {t("transactionNotCompleted")}
          </p>
        </div>

        {/* Info */}
        <div className="bg-bg-secondary rounded-2xl p-6 space-y-4">
          <div className="text-left space-y-2 text-sm text-text-muted">
            <p>{t("paymentErrorDesc")}</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>{t("reasonInsufficientBalance")}</li>
              <li>{t("reasonCardError")}</li>
              <li>{t("reasonBankRejected")}</li>
              <li>{t("reasonTimeout")}</li>
            </ul>
          </div>
        </div>

        {/* Countdown */}
        <p className="text-sm text-text-muted">
          {t("redirectCountdown", { seconds: countdown })}
        </p>

        {/* Actions */}
        <div className="space-y-3">
          <Link
            href="/coins"
            className="t-btn accept w-full flex items-center justify-center gap-2"
          >
            <RefreshCw className="h-5 w-5" />
            {t("retry")}
          </Link>

          <Link
            href="/"
            className="t-btn cancel w-full flex items-center justify-center gap-2"
          >
            <ArrowLeft className="h-5 w-5" />
            {t("goHome")}
          </Link>

          <Link href="/help" className="block text-text-muted hover:text-text-primary transition text-sm">
            {t("helpCenter")}
          </Link>
        </div>
      </div>
    </div>
  );
}
