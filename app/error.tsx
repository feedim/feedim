'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { CircleAlert, RefreshCw, Home } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to error reporting service
    console.error('Error boundary:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <CircleAlert className="h-20 w-20 mx-auto mb-6 text-pink-500" aria-hidden="true" />

        <h1 className="text-3xl font-bold mb-3 text-pink-500">Bir Şeyler Yanlış Gitti</h1>

        <p className="text-gray-400 mb-8">
          Üzgünüz, bir hata oluştu. Lütfen sayfayı yenilemeyi deneyin veya ana sayfaya dönün.
        </p>

        <div className="flex flex-col gap-3">
          <button
            onClick={reset}
            className="w-full bg-pink-500 hover:bg-pink-600 text-white py-3 px-6 rounded-full font-semibold transition-colors flex items-center justify-center gap-2"
            aria-label="Tekrar Dene"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Tekrar Dene
          </button>

          <Link
            href="/"
            className="w-full bg-zinc-800 hover:bg-zinc-700 text-white py-3 px-6 rounded-full font-semibold transition-colors flex items-center justify-center gap-2"
            aria-label="Ana sayfaya dön"
          >
            <Home className="h-4 w-4" aria-hidden="true" />
            Ana Sayfa
          </Link>
        </div>
      </div>
    </div>
  );
}
