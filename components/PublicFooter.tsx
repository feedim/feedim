"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

interface PublicFooterProps {
  variant?: "default" | "compact" | "inline" | "minimal";
}

export default function PublicFooter({ variant = "default" }: PublicFooterProps) {
  const t = useTranslations("footer");
  const year = new Date().getFullYear();

  const links = [
    { href: "/help", label: t("help"), short: t("help") },
    { href: "/help/about", label: t("about"), short: t("about") },
    { href: "/help/terms", label: t("termsLong"), short: t("terms") },
    { href: "/help/privacy", label: t("privacy"), short: t("privacy") },
    { href: "/help/community-guidelines", label: t("communityGuidelines"), short: t("communityGuidelines") },
    { href: "/help/contact", label: t("contact"), short: t("contact") },
    { href: "/help/disclaimer", label: t("disclaimer"), short: t("disclaimer") },
  ];

  // Minimal — just copyright (error page)
  if (variant === "minimal") {
    return (
      <footer className="py-6 text-center">
        <p className="text-xs text-text-muted/50">&copy; {year} Feedim</p>
      </footer>
    );
  }

  const goPremiumLabel = useTranslations("common")("goPremium");

  const paymentLogo = (
    <img alt={t("paymentMethods")} height="25" src="/logo_band_white.svg" style={{ height: 25, width: "auto", opacity: 0.7 }} />
  );

  // Compact — sidebar footer
  if (variant === "compact") {
    const compactLinks = [
      { href: "/help", label: t("help") },
      { href: "/help/about", label: t("about") },
      { href: "/help/terms", label: t("terms") },
      { href: "/help/privacy", label: t("privacy") },
      { href: "/help/community-guidelines", label: t("communityGuidelines") },
      { href: "/help/contact", label: t("contact") },
    ];
    return (
      <nav className="px-4 pb-3 pt-1">
        <div className="flex flex-wrap gap-x-2.5 gap-y-0.5 text-[0.65rem] text-text-muted leading-relaxed">
          {compactLinks.map((link) => (
            <Link key={link.href} href={link.href} className="hover:underline">{link.label}</Link>
          ))}
          <Link href="/premium" className="hover:underline">{goPremiumLabel}</Link>
        </div>
        <p className="text-[0.6rem] text-text-muted/60 mt-1.5">&copy; {year} Feedim. {t("allRightsReserved")}</p>
      </nav>
    );
  }

  // Inline — landing page footer (centered, small)
  if (variant === "inline") {
    return (
      <footer className="py-3 px-4 shrink-0">
        <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[0.72rem] text-text-muted">
          {links.map((link) => (
            <Link key={link.href + link.label} href={link.href} className="hover:underline">{link.label}</Link>
          ))}
          <Link href="/premium" className="hover:underline">{goPremiumLabel}</Link>
          <span>&copy; {year} Feedim. {t("allRightsReserved")}</span>
        </nav>
        <div className="flex justify-center mt-2">{paymentLogo}</div>
      </footer>
    );
  }

  // Default — full footer (help, premium, not-found pages)
  return (
    <footer className="mt-auto border-t border-border-primary py-8 px-4 sm:px-6">
      <div className="container mx-auto">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-xs justify-center sm:justify-start">
            {links.map((link) => (
              <Link key={link.href + link.label} href={link.href} className="text-text-muted hover:text-text-primary transition">{link.label}</Link>
            ))}
            <Link href="/premium" className="text-text-muted hover:text-text-primary transition">{goPremiumLabel}</Link>
          </div>
          <div className="flex flex-col items-center sm:items-end gap-2 shrink-0">
            {paymentLogo}
            <p className="text-xs text-text-muted">&copy; {year} Feedim. {t("allRightsReserved")}</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
