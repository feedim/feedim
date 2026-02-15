import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import PublicHeader from "@/components/PublicHeader";
import PublicFooter from "@/components/PublicFooter";
import AffiliateRefCapture from "./AffiliateRefCapture";
import { Users, Percent, Wallet, Clock, TrendingUp, Shield, Heart, Gift, PartyPopper, Sparkles, CalendarHeart, UserPlus } from "lucide-react";

export const metadata: Metadata = {
  title: "Satış Ortaklığı | Forilove",
  description: "Forilove Satış Ortaklığı ile takipçilerinize özel indirim linkleri oluşturun ve her satıştan komisyon kazanın. İçerik üreticileri için gelir fırsatı.",
  keywords: ["satış ortaklığı", "affiliate program", "influencer", "içerik üretici", "komisyon", "kazanç", "indirim linki", "forilove"],
  openGraph: {
    title: "Satış Ortaklığı | Forilove",
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
    description: "Affiliate programına katılmak için affiliate@forilove.com adresine başvurun. Sosyal medya hesaplarınızı paylaşın.",
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
    a: "Takipçilerinize verdiğiniz indirim ne kadar düşükse, komisyonunuz o kadar yüksek olur. Örneğin: %5 indirim → %30 komisyon, %10 indirim → %25 komisyon, %20 indirim → %15 komisyon. Minimum indirim oranı %5'tir.",
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
    a: "Affiliate'ler en az %5, en fazla %20 indirim sunabilir. İndirim oranınızı düşük tutarak daha yüksek komisyon kazanabilirsiniz.",
  },
  {
    q: "Kazançlarımı nasıl takip edebilirim?",
    a: "Profilinizdeki Satış Ortaklığı bölümünden toplam kayıt, satış, komisyon oranı ve kazancınızı gerçek zamanlı takip edebilirsiniz.",
  },
  {
    q: "Ödeme bilgilerimi nasıl girerim?",
    a: "Profilinizdeki 'Ödeme Bilgileri' sayfasından IBAN ve hesap sahibi bilgilerinizi girebilirsiniz.",
  },
  {
    q: "Affiliate davet programı nasıl çalışır?",
    a: "Referans linkinizi paylaşarak diğer içerik üreticilerini davet edebilirsiniz. Davet ettiğiniz affiliate her ödeme aldığında, ödeme tutarının %5'i kadar ek kazanç elde edersiniz. Bu tutar platform tarafından karşılanır, davet edilen kişinin komisyonundan kesilmez.",
  },
];

