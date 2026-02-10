import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { Toaster } from "react-hot-toast";

const inter = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  themeColor: "#000000",
};

export const metadata: Metadata = {
  title: "Forilove - Sevginizi Ölümsüzleştirin",
  description: "Sevginizi ölümsüzleştirin. Kod bilgisi olmadan sevgilinize özel romantik web sayfaları oluşturun. Yıldönümü, Sevgililer Günü ve özel günler için kişiselleştirilmiş web sayfaları hazırlayın.",
  keywords: ["sevgiliye özel sayfa", "romantik web sayfası", "yıldönümü hediyesi", "sevgililer günü", "kişiselleştirilmiş sayfa", "dijital hediye", "web sayfası oluştur", "love page", "forilove"],
  authors: [{ name: "Forilove" }],
  verification: {
    google: "OjIpCYctpEjVJTVuZrDFEDO6_xhboIhR4rG87s7K7og",
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  openGraph: {
    title: "Forilove - Sevginizi Ölümsüzleştirin",
    description: "Sevginizi ölümsüzleştirin. Kod bilgisi olmadan sevgilinize özel romantik web sayfaları oluşturun.",
    type: "website",
    locale: "tr_TR",
    siteName: "Forilove",
  },
  twitter: {
    card: "summary_large_image",
    title: "Forilove - Sevginizi Ölümsüzleştirin",
    description: "Sevginizi ölümsüzleştirin. Kod bilgisi olmadan sevgilinize özel romantik web sayfaları oluşturun.",
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
                  description: "Sevdiklerinize özel kişiselleştirilmiş aşk sayfaları oluşturun.",
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
      <body className={`${inter.variable} antialiased`} suppressHydrationWarning>
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
        {children}
        <Toaster
          position="bottom-center"
          reverseOrder={false}
          containerStyle={{
            bottom: 80,
          }}
          toastOptions={{
            duration: 5000,
            style: {
              background: '#18181b',
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
                primary: '#ef4444',
                secondary: '#fff',
              },
            },
          }}
        />
      </body>
    </html>
  );
}
