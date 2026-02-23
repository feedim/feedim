import Link from "next/link";

interface PublicFooterProps {
  variant?: "default" | "compact" | "inline" | "minimal";
}

const links = [
  { href: "/help", label: "Yardım Merkezi", short: "Yardım Merkezi" },
  { href: "/help/about", label: "Hakkımızda", short: "Hakkımızda" },
  { href: "/help/terms", label: "Kullanım Koşulları", short: "Koşullar" },
  { href: "/help/privacy", label: "Gizlilik", short: "Gizlilik" },
  { href: "/help/privacy", label: "KVKK", short: "KVKK" },
  { href: "/help/community-guidelines", label: "Topluluk Kuralları", short: "Topluluk Kuralları" },
  { href: "/help/contact", label: "İletişim", short: "İletişim" },
  { href: "/help/copyright", label: "Telif Hakkı Koruması", short: "Telif Hakkı" },
  { href: "/help/moderation", label: "Moderasyon Sistemi", short: "Moderasyon" },
  { href: "/help/ai", label: "Feedim AI", short: "Feedim AI" },
  { href: "/help/content-types", label: "İçerik Türleri", short: "İçerik Türleri" },
  { href: "/help/coins", label: "Jeton Sistemi", short: "Jeton Sistemi" },
  { href: "/help/earning", label: "Para Kazanma", short: "Para Kazanma" },
  { href: "/help/analytics", label: "Analitik", short: "Analitik" },
  { href: "/help/data-sharing", label: "Veri Paylaşımı", short: "Veri Paylaşımı" },
  { href: "/help/access-restrictions", label: "Erişim Kısıtlamaları", short: "Erişim Kısıtlamaları" },
  { href: "/help/accessibility", label: "Erişilebilirlik", short: "Erişilebilirlik" },
  { href: "/help/disclaimer", label: "Sorumluluk Reddi", short: "Sorumluluk Reddi" },
  { href: "/help/distance-sales-contract", label: "Mesafeli Satış Sözleşmesi", short: "Satış Sözleşmesi" },
  { href: "/help/refund-policy", label: "İade Politikası", short: "İade Politikası" },
  { href: "/help/payment-security", label: "Ödeme Güvenliği", short: "Ödeme Güvenliği" },
];

export default function PublicFooter({ variant = "default" }: PublicFooterProps) {
  const year = new Date().getFullYear();

  // Minimal — sadece copyright (error sayfası)
  if (variant === "minimal") {
    return (
      <footer className="py-6 text-center">
        <p className="text-xs text-text-muted/50">&copy; {year} Feedim</p>
      </footer>
    );
  }

  const paymentLogo = (
    <img alt="Ödeme yöntemleri" height="25" src="/logo_band_white.svg" style={{ height: 25, width: "auto", opacity: 0.7 }} />
  );

  // Compact — sidebar footer
  if (variant === "compact") {
    const compactLinks = [
      { href: "/help", label: "Yardım" },
      { href: "/help/about", label: "Hakkımızda" },
      { href: "/help/terms", label: "Koşullar" },
      { href: "/help/privacy", label: "Gizlilik" },
      { href: "/help/community-guidelines", label: "Topluluk Kuralları" },
      { href: "/help/contact", label: "İletişim" },
    ];
    return (
      <nav className="px-4 pb-3 pt-1">
        <div className="flex flex-wrap gap-x-2.5 gap-y-0.5 text-[0.65rem] text-text-muted leading-relaxed">
          {compactLinks.map((link) => (
            <Link key={link.href} href={link.href} className="hover:underline">{link.label}</Link>
          ))}
          <Link href="/premium" className="hover:underline">Premium ol</Link>
        </div>
        <p className="text-[0.6rem] text-text-muted/60 mt-1.5">&copy; {year} Feedim. Tüm hakları saklıdır.</p>
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
          <Link href="/premium" className="hover:underline">Premium ol</Link>
          <span>&copy; {year} Feedim. Tüm hakları saklıdır.</span>
        </nav>
        <div className="flex justify-center mt-2">{paymentLogo}</div>
      </footer>
    );
  }

  // Default — full footer (help, premium, not-found sayfaları)
  return (
    <footer className="mt-auto border-t border-border-primary py-8 px-4 sm:px-6">
      <div className="container mx-auto">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm justify-center sm:justify-start">
            {links.map((link) => (
              <Link key={link.href + link.label} href={link.href} className="text-text-muted hover:text-text-primary transition">{link.label}</Link>
            ))}
            <Link href="/premium" className="text-text-muted hover:text-text-primary transition">Premium ol</Link>
          </div>
          <div className="flex flex-col items-center sm:items-end gap-2 shrink-0">
            {paymentLogo}
            <p className="text-xs text-text-muted">&copy; {year} Feedim. Tüm hakları saklıdır.</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
