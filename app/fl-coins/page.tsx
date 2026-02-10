import Link from "next/link";
import PublicHeader from "@/components/PublicHeader";
import PublicFooter from "@/components/PublicFooter";
import CTASection from "@/components/CTASection";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "FL Coins Nedir? - Forilove",
  description: "FL Coins ile premium şablonlara erişin. Güvenli ödeme, bonus coinler ve kalıcı kullanım hakkı. FL Coins sistemi hakkında detaylı bilgi.",
  keywords: ["fl coins", "premium şablon", "dijital para birimi", "coin satın al", "bonus coin"],
};

export default function LPCoinsPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ "@context": "https://schema.org", "@type": "WebPage", name: "FL Coins Nedir? - Forilove", description: "FL Coins ile premium şablonlara erişin.", url: "https://forilove.com/fl-coins", isPartOf: { "@id": "https://forilove.com/#website" } }) }} />
      <PublicHeader variant="back" />

      <main className="container mx-auto px-6 py-16 max-w-3xl">
        <h1 className="text-4xl font-bold mb-6">FL Coins Nedir?</h1>

        <div className="space-y-6 text-gray-400">
          <p>
            FL Coins, Forilove platformunda premium şablonlara erişim sağlayan dijital bir para birimidir.
            Platformumuzda coin satın alarak özel tasarlanmış şablonları kullanabilir ve sevdikleriniz için
            benzersiz sayfalar oluşturabilirsiniz.
          </p>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Nasıl Çalışır?</h2>
            <ul className="list-disc list-inside space-y-2">
              <li>Hesabınıza FL Coins satın alın</li>
              <li>Premium şablonları keşfedin</li>
              <li>Beğendiğiniz şablonu coin ile satın alın</li>
              <li>Sınırsız kez kullanın ve düzenleyin</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Avantajlar</h2>
            <ul className="list-disc list-inside space-y-2">
              <li>Bonus coin fırsatları ile daha fazla kazanın</li>
              <li>Satın aldığınız şablonlar kalıcı olarak sizindir</li>
              <li>Güvenli ödeme altyapısı</li>
              <li>Anında kullanıma hazır</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Paketler</h2>
            <p>
              Farklı ihtiyaçlara uygun coin paketlerimiz bulunmaktadır. Daha büyük paketlerde
              bonus coinler kazanabilirsiniz. Coin satın almak için{" "}
              <Link href="/dashboard/coins" className="text-pink-500 hover:text-pink-400">
                buraya tıklayın
              </Link>.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Güvenli Ödeme</h2>
            <p>
              Tüm ödemeleriniz güvenli ödeme altyapımız üzerinden gerçekleştirilir. Kredi kartı
              bilgileriniz şifrelenir ve güvenli bir şekilde işlenir. Detaylı bilgi için{" "}
              <Link href="/payment-security" className="text-pink-500 hover:text-pink-400">
                ödeme güvenliği
              </Link>{" "}
              sayfamızı ziyaret edebilirsiniz.
            </p>
          </section>
        </div>
      </main>

      <CTASection />

      <PublicFooter />
    </div>
  );
}
