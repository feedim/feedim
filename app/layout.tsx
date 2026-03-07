import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthModalProvider } from "@/components/AuthModal";
import FeedimAlertProvider from "@/components/FeedimAlert";
import RootClientBootstrap from "@/components/RootClientBootstrap";

import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages, getTranslations } from "next-intl/server";


export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

const localeToOg: Record<string, string> = { tr: "tr_TR", en: "en_US", az: "az_AZ" };
const localeToHtml: Record<string, string> = { tr: "tr-TR", en: "en-US", az: "az-AZ" };
const inter = Inter({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata");
  const locale = await getLocale();
  return {
    title: t("title"),
    description: t("description"),
    keywords: ["feedim", "content platform", "video platform", "blog", "explore", "share"],
    authors: [{ name: "Feedim" }],
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
    icons: {
      icon: [
        { url: "/favicon.png", sizes: "512x512", type: "image/png" },
        { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
        { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
        { url: "/favicon-192x192.png", sizes: "192x192", type: "image/png" },
      ],
      apple: { url: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    },
    manifest: "/manifest.json",
    openGraph: {
      title: t("title"),
      description: t("ogDescription"),
      type: "website",
      locale: localeToOg[locale] || "tr_TR",
      siteName: "Feedim",
      images: [{ url: "/favicon-512x512.png", width: 512, height: 512, alt: "Feedim" }],
    },
    twitter: {
      card: "summary_large_image",
      title: t("title"),
      description: t("ogDescription"),
      images: ["/favicon-512x512.png"],
    },
  };
}
import { getAdsSettings } from "@/lib/siteSettings";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const adsSettings = await getAdsSettings();
  const locale = await getLocale();
  const messages = await getMessages();
  const inLanguage = localeToHtml[locale] || "tr-TR";
  return (
    <html
      lang={locale}
      suppressHydrationWarning
      data-ads-enabled={adsSettings.enabled ? "1" : "0"}
      data-ads-feed={adsSettings.feed ? "1" : "0"}
      data-ads-moments={adsSettings.moments ? "1" : "0"}
      data-ads-video={adsSettings.videoPostroll ? "1" : "0"}
    >
      <head>
        <meta charSet="utf-8" />
        <meta name="6483fe48ff87edcb3c7ff243db8b559b8efdd201" content="6483fe48ff87edcb3c7ff243db8b559b8efdd201" />
        <meta name="referrer" content="no-referrer-when-downgrade" />
        {/* Dark mode flash prevention + theme-color sync */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var m=localStorage.getItem('fdm-theme')||'dark';var c={light:'#ffffff',dark:'#090909',dim:'#0e1520'};var r=m;if(m==='system')r=window.matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light';if(r==='dark'||r==='dim'){document.documentElement.setAttribute('data-theme',r)}if(localStorage.getItem('fdm-ambient-light')==='on'){document.documentElement.setAttribute('data-ambient-light','true')}var t=document.querySelector('meta[name="theme-color"]');if(t&&c[r])t.setAttribute('content',c[r])}catch(e){}})()`,
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              url: process.env.NEXT_PUBLIC_SITE_URL || "https://feedim.com",
              name: "Feedim",
              description: messages && typeof messages === 'object' && 'metadata' in messages ? (messages.metadata as Record<string, string>).siteDescription : "Discover and Share",
              inLanguage,
              potentialAction: {
                "@type": "SearchAction",
                target: `${process.env.NEXT_PUBLIC_SITE_URL || "https://feedim.com"}/explore?q={search_term_string}`,
                "query-input": "required name=search_term_string",
              },
            }),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              name: "Feedim",
              url: process.env.NEXT_PUBLIC_SITE_URL || "https://feedim.com",
              logo: `${process.env.NEXT_PUBLIC_SITE_URL || "https://feedim.com"}/favicon.png`,
              sameAs: [],
            }),
          }}
        />
      </head>
      <body className={`${inter.className} antialiased`} suppressHydrationWarning>
        <NextIntlClientProvider messages={messages} locale={locale}>
          <AuthModalProvider>
            <RootClientBootstrap />
            {children}
          </AuthModalProvider>
          <FeedimAlertProvider />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
