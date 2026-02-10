import LegalPageLayout from "@/components/LegalPageLayout";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Kullanım Koşulları - Forilove",
  description: "Forilove kullanım koşulları ve hizmet şartları. Platform kullanımı, üyelik, ödeme ve fikri mülkiyet hakları hakkında detaylı bilgi.",
  keywords: ["kullanım koşulları", "hizmet şartları", "forilove kuralları", "üyelik koşulları"],
};

export default function TermsPage() {
  return (
    <LegalPageLayout title="Kullanım Koşulları">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ "@context": "https://schema.org", "@type": "WebPage", name: "Kullanım Koşulları - Forilove", description: "Forilove kullanım koşulları ve hizmet şartları.", url: "https://forilove.com/terms", isPartOf: { "@id": "https://forilove.com/#website" } }) }} />
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">1. Koşulların Kabulü</h2>
            <p>
              Forilove platformuna erişerek ve kullanarak, bu sözleşmenin tüm şartlarını kabul
              etmiş sayılırsınız. Bu koşulları kabul etmiyorsanız, lütfen hizmetimizi kullanmayınız.
              Platformu kullanmaya devam etmeniz, tüm güncellenmiş koşulları kabul ettiğiniz anlamına gelir.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">2. Hizmet Tanımı</h2>
            <p className="mb-3">
              Forilove, kullanıcıların sevdiklerine özel web sayfaları oluşturmasını sağlayan bir platformdur.
              Hizmetimiz şunları içerir:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Özelleştirilebilir şablon kitaplığı</li>
              <li>Sürükle-bırak içerik editörü</li>
              <li>FL Coins ile satın alma sistemi</li>
              <li>Bulut tabanlı içerik barındırma</li>
              <li>Özel URL oluşturma</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">3. Kullanıcı Hesapları</h2>
            <p className="mb-3">
              Platformu kullanmak için bir hesap oluşturmanız gerekmektedir. Hesap oluştururken:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Doğru, güncel ve eksiksiz bilgiler sağlamalısınız</li>
              <li>18 yaşından büyük olmalısınız</li>
              <li>Hesap bilgilerinizin güvenliğinden siz sorumlusunuz</li>
              <li>Hesabınızı başkalarıyla paylaşmamalısınız</li>
              <li>Hesabınızda gerçekleşen tüm aktivitelerden siz sorumlusunuz</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">4. Kullanım Lisansı</h2>
            <p>
              Forilove size, kişisel ve ticari olmayan kullanım için sınırlı, münhasır olmayan,
              devredilemez bir lisans verir. Bu lisans, şablonları kullanarak içerik oluşturmanıza
              ve paylaşmanıza izin verir. Ancak:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4 mt-3">
              <li>Şablonları yeniden satamaz veya dağıtamazsınız</li>
              <li>Platform kodlarını kopyalayamaz, tersine mühendislik yapamaz</li>
              <li>Platformun güvenliğini tehlikeye atamaz</li>
              <li>Otomatik botlar veya scriptler kullanamaz</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">5. Kullanıcı İçeriği ve Sorumluluk</h2>
            <p className="mb-3">
              Oluşturduğunuz içeriklerin tüm hakları size aittir. Ancak içerik yükleyerek:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Bize içeriği barındırma, görüntüleme ve dağıtma lisansı vermiş olursunuz</li>
              <li>İçeriğin yasal ve kurallara uygun olduğunu garanti edersiniz</li>
              <li>Telif hakkı ihlali yapmadığınızı beyan edersiniz</li>
              <li>İçeriğinizden tamamen sorumlu olduğunuzu kabul edersiniz</li>
            </ul>
            <p className="mt-3 text-pink-400">
              Detaylı bilgi için <a href="/disclaimer" className="underline">Sorumluluk Reddi</a> sayfasını inceleyiniz.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">6. Yasaklanmış Aktiviteler</h2>
            <p className="mb-3">Platformda aşağıdaki aktiviteler kesinlikle yasaktır:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Yasa dışı, zararlı veya müstehcen içerik yüklemek</li>
              <li>Telif hakkı veya fikri mülkiyet haklarını ihlal etmek</li>
              <li>Sisteme yetkisiz erişim sağlamaya çalışmak</li>
              <li>Spam, dolandırıcılık veya kötü amaçlı yazılım yaymak</li>
              <li>Başkalarının kişisel bilgilerini izinsiz paylaşmak</li>
              <li>Platformu ticari amaçlarla izinsiz kullanmak</li>
              <li>Nefret söylemi veya ayrımcılık yapmak</li>
              <li>Sistemi manipüle etmeye veya zarar vermeye çalışmak</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">7. FL Coins ve Ödeme Koşulları</h2>
            <p className="mb-3">
              FL Coins, platformdaki sanal para birimidir. Ödeme yaparken:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Tüm ödemeler güvenli POS sistemi üzerinden işlenir</li>
              <li>FL Coins satın alımları kesindir, iade edilemez</li>
              <li>Şablon satın alımlarında 14 gün iade garantisi vardır</li>
              <li>Fiyatlar önceden haber verilmeksizin değiştirilebilir</li>
              <li>İndirim ve promosyonlar belirli koşullara tabidir</li>
            </ul>
            <p className="mt-3">
              Detaylı bilgi için{" "}
              <a href="/fl-coins" className="text-pink-500 hover:text-pink-400 underline">FL Coins</a>,{" "}
              <a href="/payment-security" className="text-pink-500 hover:text-pink-400 underline">Ödeme Güvenliği</a> ve{" "}
              <a href="/refund-policy" className="text-pink-500 hover:text-pink-400 underline">İade Politikası</a> sayfalarını inceleyiniz.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">8. Hesap Askıya Alma ve Sonlandırma</h2>
            <p className="mb-3">
              Forilove, aşağıdaki durumlarda hesabınızı askıya alma veya kalıcı olarak sonlandırma hakkına sahiptir:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Kullanım koşullarını ihlal etmeniz</li>
              <li>Yasadışı aktivitelerde bulunmanız</li>
              <li>Diğer kullanıcılara zarar vermeniz</li>
              <li>Ödeme sorunları yaşanması</li>
              <li>Platformun güvenliğini tehdit etmeniz</li>
            </ul>
            <p className="mt-3">
              Hesap sonlandırma durumunda, satın aldığınız içeriklere erişiminiz kaybedilir ve
              iade yapılmaz. Siz de istediğiniz zaman hesabınızı kapatabilirsiniz.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">9. Hizmet Değişiklikleri</h2>
            <p>
              Forilove, önceden haber vermeksizin hizmeti değiştirme, askıya alma veya
              sonlandırma hakkını saklı tutar. Önemli değişiklikler için kullanıcılar
              bilgilendirilecektir, ancak günlük güncellemeler için bildirim gerekmeyebilir.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">10. Fikri Mülkiyet</h2>
            <p className="mb-3">
              Platform üzerindeki tüm içerik, tasarım, logo, şablon ve kodlar Forilove'in
              mülkiyetindedir veya lisansı altındadır:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Platform tasarımı ve kodu telif hakkı ile korunmaktadır</li>
              <li>"Forilove" markası tescillidir</li>
              <li>Şablonların tasarımları orijinal eserlerdir</li>
              <li>İzinsiz kopyalama, dağıtma veya ticari kullanım yasaktır</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">11. Sorumluluk Sınırlamaları</h2>
            <p className="mb-3">
              Forilove, aşağıdaki durumlardan sorumlu tutulamaz:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Kullanıcı içeriklerinden kaynaklanan zararlar</li>
              <li>Hizmet kesintileri veya veri kayıpları</li>
              <li>Üçüncü taraf bağlantılardan kaynaklanan sorunlar</li>
              <li>Kullanıcılar arası anlaşmazlıklar</li>
              <li>Dolaylı, tesadüfi veya özel zararlar</li>
              <li>Sistemsel veya teknik hatalardan kaynaklanan kayıplar</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">12. Gizlilik ve Veri Koruma</h2>
            <p>
              Kişisel verileriniz, <a href="/privacy" className="text-pink-500 hover:text-pink-400 underline">Gizlilik Politikası</a>'mıza
              uygun şekilde işlenir. KVKK (Kişisel Verilerin Korunması Kanunu) ve GDPR
              düzenlemelerine uyum sağlanır. Verilerinizin güvenliği bizim için önceliklidir.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">13. Uygulanacak Hukuk</h2>
            <p>
              Bu kullanım koşulları, Türkiye Cumhuriyeti yasalarına tabidir. Herhangi bir
              anlaşmazlık durumunda İstanbul mahkemeleri ve icra daireleri yetkilidir.
              5651 sayılı İnternet Ortamında Yapılan Yayınların Düzenlenmesi hakkındaki
              kanun ve ilgili mevzuat geçerlidir.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">14. Değişiklikler</h2>
            <p>
              Forilove bu kullanım koşullarını istediği zaman değiştirme hakkını saklı tutar.
              Önemli değişiklikler e-posta yoluyla bildirilecektir. Bu sayfayı düzenli olarak
              kontrol etmeniz önerilir. Değişikliklerden sonra platformu kullanmaya devam
              etmeniz, yeni koşulları kabul ettiğiniz anlamına gelir.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">15. Çeşitli Hükümler</h2>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Bu koşulların herhangi bir maddesi geçersiz sayılırsa, diğer maddeler geçerliliğini korur</li>
              <li>Forilove'in herhangi bir hakkını kullanmaması, o haktan feragat ettiği anlamına gelmez</li>
              <li>Bu koşullar, Forilove ile kullanıcı arasındaki tüm anlaşmayı oluşturur</li>
              <li>Bildirimler e-posta yoluyla yapılacaktır</li>
            </ul>
          </section>

          <section className="bg-white/5 rounded-2xl p-6 border border-white/10">
            <h2 className="text-2xl font-bold text-white mb-4">İletişim</h2>
            <p className="mb-3">
              Kullanım koşulları hakkında sorularınız için:
            </p>
            <a href="mailto:contact@forilove.com" className="text-pink-500 hover:text-pink-400 font-semibold text-lg">
              contact@forilove.com
            </a>
          </section>
    </LegalPageLayout>
  );
}
