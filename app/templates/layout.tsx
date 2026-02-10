import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Şablonlar - Forilove | Romantik Web Sayfası Şablonları",
  description: "Sevdikleriniz için özel olarak tasarlanmış 50+ romantik web sayfası şablonu. Yıldönümü, doğum günü, evlilik teklifi ve özel günler için hazır tasarımlar.",
  keywords: [
    "şablonlar",
    "romantik şablon",
    "yıldönümü şablonu",
    "doğum günü şablonu",
    "evlilik teklifi şablonu",
    "web sayfası şablonu",
    "sevgiliye hediye",
    "love page template"
  ],
  openGraph: {
    title: "Şablonlar - Forilove",
    description: "Sevdikleriniz için özel olarak tasarlanmış romantik web sayfası şablonları. Yıldönümü, doğum günü ve özel günler için.",
    type: "website",
    locale: "tr_TR",
    siteName: "Forilove",
  },
  twitter: {
    card: "summary_large_image",
    title: "Şablonlar - Forilove",
    description: "Sevdikleriniz için özel olarak tasarlanmış romantik web sayfası şablonları.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
  alternates: {
    canonical: "https://forilove.com/templates",
  },
};

export default function TemplatesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
