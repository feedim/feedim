'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { FeedimIcon } from '@/components/FeedimLogo';
import PublicFooter from '@/components/PublicFooter';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Error boundary:', error);
  }, [error]);

  return (
    <div className="min-h-screen text-text-primary flex flex-col">
      {/* Minimal header */}
      <header className="flex items-center justify-center py-8">
        <Link href="/">
          <FeedimIcon className="h-20 w-20" />
        </Link>
      </header>

      {/* Content */}
      <main className="flex-1 flex items-start justify-center px-4 pb-24">
        <div className="text-center max-w-sm">
          <h1 className="text-xl font-semibold mb-2">Bir şeyler yanlış gitti</h1>
          <p className="text-sm text-text-muted mb-8 leading-relaxed">
            Beklenmeyen bir hata oluştu. Sayfayı yenilemeyi deneyin, sorun devam ederse daha sonra tekrar ziyaret edin.
          </p>
          <div className="flex flex-col sm:flex-row gap-2.5 justify-center">
            <button
              onClick={reset}
              className="t-btn accept"
            >
              Tekrar Dene
            </button>
            <Link href="/" className="t-btn cancel">
              Ana Sayfa
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <PublicFooter variant="inline" />
    </div>
  );
}
