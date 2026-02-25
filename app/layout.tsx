import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Suspense } from "react";
import "./globals.css";
import { AuthModalProvider } from "@/components/AuthModal";
import FeedimAlertProvider from "@/components/FeedimAlert";
import ScrollToTop from "@/components/ScrollToTop";
import GlobalHotkeys from "@/components/GlobalHotkeys";
import TopProgressBar from "@/components/TopProgressBar";
import ModalsPreload from "@/components/ModalsPreload";
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
      icon: "/favicon.png",
      apple: "/apple-icon.png",
    },
    openGraph: {
      title: t("title"),
      description: t("ogDescription"),
      type: "website",
      locale: localeToOg[locale] || "tr_TR",
      siteName: "Feedim",
    },
    twitter: {
      card: "summary_large_image",
      title: t("title"),
      description: t("ogDescription"),
    },
  };
}

import AdsScriptLoader from "@/components/AdsScriptLoader";
import { getAdsEnabled } from "@/lib/siteSettings";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const adsEnabled = await getAdsEnabled();
  const locale = await getLocale();
  const messages = await getMessages();
  const inLanguage = localeToHtml[locale] || "tr-TR";
  return (
    <html lang={locale} suppressHydrationWarning data-ads-enabled={adsEnabled ? "1" : "0"}>
      <head>
        <meta charSet="utf-8" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
        {/* Dark mode flash prevention + theme-color sync */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var m=localStorage.getItem('fdm-theme')||'dark';var c={light:'#ffffff',dark:'#090909',dim:'#0e1520'};var r=m;if(m==='system')r=window.matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light';if(r==='dark'||r==='dim'){document.documentElement.setAttribute('data-theme',r)}var t=document.querySelector('meta[name="theme-color"]');if(t&&c[r])t.setAttribute('content',c[r])}catch(e){}})()`,
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
      <body className="antialiased" suppressHydrationWarning>
        <NextIntlClientProvider messages={messages} locale={locale}>
          <AuthModalProvider>
            <Suspense fallback={null}>
              <TopProgressBar />
            </Suspense>
            <ScrollToTop />
            <GlobalHotkeys />
            <ModalsPreload />
            {children}
          </AuthModalProvider>
          <FeedimAlertProvider />
        </NextIntlClientProvider>
        {/* Google AdSense (loaded conditionally) */}
        <AdsScriptLoader />
        {/* Google Analytics */}
        <Script src="https://www.googletagmanager.com/gtag/js?id=G-H0J8RKSJ59" strategy="lazyOnload" />
        <Script id="gtag-init" strategy="lazyOnload" dangerouslySetInnerHTML={{ __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','G-H0J8RKSJ59');` }} />
      </body>
    </html>
  );
}
