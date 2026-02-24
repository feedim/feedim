import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Telif Hakkı Koruması - Feedim",
  description: "Feedim telif hakkı koruma sistemi, kopya içerik politikası ve telif hakkı şikayeti süreci hakkında bilgi.",
  keywords: ["feedim telif hakkı", "copyright", "kopya içerik", "telif koruması", "içerik koruması"],
};

export default function CopyrightPage() {
  return (
    <>
      <h1 className="text-2xl sm:text-3xl font-bold mb-6">Telif Hakkı Koruması</h1>
      <div className="space-y-6 text-sm text-text-secondary leading-relaxed">
        <p>
          Feedim, içerik üreticilerinin emeklerini korumak için gelişmiş bir telif hakkı koruma sistemi sunar.
          Bu sistem, içeriklerin izinsiz kopyalanmasını engellemek ve özgün üretimi teşvik etmek amacıyla tasarlanmıştır.
        </p>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Telif Hakkı Koruması Nasıl Çalışır?</h2>
        <p>
          Gönderi, video veya moment oluştururken ayarlar bölümündeki <strong>&ldquo;Telif hakkı koruması&rdquo;</strong> özelliğini aktifleştirerek içeriğinizi koruma altına alabilirsiniz.
          Koruma aktifleştirildiğinde içeriğiniz metin, görsel ve video bazında tam kapsamlı olarak taranır.
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li>Metin içeriğiniz, kelime düzeyinde benzerlik analizi (Jaccard Similarity) ile karşılaştırılır</li>
          <li>Görselleriniz, algısal hash (dHash) teknolojisi ile korunur</li>
          <li>Video içerikleriniz, URL ve süre karşılaştırması ile kontrol edilir</li>
          <li>Sistem, yeni paylaşılan her içeriği korumalı içeriklerinizle otomatik olarak karşılaştırır</li>
        </ul>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Telif Hakkı Koruması Nasıl Etkinleşir?</h2>
        <p>
          Telif hakkı koruması, düzgün ve özgün içerik üreten hesaplarda sistem tarafından otomatik olarak etkinleşir.
          Aşağıdaki koşulları sağlayan hesaplar otomatik olarak telif hakkı koruması kazanır:
        </p>
        <ul className="list-disc pl-5 space-y-2 mt-3">
          <li>E-posta adresinizi doğrulayın</li>
          <li>En az 7 gündür platformda içerik üreticisi olun</li>
          <li>En az 3 gönderi yayınlayın</li>
          <li>Spam yapmayın, topluluk kurallarına uyun</li>
          <li>Telif ihlali yapmayın, kopya içerik paylaşmayın</li>
          <li>Özgün ve düzgün içerikler üretin</li>
        </ul>
        <p className="mt-3">
          Koşullar sağlandıktan sonra sistem bir sonraki değerlendirmede telif hakkı korumanızı otomatik olarak aktif eder.
          Bir kez etkinleştikten sonra aktif kalır. Destek için <a href="/help/contact" className="text-accent-main hover:opacity-80 font-semibold">iletişime geçebilirsiniz</a>.
        </p>
        <p className="mt-3">
          Şirketler ve kurumsal hesaplar ise{" "}
          <Link href="/settings/copyright" className="text-accent-main hover:opacity-80 font-semibold">başvuru formu</Link> ile
          beklemeden doğrudan telif hakkı koruması talep edebilir.
        </p>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Kopya İçerik Tespiti</h2>
        <p>
          Telif hakkı koruması açılmamış olsa bile, Feedim tüm içeriklerde <strong>metin bazlı kopya içerik taraması</strong> yapar.
          %90 ve üzeri metin benzerliği tespit edildiğinde içerik &ldquo;Kopya İçerik&rdquo; olarak işaretlenir ve moderasyona alınır.
          Bu sistem her zaman aktiftir ve kapatılamaz.
        </p>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Telif Hakkı Strike Sistemi</h2>
        <p>
          Her telif hakkı veya kopya içerik ihlalinde hesabınıza bir &ldquo;strike&rdquo; eklenir.
          Strike sayınız arttıkça profil puanınız düşer ve hesabınıza kademeli yaptırımlar uygulanır.
          Belirli bir strike sayısına ulaşıldığında hesabınız kalıcı olarak askıya alınabilir.
        </p>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Telif Hakkı Şikayeti Nasıl Açılır?</h2>
        <p>
          İçeriğinizin izinsiz kopyalandığını düşünüyorsanız, ilgili içeriğin menüsünden <strong>&ldquo;Şikayet Et&rdquo;</strong> seçeneğini
          kullanarak telif hakkı şikayeti açabilirsiniz. Şikayet açarken:
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Orijinal içerik URL&apos;si</strong> &mdash; Sizin orijinal içeriğinizin bağlantısı (zorunlu)</li>
          <li><strong>Kopya içerik URL&apos;si</strong> &mdash; Kopyalandığını düşündüğünüz içeriğin bağlantısı (zorunlu)</li>
          <li><strong>Açıklama</strong> &mdash; İhlali detaylandıran açıklama (isteğe bağlı)</li>
        </ul>
        <p className="mt-3">
          Şikayetiniz moderasyon ekibimiz tarafından incelenir. Asıl içerik sahibi olduğunuzu kanıtlamanız gerekebilir.
          Haksız şikayetler hesabınızın güvenilirlik puanını olumsuz etkileyebilir.
        </p>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Bildirimler</h2>
        <p>
          Telif hakkı korumalı içeriğinize benzer bir gönderi tespit edildiğinde otomatik bildirim alırsınız.
          Bildirimde eşleşme yüzdesi ve yapılan işlem (moderasyon veya rozet) belirtilir.
        </p>

        <div className="bg-bg-secondary rounded-xl p-5 mt-8">
          <p className="text-xs text-text-muted">
            Telif hakkı koruması ile ilgili sorularınız için{" "}
            <Link href="/help/contact" className="text-accent-main hover:opacity-80 font-semibold">İletişim</Link> sayfamızdan
            veya <a href="mailto:support@feedim.com" className="text-accent-main hover:opacity-80 font-semibold">support@feedim.com</a> adresinden
            bize ulaşabilirsiniz.
          </p>
        </div>
      </div>
    </>
  );
}
