"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { XCircle, ArrowLeft, RefreshCw } from "lucide-react";

export default function PaymentFailedPage() {
  const router = useRouter();
  const [countdown, setCountdown] = useState(10);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          router.push("/dashboard/coins");
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
            Ödeme Başarısız
          </h1>
          <p className="text-xl text-text-muted">
            İşlem tamamlanamadı
          </p>
        </div>

        {/* Info */}
        <div className="bg-bg-secondary rounded-2xl p-6 space-y-4">
          <div className="text-left space-y-2 text-sm text-text-muted">
            <p>Ödeme işlemi sırasında bir hata oluştu. Olası nedenler:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Yetersiz bakiye</li>
              <li>Kart bilgilerinde hata</li>
              <li>Banka tarafından reddedildi</li>
              <li>İşlem zaman aşımına uğradı</li>
            </ul>
          </div>
        </div>

        {/* Countdown */}
        <p className="text-sm text-text-muted">
          {countdown} saniye sonra jeton sayfasına yönlendirileceksiniz...
        </p>

        {/* Actions */}
        <div className="space-y-3">
          <Link
            href="/dashboard/coins"
            className="t-btn accept w-full flex items-center justify-center gap-2"
          >
            <RefreshCw className="h-5 w-5" />
            Tekrar Dene
          </Link>

          <Link
            href="/dashboard"
            className="t-btn cancel w-full flex items-center justify-center gap-2"
          >
            <ArrowLeft className="h-5 w-5" />
            Ana Sayfaya Dön
          </Link>

          <Link href="/help" className="block text-text-muted hover:text-text-primary transition text-sm">
            Yardım Merkezi
          </Link>
        </div>
      </div>
    </div>
  );
}
