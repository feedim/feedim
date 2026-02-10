import Link from "next/link";
import PublicHeader from "@/components/PublicHeader";
import PublicFooter from "@/components/PublicFooter";
import CTASection from "@/components/CTASection";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Hakkımızda - Forilove",
  description: "Forilove hakkında bilgi edinin. Sevdikleriniz için kişiselleştirilmiş web sayfaları oluşturmanıza yardımcı oluyoruz.",
  keywords: ["forilove hakkında", "şirket bilgileri", "iletişim"],
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ "@context": "https://schema.org", "@type": "AboutPage", name: "Hakkımızda - Forilove", description: "Forilove hakkında bilgi edinin.", url: "https://forilove.com/about", isPartOf: { "@id": "https://forilove.com/#website" } }) }} />
      <PublicHeader variant="back" />

      <main className="container mx-auto px-6 py-16 max-w-3xl">
        <h1 className="text-4xl font-bold mb-6">Hakkımızda</h1>

        <div className="space-y-6 text-gray-400">
          <p>
            Forilove, insanların sevdikleri için güzel ve kişiselleştirilmiş web sayfaları
            oluşturmasına yardımcı olan bir platformdur. İster yıldönümü, ister Sevgililer Günü,
            ister sadece bir sürpriz olsun, hislerinizi benzersiz ve unutulmaz bir şekilde
            ifade etmenizi kolaylaştırıyoruz.
          </p>

          <h2 className="text-2xl font-bold text-white mt-8 mb-4">Misyonumuz</h2>
          <p>
            Sevginin yaratıcı ve kişisel yollarla kutlanması gerektiğine inanıyoruz. Misyonumuz,
            herkesin teknik bilgiye ihtiyaç duymadan çarpıcı ve içten sayfalar oluşturmasını
            sağlayacak araçları sunmaktır.
          </p>

          <h2 className="text-2xl font-bold text-white mt-8 mb-4">Nasıl Çalışır?</h2>
          <p>
            Profesyonel olarak tasarlanmış şablon koleksiyonumuzdan birini seçin, fotoğraflarınız
            ve mesajlarınızla kişiselleştirin ve benzersiz sayfanızı sevdiğiniz kişiyle paylaşın.
            Bu kadar basit.
          </p>

          {/* Şahıs İşletmesi Bilgileri */}
          <div className="bg-zinc-900 rounded-xl p-6 mt-8">
            <h2 className="text-2xl font-bold text-white mb-4">İşletme Bilgileri</h2>
            <div className="space-y-2 text-gray-300">
              <p><strong>İşletme Adı:</strong> Forilove</p>
              <p><strong>Yetkili:</strong> Meral SÖZER</p>
              <p><strong>Adres:</strong> Zafer Mah. 547.1. Sk. No:224 Salihli/Manisa</p>
              <p><strong>Telefon:</strong> 0546 595 0130</p>
              <p><strong>E-posta:</strong> contact@forilove.com</p>
              <p><strong>Vergi Dairesi/No:</strong> Salihli Adil Oral / 7810676080</p>
            </div>
          </div>

          <h2 className="text-2xl font-bold text-white mt-8 mb-4">Bize Ulaşın</h2>
          <p>
            Sorularınız veya geri bildirimleriniz mi var? Sizden haber almak isteriz.{" "}
            <Link href="/contact" className="text-pink-500 hover:text-pink-400">
              İletişim sayfamızı
            </Link>{" "}
            ziyaret ederek bizimle iletişime geçebilirsiniz.
          </p>
        </div>
      </main>

      <CTASection />

      <PublicFooter />
    </div>
  );
}
