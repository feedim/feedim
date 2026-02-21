import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Hakkımızda - Feedim",
  description: "Feedim hakkında bilgi edinin. Keşfet ve paylaş - içerik ve video platformu.",
  keywords: ["feedim hakkında", "içerik ve video platformu", "gönderi yazma", "video paylaşma"],
};

export default function AboutPage() {
  return (
    <>
      <h1 className="text-2xl sm:text-3xl font-bold mb-6">Hakkımızda</h1>
      <div className="space-y-6 text-sm text-text-secondary leading-relaxed">
        <p>Feedim, kullanıcıların gönderi ve video paylaşıp, premium okuyucular tarafından okunan içeriklerinden Jeton kazanabildiği bir içerik ve video platformudur.</p>
        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Misyonumuz</h2>
        <p>Kaliteli içerik üretimini teşvik etmek ve kullanıcıları emeklerinin karşılığı ile ödüllendirmek. Okuyuculara da en kaliteli içerikleri sunmak.</p>
        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Nasıl Çalışır?</h2>
        <p>İçeriklerini keşfet ve paylaş. Premium okuyucular gönderileri okuduğunda kullanıcılar Jeton kazanır. Jetonlar TL&apos;ye çevrilebilir.</p>
        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Bize Ulaşın</h2>
        <p>Sorularınız veya geri bildirimleriniz mi var?{" "}
          <Link href="/help/contact" className="text-accent-main hover:opacity-80 font-semibold">İletişim sayfamızı</Link>{" "}
          ziyaret ederek bizimle iletişime geçebilirsiniz.
        </p>
      </div>
    </>
  );
}
