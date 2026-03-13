import NewTabLink from "@/components/NewTabLink";

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
          açısından analiz eder ve gerektiğinde içeriği tespit ederek moderasyon ekibine iletir.
        </p>
        <ol className="list-decimal pl-5 space-y-2">
          <li><strong>Otomatik AI Taraması</strong> — İçerik yayınlandığı anda AI tarafından otomatik olarak taranır.</li>
          <li><strong>Tespit ve/veya Engelleme</strong> — Politika ihlali tespit edilirse içerik gizlenir ve moderasyon ekibine iletilir.</li>
          <li><strong>İnsan İncelemesi</strong> — Tespit edilen içerikler moderasyon ekibi tarafından incelenir ve nihai karar verilir.</li>
        </ol>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Moderasyon Altındaki İçerikler</h2>
        <p>
          Tespit edilen veya moderasyona alınan içerikler genel akıştan gizlenir ve diğer kullanıcılar tarafından görüntülenemez.
          Ancak <strong>içeriğin yazarı</strong>, moderasyon altındaki içeriğini görmeye ve durumunu takip etmeye devam edebilir.
          İçeriğin üzerinde moderasyon durumunu gösteren bir bildirim rozeti görüntülenir.
        </p>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">48 Saat Kuralı</h2>
        <p>
          Moderasyona alınan tüm içerikler <strong>en geç 48 saat</strong> içinde incelenir.
          Bu süre zarfında içerik gizli kalır. İnceleme sonucunda içerik onaylanırsa tekrar yayına alınır;
          reddedilirse kalıcı olarak kaldırılır. 48 saat içinde inceleme yapılmazsa içerik otomatik olarak yayına geri alınır.
        </p>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">İtiraz Süreci ve Karar Numarası</h2>
        <p>
          Moderasyon sonucunda içeriğiniz kaldırıldıysa, size bir <strong>karar numarası</strong> verilir.
          Bu numara ile itiraz sürecini başlatabilirsiniz. İtirazlar moderasyon ekibi tarafından tekrar değerlendirilir.
          İtiraz sonucu kesindir.
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li>Moderasyon kararı bildiriminizde karar numaranızı bulabilirsiniz</li>
          <li>İtirazınızı karar numarası ile birlikte hesabınız varsa Destek Talebi Oluştur sayfasından, yoksa <NewTabLink href="/help/contact" className="text-accent-main hover:opacity-80 font-semibold">İletişim</NewTabLink> sayfasındaki e-posta kanallarından iletebilirsiniz.</li>
          <li>İtirazlar genellikle 24-48 saat içinde sonuçlanır</li>
          <li>Her karar için yalnızca bir itiraz hakkınız bulunur</li>
        </ul>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Moderasyon Kategorileri</h2>
        <p>Feedim&apos;de aşağıdaki kategorilerdeki içerikler moderasyona alınır veya kaldırılır:</p>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Cinsel / Uygunsuz İçerik</strong> — Cinsel içerik, çıplaklık veya yetişkinlere yönelik materyaller.</li>
          <li><strong>Nefret Söylemi</strong> — Irk, din, cinsiyet, etnik köken veya diğer özelliklere dayalı nefret söylemi ve ayrımcılık.</li>
          <li><strong>Spam / Yanıltıcı İçerik</strong> — Toplu paylaşım, clickbait, dolandırıcılık veya yanıltıcı bilgi içeren gönderiler.</li>
          <li><strong>Telif Hakkı İhlali</strong> — Başkalarına ait içeriklerin izinsiz kullanımı. Detaylar için{" "}
            <NewTabLink href="/help/copyright" className="text-accent-main hover:opacity-80 font-semibold">Telif Hakkı Koruması</NewTabLink> sayfasına bakın.</li>
          <li><strong>Kopya İçerik</strong> — Platformdaki mevcut içeriklerin kopyalanması veya çoğaltılması.</li>
        </ul>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Topluluk Şikayetleri</h2>
        <p>
          Feedim, kullanıcılardan gelen şikayetleri otomatik olarak değerlendirir.
          Şikayetler yeterli sayıya ulaştığında içerik AI tarafından yeniden taranır ve gerektiğinde moderasyon ekibine iletilir.
          Bu sistem, kötü niyetli toplu şikayet girişimlerini önler ve gerçek ihlallerin hızlıca tespit edilmesini sağlar.
        </p>

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
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Hesap Dondurma</strong> — Hesabınız geçici olarak dondurulur. Bu sürede yeni içerik yayınlayamaz, yorum yapamazsınız. Mevcut içerikleriniz bu süre boyunca erişilemez hale gelir.</li>
          <li><strong>Hesap Askıya Alma</strong> — Hesabınız kalıcı olarak askıya alınır. Tüm içerikleriniz gizlenir ve hesabınıza erişim engellenir. Ciddi veya tekrarlayan ihlallerde uygulanır.</li>
        </ul>
        <ul className="list-disc pl-5 space-y-2 mt-4">
          <li>Hesap dondurma süresi ihlalin ciddiyetine göre belirlenir</li>
          <li>Askıya alınan hesaplar için itiraz süreci mevcuttur</li>
          <li>Tekrarlayan telif hakkı ihlallerinde hesaplar kalıcı olarak askıya alınabilir</li>
        </ul>

        <p className="text-xs text-text-muted mt-8">
          Moderasyon sistemi hakkında sorularınız veya karar numarası bazlı itirazlarınız için hesabınıza giriş yaptıktan sonra Destek Talebi Oluştur sayfasından destek talebi oluşturabilirsiniz. Hesabınıza erişemiyorsanız <NewTabLink href="/help/contact" className="text-accent-main hover:opacity-80 font-semibold">İletişim</NewTabLink> sayfamızdaki e-posta kanalları bu konuda yardımcı olacaktır.
        </p>
      </div>
    </>
  );
}
