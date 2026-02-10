import Link from "next/link";
import LegalPageLayout from "@/components/LegalPageLayout";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ödeme Güvenliği - Forilove",
  description: "Forilove ödeme güvenliği. 3D Secure, SSL şifreleme, PCI-DSS uyumlu altyapı ve desteklenen ödeme yöntemleri.",
  keywords: ["ödeme güvenliği", "3d secure", "ssl şifreleme", "güvenli ödeme", "pci-dss"],
};

export default function PaymentSecurityPage() {
  return (
    <LegalPageLayout title="Ödeme Güvenliği">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ "@context": "https://schema.org", "@type": "WebPage", name: "Ödeme Güvenliği - Forilove", description: "3D Secure, SSL ve PCI-DSS uyumlu güvenli ödeme altyapısı.", url: "https://forilove.com/payment-security", isPartOf: { "@id": "https://forilove.com/#website" } }) }} />
          <section>
            <p>
              Forilove olarak müşterilerimizin ödeme güvenliğini en üst düzeyde tutuyoruz.
              Tüm ödeme işlemleri SSL sertifikası ile şifrelenmiş ve PCI-DSS standartlarına
              uygun güvenli altyapı üzerinden gerçekleştirilmektedir.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">3D Secure Doğrulama</h2>
            <p>
              Tüm kredi kartı ödemelerimiz 3D Secure sistemi ile korunmaktadır. Bu sayede
              işlemleriniz ekstra bir güvenlik katmanı ile doğrulanır ve yetkisiz kullanımlara
              karşı korunursunuz.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Kart Bilgileriniz</h2>
            <ul className="list-disc list-inside space-y-2">
              <li>Kart bilgileriniz sistemimizde saklanmaz</li>
              <li>Her işlem anlık olarak şifrelenir</li>
              <li>Ödeme bilgileriniz sadece ödeme sağlayıcımız ile paylaşılır</li>
              <li>PCI-DSS Level 1 sertifikalı altyapı kullanılır</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Desteklenen Ödeme Yöntemleri</h2>
            <ul className="list-disc list-inside space-y-2">
              <li>Visa</li>
              <li>Mastercard</li>
              <li>American Express</li>
              <li>Troy</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">İade Politikası</h2>
            <p>
              Satın aldığınız FL Coins iade edilemez. Ancak şablon satın alımlarınızdan memnun
              kalmazsanız 14 gün içerisinde iade talebinde bulunabilirsiniz. Detaylı bilgi için{" "}
              <Link href="/refund-policy" className="text-pink-500 hover:text-pink-400">
                iade politikası
              </Link>{" "}
              sayfamızı inceleyebilirsiniz.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Destek</h2>
            <p>
              Ödeme ile ilgili herhangi bir sorun yaşarsanız veya sorularınız varsa{" "}
              <Link href="/contact" className="text-pink-500 hover:text-pink-400">
                iletişim
              </Link>{" "}
              sayfamızdan bize ulaşabilirsiniz.
            </p>
          </section>
    </LegalPageLayout>
  );
}
