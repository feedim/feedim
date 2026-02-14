import { Mail } from "lucide-react";
import PublicHeader from "@/components/PublicHeader";
import PublicFooter from "@/components/PublicFooter";
import CTASection from "@/components/CTASection";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "İletişim - Forilove",
  description: "Forilove ile iletişime geçin. Sorularınız, geri bildirimleriniz ve destek talepleriniz için bize ulaşın.",
  keywords: ["iletişim", "destek", "müşteri hizmetleri", "forilove iletişim"],
};

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ "@context": "https://schema.org", "@type": "ContactPage", name: "İletişim - Forilove", description: "Forilove ile iletişime geçin.", url: "https://forilove.com/contact", isPartOf: { "@id": "https://forilove.com/#website" } }) }} />
      <PublicHeader variant="back" />

      <main className="container mx-auto px-3 sm:px-6 py-10 sm:py-16 max-w-3xl">
        <h1 className="text-4xl font-bold mb-6">İletişim</h1>

        <div className="space-y-8">
          <p className="text-gray-400">
            Sizden haber almak isteriz. İster bir sorunuz olsun, ister geri bildirim paylaşmak
            isteyin, ister desteğe ihtiyacınız olsun, bizimle iletişime geçmekten çekinmeyin.
          </p>

          <div className="border border-white/10 rounded-xl p-8 space-y-6">
            <div className="flex items-center gap-3 mb-4">
              <Mail className="h-6 w-6 text-pink-500" />
              <h2 className="text-xl font-semibold">E-posta</h2>
            </div>

            <div>
              <p className="text-gray-400 mb-2">
                Genel sorular ve iletişim için:
              </p>
              <a
                href="mailto:contact@forilove.com"
                className="text-pink-500 hover:text-pink-400 font-medium"
              >
                contact@forilove.com
              </a>
            </div>

            <div>
              <p className="text-gray-400 mb-2">
                Teknik destek ve yardım için:
              </p>
              <a
                href="mailto:support@forilove.com"
                className="text-pink-500 hover:text-pink-400 font-medium"
              >
                support@forilove.com
              </a>
            </div>

            <div>
              <p className="text-gray-400 mb-2">
                Affiliate Program başvuru ve destek için:
              </p>
              <a
                href="mailto:affiliate@forilove.com"
                className="text-pink-500 hover:text-pink-400 font-medium"
              >
                affiliate@forilove.com
              </a>
            </div>
          </div>

          <div className="border border-white/10 rounded-xl p-8">
            <h2 className="text-xl font-semibold mb-4">Çalışma Saatleri</h2>
            <div className="text-gray-400 space-y-2">
              <p>Pazartesi - Cuma: 09:00 - 18:00 (Türkiye Saati)</p>
              <p>Cumartesi - Pazar: Kapalı</p>
            </div>
          </div>

          <div className="border border-white/10 rounded-xl p-8">
            <h2 className="text-xl font-semibold mb-4">Yanıt Süresi</h2>
            <p className="text-gray-400">
              Genellikle iş günlerinde 24 saat içinde tüm sorulara yanıt veriyoruz.
              Acil konular için lütfen e-posta başlığınızda "ACİL" belirtin.
            </p>
          </div>
        </div>
      </main>

      <CTASection />

      <PublicFooter />
    </div>
  );
}
