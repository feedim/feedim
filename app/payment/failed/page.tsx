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
          router.push('/dashboard/coins');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [router]);

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center px-6 py-12">
      <div className="max-w-md w-full text-center space-y-8">
        {/* Error Icon */}
        <div className="flex justify-center">
          <div className="relative">
            <div className="absolute inset-0 bg-red-500/20 rounded-full blur-2xl animate-pulse"></div>
            <XCircle className="h-24 w-24 text-red-500 relative" />
          </div>
        </div>

        {/* Error Message */}
        <div className="space-y-4">
          <h1 className="text-4xl font-bold text-red-500">
            Ödeme Başarısız
          </h1>
          <p className="text-xl text-gray-400">
            İşlem tamamlanamadı
          </p>
        </div>

        {/* Info */}
        <div className="bg-zinc-900 rounded-2xl p-6 space-y-4">
          <div className="text-left space-y-2 text-sm text-gray-400">
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
        <p className="text-sm text-gray-500">
          {countdown} saniye sonra coin sayfasına yönlendirileceksiniz...
        </p>

        {/* Actions */}
        <div className="space-y-3">
          <Link href="/dashboard/coins" className="block w-full bg-yellow-500 hover:bg-yellow-600 text-black py-4 rounded-full font-bold text-lg transition-colors flex items-center justify-center gap-2">
              <RefreshCw className="h-5 w-5" />
              Tekrar Dene
          </Link>

          <Link href="/dashboard" className="block w-full bg-zinc-800 hover:bg-zinc-700 text-white py-3 rounded-full font-semibold transition-colors flex items-center justify-center gap-2">
              <ArrowLeft className="h-5 w-5" />
              Ana Sayfaya Dön
          </Link>

          <Link href="/help" className="block text-gray-400 hover:text-white transition-colors text-sm">
              Yardım Merkezi
          </Link>
        </div>
      </div>
    </div>
  );
}
