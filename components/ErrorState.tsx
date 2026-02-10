import { AlertCircle, RefreshCw, Home, ArrowLeft } from "lucide-react";
import Link from "next/link";

interface ErrorStateProps {
  title?: string;
  message?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  showHomeLink?: boolean;
  showBackLink?: boolean;
  variant?: 'error' | 'warning' | 'info';
}

export default function ErrorState({
  title = "Bir Hata Oluştu",
  message = "Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.",
  action,
  showHomeLink = false,
  showBackLink = false,
  variant = 'error'
}: ErrorStateProps) {
  const colors = {
    error: {
      bg: 'bg-pink-500/10',
      border: 'border-pink-500/20',
      icon: 'text-pink-500',
      title: 'text-pink-500'
    },
    warning: {
      bg: 'bg-yellow-500/10',
      border: 'border-yellow-500/20',
      icon: 'text-yellow-500',
      title: 'text-yellow-500'
    },
    info: {
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/20',
      icon: 'text-blue-500',
      title: 'text-blue-500'
    }
  };

  const style = colors[variant];

  return (
    <div
      className={`${style.bg} ${style.border} border rounded-xl p-8 text-center max-w-md mx-auto`}
      role="alert"
      aria-live="polite"
    >
      <div className="flex justify-center mb-4">
        <AlertCircle className={`h-16 w-16 ${style.icon}`} aria-hidden="true" />
      </div>

      <h2 className={`text-2xl font-bold mb-2 ${style.title}`}>
        {title}
      </h2>

      <p className="text-gray-400 mb-6">
        {message}
      </p>

      <div className="space-y-3">
        {action && (
          <button
            onClick={action.onClick}
            className="w-full bg-pink-500 hover:bg-pink-600 text-white py-3 px-6 rounded-full font-semibold transition-colors flex items-center justify-center gap-2"
            aria-label={action.label}
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            {action.label}
          </button>
        )}

        {showBackLink && (
          <button
            onClick={() => window.history.back()}
            className="w-full bg-zinc-800 hover:bg-zinc-700 text-white py-3 px-6 rounded-full font-semibold transition-colors flex items-center justify-center gap-2"
            aria-label="Geri dön"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Geri Dön
          </button>
        )}

        {showHomeLink && (
          <Link
            href="/"
            className="w-full bg-zinc-800 hover:bg-zinc-700 text-white py-3 px-6 rounded-full font-semibold transition-colors flex items-center justify-center gap-2"
            aria-label="Ana sayfaya dön"
          >
            <Home className="h-4 w-4" aria-hidden="true" />
            Ana Sayfa
          </Link>
        )}
      </div>
    </div>
  );
}

/**
 * Compact error message for inline errors
 */
export function ErrorMessage({
  message,
  className = ""
}: {
  message: string;
  className?: string;
}) {
  return (
    <div
      className={`bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-sm text-red-600 dark:text-red-400 ${className}`}
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-start gap-2">
        <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" aria-hidden="true" />
        <span>{message}</span>
      </div>
    </div>
  );
}

/**
 * Loading state component
 */
export function LoadingState({
  message = "Yükleniyor..."
}: {
  message?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center p-12" role="status" aria-live="polite">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500 mb-4" aria-hidden="true"></div>
      <p className="text-gray-600 dark:text-gray-400">{message}</p>
      <span className="sr-only">Yükleniyor</span>
    </div>
  );
}

/**
 * Empty state component
 */
export function EmptyState({
  icon: Icon,
  title,
  message,
  action
}: {
  icon?: any;
  title: string;
  message: string;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
}) {
  return (
    <div className="text-center p-8 sm:p-12" role="status">
      {Icon && (
        <div className="flex justify-center mb-3 sm:mb-4">
          <Icon className="h-12 w-12 sm:h-16 sm:w-16 text-gray-400" aria-hidden="true" />
        </div>
      )}

      <h3 className="text-lg sm:text-xl font-semibold mb-2 text-white">
        {title}
      </h3>

      <p className="text-gray-400 mb-5 sm:mb-6 text-sm sm:text-base">
        {message}
      </p>

      {action && (
        <>
          {action.href ? (
            <Link
              href={action.href}
              className="btn-primary inline-flex items-center"
              aria-label={action.label}
            >
              {action.label}
            </Link>
          ) : (
            <button
              onClick={action.onClick}
              className="btn-primary"
              aria-label={action.label}
            >
              {action.label}
            </button>
          )}
        </>
      )}
    </div>
  );
}
