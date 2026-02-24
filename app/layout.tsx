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


export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "Feedim — Keşfet ve Paylaş",
  description: "Feedim ile ilham veren içerikler yaz, videolar paylaş, farklı bakış açılarını keşfet ve fikirlerini dünyayla paylaş.",
  keywords: ["gönderi yazma", "içerik platformu", "video platformu", "blog", "keşfet", "paylaş", "kullanıcı", "okuyucu", "feedim"],
  authors: [{ name: "Feedim" }],
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  icons: {
    icon: "/favicon.png",
    apple: "/apple-icon.png",
  },
  openGraph: {
    title: "Feedim — Keşfet ve Paylaş",
    description: "İlham veren içerikler yaz, videolar paylaş, farklı bakış açılarını keşfet ve fikirlerini dünyayla paylaş.",
    type: "website",
    locale: "tr_TR",
    siteName: "Feedim",
  },
  twitter: {
    card: "summary_large_image",
    title: "Feedim — Keşfet ve Paylaş",
    description: "İlham veren içerikler yaz, videolar paylaş, farklı bakış açılarını keşfet ve fikirlerini dünyayla paylaş.",
  },
};

import AdsScriptLoader from "@/components/AdsScriptLoader";
import { getAdsEnabled } from "@/lib/siteSettings";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const adsEnabled = await getAdsEnabled();
  return (
    <html lang="tr" suppressHydrationWarning data-ads-enabled={adsEnabled ? "1" : "0"}>
      <head>
        <meta charSet="utf-8" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
        {/* Dark mode flash prevention + theme-color sync + skeleton gate */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var m=localStorage.getItem('fdm-theme')||'dark';var c={light:'#ffffff',dark:'#090909',dim:'#0e1520'};var r=m;if(m==='system')r=window.matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light';if(r==='dark'||r==='dim'){document.documentElement.setAttribute('data-theme',r)}var t=document.querySelector('meta[name="theme-color"]');if(t&&c[r])t.setAttribute('content',c[r])}catch(e){}try{var hasAuth=false;for(var k in localStorage){if(k.indexOf('sb-')===0&&k.indexOf('-auth-token')>0){if(localStorage.getItem(k)){hasAuth=true;break}}}if(!hasAuth){document.documentElement.setAttribute('data-skeletons-off','1')}}catch(e){}})()`,
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
              description: "Keşfet ve Paylaş - İçerik ve video platformu",
              inLanguage: "tr-TR",
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
        {/* Google AdSense (loaded conditionally) */}
        <AdsScriptLoader />
        {/* Google Analytics */}
        <Script src="https://www.googletagmanager.com/gtag/js?id=G-H0J8RKSJ59" strategy="lazyOnload" />
        <Script id="gtag-init" strategy="lazyOnload" dangerouslySetInnerHTML={{ __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','G-H0J8RKSJ59');` }} />
      </body>
    </html>
  );
}
