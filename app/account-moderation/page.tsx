import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Hesap Incelemede | Feedim",
  robots: "noindex",
};

export default function AccountModerationPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-primary p-4">
      <div className="max-w-md w-full text-center">
        <div className="bg-bg-secondary border border-border-primary rounded-2xl p-8">
          <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/40 rounded-full flex items-center justify-center mx-auto mb-5">
            <svg className="w-8 h-8 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0-10.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.75c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.249-8.25-3.286Z" />
            </svg>
          </div>

          <h1 className="text-xl font-bold text-text-primary mb-3">
            Hesabiniz inceleme altinda
          </h1>

          <p className="text-sm text-text-muted leading-relaxed mb-6">
            Hesabiniz topluluk kurallari cercevesinde incelemeye alinmistir.
            Inceleme sureci tamamlanana kadar hesabiniza erisim kisitlanmistir.
            Bir hata oldugunu dusunuyorsaniz bizimle iletisime gecebilirsiniz.
          </p>

          <div className="flex flex-col gap-3">
            <Link
              href="/help"
              className="inline-flex items-center justify-center px-5 py-2.5 bg-text-primary text-bg-primary rounded-xl text-sm font-semibold transition hover:opacity-90"
            >
              Yardim Al
            </Link>

            <form action="/auth/signout" method="POST">
              <button
                type="submit"
                className="w-full px-5 py-2.5 border border-border-primary rounded-xl text-sm font-medium text-text-muted transition hover:bg-bg-tertiary"
              >
                Cikis Yap
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