export default function AffiliatePage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <PublicHeader />
      <Suspense fallback={null}>
        <AffiliateRefCapture />
      </Suspense>

      {/* Hero */}
      <section className="py-20 sm:py-28">
        <div className="container mx-auto px-4 sm:px-6 max-w-4xl text-center">
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-bold mb-6" style={{ lineHeight: 1.1 }}>
            Forilove
            <span className="block text-pink-500 mt-3">Satış Ortaklığı</span>
          </h1>
          <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
            Takipçilerinize özel indirim linkleri oluşturun, her satıştan %15 ile %30 arası komisyon kazanın.
          </p>
        </div>
      </section>

      {/* Forilove Nedir? */}
      <section className="border-t border-white/10 py-20">
        <div className="container mx-auto px-4 sm:px-6 max-w-4xl">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-4">Forilove Nedir?</h2>
          <p className="text-zinc-400 text-center mb-4 max-w-2xl mx-auto">
            Forilove, sevdikleriniz için özel dijital davetiyeler ve hediye sayfaları oluşturmanızı sağlayan bir platformdur. Hiçbir teknik bilgi gerektirmez — herkes çok basit bir editör panelinden birkaç dakikada kendi sayfasını oluşturabilir.
          </p>
          <p className="text-zinc-500 text-center text-sm mb-12 max-w-xl mx-auto">
            Şablon seç, fotoğraflarını ve yazılarını ekle, müziğini belirle, yayınla. Bu kadar basit.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <div className="bg-zinc-900 border border-white/10 rounded-2xl p-5">
              <Heart className="h-6 w-6 text-pink-500 mb-3" />
              <h3 className="font-bold text-sm mb-1">Sevgililer Günü</h3>
              <p className="text-xs text-zinc-400">Sevgilinize özel romantik sayfalar, aşk mektupları ve sürpriz davetiyeler oluşturun.</p>
            </div>
            <div className="bg-zinc-900 border border-white/10 rounded-2xl p-5">
              <Gift className="h-6 w-6 text-pink-500 mb-3" />
              <h3 className="font-bold text-sm mb-1">Anneler & Babalar Günü</h3>
              <p className="text-xs text-zinc-400">Annenize veya babanıza unutulmaz dijital hediyeler ve teşekkür sayfaları hazırlayın.</p>
            </div>
            <div className="bg-zinc-900 border border-white/10 rounded-2xl p-5">
              <PartyPopper className="h-6 w-6 text-pink-500 mb-3" />
              <h3 className="font-bold text-sm mb-1">Doğum Günü</h3>
              <p className="text-xs text-zinc-400">Doğum günü kutlamaları için müzikli, fotoğraflı ve animasyonlu özel sayfalar.</p>
            </div>
            <div className="bg-zinc-900 border border-white/10 rounded-2xl p-5">
              <Sparkles className="h-6 w-6 text-pink-500 mb-3" />
              <h3 className="font-bold text-sm mb-1">Düğün & Nişan Davetiyeleri</h3>
              <p className="text-xs text-zinc-400">Online davetiyeler ile düğün ve nişan davetlerinizi dijital olarak paylaşın.</p>
            </div>
            <div className="bg-zinc-900 border border-white/10 rounded-2xl p-5">
              <CalendarHeart className="h-6 w-6 text-pink-500 mb-3" />
              <h3 className="font-bold text-sm mb-1">Yıl Dönümü</h3>
              <p className="text-xs text-zinc-400">Evlilik yıl dönümü, tanışma yıl dönümü gibi özel günler için anı sayfaları.</p>
            </div>
            <div className="bg-zinc-900 border border-white/10 rounded-2xl p-5">
              <Users className="h-6 w-6 text-pink-500 mb-3" />
              <h3 className="font-bold text-sm mb-1">Özel Davetiyeler</h3>
              <p className="text-xs text-zinc-400">Baby shower, mezuniyet, açılış ve her türlü özel etkinlik için dijital davetiyeler.</p>
            </div>
          </div>
          <p className="text-xs text-zinc-500 text-center mt-8">
            Tüm şablonlar müzik, fotoğraf, geri sayım ve animasyon desteği ile tamamen kişiselleştirilebilir. Tasarım bilgisi gerekmez — basit editör panelinden herkes yapabilir.
          </p>
        </div>
      </section>

      {/* How It Works */}
      <section className="border-t border-white/10 py-20">
        <div className="container mx-auto px-4 sm:px-6 max-w-4xl">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-12">Nasıl Çalışır?</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((step, i) => (
              <div key={i} className="bg-zinc-900 border border-white/10 rounded-2xl p-6 text-center">
                <div className="w-14 h-14 rounded-full bg-pink-500/10 flex items-center justify-center mx-auto mb-4">
                  <step.icon className="h-7 w-7 text-pink-500" />
                </div>
                <h3 className="text-lg font-bold mb-2">{step.title}</h3>
                <p className="text-sm text-zinc-400">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Commission Table */}
      <section className="border-t border-white/10 py-20">
        <div className="container mx-auto px-4 sm:px-6 max-w-2xl">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-4">Komisyon Tablosu</h2>
          <p className="text-zinc-400 text-center mb-10">İndiriminiz ne kadar düşükse, komisyonunuz o kadar yüksek! (Min. %5 — Maks. %20)</p>
          <div className="bg-zinc-900 rounded-2xl overflow-hidden border border-white/10">
            <div className="grid grid-cols-3 gap-0 text-center text-sm font-semibold border-b border-white/10 bg-white/5">
              <div className="p-4">İndirim</div>
              <div className="p-4">Komisyon</div>
              <div className="p-4">100 TRY Satışta</div>
            </div>
            {[
              { discount: 5, commission: 30 },
              { discount: 10, commission: 25 },
              { discount: 15, commission: 20 },
              { discount: 20, commission: 15 },
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
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-10">Ödeme Bilgilendirmesi</h2>
          <div className="grid sm:grid-cols-2 gap-6">
            <div className="bg-zinc-900 border border-white/10 rounded-2xl p-6">
              <Clock className="h-8 w-8 text-pink-500 mb-3" />
              <h3 className="font-bold mb-2">İlk 24 Saat</h3>
              <p className="text-sm text-zinc-400">İlk 24 saat içindeki satışlardan elde edilen kazançlar peşin olarak ödenir.</p>
            </div>
            <div className="bg-zinc-900 border border-white/10 rounded-2xl p-6">
              <Wallet className="h-8 w-8 text-pink-500 mb-3" />
              <h3 className="font-bold mb-2">Haftalık Ödemeler</h3>
              <p className="text-sm text-zinc-400">Sonrasında kazançlarınız haftada bir (7 günde bir) IBAN hesabınıza aktarılır.</p>
            </div>
            <div className="bg-zinc-900 border border-white/10 rounded-2xl p-6">
              <Shield className="h-8 w-8 text-pink-500 mb-3" />
              <h3 className="font-bold mb-2">Minimum Ödeme</h3>
              <p className="text-sm text-zinc-400">Minimum ödeme tutarı 100 TRY&apos;dir. Bu tutarın altındaki bakiyeler bir sonraki ödeme dönemine aktarılır. Kullanıcılar iki faktörlü doğrulama (2FA) ile korunur.</p>
            </div>
            <div className="bg-zinc-900 border border-white/10 rounded-2xl p-6">
              <TrendingUp className="h-8 w-8 text-pink-500 mb-3" />
              <h3 className="font-bold mb-2">Gerçek Zamanlı Takip</h3>
              <p className="text-sm text-zinc-400">Profilinizdeki panelden tüm kayıtları, satışları ve kazancınızı anlık olarak izleyin.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Affiliate Panel Preview */}
      <section className="border-t border-white/10 py-20">
        <div className="container mx-auto px-4 sm:px-6 max-w-3xl text-center">
          <h2 className="text-2xl sm:text-3xl font-bold mb-4">Satış Ortaklığı Paneliniz</h2>
          <p className="text-zinc-400 mb-10">Kazançlarınızı, kayıtları ve satışları gerçek zamanlı takip edin.</p>
          <div className="grid sm:grid-cols-2 gap-6 max-w-2xl mx-auto">
            <div className="rounded-2xl overflow-hidden border border-white/10">
              <img src="/affiliate/panel-1.jpg" alt="Affiliate Panel - Kazanç Takibi" className="w-full" />
            </div>
            <div className="rounded-2xl overflow-hidden border border-white/10">
              <img src="/affiliate/panel-2.jpeg" alt="Affiliate Panel - Link Yönetimi" className="w-full" />
            </div>
            <div className="rounded-2xl overflow-hidden border border-white/10">
              <img src="/affiliate/panel-3.jpg" alt="Affiliate Panel - IBAN Bilgileri" className="w-full" />
            </div>
            <div className="rounded-2xl overflow-hidden border border-white/10">
              <img src="/affiliate/panel-4.jpg" alt="Affiliate Panel - Ödeme Takibi" className="w-full" />
            </div>
            <div className="rounded-2xl overflow-hidden border border-white/10">
              <img src="/affiliate/panel-5.jpg" alt="Affiliate Panel - Promo Link" className="w-full" />
            </div>
            <div className="rounded-2xl overflow-hidden border border-white/10">
              <img src="/affiliate/panel-6.jpg" alt="Affiliate Panel - Kullanıcılar" className="w-full" />
            </div>
          </div>
        </div>
      </section>

      {/* Referral Program */}
      <section className="border-t border-white/10 py-20">
        <div className="container mx-auto px-4 sm:px-6 max-w-3xl">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-4">Affiliate Davet Programı</h2>
          <p className="text-zinc-400 text-center mb-10">Affiliate olarak arkadaşlarınızı da platforma davet edin, onların kazançlarından %5 ek gelir elde edin.</p>
          <div className="grid sm:grid-cols-2 gap-6">
            <div className="bg-zinc-900 border border-white/10 rounded-2xl p-6">
              <UserPlus className="h-8 w-8 text-pink-500 mb-3" />
              <h3 className="font-bold mb-2">Arkadaşını Davet Et</h3>
              <p className="text-sm text-zinc-400">Kendi referans linkinizi paylaşarak diğer içerik üreticilerini Forilove affiliate programına davet edin.</p>
            </div>
            <div className="bg-zinc-900 border border-white/10 rounded-2xl p-6">
              <TrendingUp className="h-8 w-8 text-pink-500 mb-3" />
              <h3 className="font-bold mb-2">%5 Ek Kazanç</h3>
              <p className="text-sm text-zinc-400">Davet ettiğiniz affiliate her ödeme aldığında, ödeme tutarının %5&apos;i kadar ek kazanç elde edersiniz. Bu tutar platform tarafından karşılanır.</p>
            </div>
          </div>
          <div className="bg-zinc-900 border border-white/10 rounded-2xl p-6 mt-6">
            <h3 className="font-bold mb-3 text-center">Nasıl Çalışır?</h3>
            <div className="space-y-3 text-sm text-zinc-400">
              <div className="flex items-start gap-3">
                <span className="bg-pink-500/20 text-pink-400 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shrink-0">1</span>
                <p>Affiliate panelinizden referans linkinizi kopyalayın ve paylaşın.</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="bg-pink-500/20 text-pink-400 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shrink-0">2</span>
                <p>Davet ettiğiniz kişi affiliate başvurusu yapar ve onaylanır.</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="bg-pink-500/20 text-pink-400 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shrink-0">3</span>
                <p>Davet ettiğiniz affiliate her ödeme aldığında, ödeme tutarının %5&apos;i sizin bakiyenize eklenir.</p>
              </div>
            </div>
            <p className="text-xs text-zinc-500 mt-4 text-center">
              Örnek: Davet ettiğiniz affiliate 100 TRY satış yaptı ve %30 komisyon aldı (30 TRY). Siz 30 TRY&apos;nin %5&apos;i olan 1,50 TRY ek kazanç elde edersiniz. Bu tutar affiliate&apos;ın komisyonundan kesilmez, platform tarafından karşılanır.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t border-white/10 py-20">
        <div className="container mx-auto px-4 sm:px-6 max-w-3xl">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-10">Sıkça Sorulan Sorular</h2>
          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <div key={i} className="bg-zinc-900 border border-white/10 rounded-2xl p-6">
                <h3 className="font-bold mb-2">{faq.q}</h3>
                <p className="text-sm text-zinc-400">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-white/10 py-20">
        <div className="container mx-auto px-4 sm:px-6 max-w-2xl text-center">
          <h2 className="text-2xl sm:text-3xl font-bold mb-4">Hazır mısınız?</h2>
          <p className="text-zinc-400 mb-4">Affiliate programına katılın ve içeriklerinizden gelir elde etmeye başlayın.</p>
          <p className="text-sm text-zinc-500 mb-6">Başvuru için giriş yapmanız ve profilinizden başvurmanız gerekmektedir.</p>
          <Link href="/register" className="btn-primary px-8 py-3 text-lg">
            Şimdi Başvur
          </Link>
          <p className="text-xs text-zinc-500 mt-6">
            Aklınıza takılan sorular ve destek için: <a href="mailto:affiliate@forilove.com" className="text-pink-500 hover:text-pink-400">affiliate@forilove.com</a>
          </p>
          <p className="text-xs text-zinc-300 mt-1">Beklenmedik durumlarda e-posta adresiniz üzerinden iletişime geçilecektir.</p>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
