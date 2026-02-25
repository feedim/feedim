import Link from "next/link";

export default function ContentTr() {
  return (
    <>
      <h1 className="text-2xl sm:text-3xl font-bold mb-6">Moderasyon Sistemi</h1>
      <div className="space-y-6 text-sm text-text-secondary leading-relaxed">
        <p>
          Feedim, güvenli ve kaliteli bir topluluk ortamı sağlamak için <strong>yapay zeka destekli otomatik tarama</strong> ve{" "}
          <strong>insan moderasyonunu</strong> bir arada kullanan çok katmanlı bir moderasyon sistemi uygular.
          Bu sayfa, moderasyon sürecimizin nasıl işlediğini detaylı olarak açıklar.
        </p>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Moderasyon Nasıl Çalışır?</h2>
        <p>
          Feedim moderasyon sistemi iki temel bileşenden oluşur: yapay zeka (AI) taraması ve insan moderasyonu.
          Her içerik yayınlandığında otomatik olarak AI taramasından geçer. AI, içeriği politika ihlalleri
          açısından analiz eder ve gerektiğinde içeriği tespit eder veya doğrudan engeller.
        </p>
        <div className="bg-bg-secondary rounded-[15px] p-4 space-y-3">
          <div className="flex items-start gap-3">
            <span className="text-accent-main font-bold text-xs mt-0.5 shrink-0">1.</span>
            <div>
              <p className="font-semibold text-text-primary">Otomatik AI Taraması</p>
              <p className="text-text-muted text-xs mt-0.5">İçerik yayınlandığı anda AI tarafından otomatik olarak taranır.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-accent-main font-bold text-xs mt-0.5 shrink-0">2.</span>
            <div>
              <p className="font-semibold text-text-primary">Tespit ve/veya Engelleme</p>
              <p className="text-text-muted text-xs mt-0.5">Politika ihlali tespit edilirse içerik gizlenir veya doğrudan engellenir.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-accent-main font-bold text-xs mt-0.5 shrink-0">3.</span>
            <div>
              <p className="font-semibold text-text-primary">İnsan İncelemesi</p>
              <p className="text-text-muted text-xs mt-0.5">Tespit edilen içerikler moderasyon ekibi tarafından incelenir ve nihai karar verilir.</p>
            </div>
          </div>
        </div>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Moderasyon Altındaki İçerikler</h2>
        <p>
          Tespit edilen veya moderasyona alınan içerikler genel akıştan gizlenir ve diğer kullanıcılar tarafından görüntülenemez.
          Ancak <strong>içeriğin yazarı</strong>, moderasyon altındaki içeriğini görmeye ve durumunu takip etmeye devam edebilir.
          İçeriğin üzerinde moderasyon durumunu gösteren bir bildirim rozeti görüntülenir.
        </p>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">48 Saat Kuralı</h2>
        <div className="bg-bg-secondary rounded-[15px] p-5">
          <p>
            Moderasyona alınan tüm içerikler <strong className="text-text-primary">en geç 48 saat</strong> içinde incelenir.
            Bu süre zarfında içerik gizli kalır. İnceleme sonucunda içerik onaylanırsa tekrar yayına alınır;
            reddedilirse kalıcı olarak kaldırılır. 48 saat içinde inceleme yapılmazsa içerik otomatik olarak yayına geri alınır.
          </p>
        </div>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">İtiraz Süreci ve Karar Numarası</h2>
        <p>
          Moderasyon sonucunda içeriğiniz kaldırıldıysa, size bir <strong>karar numarası</strong> verilir.
          Bu numara ile itiraz sürecini başlatabilirsiniz. İtirazlar moderasyon ekibi tarafından tekrar değerlendirilir.
          İtiraz sonucu kesindir.
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li>Moderasyon kararı bildiriminizde karar numaranızı bulabilirsiniz</li>
          <li>İtirazınızı karar numarası ile birlikte iletişim sayfasından veya içerik moderasyon sayfasından iletebilirsiniz</li>
          <li>İtirazlar genellikle 24-48 saat içinde sonuçlanır</li>
          <li>Her karar için yalnızca bir itiraz hakkınız bulunur</li>
        </ul>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Moderasyon Kategorileri</h2>
        <p>Feedim&apos;de aşağıdaki kategorilerdeki içerikler moderasyona alınır veya kaldırılır:</p>
        <div className="bg-bg-secondary rounded-[15px] p-4 space-y-3">
          <div className="flex items-start gap-3">
            <span className="text-error font-bold text-xs mt-0.5 shrink-0">NSFW</span>
            <div>
              <p className="font-semibold text-text-primary">Cinsel / Uygunsuz İçerik</p>
              <p className="text-text-muted text-xs mt-0.5">Cinsel içerik, çıplaklık veya yetişkinlere yönelik materyaller.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-error font-bold text-xs mt-0.5 shrink-0">NEFRET</span>
            <div>
              <p className="font-semibold text-text-primary">Nefret Söylemi</p>
              <p className="text-text-muted text-xs mt-0.5">Irk, din, cinsiyet, etnik köken veya diğer özelliklere dayalı nefret söylemi ve ayrımcılık.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-warning font-bold text-xs mt-0.5 shrink-0">SPAM</span>
            <div>
              <p className="font-semibold text-text-primary">Spam / Yanıltıcı İçerik</p>
              <p className="text-text-muted text-xs mt-0.5">Toplu paylaşım, clickbait, dolandırıcılık veya yanıltıcı bilgi içeren gönderiler.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-warning font-bold text-xs mt-0.5 shrink-0">TELİF</span>
            <div>
              <p className="font-semibold text-text-primary">Telif Hakkı İhlali</p>
              <p className="text-text-muted text-xs mt-0.5">Başkalarına ait içeriklerin izinsiz kullanımı. Detaylar için{" "}
                <Link href="/help/copyright" className="text-accent-main hover:opacity-80 font-semibold">Telif Hakkı Koruması</Link> sayfasına bakın.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-warning font-bold text-xs mt-0.5 shrink-0">KOPYA</span>
            <div>
              <p className="font-semibold text-text-primary">Kopya İçerik</p>
              <p className="text-text-muted text-xs mt-0.5">Platformdaki mevcut içeriklerin kopyalanması veya çoğaltılması.</p>
            </div>
          </div>
        </div>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Topluluk Şikayetleri</h2>
        <p>
          Feedim, kullanıcılardan gelen şikayetleri <strong>ağırlıklı şikayet sistemi</strong> ile değerlendirir.
          Her kullanıcının şikayeti eşit ağırlıkta değildir; profil puanı yüksek ve güvenilir kullanıcıların
          şikayetleri daha yüksek ağırlığa sahiptir. Bu sistem, kötü niyetli toplu şikayet girişimlerini önler
          ve gerçek ihlallerin hızlıca tespit edilmesini sağlar.
        </p>
        <div className="bg-bg-secondary rounded-[15px] p-4 space-y-3">
          <div className="flex items-start gap-3">
            <span className="text-accent-main font-bold text-xs mt-0.5 shrink-0">3+</span>
            <div>
              <p className="font-semibold text-text-primary">Ağırlıklı Şikayet &rarr; AI Deep Scan</p>
              <p className="text-text-muted text-xs mt-0.5">Bir içerik 3 veya daha fazla ağırlıklı şikayet aldığında, AI tarafından derinlemesine yeniden taranır.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-error font-bold text-xs mt-0.5 shrink-0">10+</span>
            <div>
              <p className="font-semibold text-text-primary">Ağırlıklı Şikayet &rarr; Öncelikli Moderasyon Kuyruğu</p>
              <p className="text-text-muted text-xs mt-0.5">10 veya daha fazla ağırlıklı şikayet alan içerikler öncelikli olarak moderasyon ekibine iletilir.</p>
            </div>
          </div>
        </div>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Profil Moderasyonu</h2>
        <p>
          Moderasyon sistemi yalnızca içeriklerle sınırlı değildir. Kullanıcı profilleri de moderasyon kapsamındadır.
          Profil fotoğrafı, kullanıcı adı, biyografi ve diğer profil bilgileri uygunsuz içerik barındırıyorsa
          moderasyona alınabilir. Kayıt ve onboarding aşamasında da AI tabanlı küfür ve uygunsuzluk kontrolü yapılır.
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li>Uygunsuz profil fotoğrafları otomatik tespit edilir ve kaldırılır</li>
          <li>Kullanıcı adı ve biyografi metinleri AI taramasından geçer</li>
          <li>Profil ihlalleri tekrarlanırsa hesap askıya alınabilir</li>
        </ul>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Hesap Dondurma ve Askıya Alma</h2>
        <p>
          Tekrarlayan ihlaller veya ciddi politika ihlallerinde hesabınız dondurulabilir veya askıya alınabilir.
        </p>
        <div className="bg-bg-secondary rounded-[15px] p-4 space-y-3">
          <div className="flex items-start gap-3">
            <span className="text-warning font-bold text-xs mt-0.5 shrink-0">DONDURMA</span>
            <div>
              <p className="font-semibold text-text-primary">Hesap Dondurma</p>
              <p className="text-text-muted text-xs mt-0.5">Hesabınız geçici olarak dondurulur. Bu sürede yeni içerik yayınlayamaz, yorum yapamazsınız. Mevcut içerikleriniz görünür kalır.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-error font-bold text-xs mt-0.5 shrink-0">ASKIYA ALMA</span>
            <div>
              <p className="font-semibold text-text-primary">Hesap Askıya Alma</p>
              <p className="text-text-muted text-xs mt-0.5">Hesabınız kalıcı olarak askıya alınır. Tüm içerikleriniz gizlenir ve hesabınıza erişim engellenir. Ciddi veya tekrarlayan ihlallerde uygulanır.</p>
            </div>
          </div>
        </div>
        <ul className="list-disc pl-5 space-y-2 mt-4">
          <li>Hesap dondurma süresi ihlalin ciddiyetine göre belirlenir</li>
          <li>Askıya alınan hesaplar için itiraz süreci mevcuttur</li>
          <li>Telif hakkı strike sistemi ile 10 strike&apos;a ulaşan hesaplar kalıcı olarak askıya alınır ve silinir</li>
        </ul>

        <div className="bg-bg-secondary rounded-[15px] p-5 mt-8">
          <p className="text-xs text-text-muted">
            Moderasyon sistemi hakkında sorularınız veya itirazlarınız için{" "}
            <Link href="/help/contact" className="text-accent-main hover:opacity-80 font-semibold">İletişim</Link> sayfamızdan
            veya <a href="mailto:support@feedim.com" className="text-accent-main hover:opacity-80 font-semibold">support@feedim.com</a> adresinden
            bize ulaşabilirsiniz.
          </p>
        </div>
      </div>
    </>
  );
}
