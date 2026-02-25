"use client";

import { AlertCircle, RefreshCw, Home, ArrowLeft } from "lucide-react";
import { useTranslations } from "next-intl";
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
  title,
  message,
  action,
  showHomeLink = false,
  showBackLink = false,
  variant = 'error'
}: ErrorStateProps) {
  const t = useTranslations("errors");
  const resolvedTitle = title ?? t("somethingWentWrong");
  const resolvedMessage = message ?? t("unexpectedError");
  const colors = {
    error: {
      bg: 'bg-accent-main/10',
      border: 'border-accent-main/20',
      icon: 'text-accent-main',
      title: 'text-accent-main'
    },
    warning: {
      bg: 'bg-warning/10',
      border: 'border-warning/20',
      icon: 'text-warning',
      title: 'text-warning'
    },
    info: {
      bg: 'bg-info/10',
      border: 'border-info/20',
      icon: 'text-info',
      title: 'text-info'
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
        {resolvedTitle}
      </h2>

      <p className="text-text-muted mb-6">
        {resolvedMessage}
      </p>

      <div className="space-y-3">
        {action && (
          <button
            onClick={action.onClick}
            className="w-full bg-accent-main hover:bg-accent-main text-text-primary py-3 px-6 rounded-full font-semibold transition-colors flex items-center justify-center gap-2"
            aria-label={action.label}
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            {action.label}
          </button>
        )}

        {showBackLink && (
          <button
            onClick={() => {
              if (window.history.length > 1) {
                window.history.back();
              } else {
                window.location.href = "/";
              }
            }}
            className="w-full bg-bg-secondary hover:bg-bg-tertiary text-text-primary py-3 px-6 rounded-full font-semibold transition-colors flex items-center justify-center gap-2"
            aria-label={t("goBack")}
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            {t("goBack")}
          </button>
        )}

        {showHomeLink && (
          <Link
            href="/"
            className="w-full bg-bg-secondary hover:bg-bg-tertiary text-text-primary py-3 px-6 rounded-full font-semibold transition-colors flex items-center justify-center gap-2"
            aria-label={t("goHome")}
          >
            <Home className="h-4 w-4" aria-hidden="true" />
            {t("goHome")}
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
      className={`bg-error/10 border border-error/20 rounded-lg p-3 text-sm text-error ${className}`}
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
  message
}: {
  message?: string;
}) {
  const t = useTranslations("common");
  const resolvedMessage = message ?? t("loading");
  return (
    <div className="flex flex-col items-center justify-center p-12" role="status" aria-live="polite">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-main mb-4" aria-hidden="true"></div>
      <p className="text-text-muted dark:text-text-muted">{resolvedMessage}</p>
      <span className="sr-only">{t("loading")}</span>
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
          <Icon className="h-12 w-12 sm:h-16 sm:w-16 text-text-muted" aria-hidden="true" />
        </div>
      )}

      <h3 className="text-lg sm:text-xl font-semibold mb-2 text-text-primary">
        {title}
      </h3>

      <p className="text-text-muted mb-5 sm:mb-6 text-sm">
        {message}
      </p>

      {action && (
        <>
          {action.href ? (
            <Link
              href={action.href}
              className="t-btn accept inline-flex items-center"
              aria-label={action.label}
            >
              {action.label}
            </Link>
          ) : (
            <button
              onClick={action.onClick}
              className="t-btn accept"
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
