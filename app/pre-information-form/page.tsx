import LegalPageLayout from "@/components/LegalPageLayout";
import PrintButton from "@/components/PrintButton";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ön Bilgilendirme Formu - Forilove",
  description: "Mesafeli Sözleşmeler Yönetmeliği Madde 5 uyarınca hazırlanmış ön bilgilendirme formu. Ödeme işleminden önce mutlaka okunmalıdır.",
  keywords: ["ön bilgilendirme formu", "mesafeli sözleşme", "dijital ürün satışı"],
};

export default function PreInformationFormPage() {
  return (
    <LegalPageLayout title="Ön Bilgilendirme Formu" maxWidth="4xl" lastUpdated="Şubat 2026">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ "@context": "https://schema.org", "@type": "WebPage", name: "Ön Bilgilendirme Formu - Forilove", description: "Mesafeli Sözleşmeler Yönetmeliği uyarınca ön bilgilendirme formu.", url: "https://forilove.com/pre-information-form", isPartOf: { "@id": "https://forilove.com/#website" } }) }} />

        <div className="bg-pink-500/10 border border-pink-500/30 rounded-xl p-6 mb-8">
          <p className="text-gray-300 text-sm">
            <strong>Mesafeli Sözleşmeler Yönetmeliği</strong> (RG: 27.11.2014/29188) Madde 5 uyarınca
            düzenlenmiştir. Bu form, ödeme işleminden <strong>önce</strong> mutlaka okunmalı ve
            kabul edilmelidir.
          </p>
        </div>

        <div className="prose prose-invert max-w-none space-y-6 text-base leading-relaxed">

          {/* SATICI BİLGİLERİ */}
          <section className="bg-zinc-900 rounded-xl p-6">
            <h2 className="text-2xl font-bold mb-4 text-pink-500">1. SATICI BİLGİLERİ</h2>
            <div className="text-gray-300 space-y-2">
              <p><strong>İşletme Adı:</strong> Forilove</p>
              <p><strong>Yetkili:</strong> Meral SÖZER</p>
              <p><strong>Adres:</strong> Zafer Mah. 547.1. Sk. No:224 Salihli/Manisa</p>
              <p><strong>Telefon:</strong> 0546 595 0130</p>
              <p><strong>E-posta:</strong> contact@forilove.com</p>
              <p><strong>Vergi Dairesi/No:</strong> Salihli Adil Oral / 7810676080</p>
            </div>
          </section>

          {/* ÜRÜN/HİZMET BİLGİLERİ */}
          <section className="bg-zinc-900 rounded-xl p-6">
            <h2 className="text-2xl font-bold mb-4 text-pink-500">2. ÜRÜN/HİZMET BİLGİLERİ</h2>
            <div className="text-gray-300 space-y-3">
              <div>
                <h3 className="text-lg font-semibold mb-2 text-white">Ürün Türü:</h3>
                <p>Dijital İçerik (FL Coins - Dijital Para Birimi ve Premium Şablonlar)</p>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2 text-white">Temel Özellikler:</h3>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li><strong>FL Coins:</strong> Platform içinde kullanılabilen dijital para birimi</li>
                  <li><strong>Premium Şablonlar:</strong> Özelleştirilebilir web sayfası şablonları</li>
                  <li>Anında teslimat (dijital içerik)</li>
                  <li>Hesaba otomatik tanımlama</li>
                  <li>Süresiz kullanım hakkı</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2 text-white">Fiyat Bilgileri:</h3>
                <p className="mb-2">
                  <strong>Toplam Tutar:</strong> [Sepet tutarı - KDV Dahil]
                </p>
                <p className="mb-2">
                  <strong>KDV Oranı:</strong> %20
                </p>
                <p className="text-sm text-gray-400">
                  Not: Fiyat bilgileri sipariş sırasında sepet sayfasında gösterilir.
                </p>
              </div>
            </div>
          </section>

          {/* ÖDEME BİLGİLERİ */}
          <section className="bg-zinc-900 rounded-xl p-6">
            <h2 className="text-2xl font-bold mb-4 text-pink-500">3. ÖDEME VE TESLİMAT</h2>
            <div className="text-gray-300 space-y-3">
              <div>
                <h3 className="text-lg font-semibold mb-2 text-white">Ödeme Şekli:</h3>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li>Kredi Kartı (Visa, Mastercard, American Express)</li>
                  <li>Banka Kartı</li>
                  <li><strong>3D Secure</strong> güvenli ödeme</li>
                  <li><strong>SSL sertifikalı</strong> güvenli bağlantı</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2 text-white">Teslimat Şekli ve Süresi:</h3>
                <p>
                  <strong>Dijital teslimat:</strong> Ödeme onayından sonra <strong>0-48 saat</strong> içinde
                  FL Coins kullanıcı hesabına otomatik olarak tanımlanır.
                </p>
                <p className="text-sm text-gray-400 mt-2">
                  Not: Çoğu ödemede FL Coins anında hesaba yüklenir. Nadir durumlarda banka onay
                  süreçleri nedeniyle 48 saate kadar sürebilir.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2 text-white">Teslimat Masrafı:</h3>
                <p>
                  Dijital içerik olduğu için <strong>kargo/teslimat masrafı bulunmamaktadır</strong>.
                </p>
              </div>
            </div>
          </section>

          {/* CAYMA HAKKI */}
          <section className="bg-zinc-900 rounded-xl p-6">
            <h2 className="text-2xl font-bold mb-4 text-pink-500">4. CAYMA HAKKI</h2>
            <div className="text-gray-300 space-y-3">
              <div className="bg-pink-500/10 border border-pink-500/30 rounded-xl p-6">
                <p className="text-gray-300">
                  <strong>ÖNEMLİ:</strong> FL Coins dijital içerik niteliğinde olduğundan, hesabınıza
                  tanımlandıktan sonra cayma hakkınız sona erer (6502 sayılı
                  Tüketicinin Korunması Hakkında Kanun, Madde 15/ı).
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2 text-white">Cayma Hakkı Kullanılabilen Durumlar:</h3>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li>Premium şablon satın alındı ancak henüz <strong>yayınlanmadıysa</strong></li>
                  <li>Cayma süresi: Satın alımdan sonra <strong>14 gün</strong></li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2 text-white">Cayma Hakkı Nasıl Kullanılır?</h3>
                <p className="mb-2">
                  <strong>contact@forilove.com</strong> adresine e-posta göndererek cayma hakkınızı
                  kullanabilirsiniz.
                </p>
                <p className="text-sm text-gray-400">
                  E-postada belirtilmesi gerekenler: Ad-soyad, e-posta adresi, sipariş numarası
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2 text-white">Para İadesi:</h3>
                <p>
                  Cayma hakkı kullanıldığında, ödenen tutar <strong>en geç 14 gün içinde</strong>
                  ödeme yapılan kredi/banka kartına iade edilir.
                </p>
              </div>
            </div>
          </section>

          {/* ŞİKAYET VE İTİRAZ */}
          <section className="bg-zinc-900 rounded-xl p-6">
            <h2 className="text-2xl font-bold mb-4 text-pink-500">5. ŞİKAYET VE İTİRAZ</h2>
            <div className="text-gray-300 space-y-3">
              <p>
                Satın alınan ürün/hizmetle ilgili şikayet ve itirazlar için aşağıdaki
                mercilere başvurulabilir:
              </p>

              <div>
                <h3 className="text-lg font-semibold mb-2 text-white">Başvuru Mercileri:</h3>
                <ul className="list-disc list-inside ml-4 space-y-2">
                  <li><strong>İl/İlçe Tüketici Hakem Heyetleri</strong></li>
                  <li><strong>Tüketici Mahkemeleri</strong></li>
                  <li><strong>Ticaret Bakanlığı İl Müdürlükleri</strong></li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2 text-white">Parasal Sınırlar (2024):</h3>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li>İlçe Tüketici Hakem Heyeti: 82.910 TL'ye kadar</li>
                  <li>İl Tüketici Hakem Heyeti: 165.830 TL'ye kadar</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2 text-white">İletişim:</h3>
                <p><strong>E-posta:</strong> contact@forilove.com</p>
                <p><strong>Telefon:</strong> 0546 595 0130</p>
              </div>
            </div>
          </section>

          {/* KİŞİSEL VERİLER */}
          <section className="bg-zinc-900 rounded-xl p-6">
            <h2 className="text-2xl font-bold mb-4 text-pink-500">6. KİŞİSEL VERİLERİN KORUNMASI</h2>
            <div className="text-gray-300 space-y-3">
              <p>
                Kişisel verileriniz <strong>6698 sayılı KVKK</strong> (Kişisel Verilerin Korunması Kanunu)
                uyarınca işlenmekte ve korunmaktadır.
              </p>
              <p>
                Detaylı bilgi için{" "}
                <a href="/privacy" className="text-pink-500 hover:text-pink-400 underline">
                  Gizlilik Politikası
                </a>
                {" "}ve{" "}
                <a href="/kvkk" className="text-pink-500 hover:text-pink-400 underline">
                  KVKK Aydınlatma Metni
                </a>
                {" "}sayfalarını inceleyebilirsiniz.
              </p>
            </div>
          </section>

          {/* ONAY BEYANI */}
          <section className="bg-zinc-900 rounded-xl p-6">
            <h2 className="text-2xl font-bold mb-4 text-pink-500">7. ONAY BEYANI</h2>
            <div className="text-gray-300 space-y-3">
              <p>
                Ödeme işlemini tamamlayarak aşağıdaki hususları <strong>kabul etmiş sayılırsınız</strong>:
              </p>
              <ul className="list-disc list-inside ml-4 space-y-2">
                <li>Bu Ön Bilgilendirme Formu'nu okudum ve anladım</li>
                <li>Ürün/hizmet bilgilerini, fiyatı ve ödeme koşullarını öğrendim</li>
                <li>Dijital içerik teslim edildikten sonra cayma hakkımın sona ereceğini kabul ediyorum</li>
                <li>
                  <a href="/distance-sales-contract" className="text-pink-500 hover:text-pink-400 underline">
                    Mesafeli Satış Sözleşmesi
                  </a>
                  {" "}koşullarını kabul ediyorum
                </li>
                <li>
                  <a href="/terms" className="text-pink-500 hover:text-pink-400 underline">
                    Kullanım Koşulları
                  </a>
                  'nı kabul ediyorum
                </li>
              </ul>
            </div>
          </section>

          {/* İNDİRME BUTONU */}
          <div className="text-center pt-6">
            <PrintButton />
            <p className="text-gray-500 text-sm mt-3">
              Bu formu yazdırabilir veya PDF olarak kaydedebilirsiniz
            </p>
          </div>

          {/* Son Güncelleme */}
          <div className="text-center text-gray-500 text-sm pt-8 border-t border-white/10">
            <p>Son Güncelleme: Şubat 2026</p>
            <p className="mt-2">
              Sorularınız için:{" "}
              <a href="mailto:contact@forilove.com" className="text-pink-500 hover:text-pink-400">
                contact@forilove.com
              </a>
            </p>
          </div>
        </div>
    </LegalPageLayout>
  );
}
