import Link from "next/link";
import LegalPageLayout from "@/components/LegalPageLayout";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "İade ve İptal Politikası - Forilove",
  description: "Forilove iade ve iptal politikası. FL Coins iadeleri, şablon iade koşulları ve para iadesi süreçleri hakkında bilgi.",
  keywords: ["iade politikası", "iptal koşulları", "para iadesi", "fl coins iade", "cayma hakkı"],
};

export default function RefundPolicyPage() {
  return (
    <LegalPageLayout title="İade ve İptal Politikası">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ "@context": "https://schema.org", "@type": "WebPage", name: "İade ve İptal Politikası - Forilove", description: "Forilove iade ve iptal politikası.", url: "https://forilove.com/refund-policy", isPartOf: { "@id": "https://forilove.com/#website" } }) }} />
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">FL Coins İadeleri</h2>
            <p>
              Satın alınan FL Coins kural olarak iade edilemez ve geri ödemesi yapılamaz. Coinler dijital bir
              para birimi olup, satın alındığı anda hesabınıza tanımlanır ve kullanıma hazır hale gelir.
            </p>
            <p className="mt-4">
              <strong className="text-white">İstisna:</strong> FL Coins satın aldıktan sonra henüz hiçbir
              şablon satın almadıysanız (coinlerinizi hiç kullanmadıysanız), satın alma tarihinden itibaren
              <strong className="text-white"> 14 gün içinde</strong> tam iade talebinde bulunabilirsiniz.
              Bu durumda ödenen tutar, ödeme yapılan kredi/banka kartına iade edilir.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Şablon Satın Alımları</h2>
            <p>
              FL Coins ile satın aldığınız şablonlardan memnun kalmazsanız, satın alma tarihinden
              itibaren 14 gün içerisinde iade talebinde bulunabilirsiniz. İade talebiniz onaylanırsa
              harcanan coinler hesabınıza iade edilir.
            </p>
            <p className="mt-4">
              <strong className="text-white">İade şartları:</strong>
            </p>
            <ul className="list-disc list-inside space-y-2 mt-2">
              <li>Şablon satın alımından sonra 14 gün geçmemiş olmalıdır</li>
              <li>Şablonu kullanarak bir sayfa yayınlamamış olmanız gerekmektedir</li>
              <li>İade talebi geçerli bir sebep içermelidir</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">İade Süreci</h2>
            <ol className="list-decimal list-inside space-y-2">
              <li>
                <Link href="/contact" className="text-pink-500 hover:text-pink-400">
                  İletişim
                </Link>{" "}
                sayfamızdan destek talebinde bulunun
              </li>
              <li>İade sebebinizi detaylı olarak açıklayın</li>
              <li>Destek ekibimiz talebinizi 2 iş günü içinde değerlendirir</li>
              <li>Onay durumunda coinler 1-3 iş günü içinde hesabınıza iade edilir</li>
            </ol>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Para İadesi</h2>
            <p>
              Hatalı ödeme veya teknik sorunlar nedeniyle coin satın alamadıysanız, ödemeniz
              5-10 iş günü içinde kartınıza/hesabınıza iade edilir. Bu durumda lütfen bankacılık
              işlem detaylarınızı içeren ekran görüntülerini bizimle paylaşın.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">İptal Hakkı</h2>
            <p>
              6502 sayılı Tüketicinin Korunması Hakkında Kanun kapsamında, dijital içerik
              niteliğindeki ürünler teslim edildiği andan itibaren cayma hakkı sona erer.
              Ancak yukarıda belirtilen şartlar dahilinde iade talebinde bulunabilirsiniz.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">İletişim</h2>
            <p>
              İade ve iptal ile ilgili sorularınız için{" "}
              <a href="mailto:contact@forilove.com" className="text-pink-500 hover:text-pink-400">
                contact@forilove.com
              </a>{" "}
              adresinden bize ulaşabilirsiniz.
            </p>
          </section>
    </LegalPageLayout>
  );
}
