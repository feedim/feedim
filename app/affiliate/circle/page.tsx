import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import PublicHeader from "@/components/PublicHeader";
import PublicFooter from "@/components/PublicFooter";
import AffiliateRefCapture from "../AffiliateRefCapture";
import { UserPlus, TrendingUp, Users, Gift } from "lucide-react";

export const metadata: Metadata = {
  title: "Satış Ortağı Çember Sistemi | Forilove",
  description: "Forilove Satış Ortağı Çember Sistemi ile arkadaşlarınızı davet edin, onların kazançlarından %5 ek gelir elde edin.",
  keywords: ["satış ortağı", "çember sistemi", "affiliate referral", "davet programı", "ek kazanç", "forilove"],
  openGraph: {
    title: "Satış Ortağı Çember Sistemi | Forilove",
    description: "Arkadaşlarınızı davet edin, onların kazançlarından %5 ek gelir elde edin.",
    type: "website",
  },
  robots: {
    index: true,
    follow: true,
  },
};

const steps = [
  {
    number: "1",
    title: "Referans Linkini Paylaş",
    description: "Affiliate panelinizden referans linkinizi kopyalayın ve diğer içerik üreticileriyle paylaşın.",
  },
  {
    number: "2",
    title: "Davetli Onaylanır",
    description: "Davet ettiğiniz kişi affiliate başvurusu yapar ve başvurusu onaylanır.",
  },
  {
    number: "3",
    title: "Ek Kazanç Elde Et",
    description: "Davet ettiğiniz affiliate her ödeme aldığında, ödeme tutarının %5'i sizin bakiyenize eklenir.",
  },
];

const faqs = [
  {
    q: "Çember Sistemi nedir?",
    a: "Çember Sistemi, mevcut affiliate'lerin yeni satış ortakları davet etmesini teşvik eden bir programdır. Davet ettiğiniz kişi affiliate olduğunda, onun kazançlarından %5 ek gelir elde edersiniz.",
  },
  {
    q: "Ek kazanç davet edilen kişinin komisyonundan mı kesiliyor?",
    a: "Hayır. %5 ek kazanç tamamen platform tarafından karşılanır. Davet ettiğiniz kişinin komisyon oranı hiçbir şekilde etkilenmez.",
  },
  {
    q: "Kaç kişiyi davet edebilirim?",
    a: "Davet sayısında bir sınır yoktur. Ne kadar çok kişi davet ederseniz, o kadar fazla ek kazanç elde edersiniz.",
  },
  {
    q: "Ek kazançlar ne zaman ödenir?",
    a: "Ek kazançlarınız mevcut bakiyenize eklenir ve normal ödeme döngüsüne tabidir. Minimum ödeme tutarı 100 TRY'dir.",
  },
];

export default function AffiliateCirclePage() {
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
            Satış Ortağı
            <span className="block text-pink-500 mt-3">Çember Sistemi</span>
          </h1>
          <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
            Arkadaşlarınızı davet edin, onların kazançlarından %5 ek gelir elde edin. Davet ettiğiniz her affiliate, kazanç çemberinizi büyütür.
          </p>
        </div>
      </section>

      {/* Nasıl Çalışır */}
      <section className="border-t border-white/10 py-20">
        <div className="container mx-auto px-4 sm:px-6 max-w-4xl">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-12">Nasıl Çalışır?</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((step) => (
              <div key={step.number} className="bg-zinc-900 border border-white/10 rounded-2xl p-6 text-center">
                <div className="w-14 h-14 rounded-full bg-pink-500/10 flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-pink-500">{step.number}</span>
                </div>
                <h3 className="text-lg font-bold mb-2">{step.title}</h3>
                <p className="text-sm text-zinc-400">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 2-Card Grid */}
      <section className="border-t border-white/10 py-20">
        <div className="container mx-auto px-4 sm:px-6 max-w-3xl">
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
        </div>
      </section>

      {/* Örnek Hesaplama */}
      <section className="border-t border-white/10 py-20">
        <div className="container mx-auto px-4 sm:px-6 max-w-2xl">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-8">Örnek Hesaplama</h2>
          <div className="bg-zinc-900 border border-white/10 rounded-2xl p-6">
            <div className="space-y-4 text-sm text-zinc-400">
              <div className="flex items-start gap-3">
                <Gift className="h-5 w-5 text-pink-500 shrink-0 mt-0.5" />
                <p>Davet ettiğiniz affiliate <span className="text-white font-semibold">100 TRY</span> satış yaptı ve <span className="text-white font-semibold">%30 komisyon</span> aldı (<span className="text-pink-500 font-semibold">30 TRY</span>).</p>
              </div>
              <div className="flex items-start gap-3">
                <Users className="h-5 w-5 text-pink-500 shrink-0 mt-0.5" />
                <p>Siz 30 TRY&apos;nin <span className="text-white font-semibold">%5</span>&apos;i olan <span className="text-pink-500 font-semibold">1,50 TRY</span> ek kazanç elde edersiniz.</p>
              </div>
            </div>
            <p className="text-xs text-zinc-500 mt-4 text-center border-t border-white/5 pt-4">
              Bu tutar affiliate&apos;ın komisyonundan kesilmez, tamamen platform tarafından karşılanır.
            </p>
          </div>
        </div>
      </section>

      {/* SSS */}
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
          <h2 className="text-2xl sm:text-3xl font-bold mb-4">Çemberi Büyütmeye Başlayın</h2>
          <p className="text-zinc-400 mb-6">Affiliate programına katılın ve davet sistemiyle ek kazanç elde etmeye başlayın.</p>
          <Link href="/dashboard/affiliate-apply" className="btn-primary px-8 py-3 text-lg">
            Şimdi Başvur
          </Link>
          <p className="text-xs text-zinc-500 mt-6">
            Aklınıza takılan sorular ve destek için: <a href="mailto:affiliate@forilove.com" className="text-pink-500 hover:text-pink-400">affiliate@forilove.com</a>
          </p>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
