import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ödeme Güvenliği - Feedim",
  description: "Feedim ödeme güvenliği bilgileri. SSL şifreleme, 3D Secure doğrulama ve PCI-DSS uyumlu ödeme altyapısı.",
  keywords: ["ödeme güvenliği", "feedim güvenlik", "3D Secure", "SSL", "PCI-DSS"],
};

export default function PaymentSecurityPage() {
  return (
    <>
      <h1 className="text-2xl sm:text-3xl font-bold mb-3">Ödeme Güvenliği</h1>
      <p className="text-xs text-text-muted mb-10">Son güncelleme: 21 Şubat 2026</p>

      <div className="space-y-8 text-sm text-text-secondary leading-relaxed">
        <p>
          Feedim olarak ödeme güvenliğinizi en üst düzeyde tutmayı taahhüt ediyoruz. Tüm ödeme
          işlemleriniz endüstri standardı güvenlik protokolleri ile korunmaktadır.
        </p>

        <section>
          <h2 className="text-lg font-bold text-text-primary mb-3">SSL Şifreleme</h2>
          <p>
            Feedim platformundaki tüm veri iletişimi 256-bit SSL (Secure Socket Layer) şifrelemesi
            ile korunmaktadır. Ödeme sayfalarımızda paylaştığınız tüm bilgiler şifrelenerek iletilir
            ve üçüncü tarafların erişimine kapalıdır.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-text-primary mb-3">3D Secure Doğrulama</h2>
          <p>
            Tüm kredi kartı ve banka kartı ödemeleriniz 3D Secure (3 Boyutlu Güvenlik) teknolojisi
            ile korunmaktadır. Ödeme sırasında bankanız tarafından kimlik doğrulaması yapılır ve
            yalnızca onaylanan işlemler gerçekleştirilir.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-text-primary mb-3">Kart Bilgilerinizin Güvenliği</h2>
          <ul className="list-disc pl-5 space-y-2 mt-3 text-sm text-text-secondary">
            <li>Kredi kartı ve banka kartı bilgileriniz Feedim sunucularında <strong>saklanmaz</strong>.</li>
            <li>Kart bilgileriniz yalnızca ödeme anında şifrelenerek doğrudan ödeme sağlayıcısına (PayTR) iletilir.</li>
            <li>PayTR, PCI-DSS Level 1 sertifikasına sahip, uluslararası güvenlik standartlarına uyumlu bir ödeme altyapısıdır.</li>
            <li>İşlem sonrasında kart bilgileriniz hiçbir yerde tutulmaz.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-text-primary mb-3">Desteklenen Ödeme Yöntemleri</h2>
          <ul className="list-disc pl-5 space-y-2 mt-3 text-sm text-text-secondary">
            <li>Visa</li>
            <li>Mastercard</li>
            <li>American Express</li>
            <li>Troy</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-text-primary mb-3">İade İşlemleri</h2>
          <p>
            Ödeme ile ilgili iade talepleriniz, iade politikamız kapsamında değerlendirilir.
            Onaylanan iadeler, ödeme yaptığınız karta iade edilir. Detaylı bilgi için{" "}
            <a href="/help/refund-policy" className="text-accent-main hover:underline">İade ve İptal Politikamızı</a>{" "}
            inceleyebilirsiniz.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-text-primary mb-3">Destek</h2>
          <p>
            Ödeme ile ilgili herhangi bir sorun yaşamanız durumunda{" "}
            <strong>contact@feedim.com</strong> adresinden bize ulaşabilirsiniz. Ödeme sorunlarınız
            en kısa sürede çözüme kavuşturulacaktır.
          </p>
        </section>
      </div>
    </>
  );
}
