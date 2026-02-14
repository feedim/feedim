import type { Metadata } from "next";
import Link from "next/link";
import PublicHeader from "@/components/PublicHeader";
import PublicFooter from "@/components/PublicFooter";
import { Users, Percent, Wallet, Clock, TrendingUp, Shield } from "lucide-react";

export const metadata: Metadata = {
  title: "Affiliate Program | Forilove",
  description: "Forilove Affiliate Program ile takipçilerinize özel indirim linkleri oluşturun ve her satıştan komisyon kazanın. İçerik üreticileri için gelir fırsatı.",
  keywords: ["affiliate program", "influencer", "içerik üretici", "komisyon", "kazanç", "indirim linki", "forilove"],
  openGraph: {
    title: "Affiliate Program | Forilove",
    description: "Takipçilerinize özel indirim linkleri oluşturun ve her satıştan komisyon kazanın.",
    type: "website",
  },
  robots: {
    index: true,
    follow: true,
  },
};

const steps = [
  {
    icon: Users,
    title: "Başvuru Yapın",
    description: "Affiliate programına katılmak için bizimle iletişime geçin. Sosyal medya hesaplarınızı paylaşın.",
  },
  {
    icon: Percent,
    title: "Link Oluşturun",
    description: "Profilinizden özel indirim linkinizi oluşturun. Takipçilerinize %5 ile %20 arası indirim sunun.",
  },
  {
    icon: TrendingUp,
    title: "Paylaşın & Kazanın",
    description: "Linkinizi Instagram, TikTok veya YouTube'da paylaşın. Her satıştan komisyon kazanın.",
  },
];

const faqs = [
  {
    q: "Komisyon oranım nasıl belirlenir?",
    a: "Toplam havuz %40'tır. Takipçilerinize verdiğiniz indirim ne kadar düşükse, komisyonunuz o kadar yüksek olur. Örneğin: %10 indirim → %30 komisyon, %20 indirim → %20 komisyon.",
  },
  {
    q: "Ödemeler nasıl yapılır?",
    a: "İlk 24 saat içindeki satışlardan elde edilen kazançlar peşin olarak ödenir. Sonrasında ödemeler haftada bir (7 günde bir) yapılır. Minimum ödeme tutarı 100 TRY'dir.",
  },
  {
    q: "Kaç tane indirim linki oluşturabilirim?",
    a: "Her affiliate 1 adet indirim linki oluşturabilir. Bu linki tüm platformlarınızda paylaşabilirsiniz.",
  },
  {
    q: "Maksimum indirim oranı nedir?",
    a: "Affiliate'ler en fazla %20 indirim sunabilir. İndirim oranınızı düşük tutarak daha yüksek komisyon kazanabilirsiniz.",
  },
  {
    q: "Kazançlarımı nasıl takip edebilirim?",
    a: "Profilinizdeki Affiliate Program bölümünden toplam kayıt, satış, komisyon oranı ve kazancınızı gerçek zamanlı takip edebilirsiniz.",
  },
  {
    q: "Ödeme bilgilerimi nasıl girerim?",
    a: "Profilinizdeki 'Ödeme Bilgileri' sayfasından IBAN ve hesap sahibi bilgilerinizi girebilirsiniz.",
  },
];

