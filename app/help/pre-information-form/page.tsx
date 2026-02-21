import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ön Bilgilendirme Formu - Feedim",
  description: "Feedim platformu ön bilgilendirme formu. Mesafeli satış öncesi tüketici bilgilendirmesi.",
  keywords: ["ön bilgilendirme formu", "feedim bilgilendirme", "tüketici hakları"],
};

export default function PreInformationFormPage() {
  return (
    <>
      <h1 className="text-2xl sm:text-3xl font-bold mb-3">Ön Bilgilendirme Formu</h1>
      <p className="text-xs text-text-muted mb-10">Son güncelleme: 21 Şubat 2026</p>

      <div className="space-y-8 text-sm text-text-secondary leading-relaxed">
        <p>
          İşbu ön bilgilendirme formu, 27.11.2014 tarihli ve 29188 sayılı Resmî Gazete&apos;de yayımlanan
          Mesafeli Sözleşmeler Yönetmeliği&apos;nin 5. maddesi uyarınca, sözleşme kurulmadan önce tüketicinin
          bilgilendirilmesi amacıyla düzenlenmiştir.
        </p>

        <section>
          <h2 className="text-lg font-bold text-text-primary mb-3">1. Satıcı Bilgileri</h2>
          <ul className="list-none pl-0 space-y-1 mt-2 text-sm text-text-secondary">
            <li><strong>Unvan:</strong> Feedim</li>
            <li><strong>Web Sitesi:</strong> feedim.com</li>
            <li><strong>E-posta:</strong> contact@feedim.com</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-text-primary mb-3">2. Ürün/Hizmet Bilgileri</h2>
          <p>Feedim platformunda sunulan dijital ürün ve hizmetler:</p>
          <ul className="list-disc pl-5 space-y-2 mt-3 text-sm text-text-secondary">
            <li>
              <strong>Jeton Paketleri:</strong> Platform içi dijital para birimi. İçerik üreticilerine
              hediye göndermek ve platform özelliklerinden yararlanmak için kullanılır.
            </li>
            <li>
              <strong>Premium Üyelik:</strong> Aylık veya yıllık abonelik planları. Reklamsız deneyim,
              onaylı rozet, gelişmiş analitik ve daha fazla özellik sunar. Basic, Pro, Max ve Business
              planları mevcuttur.
            </li>
          </ul>
          <p className="mt-3">Tüm fiyatlar KDV (%20) dahildir. Güncel fiyatlar satın alma sayfasında belirtilir.</p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-text-primary mb-3">3. Ödeme ve Teslimat</h2>
          <ul className="list-disc pl-5 space-y-2 mt-3 text-sm text-text-secondary">
            <li><strong>Desteklenen ödeme yöntemleri:</strong> Visa, Mastercard, American Express, Troy</li>
            <li><strong>Güvenlik:</strong> Tüm ödemeler SSL şifrelemesi ve 3D Secure doğrulaması ile korunur.</li>
            <li><strong>Ödeme altyapısı:</strong> PayTR (PCI-DSS uyumlu)</li>
            <li><strong>Teslimat süresi:</strong> Dijital ürünler anında, en geç 48 saat içinde hesaba tanımlanır.</li>
            <li><strong>Kargo ücreti:</strong> Dijital ürün olduğundan kargo ücreti yoktur.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-text-primary mb-3">4. Cayma Hakkı</h2>
          <p>
            6502 sayılı Tüketicinin Korunması Hakkında Kanun&apos;un 15/ğ maddesi uyarınca, dijital içerik
            ve hizmetlerin ifasına tüketicinin onayıyla başlanmasından sonra cayma hakkı kullanılamaz.
          </p>
          <ul className="list-disc pl-5 space-y-2 mt-3 text-sm text-text-secondary">
            <li>Satın alınan jetonlar veya premium üyelik henüz kullanılmamışsa, 14 gün içinde cayma hakkı kullanılabilir.</li>
            <li>Cayma hakkı kullanıldığında, ödeme en geç 14 iş günü içinde aynı ödeme yöntemine iade edilir.</li>
            <li>Cayma talebi contact@feedim.com adresine yazılı olarak iletilmelidir.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-text-primary mb-3">5. Şikayet ve İtiraz</h2>
          <p>
            Ürün ve hizmetlerle ilgili şikayetlerinizi aşağıdaki kanallar aracılığıyla iletebilirsiniz:
          </p>
          <ul className="list-disc pl-5 space-y-2 mt-3 text-sm text-text-secondary">
            <li>E-posta: contact@feedim.com</li>
            <li>Tüketici Hakem Heyetleri (Bakanlıkça belirlenen parasal sınırlar dahilinde)</li>
            <li>Tüketici Mahkemeleri</li>
            <li>Ticaret Bakanlığı il ve ilçe müdürlükleri</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-text-primary mb-3">6. Kişisel Verilerin Korunması</h2>
          <p>
            Kişisel verileriniz, 6698 sayılı Kişisel Verilerin Korunması Kanunu (KVKK) kapsamında
            işlenmektedir. Detaylı bilgi için{" "}
            <a href="/help/privacy" className="text-accent-main hover:underline">Gizlilik Politikamızı</a> ve{" "}
            <a href="/kvkk" className="text-accent-main hover:underline">KVKK Aydınlatma Metnimizi</a>{" "}
            inceleyebilirsiniz.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-text-primary mb-3">7. Onay Beyanı</h2>
          <p>
            Ödeme işlemini tamamlayarak; işbu ön bilgilendirme formunu, mesafeli satış sözleşmesini,
            kullanım koşullarını, cayma hakkı koşullarını ve gizlilik politikasını okuduğunuzu,
            anladığınızı ve kabul ettiğinizi beyan etmiş olursunuz.
          </p>
        </section>
      </div>
    </>
  );
}
