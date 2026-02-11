"use client";

import Link from "next/link";
import { Heart } from "lucide-react";
import PublicHeader from "@/components/PublicHeader";
import PublicFooter from "@/components/PublicFooter";
import CTASection from "@/components/CTASection";

export default function Home() {
  const scrollToFeatures = () => {
    const featuresSection = document.getElementById('features');
    if (featuresSection) {
      featuresSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ "@context": "https://schema.org", "@type": "WebPage", name: "Forilove - Sevginizi Ölümsüzleştirin", description: "Kod bilgisi olmadan sevgilinize özel romantik web sayfaları oluşturun.", url: "https://forilove.com", isPartOf: { "@id": "https://forilove.com/#website" } }) }} />
      <PublicHeader variant="home" />

      {/* Hero Section */}
      <section className="min-h-screen flex items-center justify-center py-20 -mt-20">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="max-w-3xl mx-auto text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full bg-pink-500/10 border border-pink-500/20 mb-6 sm:mb-8">
              <Heart className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-pink-500 fill-pink-500" aria-hidden="true" />
              <span className="text-xs sm:text-sm text-gray-300">Özel anlarınız için dijital sayfalar!</span>
            </div>

            {/* Main Title */}
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-6" style={{ lineHeight: 1.1 }}>
              Sevginizi dijitalde
              <span className="block text-pink-500 mt-3">ölümsüzleştirin</span>
            </h1>

            {/* Description */}
            <p className="text-base sm:text-lg md:text-xl text-gray-400 mb-10 max-w-2xl mx-auto px-2">
              Özel tasarlanmış şablonlar ile sevdikleriniz için unutulmaz anı sayfaları oluşturun
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-row items-center justify-center gap-3">
              <button
                onClick={scrollToFeatures}
                className="btn-secondary px-4 py-3 sm:px-8"
              >
                Nasıl Çalışır?
              </button>
              <Link href="/register" className="btn-primary px-4 py-3 sm:px-8">
                  Ücretsiz Başla
              </Link>
            </div>

            {/* Stats */}
            <div className="mt-16 sm:mt-20 grid grid-cols-3 gap-6 sm:gap-8 max-w-xl mx-auto sm:pt-8 sm:border-t border-white/10">
              <div>
                <div className="text-2xl md:text-3xl font-bold text-white">1K+</div>
                <div className="text-sm text-gray-500 mt-1">Kullanıcı</div>
              </div>
              <div>
                <div className="text-2xl md:text-3xl font-bold text-white">50K+</div>
                <div className="text-sm text-gray-500 mt-1">Paylaşım</div>
              </div>
              <div>
                <div className="text-2xl md:text-3xl font-bold text-white">4.9★</div>
                <div className="text-sm text-gray-500 mt-1">Puan</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="features" className="border-t border-white/10 py-24">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto">
            {/* Section Header */}
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Nasıl Çalışır?</h2>
              <p className="text-gray-400 text-lg">3 basit adımda anı sayfanızı oluşturun</p>
            </div>

            {/* Steps */}
            <div className="space-y-0">
              {/* Step 1 */}
              <div className="flex gap-6 items-stretch">
                <div className="flex-shrink-0 flex flex-col items-center">
                  <div className="w-12 h-12 rounded-full bg-pink-500 flex items-center justify-center text-black font-bold text-xl shrink-0">
                    1
                  </div>
                  <div className="w-px flex-1 bg-white/10" />
                </div>
                <div className="flex-1 pt-1 pb-12">
                  <h3 className="text-2xl font-bold mb-3">Şablon Seçin</h3>
                  <p className="text-gray-400 text-lg leading-relaxed mb-4">
                    Özel günleriniz için tasarlanmış profesyonel şablonlar arasından beğendiğinizi seçin. Her biri farklı tema ve stilde.
                  </p>
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-900 border border-white/5">
                    <Heart className="h-5 w-5 sm:h-4 sm:w-4 text-pink-500 shrink-0" aria-hidden="true" />
                    <span className="text-sm text-gray-400">Yıldönümü, Doğum Günü, Evlilik Teklifi ve daha fazlası</span>
                  </div>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex gap-6 items-stretch">
                <div className="flex-shrink-0 flex flex-col items-center">
                  <div className="w-12 h-12 rounded-full bg-pink-500 flex items-center justify-center text-black font-bold text-xl shrink-0">
                    2
                  </div>
                  <div className="w-px flex-1 bg-white/10" />
                </div>
                <div className="flex-1 pt-1 pb-12">
                  <h3 className="text-2xl font-bold mb-3">Özelleştirin</h3>
                  <p className="text-gray-400 text-lg leading-relaxed mb-4">
                    Fotoğraflarınızı ekleyin, metinleri düzenleyin, renkleri değiştirin. Basit editörümüz ile her şeyi kolayca özelleştirin.
                  </p>
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-900 border border-white/5">
                    <svg className="h-5 w-5 sm:h-4 sm:w-4 text-pink-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                    <span className="text-sm text-gray-400">Kod bilgisi gerektirmez, tıklayın ve düzenleyin</span>
                  </div>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex gap-6 items-start">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 rounded-full bg-pink-500 flex items-center justify-center text-black font-bold text-xl">
                    3
                  </div>
                </div>
                <div className="flex-1 pt-1">
                  <h3 className="text-2xl font-bold mb-3">Paylaşın</h3>
                  <p className="text-gray-400 text-lg leading-relaxed mb-4">
                    Özel linkinizi alın ve sevdiklerinizle paylaşın. WhatsApp, Instagram veya dilediğiniz platformda anında erişilebilir.
                  </p>
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-900 border border-white/5">
                    <svg className="h-5 w-5 sm:h-4 sm:w-4 text-pink-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                    </svg>
                    <span className="text-sm text-gray-400">Her cihazdan erişilebilir, mobil uyumlu</span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      <CTASection />

      <PublicFooter />
    </div>
  );
}
