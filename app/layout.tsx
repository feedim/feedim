import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { AuthModalProvider } from "@/components/AuthModal";
import FeedimAlertProvider from "@/components/FeedimAlert";
import ScrollToTop from "@/components/ScrollToTop";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Dark mode flash prevention + theme-color sync */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var m=localStorage.getItem('fdm-theme');var c={light:'#ffffff',dark:'#090909',dim:'#0e1520'};var r=m;if(m==='system')r=window.matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light';if(r==='dark'||r==='dim'){document.documentElement.setAttribute('data-theme',r)}var t=document.querySelector('meta[name="theme-color"]');if(t&&c[r])t.setAttribute('content',c[r])}catch(e){}})()`,
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
                target: `${process.env.NEXT_PUBLIC_SITE_URL || "https://feedim.com"}/dashboard/explore?q={search_term_string}`,
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
      <body className={`${inter.variable} antialiased`} suppressHydrationWarning>
        <AuthModalProvider>
          <ScrollToTop />
          {children}
        </AuthModalProvider>
        <FeedimAlertProvider />
        {/* Google AdSense */}
        <Script src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1411343179923275" strategy="afterInteractive" crossOrigin="anonymous" />
        {/* Google Analytics */}
        <Script src="https://www.googletagmanager.com/gtag/js?id=G-H0J8RKSJ59" strategy="afterInteractive" />
        <Script id="gtag-init" strategy="afterInteractive" dangerouslySetInnerHTML={{ __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','G-H0J8RKSJ59');` }} />
      </body>
    </html>
  );
}
