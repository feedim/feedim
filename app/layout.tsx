import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import { PurchaseConfirmProvider } from "@/components/PurchaseConfirmModal";
import { AuthModalProvider } from "@/components/AuthModal";
import PromoBanner from "@/components/PromoBanner";
import { Suspense } from "react";

const inter = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: "Forilove - Sevginizi Ölümsüzleştirin",
  description: "Sevginizi ölümsüzleştirin. Kod bilgisi olmadan sevgilinize özel romantik web sayfaları oluşturun. Yıldönümü, Sevgililer Günü ve özel günler için kişiselleştirilmiş web sayfaları hazırlayın.",
  keywords: ["sevgiliye özel sayfa", "romantik web sayfası", "yıldönümü hediyesi", "sevgililer günü", "kişiselleştirilmiş sayfa", "dijital hediye", "web sayfası oluştur", "love page", "forilove"],
  authors: [{ name: "Forilove" }],
  verification: {
    google: "OjIpCYctpEjVJTVuZrDFEDO6_xhboIhR4rG87s7K7og",
    yandex: "e8b54ef0d0f19431",
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  icons: {
    icon: "/favicon.png",
    apple: "/apple-icon.png",
  },
  openGraph: {
    title: "Forilove - Sevginizi Ölümsüzleştirin",
    description: "Sevginizi ölümsüzleştirin. Kod bilgisi olmadan sevgilinize özel romantik web sayfaları oluşturun.",
    type: "website",
    locale: "tr_TR",
    siteName: "Forilove",
    images: ["/icon.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Forilove - Sevginizi Ölümsüzleştirin",
    description: "Sevginizi ölümsüzleştirin. Kod bilgisi olmadan sevgilinize özel romantik web sayfaları oluşturun.",
    images: ["/icon.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" suppressHydrationWarning style={{ backgroundColor: '#000' }}>
      <head>
        <meta charSet="utf-8" />
        <link rel="dns-prefetch" href="https://www.googletagmanager.com" />
        <link rel="dns-prefetch" href="https://analytics.tiktok.com" />
        <link rel="dns-prefetch" href="https://www.youtube.com" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@graph": [
                {
                  "@type": "Organization",
                  "@id": "https://www.forilove.com/#organization",
                  name: "Forilove",
                  url: "https://www.forilove.com",
                  description: "Sevdiklerinize özel kişiselleştirilmiş anı sayfaları oluşturun.",
                  contactPoint: {
                    "@type": "ContactPoint",
                    email: "contact@forilove.com",
                    contactType: "customer service",
                    availableLanguage: "Turkish",
                  },
                },
                {
                  "@type": "WebSite",
                  "@id": "https://www.forilove.com/#website",
                  url: "https://www.forilove.com",
                  name: "Forilove",
                  publisher: { "@id": "https://www.forilove.com/#organization" },
                  inLanguage: "tr-TR",
                },
              ],
            }),
          }}
        />
      </head>
      <body className={`${inter.variable} antialiased`} style={{ backgroundColor: '#000' }} suppressHydrationWarning>
        <Script
          async
          src="https://www.googletagmanager.com/gtag/js?id=G-3D5YZ6PJBS"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-3D5YZ6PJBS');
          `}
        </Script>
        <Script id="tiktok-pixel" strategy="beforeInteractive">
          {`
            !function (w, d, t) {
              w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie","holdConsent","revokeConsent","grantConsent"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(
              var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var r="https://analytics.tiktok.com/i18n/pixel/events.js",o=n&&n.partner;ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=r,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};n=document.createElement("script");n.type="text/javascript",n.async=!0,n.src=r+"?sdkid="+e+"&lib="+t;e=document.getElementsByTagName("script")[0];e.parentNode.insertBefore(n,e)};
              ttq.load('D68QTBRC77U43E96GLE0');
              ttq.page();
            }(window, document, 'ttq');
          `}
        </Script>
        <Suspense><PromoBanner /></Suspense>
        <PurchaseConfirmProvider>
        <AuthModalProvider>
        {children}
        </AuthModalProvider>
        <Toaster
          position="bottom-center"
          reverseOrder={false}
          containerStyle={{
            bottom: 80,
          }}
          toastOptions={{
            duration: 5000,
            style: {
              background: '#161616',
              color: '#fff',
              padding: '12px 16px',
              borderRadius: '12px',
              fontSize: '14px',
              fontWeight: '500',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
            },
            success: {
              iconTheme: {
                primary: '#e63e7a',
                secondary: '#fff',
              },
            },
            error: {
              iconTheme: {
                primary: '#e63e7a',
                secondary: '#fff',
              },
            },
          }}
        />
        </PurchaseConfirmProvider>
      </body>
    </html>
  );
}
