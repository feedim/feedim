import LegalPageLayout from "@/components/LegalPageLayout";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mesafeli Satış Sözleşmesi - Forilove",
  description: "Forilove mesafeli satış sözleşmesi. 6502 sayılı Tüketicinin Korunması Hakkında Kanun ve Mesafeli Sözleşmeler Yönetmeliği uyarınca düzenlenmiştir.",
  keywords: ["mesafeli satış sözleşmesi", "tüketici hakları", "dijital ürün satış"],
};

export default function DistanceSalesContractPage() {
  return (
    <LegalPageLayout title="Mesafeli Satış Sözleşmesi" maxWidth="4xl" lastUpdated="Şubat 2026">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ "@context": "https://schema.org", "@type": "WebPage", name: "Mesafeli Satış Sözleşmesi - Forilove", description: "6502 sayılı Kanun uyarınca düzenlenmiş mesafeli satış sözleşmesi.", url: "https://forilove.com/distance-sales-contract", isPartOf: { "@id": "https://forilove.com/#website" } }) }} />
      <div className="prose prose-invert max-w-none space-y-6 text-base leading-relaxed">

          {/* MADDE 1 */}
          <section className="bg-zinc-900 rounded-xl p-6">
            <h2 className="text-2xl font-bold mb-4 text-pink-500">MADDE 1: TARAFLAR</h2>

            <div className="space-y-4">
              <div>
                <h3 className="text-xl font-semibold mb-2 text-white">SATICI BİLGİLERİ:</h3>
                <div className="text-zinc-300 space-y-1">
                  <p><strong>İşletme Adı:</strong> Forilove</p>
                  <p><strong>Yetkili:</strong> Meral SÖZER</p>
                  <p><strong>Adres:</strong> Zafer Mah. 547.1. Sk. No:224 Salihli/Manisa</p>
                  <p><strong>Telefon:</strong> 0546 595 0130</p>
                  <p><strong>E-posta:</strong> contact@forilove.com</p>
                  <p><strong>Vergi Dairesi/No:</strong> Salihli Adil Oral / 7810676080</p>
                </div>
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-2 text-white">ALICI BİLGİLERİ:</h3>
                <p className="text-zinc-300">Sistemde kayıtlı kullanıcı bilgileri geçerlidir.</p>
              </div>
            </div>
          </section>

          {/* MADDE 2 */}
          <section className="bg-zinc-900 rounded-xl p-6">
            <h2 className="text-2xl font-bold mb-4 text-pink-500">MADDE 2: SÖZLEŞMENİN KONUSU</h2>
            <p className="text-zinc-300">
              İşbu sözleşmenin konusu, ALICI'nın SATICI'ya ait <strong>forilove.com</strong> internet
              sitesinden elektronik ortamda siparişini yaptığı, aşağıda nitelikleri ve satış fiyatı
              belirtilen dijital ürün/hizmetin satışı ve teslimi ile ilgili olarak <strong>6502 sayılı
              Tüketicinin Korunması Hakkında Kanun</strong> ve <strong>Mesafeli Sözleşmeler Yönetmeliği</strong>
              hükümleri gereğince tarafların hak ve yükümlülüklerinin saptanmasıdır.
            </p>
          </section>

          {/* MADDE 3 */}
          <section className="bg-zinc-900 rounded-xl p-6">
            <h2 className="text-2xl font-bold mb-4 text-pink-500">MADDE 3: ÜRÜN/HİZMET BİLGİLERİ</h2>
            <div className="text-zinc-300 space-y-2">
              <p><strong>Ürün/Hizmet:</strong> FL Coins (Dijital Para Birimi) ve Premium Şablonlar</p>
              <p><strong>Miktar:</strong> Kullanıcının seçtiği paket/şablon</p>
              <p><strong>Birim Fiyat:</strong> Paket/şablon bazında değişkenlik gösterir</p>
              <p><strong>Toplam Satış Bedeli:</strong> KDV Dahil (sipariş anında belirlenir)</p>
              <p><strong>Ödeme Şekli:</strong> Kredi Kartı / Banka Kartı (3D Secure güvenli ödeme)</p>
              <p><strong>Teslimat:</strong> Ödeme onayından sonra anında kullanıcı hesabına tanımlanır</p>
              <p><strong>KDV Oranı:</strong> %20</p>
            </div>
          </section>

          {/* MADDE 4 */}
          <section className="bg-zinc-900 rounded-xl p-6">
            <h2 className="text-2xl font-bold mb-4 text-pink-500">MADDE 4: CAYMA HAKKI</h2>
            <div className="text-zinc-300 space-y-3">
              <p>
                <strong>4.1.</strong> ALICI, dijital içerik niteliğindeki <strong>FL Coins'in</strong>
                hesabına tanımlanması ile cayma hakkını kaybeder (6502 sayılı Tüketicinin Korunması
                Hakkında Kanun, Madde 15/ı).
              </p>
              <p>
                <strong>4.2.</strong> <strong>İstisna:</strong> ALICI, FL Coins satın aldıktan sonra henüz
                hiçbir şablon satın almamışsa (coinlerini hiç kullanmamışsa), satın alma tarihinden itibaren
                <strong> 14 gün içinde</strong> tam iade talebinde bulunabilir. Bu durumda ödenen tutar
                ALICI&apos;nın kullandığı ödeme yöntemine iade edilir.
              </p>
              <p>
                <strong>4.3.</strong> Şablon satın alımlarında, şablon henüz yayınlanmamış veya
                kullanılmamışsa <strong>14 gün içinde</strong> cayma hakkı kullanılabilir.
              </p>
              <p>
                <strong>4.4.</strong> Cayma hakkının kullanımı için <strong>contact@forilove.com</strong>
                adresine e-posta ile bildirim yapılması yeterlidir.
              </p>
              <p>
                <strong>4.5.</strong> Cayma bildiriminde aşağıdaki bilgiler yer almalıdır:
              </p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Ad Soyad</li>
                <li>E-posta adresi</li>
                <li>Sipariş numarası</li>
                <li>Cayma gerekçesi (opsiyonel)</li>
              </ul>
              <p>
                <strong>4.6.</strong> Cayma hakkı kullanıldığında, ödenen tutar <strong>14 gün
                içinde</strong> ALICI&apos;nın kullandığı ödeme yöntemine iade edilir.
              </p>
            </div>
          </section>

          {/* MADDE 5 */}
          <section className="bg-zinc-900 rounded-xl p-6">
            <h2 className="text-2xl font-bold mb-4 text-pink-500">MADDE 5: ÖDEME VE TESLİMAT</h2>
            <div className="text-zinc-300 space-y-3">
              <p>
                <strong>5.1.</strong> Ödemeler <strong>SSL sertifikalı</strong> ve <strong>3D Secure
                korumalı</strong> güvenli ödeme sistemi (PayTR) üzerinden alınır.
              </p>
              <p>
                <strong>5.2.</strong> Dijital içerik niteliğindeki FL Coins, ödeme onayından sonra
                <strong> en geç 48 saat içinde</strong> ALICI hesabına tanımlanır.
              </p>
              <p>
                <strong>5.3.</strong> Premium şablon satın alımlarında, şablon anında kullanıma açılır.
              </p>
              <p>
                <strong>5.4.</strong> Ödeme işleminde herhangi bir sorun yaşanması durumunda ALICI
                derhal bilgilendirilir.
              </p>
            </div>
          </section>

          {/* MADDE 6 */}
          <section className="bg-zinc-900 rounded-xl p-6">
            <h2 className="text-2xl font-bold mb-4 text-pink-500">MADDE 6: TARAFLARIN HAK VE YÜKÜMLÜLÜKLERİ</h2>

            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-2 text-white">ALICI'nın Yükümlülükleri:</h3>
                <ul className="list-disc list-inside ml-4 space-y-1 text-zinc-300">
                  <li>Doğru ve güncel bilgi sağlamak</li>
                  <li>Kullanım koşullarına uymak</li>
                  <li>FL Coins'leri kendi kullanımı için satın almak</li>
                  <li>Oluşturulan içeriklerden sorumlu olmak</li>
                  <li>Üçüncü şahıs haklarını ihlal etmemek</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2 text-white">SATICI'nın Yükümlülükleri:</h3>
                <ul className="list-disc list-inside ml-4 space-y-1 text-zinc-300">
                  <li>Hizmeti kesintisiz sunmak için makul çaba göstermek</li>
                  <li>Kişisel verileri korumak (KVKK uyumlu)</li>
                  <li>Ödeme güvenliğini sağlamak</li>
                  <li>Müşteri destek hizmeti sunmak</li>
                </ul>
              </div>
            </div>
          </section>

          {/* MADDE 7 */}
          <section className="bg-zinc-900 rounded-xl p-6">
            <h2 className="text-2xl font-bold mb-4 text-pink-500">MADDE 7: UYUŞMAZLIK ÇÖZÜMÜ</h2>
            <div className="text-zinc-300 space-y-3">
              <p>
                <strong>7.1.</strong> İşbu sözleşmeden doğan uyuşmazlıklarda <strong>İstanbul
                Mahkemeleri ve İcra Daireleri</strong> yetkilidir.
              </p>
              <p>
                <strong>7.2.</strong> ALICI, <strong>Tüketici Hakem Heyetleri</strong> ve
                <strong> Tüketici Mahkemeleri</strong>'ne de başvurabilir.
              </p>
              <p>
                <strong>7.3.</strong> Parasal sınırlar:
              </p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>İlçe Tüketici Hakem Heyetleri: 2024 yılı için 82.910 TL'ye kadar</li>
                <li>İl Tüketici Hakem Heyetleri: 2024 yılı için 165.830 TL'ye kadar</li>
              </ul>
            </div>
          </section>

          {/* MADDE 8 */}
          <section className="bg-zinc-900 rounded-xl p-6">
            <h2 className="text-2xl font-bold mb-4 text-pink-500">MADDE 8: YÜRÜRLÜK</h2>
            <p className="text-zinc-300">
              ALICI, işbu Mesafeli Satış Sözleşmesi'nin tüm maddelerini okuduğunu, anladığını,
              içeriğini kabul ettiğini ve elektronik ortamda onay vererek sözleşmeyi
              imzalamış/akdetmiş sayılacağını beyan ve kabul eder.
            </p>
            <p className="text-zinc-300 mt-3">
              İşbu sözleşme, ALICI'nın siparişi onaylaması ile yürürlüğe girer.
            </p>
          </section>

          {/* UYARI */}
          <div className="bg-pink-500/10 border border-pink-500/30 rounded-xl p-6">
            <p className="text-zinc-300 text-sm">
              <strong>ÖNEMLİ:</strong> Bu sözleşme, 6502 sayılı Tüketicinin Korunması Hakkında Kanun ve Mesafeli Sözleşmeler
              Yönetmeliği (27.11.2014/29188) uyarınca düzenlenmiştir. Sözleşme, taraflar arasında
              akdedildiği tarihten itibaren <strong>3 (üç) yıl süreyle saklanacaktır</strong>.
            </p>
          </div>

          {/* Son Güncelleme */}
          <div className="text-center text-zinc-500 text-sm pt-8">
            <p>Son Güncelleme: Şubat 2026</p>
            <p className="mt-2">
              Bu sözleşme hakkında sorularınız için:{" "}
              <a href="mailto:contact@forilove.com" className="text-pink-500 hover:text-pink-400">
                contact@forilove.com
              </a>
            </p>
          </div>
        </div>
    </LegalPageLayout>
  );
}
