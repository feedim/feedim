import LegalPageLayout from "@/components/LegalPageLayout";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sorumluluk Reddi - Forilove",
  description: "Forilove sorumluluk reddi beyanı. Platform kullanımı, içerik sorumluluğu ve yasal sınırlamalar hakkında bilgilendirme.",
  keywords: ["sorumluluk reddi", "yasal uyarı", "içerik sorumluluğu", "forilove disclaimer"],
};

export default function DisclaimerPage() {
  return (
    <LegalPageLayout title="Sorumluluk Reddi">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ "@context": "https://schema.org", "@type": "WebPage", name: "Sorumluluk Reddi - Forilove", description: "Forilove sorumluluk reddi beyanı.", url: "https://forilove.com/disclaimer", isPartOf: { "@id": "https://forilove.com/#website" } }) }} />
          <section className="bg-pink-500/10 border border-pink-500/30 rounded-2xl p-6">
            <h2 className="text-2xl font-bold text-pink-400 mb-4">Önemli Uyarı</h2>
            <p className="text-white leading-relaxed">
              Forilove platformu, kullanıcıların kişisel içerik oluşturmasına olanak tanıyan bir araçtır.
              Platform üzerinde oluşturulan tüm içerikler tamamen kullanıcıların sorumluluğundadır.
              Forilove, kullanıcılar tarafından oluşturulan içeriklerin yasal, ahlaki veya uygun
              olduğunu garanti etmez.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Kullanıcı İçerik Sorumluluğu</h2>
            <p className="mb-4">
              Platform kullanıcıları tarafından yüklenen, paylaşılan veya oluşturulan her türlü içerik
              (metin, görsel, video, ses, link vb.) tamamen o kullanıcının sorumluluğundadır. Forilove:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Kullanıcı içeriklerinin doğruluğunu, yasallığını veya uygunluğunu kontrol etmez</li>
              <li>Cinsel, müstehcen, şiddet içerikli veya yasa dışı içeriklerden sorumlu değildir</li>
              <li>Kişisel bilgi, özel fotoğraf veya hassas verilerin paylaşılmasından sorumlu değildir</li>
              <li>Telif hakkı ihlali, fikri mülkiyet ihlali veya üçüncü taraf haklarının çiğnenmesinden sorumlu değildir</li>
              <li>Kullanıcılar arası anlaşmazlıklar, tartışmalar veya yasal sorunlardan sorumlu değildir</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Yasaklanmış İçerik Türleri</h2>
            <p className="mb-4">
              Kullanıcılar aşağıdaki türde içerikleri platformda yayınlayamaz:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4 text-red-400">
              <li>Pornografik, müstehcen veya cinsel içerikli materyaller</li>
              <li>Nefret söylemi, ayrımcılık veya şiddeti teşvik eden içerikler</li>
              <li>Yasadışı faaliyetleri teşvik eden veya destekleyen içerikler</li>
              <li>Telif hakkı koruması altındaki materyallerin izinsiz kullanımı</li>
              <li>Başkalarının kişisel bilgilerini veya özel verilerini içeren materyaller</li>
              <li>Yanıltıcı, dolandırıcılık amaçlı veya zararlı içerikler</li>
              <li>Terör, şiddet veya suça teşvik eden içerikler</li>
              <li>Çocuk istismarı veya çocukları tehlikeye atan içerikler</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Platform Hakları</h2>
            <p className="mb-4">
              Forilove aşağıdaki haklara sahiptir:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Yasalara, kullanım koşullarına veya topluluk kurallarına aykırı içerikleri uyarı vermeksizin kaldırma</li>
              <li>Kural ihlalinde bulunan kullanıcı hesaplarını askıya alma veya kalıcı olarak kapatma</li>
              <li>Yasal makamların talebi üzerine kullanıcı bilgilerini paylaşma</li>
              <li>Platform içeriğini ve kurallarını istediği zaman değiştirme</li>
              <li>Şüpheli veya zararlı aktiviteleri bildirme ve yasal işlem başlatma</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Gizlilik ve Veri Güvenliği Uyarısı</h2>
            <p className="mb-4">
              Kullanıcılar, oluşturdukları sayfalarda aşağıdaki bilgileri paylaşmamalıdır:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4 text-yellow-400">
              <li>TC Kimlik Numarası, pasaport numarası gibi resmi kimlik bilgileri</li>
              <li>Kredi kartı, banka hesap numarası gibi finansal bilgiler</li>
              <li>Tam adres, telefon numarası gibi hassas kişisel veriler</li>
              <li>Şifreler, güvenlik soruları veya diğer giriş bilgileri</li>
              <li>Özel sağlık bilgileri veya tıbbi kayıtlar</li>
            </ul>
            <p className="mt-4 text-pink-400 font-semibold">
              Bu tür bilgilerin paylaşılması halinde ortaya çıkabilecek her türlü zarar,
              hırsızlık, dolandırıcılık veya hukuki sorundan tamamen kullanıcı sorumludur.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Üçüncü Taraf Bağlantıları</h2>
            <p>
              Platform üzerinde kullanıcılar tarafından paylaşılan dış bağlantılar (linkler)
              Forilove'in kontrolü dışındadır. Bu bağlantıların içeriği, güvenliği veya
              yasallığından Forilove sorumlu değildir. Kullanıcılar dış bağlantılara
              tıklarken dikkatli olmalı ve kendi sorumluluklarında hareket etmelidir.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Hizmet Kesintileri ve Garanti Reddi</h2>
            <p className="mb-4">
              Forilove hizmeti "olduğu gibi" sunulmaktadır:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Platform kesintisiz veya hatasız çalışacağına dair garanti vermez</li>
              <li>Veri kaybı, hizmet kesintisi veya teknik sorunlardan sorumlu değildir</li>
              <li>Kullanıcı içeriklerinin yedeklenmesinden kullanıcılar sorumludur</li>
              <li>Bakım, güncelleme veya acil durumlar nedeniyle hizmet geçici olarak durabilir</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Yasal Sorumluluk</h2>
            <p className="mb-4 leading-relaxed">
              Kullanıcılar, platform üzerinde yaptıkları her türlü eylemden dolayı yasal olarak
              sorumludur. Yasalara aykırı içerik paylaşılması halinde:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Forilove kullanıcı bilgilerini yasal makamlara bildirme hakkına sahiptir</li>
              <li>Kullanıcı cezai ve hukuki sorumluluğu kabul eder</li>
              <li>Platform, zarar gören üçüncü tarafların talebi üzerine bilgi paylaşabilir</li>
              <li>Türkiye Cumhuriyeti yasaları ve 5651 sayılı İnternet Ortamında Yapılan Yayınların Düzenlenmesi hakkındaki kanun geçerlidir</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">İçerik Raporlama</h2>
            <p className="mb-4">
              Uygunsuz, yasadışı veya zararlı içerik tespit ederseniz, lütfen bizi derhal bilgilendirin:
            </p>
            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
              <p className="font-semibold mb-2">İhlal Bildirimi:</p>
              <a href="mailto:contact@forilove.com" className="text-pink-500 hover:text-pink-400">
                contact@forilove.com
              </a>
              <p className="text-sm mt-2 text-zinc-500">
                Bildirimlerde lütfen içeriğin bulunduğu URL'yi ve ihlal türünü belirtin.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Değişiklik Hakkı</h2>
            <p>
              Forilove bu sorumluluk reddi beyanını herhangi bir zamanda değiştirme hakkını saklı tutar.
              Değişiklikler bu sayfada yayınlandığı anda yürürlüğe girer. Platformu kullanmaya devam
              etmeniz, değişiklikleri kabul ettiğiniz anlamına gelir.
            </p>
          </section>

          <section className="bg-white/5 rounded-2xl p-6 border border-white/10">
            <h2 className="text-2xl font-bold text-white mb-4">İletişim</h2>
            <p className="mb-4">
              Sorumluluk reddi ile ilgili sorularınız için:
            </p>
            <a href="mailto:contact@forilove.com" className="text-pink-500 hover:text-pink-400 font-semibold">
              contact@forilove.com
            </a>
          </section>
    </LegalPageLayout>
  );
}
