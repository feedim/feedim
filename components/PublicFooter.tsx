"use client";

import NewTabLink from "@/components/NewTabLink";
import { defaultPublicFooterLabels, type PublicFooterLabels } from "@/lib/footerLabels";

interface PublicFooterProps {
  variant?: "default" | "compact" | "inline" | "minimal";
  labels?: PublicFooterLabels;
}

export default function PublicFooter({ variant = "default", labels = defaultPublicFooterLabels }: PublicFooterProps) {
  const year = new Date().getFullYear();

  const links = [
    { href: "/help", label: labels.help, short: labels.help },
    { href: "/help/about", label: labels.about, short: labels.about },
    { href: "/help/terms", label: labels.termsLong, short: labels.terms },
    { href: "/help/privacy", label: labels.privacy, short: labels.privacy },
    { href: "/help/community-guidelines", label: labels.communityGuidelines, short: labels.communityGuidelines },
    { href: "/help/contact", label: labels.contact, short: labels.contact },
    { href: "/help/disclaimer", label: labels.disclaimer, short: labels.disclaimer },
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
    <img alt={labels.paymentMethods} src="/logo_band_white.svg" className="footer-logo" />
  );

  // Compact — sidebar footer
  if (variant === "compact") {
    const compactLinks = [
      { href: "/help", label: labels.help },
      { href: "/help/about", label: labels.about },
      { href: "/help/terms", label: labels.terms },
      { href: "/help/privacy", label: labels.privacy },
      { href: "/help/community-guidelines", label: labels.communityGuidelines },
      { href: "/help/contact", label: labels.contact },
    ];
    return (
      <nav className="px-4 pb-3 pt-1 select-none">
        <div className="flex flex-wrap gap-x-2.5 gap-y-0.5 text-[0.65rem] text-text-muted leading-relaxed">
          {compactLinks.map((link) => (
            <NewTabLink key={link.href} href={link.href} className="hover:underline">{link.label}</NewTabLink>
          ))}
          <NewTabLink href="/premium" className="hover:underline">{labels.goPremium}</NewTabLink>
        </div>
        <p className="text-[0.6rem] text-text-muted/60 mt-1.5">&copy; {year} Feedim. {labels.allRightsReserved}</p>
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
          <NewTabLink href="/premium" className="hover:underline">{labels.goPremium}</NewTabLink>
          <span>&copy; {year} Feedim. {labels.allRightsReserved}</span>
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
            <NewTabLink href="/premium" className="text-text-muted hover:text-text-primary transition hover:underline">{labels.goPremium}</NewTabLink>
          </div>
          <div className="flex flex-col items-center sm:items-end gap-3 shrink-0">
            {paymentLogo}
            <p className="text-xs text-text-muted/70">&copy; {year} Feedim. {labels.allRightsReserved}</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
