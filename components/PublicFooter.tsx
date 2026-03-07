"use client";

import NewTabLink from "@/components/NewTabLink";
import { useTranslations } from "next-intl";

interface PublicFooterProps {
  variant?: "default" | "compact" | "inline" | "minimal";
}

export default function PublicFooter({ variant = "default" }: PublicFooterProps) {
  const t = useTranslations("footer");
  const tCommon = useTranslations("common");
  const year = new Date().getFullYear();
  const goPremiumLabel = tCommon("goPremium");

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
      <footer className="py-6 text-center select-none">
        <p className="text-xs text-text-muted/50">&copy; {year} Feedim</p>
      </footer>
    );
  }

  const paymentLogo = (
    <img alt={t("paymentMethods")} src="/logo_band_white.svg" className="footer-logo" />
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
      <nav className="px-4 pb-3 pt-1 select-none">
        <div className="flex flex-wrap gap-x-2.5 gap-y-0.5 text-[0.65rem] text-text-muted leading-relaxed">
          {compactLinks.map((link) => (
            <NewTabLink key={link.href} href={link.href} className="hover:underline">{link.label}</NewTabLink>
          ))}
          <NewTabLink href="/premium" className="hover:underline">{goPremiumLabel}</NewTabLink>
        </div>
        <p className="text-[0.6rem] text-text-muted/60 mt-1.5">&copy; {year} Feedim. {t("allRightsReserved")}</p>
      </nav>
    );
  }

  // Inline — landing page footer (centered, small)
  if (variant === "inline") {
    return (
      <footer className="py-3 px-4 shrink-0 select-none">
        <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[0.72rem] text-text-muted">
          {links.map((link) => (
            <NewTabLink key={link.href + link.label} href={link.href} className="hover:underline">{link.label}</NewTabLink>
          ))}
          <NewTabLink href="/premium" className="hover:underline">{goPremiumLabel}</NewTabLink>
          <span>&copy; {year} Feedim. {t("allRightsReserved")}</span>
        </nav>
      </footer>
    );
  }

  // Default — full footer (help, premium, not-found pages)
  return (
    <footer className="mt-auto border-t border-border-primary py-8 px-4 sm:px-6 select-none">
      <div className="container mx-auto">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-xs justify-center sm:justify-start">
            {links.map((link) => (
              <NewTabLink key={link.href + link.label} href={link.href} className="text-text-muted hover:text-text-primary transition hover:underline">{link.label}</NewTabLink>
            ))}
            <NewTabLink href="/premium" className="text-text-muted hover:text-text-primary transition hover:underline">{goPremiumLabel}</NewTabLink>
          </div>
          <div className="flex flex-col items-center sm:items-end gap-3 shrink-0">
            {paymentLogo}
            <p className="text-xs text-text-muted/70">&copy; {year} Feedim. {t("allRightsReserved")}</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
