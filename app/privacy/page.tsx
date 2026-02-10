import Link from "next/link";
import LegalPageLayout from "@/components/LegalPageLayout";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Gizlilik Politikası - Forilove",
  description: "Forilove gizlilik politikası ve kişisel verilerin korunması. KVKK uyumlu veri işleme ve güvenlik politikalarımız.",
  keywords: ["gizlilik politikası", "kvkk", "kişisel verilerin korunması", "veri güvenliği"],
};

export default function PrivacyPage() {
  return (
    <LegalPageLayout title="Gizlilik Politikası">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ "@context": "https://schema.org", "@type": "WebPage", name: "Gizlilik Politikası - Forilove", description: "Forilove gizlilik politikası ve kişisel verilerin korunması.", url: "https://forilove.com/privacy", isPartOf: { "@id": "https://forilove.com/#website" } }) }} />
          <section>
            <p className="mb-4">
              Forilove olarak kişisel verilerinizin güvenliği ve gizliliği bizim için son derece önemlidir.
              Bu gizlilik politikası, 6698 sayılı Kişisel Verilerin Korunması Kanunu (KVKK) ve Avrupa Birliği
              Genel Veri Koruma Tüzüğü (GDPR) hükümlerine uygun olarak hazırlanmıştır.
            </p>
            <p>
              Lütfen daha fazla bilgi için{" "}
              <Link href="/disclaimer" className="text-pink-500 hover:text-pink-400">
                Sorumluluk Reddi
              </Link>{" "}
              sayfamızı inceleyin.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Veri Sorumlusu</h2>
            <p>
              KVKK kapsamında veri sorumlusu Forilove'dir. Kişisel verilerinizin işlenmesine ilişkin
              tüm kararlar tarafımızca alınmaktadır.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Toplanan Kişisel Veriler</h2>
            <p className="mb-3">
              Hizmetlerimizi sunabilmek için aşağıdaki kişisel verileri toplayabiliriz:
            </p>
            <ul className="list-disc list-inside space-y-2">
              <li>Kimlik bilgileri (ad, soyad)</li>
              <li>İletişim bilgileri (e-posta adresi, telefon numarası)</li>
              <li>Hesap bilgileri (kullanıcı adı, şifre)</li>
              <li>Yüklediğiniz içerikler (fotoğraflar, metinler, videolar)</li>
              <li>İşlem güvenliği bilgileri (IP adresi, çerez verileri)</li>
              <li>Ödeme bilgileri (kredi kartı bilgileri güvenli ödeme sağlayıcıları aracılığıyla işlenir)</li>
              <li>Müşteri hizmetleri ile iletişim kayıtları</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Kişisel Verilerin İşlenme Amaçları</h2>
            <p className="mb-3">Kişisel verileriniz aşağıdaki amaçlarla işlenmektedir:</p>
            <ul className="list-disc list-inside space-y-2">
              <li>Hizmetlerimizi sağlamak, sürdürmek ve geliştirmek</li>
              <li>Kullanıcı hesabınızı oluşturmak ve yönetmek</li>
              <li>Özelleştirilebilir sayfalarınızı oluşturmak ve yayınlamak</li>
              <li>Ödeme işlemlerini gerçekleştirmek ve fatura göndermek</li>
              <li>Teknik destek ve müşteri hizmetleri sunmak</li>
              <li>Yasal yükümlülüklerimizi yerine getirmek</li>
              <li>Platform güvenliğini sağlamak ve dolandırıcılığı önlemek</li>
              <li>İstatistiksel analiz ve hizmet iyileştirmeleri yapmak</li>
              <li>Sizinle iletişim kurmak ve bilgilendirme yapmak</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Kişisel Verilerin İşlenme Hukuki Sebepleri</h2>
            <p className="mb-3">Kişisel verileriniz KVKK'nın 5. ve 6. maddelerinde belirtilen aşağıdaki hukuki sebeplere dayanarak işlenmektedir:</p>
            <ul className="list-disc list-inside space-y-2">
              <li>Sözleşmenin kurulması ve ifası</li>
              <li>Yasal yükümlülüklerin yerine getirilmesi</li>
              <li>Açık rızanızın bulunması</li>
              <li>Meşru menfaatlerimizin gerektirmesi</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Kişisel Verilerin Aktarımı</h2>
            <p className="mb-3">
              Kişisel verileriniz, yukarıda belirtilen amaçların gerçekleştirilmesi doğrultusunda
              aşağıdaki taraflarla paylaşılabilir:
            </p>
            <ul className="list-disc list-inside space-y-2">
              <li>Ödeme hizmet sağlayıcıları (güvenli ödeme işlemleri için)</li>
              <li>Barındırma ve bulut hizmet sağlayıcıları</li>
              <li>Hukuki danışmanlar ve denetim kuruluşları</li>
              <li>Yasal zorunluluklar gereği resmi kurumlar</li>
            </ul>
            <p className="mt-3">
              Verilerinizin yurt dışına aktarılması durumunda KVKK'nın 9. maddesi uyarınca
              gerekli güvenlik önlemleri alınmaktadır.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Veri Güvenliği</h2>
            <p>
              Kişisel verilerinizin güvenliğini sağlamak için endüstri standardı güvenlik önlemleri
              kullanmaktayız. Bunlar arasında SSL/TLS şifreleme, güvenlik duvarları, düzenli güvenlik
              testleri ve erişim kontrolleri bulunmaktadır. Ancak, internet üzerinden yapılan hiçbir
              veri iletiminin %100 güvenli olduğunu garanti edemeyiz. Verilerinizi korumak için
              mümkün olan tüm teknik ve idari tedbirleri almaktayız.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Kişisel Verilerin Saklanma Süresi</h2>
            <p>
              Kişisel verileriniz, işleme amaçlarının gerektirdiği süre boyunca ve yasal saklama
              yükümlülüklerimiz çerçevesinde saklanmaktadır. Hesabınızı sildiğinizde veya verilerinizin
              silinmesini talep ettiğinizde, yasal zorunluluklar haricinde verileriniz sistemlerimizden
              kalıcı olarak silinir.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">KVKK Kapsamındaki Haklarınız</h2>
            <p className="mb-3">
              KVKK'nın 11. maddesi uyarınca, kişisel verilerinizle ilgili aşağıdaki haklara sahipsiniz:
            </p>
            <ul className="list-disc list-inside space-y-2">
              <li>Kişisel verilerinizin işlenip işlenmediğini öğrenme</li>
              <li>Kişisel verileriniz işlenmişse buna ilişkin bilgi talep etme</li>
              <li>Kişisel verilerinizin işlenme amacını ve bunların amacına uygun kullanılıp kullanılmadığını öğrenme</li>
              <li>Yurt içinde veya yurt dışında kişisel verilerinizin aktarıldığı üçüncü kişileri bilme</li>
              <li>Kişisel verilerinizin eksik veya yanlış işlenmiş olması halinde bunların düzeltilmesini isteme</li>
              <li>KVKK'nın 7. maddesinde öngörülen şartlar çerçevesinde kişisel verilerinizin silinmesini veya yok edilmesini isteme</li>
              <li>Düzeltme, silme ve yok edilme işlemlerinin kişisel verilerin aktarıldığı üçüncü kişilere bildirilmesini isteme</li>
              <li>İşlenen verilerin münhasıran otomatik sistemler vasıtasıyla analiz edilmesi suretiyle aleyhinize bir sonucun ortaya çıkmasına itiraz etme</li>
              <li>Kişisel verilerinizin kanuna aykırı olarak işlenmesi sebebiyle zarara uğramanız halinde zararın giderilmesini talep etme</li>
            </ul>
            <p className="mt-3">
              Bu haklarınızı kullanmak için hesap ayarlarınızdan işlem yapabilir veya
              contact@forilove.com adresinden bizimle iletişime geçebilirsiniz.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Çerezler (Cookies)</h2>
            <p>
              Web sitemiz, kullanıcı deneyimini iyileştirmek ve site performansını analiz etmek için
              çerezler kullanmaktadır. Çerez tercihlerinizi ayarlayabilir veya çerezleri tamamen
              devre dışı bırakabilirsiniz. Ancak bu durumda bazı özellikler düzgün çalışmayabilir.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Çocukların Gizliliği</h2>
            <p>
              Hizmetlerimiz 18 yaşın altındaki kişilere yönelik değildir. 18 yaşın altındaki
              kullanıcılardan bilerek kişisel veri toplamıyoruz. Ebeveyn veya vasi iseniz ve
              çocuğunuzun bize kişisel veri sağladığını fark ederseniz, lütfen bizimle iletişime geçin.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Gizlilik Politikası Güncellemeleri</h2>
            <p>
              Bu gizlilik politikasını zaman zaman güncelleyebiliriz. Önemli değişiklikler olması
              durumunda sizi e-posta yoluyla veya platformumuz üzerinden bilgilendireceğiz.
              Politikayı düzenli olarak gözden geçirmenizi öneririz.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">İletişim</h2>
            <p>
              Gizlilik politikamız veya kişisel verilerinizin işlenmesi hakkında sorularınız varsa,
              lütfen bizimle iletişime geçin:
            </p>
            <p className="mt-3">
              E-posta:{" "}
              <a href="mailto:contact@forilove.com" className="text-pink-500 hover:text-pink-400">
                contact@forilove.com
              </a>
            </p>
            <p className="mt-2 text-sm">
              Ayrıca, KVKK kapsamındaki haklarınızın ihlal edildiğini düşünüyorsanız,
              Kişisel Verileri Koruma Kurumu'na başvurabilirsiniz.
            </p>
          </section>
    </LegalPageLayout>
  );
}
