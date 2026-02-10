import Link from "next/link";
import LegalPageLayout from "@/components/LegalPageLayout";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Yardım Merkezi - Forilove",
  description: "Forilove platformu hakkında sık sorulan sorular ve yardım rehberi.",
  keywords: ["yardım", "sss", "destek", "forilove yardım merkezi"],
};

export default function HelpPage() {
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    name: "Yardım Merkezi - Forilove",
    url: "https://forilove.com/help",
    mainEntity: [
      { "@type": "Question", name: "Forilove nedir?", acceptedAnswer: { "@type": "Answer", text: "Forilove, sevdiklerinize özel kişiselleştirilmiş aşk sayfaları oluşturmanızı sağlayan bir platformdur." } },
      { "@type": "Question", name: "FL Coins nedir?", acceptedAnswer: { "@type": "Answer", text: "Premium şablonları satın almak için kullanılan dijital para birimidir." } },
      { "@type": "Question", name: "Şablonu satın aldıktan sonra ne olur?", acceptedAnswer: { "@type": "Answer", text: "Şablon kalıcı olarak sizindir. İstediğiniz kadar düzenleyebilir ve yeniden yayımlayabilirsiniz." } },
      { "@type": "Question", name: "Müzik nasıl eklenir?", acceptedAnswer: { "@type": "Answer", text: "Editörde Müzik Ekle butonuna tıklayarak bir YouTube linki yapıştırın. Müzik sayfanızda arka planda çalacaktır." } },
      { "@type": "Question", name: "Sayfam herkese açık mı?", acceptedAnswer: { "@type": "Answer", text: "Yayımlarken Herkese Açık veya Özel URL seçeneğini belirleyebilirsiniz. Özel URL seçerseniz sadece linke sahip olanlar görebilir." } },
    ],
  };

  return (
    <LegalPageLayout title="Yardım Merkezi" lastUpdated="10 Şubat 2026" maxWidth="4xl">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <section>
        <h2 className="text-2xl font-bold text-white mb-4">Forilove Nedir?</h2>
        <p>
          Forilove, sevdiklerinize özel kişiselleştirilmiş aşk sayfaları oluşturmanızı
          sağlayan bir platformdur. Premium şablonlar arasından seçim yaparak fotoğraf,
          metin ve müzik ekleyebilir, ardından oluşturduğunuz sayfayı bir link ile
          paylaşabilirsiniz.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-bold text-white mb-4">Nasıl Başlarım?</h2>
        <ol className="list-decimal list-inside space-y-2">
          <li>Ücretsiz bir hesap oluşturun veya giriş yapın</li>
          <li>Ana sayfadan beğendiğiniz bir şablonu seçin</li>
          <li>Şablonu FL Coins ile satın alın</li>
          <li>Editörde fotoğraf, metin ve müzik ekleyerek kişiselleştirin</li>
          <li>Sayfanızı yayımlayın ve linki sevdiklerinizle paylaşın</li>
        </ol>
      </section>

      <section>
        <h2 className="text-2xl font-bold text-white mb-4">FL Coins</h2>
        <ul className="list-disc list-inside space-y-2">
          <li>
            <strong className="text-white">FL Coins nedir?</strong> — Premium şablonları
            satın almak için kullanılan dijital para birimidir.{" "}
            <Link href="/fl-coins" className="text-pink-500 hover:text-pink-400">
              Detaylı bilgi
            </Link>
          </li>
          <li>
            <strong className="text-white">Nasıl satın alırım?</strong> — Profil
            menüsünden veya{" "}
            <Link href="/dashboard/coins" className="text-pink-500 hover:text-pink-400">
              Bakiye Al
            </Link>{" "}
            sayfasından kredi kartı ile satın alabilirsiniz.
          </li>
          <li>
            <strong className="text-white">Bonus coin nedir?</strong> — Büyük paketlerde
            ekstra coin kazanırsınız. Bonus coinler normal coinler gibi kullanılır.
          </li>
        </ul>
      </section>

      <section>
        <h2 className="text-2xl font-bold text-white mb-4">Şablonlar ve Editör</h2>
        <ul className="list-disc list-inside space-y-2">
          <li>
            <strong className="text-white">Şablonu satın aldıktan sonra ne olur?</strong>{" "}
            — Şablon kalıcı olarak sizindir. İstediğiniz kadar düzenleyebilir ve
            yeniden yayımlayabilirsiniz.
          </li>
          <li>
            <strong className="text-white">Müzik nasıl eklenir?</strong> — Editörde
            &quot;Müzik Ekle&quot; butonuna tıklayarak bir YouTube linki yapıştırın.
            Müzik sayfanızda arka planda çalacaktır.
          </li>
          <li>
            <strong className="text-white">Sayfamı düzenleyebilir miyim?</strong> — Evet,
            yayımladıktan sonra da editörden düzenleyip &quot;Güncelle&quot; butonuyla
            değişikliklerinizi kaydedebilirsiniz.
          </li>
          <li>
            <strong className="text-white">Sayfam herkese açık mı?</strong> — Yayımlarken
            &quot;Herkese Açık&quot; veya &quot;Özel URL&quot; seçeneğini belirleyebilirsiniz.
            Özel URL seçerseniz sadece linke sahip olanlar görebilir.
          </li>
        </ul>
      </section>

      <section>
        <h2 className="text-2xl font-bold text-white mb-4">Ödeme ve Güvenlik</h2>
        <ul className="list-disc list-inside space-y-2">
          <li>
            Tüm ödemeler 3D Secure ve SSL ile korunmaktadır.{" "}
            <Link href="/payment-security" className="text-pink-500 hover:text-pink-400">
              Ödeme güvenliği
            </Link>
          </li>
          <li>Kart bilgileriniz sistemimizde saklanmaz.</li>
          <li>
            İade politikamız hakkında bilgi almak için{" "}
            <Link href="/refund-policy" className="text-pink-500 hover:text-pink-400">
              iade politikası
            </Link>{" "}
            sayfamızı inceleyin.
          </li>
        </ul>
      </section>

      <section>
        <h2 className="text-2xl font-bold text-white mb-4">Hesap</h2>
        <ul className="list-disc list-inside space-y-2">
          <li>
            <strong className="text-white">Şifremi unuttum.</strong> — Giriş sayfasındaki
            &quot;Şifremi Unuttum&quot; bağlantısını kullanarak şifrenizi sıfırlayabilirsiniz.
          </li>
          <li>
            <strong className="text-white">Profil bilgilerimi nasıl değiştiririm?</strong>{" "}
            — Profil sayfanızdaki düzenle butonuna tıklayarak isim ve diğer bilgilerinizi
            güncelleyebilirsiniz.
          </li>
        </ul>
      </section>

      <section>
        <h2 className="text-2xl font-bold text-white mb-4">Hâlâ Yardıma mı İhtiyacınız Var?</h2>
        <p>
          Aradığınız cevabı bulamadıysanız{" "}
          <Link href="/contact" className="text-pink-500 hover:text-pink-400">
            iletişim
          </Link>{" "}
          sayfamızdan bize ulaşabilirsiniz. Destek ekibimiz iş günlerinde 24 saat
          içinde yanıt verir.
        </p>
      </section>
    </LegalPageLayout>
  );
}