export default function AffiliatePage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <PublicHeader />

      {/* Hero */}
      <section className="py-20 sm:py-28">
        <div className="container mx-auto px-4 sm:px-6 max-w-4xl text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/10 border border-green-500/20 mb-8">
            <TrendingUp className="h-4 w-4 text-green-500" />
            <span className="text-sm text-gray-300">Her satıştan kazanın</span>
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-6" style={{ lineHeight: 1.1 }}>
            Forilove
            <span className="block text-pink-500 mt-3">Affiliate Program</span>
          </h1>
          <p className="text-lg text-gray-400 mb-10 max-w-2xl mx-auto">
            Takipçilerinize özel indirim linkleri oluşturun, her satıştan %20 ile %30 arası komisyon kazanın.
          </p>
          <Link href="/contact" className="btn-primary px-8 py-3 text-lg">
            Başvuru Yap
          </Link>
        </div>
      </section>

      {/* How It Works */}
      <section className="border-t border-white/10 py-20">
        <div className="container mx-auto px-4 sm:px-6 max-w-4xl">
          <h2 className="text-3xl font-bold text-center mb-12">Nasıl Çalışır?</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((step, i) => (
              <div key={i} className="bg-zinc-900 border border-white/10 rounded-2xl p-6 text-center">
                <div className="w-14 h-14 rounded-full bg-pink-500/10 flex items-center justify-center mx-auto mb-4">
                  <step.icon className="h-7 w-7 text-pink-500" />
                </div>
                <h3 className="text-lg font-bold mb-2">{step.title}</h3>
                <p className="text-sm text-gray-400">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Commission Table */}
      <section className="border-t border-white/10 py-20">
        <div className="container mx-auto px-4 sm:px-6 max-w-2xl">
          <h2 className="text-3xl font-bold text-center mb-4">Komisyon Tablosu</h2>
          <p className="text-gray-400 text-center mb-10">İndiriminiz ne kadar düşükse, komisyonunuz o kadar yüksek!</p>
          <div className="bg-zinc-900 rounded-2xl overflow-hidden border border-white/10">
            <div className="grid grid-cols-3 gap-0 text-center text-sm font-semibold border-b border-white/10 bg-white/5">
              <div className="p-4">İndirim</div>
              <div className="p-4">Komisyon</div>
              <div className="p-4">100 TRY Satışta</div>
            </div>
            {[
              { discount: 5, commission: 35 },
              { discount: 10, commission: 30 },
              { discount: 15, commission: 25 },
              { discount: 20, commission: 20 },
            ].map((row) => (
              <div key={row.discount} className="grid grid-cols-3 gap-0 text-center text-sm border-b border-white/5 last:border-0">
                <div className="p-4 text-pink-400 font-medium">%{row.discount}</div>
                <div className="p-4 text-green-400 font-bold">%{row.commission}</div>
                <div className="p-4 text-yellow-500 font-bold">{row.commission} TRY</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Payment Info */}
      <section className="border-t border-white/10 py-20">
        <div className="container mx-auto px-4 sm:px-6 max-w-3xl">
          <h2 className="text-3xl font-bold text-center mb-10">Ödeme Bilgilendirmesi</h2>
          <div className="grid sm:grid-cols-2 gap-6">
            <div className="bg-zinc-900 border border-white/10 rounded-2xl p-6">
              <Clock className="h-8 w-8 text-pink-500 mb-3" />
              <h3 className="font-bold mb-2">İlk 24 Saat</h3>
              <p className="text-sm text-gray-400">İlk 24 saat içindeki satışlardan elde edilen kazançlar peşin olarak ödenir.</p>
            </div>
            <div className="bg-zinc-900 border border-white/10 rounded-2xl p-6">
              <Wallet className="h-8 w-8 text-green-500 mb-3" />
              <h3 className="font-bold mb-2">Haftalık Ödemeler</h3>
              <p className="text-sm text-gray-400">Sonrasında kazançlarınız haftada bir (7 günde bir) IBAN hesabınıza aktarılır.</p>
            </div>
            <div className="bg-zinc-900 border border-white/10 rounded-2xl p-6">
              <Shield className="h-8 w-8 text-blue-500 mb-3" />
              <h3 className="font-bold mb-2">Minimum Ödeme</h3>
              <p className="text-sm text-gray-400">Minimum ödeme tutarı 100 TRY&apos;dir. Bu tutarın altındaki bakiyeler bir sonraki ödeme dönemine aktarılır.</p>
            </div>
            <div className="bg-zinc-900 border border-white/10 rounded-2xl p-6">
              <TrendingUp className="h-8 w-8 text-yellow-500 mb-3" />
              <h3 className="font-bold mb-2">Gerçek Zamanlı Takip</h3>
              <p className="text-sm text-gray-400">Profilinizdeki panelden tüm kayıtları, satışları ve kazancınızı anlık olarak izleyin.</p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t border-white/10 py-20">
        <div className="container mx-auto px-4 sm:px-6 max-w-3xl">
          <h2 className="text-3xl font-bold text-center mb-10">Sıkça Sorulan Sorular</h2>
          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <div key={i} className="bg-zinc-900 border border-white/10 rounded-2xl p-6">
                <h3 className="font-bold mb-2">{faq.q}</h3>
                <p className="text-sm text-gray-400">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-white/10 py-20">
        <div className="container mx-auto px-4 sm:px-6 max-w-2xl text-center">
          <h2 className="text-3xl font-bold mb-4">Hazır mısınız?</h2>
          <p className="text-gray-400 mb-8">Affiliate programına katılın ve içeriklerinizden gelir elde etmeye başlayın.</p>
          <Link href="/contact" className="btn-primary px-8 py-3 text-lg">
            Şimdi Başvur
          </Link>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
