import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Feedim AI - Feedim",
  description: "Feedim AI destekli içerik moderasyonu, güvenlik sistemi, SEO üretimi ve telif hakkı taraması hakkında bilgi.",
  keywords: ["feedim ai", "yapay zeka moderasyon", "ai içerik analizi", "ai görsel analizi", "ai seo", "içerik güvenliği"],
};

export default function AIPage() {
  return (
    <>
      <h1 className="text-2xl sm:text-3xl font-bold mb-6">AI</h1>
      <div className="space-y-6 text-sm text-text-secondary leading-relaxed">
        <p>
          Feedim AI, platformdaki içeriklerin güvenliğini ve kalitesini artırmak için tasarlanmış yapay zeka destekli bir sistemdir.
          AI, içerik moderasyonundan SEO üretimine, telif hakkı taramasından profil puanı hesaplamaya kadar birçok alanda kullanılır.
        </p>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">AI Metin Analizi</h2>
        <p>
          Her gönderi, moment veya yorum yayınlanırken metin içeriği AI tarafından otomatik olarak taranır.
          Sistem, içeriği çeşitli kategorilerde analiz eder ve topluluk kurallarına aykırı içerikleri tespit eder.
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Nefret söylemi</strong> &mdash; Irk, din, cinsiyet veya etnik kökene yönelik nefret içeren ifadeler</li>
          <li><strong>Küfür ve hakaret</strong> &mdash; Argo, küfür ve kişisel saldırı içeren dil</li>
          <li><strong>Cinsel içerik</strong> &mdash; Yetişkinlere yönelik veya müstehcen ifadeler</li>
          <li><strong>Spam</strong> &mdash; Tekrarlayan, anlamsız veya tanıtım amaçlı içerikler</li>
          <li><strong>Yanıltıcı bilgi</strong> &mdash; Kasıtlı olarak yanlış veya dezenformasyon niteliğinde içerikler</li>
        </ul>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">AI Görsel Analizi</h2>
        <p>
          Gönderilere eklenen görseller yayınlanmadan önce AI tarafından otomatik olarak taranır.
          Görsel analizi aşağıdaki kategorilerde uygunsuz içerikleri tespit eder:
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Cinsel içerik</strong> &mdash; Müstehcen veya yetişkinlere yönelik görseller</li>
          <li><strong>Şiddet</strong> &mdash; Kan, yaralanma veya fiziksel şiddet içeren görseller</li>
          <li><strong>Uygunsuz görsel</strong> &mdash; Topluluk kurallarına aykırı diğer görsel içerikler</li>
        </ul>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">AI SEO Üretimi</h2>
        <p>
          Feedim AI, yayınlanan her gönderi için otomatik olarak SEO meta verileri oluşturur. Bu sayede içerikleriniz
          arama motorlarında daha iyi sıralanır ve daha fazla kişiye ulaşır.
        </p>
        <div className="bg-bg-secondary rounded-xl p-4 space-y-3">
          <div className="flex items-start gap-3">
            <span className="text-accent-main font-bold text-xs mt-0.5 shrink-0">Başlık</span>
            <p className="text-text-muted text-xs">İçeriğinize uygun SEO başlığı AI tarafından otomatik oluşturulur</p>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-accent-main font-bold text-xs mt-0.5 shrink-0">Açıklama</span>
            <p className="text-text-muted text-xs">Meta description AI tarafından içerikten özetlenerek üretilir</p>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-accent-main font-bold text-xs mt-0.5 shrink-0">Anahtar Kelimeler</span>
            <p className="text-text-muted text-xs">İçeriğe uygun anahtar kelimeler AI tarafından belirlenir</p>
          </div>
        </div>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">AI Telif Hakkı Taraması</h2>
        <p>
          Feedim AI, telif hakkı koruması açık olan içeriklerde metin, görsel ve video benzerlik taraması gerçekleştirir.
          Kopya içerik tespit edildiğinde içerik moderasyona alınabilir. Detaylar için{" "}
          <Link href="/help/copyright" className="text-accent-main hover:opacity-80 font-semibold">Telif Hakkı Koruması</Link> sayfasını inceleyebilirsiniz.
        </p>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">AI Profil Puanı Hesaplama</h2>
        <p>
          Her kullanıcının güvenilirlik puanı AI tarafından otomatik olarak hesaplanır. Profil puanı; içerik kalitesi,
          topluluk etkileşimi, hesap yaşı ve moderasyon geçmişi gibi birçok faktöre göre belirlenir.
        </p>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">AI Onboarding Kontrolü</h2>
        <p>
          Yeni kullanıcılar kayıt olurken seçtikleri kullanıcı adı ve yazdıkları biyografi AI tarafından kontrol edilir.
          Uygunsuz, küfür içeren veya yanıltıcı kullanıcı adları ve biyografiler tespit edildiğinde hesap moderasyona alınır.
          Bu sayede platform en başından itibaren güvenli bir ortam sunar.
        </p>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Fail-Open Tasarım</h2>
        <div className="bg-bg-secondary rounded-xl p-4">
          <p>
            Feedim AI, <strong className="text-text-primary">fail-open</strong> prensibi ile çalışır. Bu, AI sisteminde herhangi bir
            teknik hata veya gecikme yaşandığında içeriklerin engellenmeyeceği anlamına gelir. Kullanıcı deneyimi her zaman
            önceliklidir; AI&apos;da oluşabilecek bir sorun, içerik yayınlama sürecini aksatmaz.
          </p>
        </div>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">AI ve İnsan Moderasyonu</h2>
        <p>
          Feedim AI, insan moderasyonunun yerine geçmez; onu destekler ve güçlendirir. AI tarafından tespit edilen içerikler
          moderasyon ekibine iletilir ve nihai kararlar insan moderatörler tarafından verilir. AI, moderatörlerin iş yükünü
          azaltarak daha hızlı ve tutarlı bir moderasyon süreci sağlar.
        </p>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Gizlilik ve Veri Güvenliği</h2>
        <p>
          Feedim AI tarafından analiz edilen içerikler ve veriler yalnızca platform içi moderasyon ve güvenlik amacıyla
          kullanılır. AI süreçlerinde elde edilen veriler üçüncü taraflarla paylaşılmaz, satılmaz veya reklam amacıyla
          kullanılmaz. Tüm AI analizleri Feedim altyapısı dahilinde gerçekleştirilir.
        </p>

        <div className="bg-bg-secondary rounded-xl p-5 mt-8">
          <p className="text-xs text-text-muted">
            Feedim AI hakkında sorularınız için{" "}
            <Link href="/help/contact" className="text-accent-main hover:opacity-80 font-semibold">İletişim</Link> sayfamızdan
            veya <a href="mailto:support@feedim.com" className="text-accent-main hover:opacity-80 font-semibold">support@feedim.com</a> adresinden
            bize ulaşabilirsiniz.
          </p>
        </div>
      </div>
    </>
  );
}
