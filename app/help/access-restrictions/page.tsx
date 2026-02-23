import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Erişim Kısıtlamaları - Feedim",
  description: "Feedim platformundaki erişim kısıtlamaları, yaş sınırı, coğrafi kısıtlamalar, hesap doğrulaması, premium özellikler ve moderasyon kuralları hakkında bilgi.",
  keywords: ["feedim erişim kısıtlamaları", "yaş sınırı", "premium özellikler", "hesap askıya alma", "moderasyon", "gönderi limiti"],
};

export default function AccessRestrictionsPage() {
  return (
    <>
      <h1 className="text-2xl sm:text-3xl font-bold mb-6">Erişim Kısıtlamaları</h1>
      <div className="space-y-6 text-sm text-text-secondary leading-relaxed">
        <p>
          Feedim, güvenli ve kaliteli bir kullanıcı deneyimi sunmak amacıyla çeşitli erişim kısıtlamaları
          uygulamaktadır. Bu kısıtlamalar, platformun sağlıklı bir şekilde işlemesini ve tüm kullanıcıların
          güvenliğini sağlamak için tasarlanmıştır.
        </p>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Yaş Kısıtlaması</h2>
        <p>
          Feedim platformunu kullanabilmek için en az <strong>13 yaşında</strong> olmanız gerekmektedir.
          13 yaş altındaki kullanıcılar hesap oluşturamaz ve platformu kullanamazlar. Bu kısıtlama,
          çocuk güvenliği yasaları ve uluslararası düzenlemeler çerçevesinde uygulanmaktadır.
          Kayıt sırasında belirtilen doğum tarihi doğrulanır ve yaş koşulunu karşılamayan hesaplar otomatik olarak engellenir.
        </p>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Coğrafi Kısıtlamalar</h2>
        <p>
          Feedim, Türkiye merkezli bir platformdur. Hizmetlerimiz öncelikli olarak Türkiye&apos;deki kullanıcılar için
          optimize edilmiştir. Ödeme sistemleri, yasal düzenlemeler ve içerik politikaları Türkiye mevzuatına uygun
          olarak yapılandırılmıştır. Platformun dili Türkçedir ve destek hizmetleri Türkçe olarak sunulmaktadır.
        </p>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Hesap Doğrulaması</h2>
        <p>
          Platformdaki bazı özellikler, e-posta doğrulaması yapılmadan kısıtlıdır. Hesabınızı oluşturduktan sonra
          e-posta adresinizi doğrulamanız gerekmektedir. Doğrulanmamış hesaplar şu kısıtlamalarla karşılaşabilir:
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li>Gönderi paylaşma ve yorum yapma kısıtlanabilir</li>
          <li>Diğer kullanıcılarla etkileşim sınırlı olabilir</li>
          <li>Premium özelliklere erişim sağlanamaz</li>
          <li>Bildirim tercihleri sınırlı olabilir</li>
        </ul>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Gizli Hesap Kısıtlamaları</h2>
        <p>
          Gizli olarak ayarlanan hesapların içerikleri yalnızca onaylanmış takipçilere görünür.
          Gizli hesap sahiplerinin gönderileri, momentleri ve profil bilgileri takipçi olmayan
          kullanıcılar tarafından görüntülenemez. Takip istekleri hesap sahibi tarafından manuel olarak
          onaylanmalıdır.
        </p>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Engelleme</h2>
        <p>
          Bir kullanıcıyı engellediğinizde, engellenen kullanıcı sizin içeriklerinize erişemez,
          profilinizi görüntüleyemez ve sizinle etkileşime geçemez. Aynı şekilde, siz de engellediğiniz
          kullanıcının içeriklerine erişemezsiniz. Engelleme iki taraflı olarak çalışır ve her iki kullanıcı
          için de geçerlidir.
        </p>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Moderasyon Kısıtlamaları</h2>
        <p>
          Moderasyon sürecindeki içerikler özel kurallara tabidir:
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Moderasyon altındaki içerikler:</strong> Yalnızca içerik sahibi tarafından görülebilir, diğer kullanıcılara gösterilmez</li>
          <li><strong>Kaldırılan içerikler:</strong> Tamamen gizlenir ve hiçbir kullanıcı tarafından (içerik sahibi dahil) görüntülenemez</li>
          <li><strong>NSFW işaretli içerikler:</strong> Akışta ve arama sonuçlarında gizlenir</li>
        </ul>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Premium Kısıtlamalar</h2>
        <p>
          Bazı gelişmiş özellikler yalnızca Premium üyelere sunulmaktadır:
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Analitik:</strong> Detaylı içerik istatistikleri ve performans analizleri</li>
          <li><strong>Para kazanma:</strong> İçeriklerden gelir elde etme özelliği</li>
          <li><strong>Reklamsız deneyim:</strong> Platform genelinde reklam gösterilmez</li>
          <li><strong>Öncelikli destek:</strong> Destek talepleriniz öncelikli olarak değerlendirilir</li>
        </ul>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Hesap Askıya Alma</h2>
        <p>
          Topluluk kurallarını veya kullanım koşullarını ihlal eden hesaplar geçici veya kalıcı olarak
          askıya alınabilir. Hesap dondurma, askıya alma ve itiraz süreci hakkında detaylı bilgi için{" "}
          <Link href="/help/moderation" className="text-accent-main hover:opacity-80 font-semibold">Moderasyon Sistemi</Link> sayfasını
          inceleyebilirsiniz.
        </p>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">IP Bazlı Kısıtlamalar</h2>
        <p>
          Kötüye kullanım, spam veya güvenlik tehdidi tespit edilmesi durumunda Feedim, belirli IP adreslerine
          geçici kısıtlama uygulayabilir. Bu kısıtlamalar otomatik sistemler tarafından uygulanır ve
          genellikle belirli bir süre sonra otomatik olarak kaldırılır. IP bazlı kısıtlamalar, platformun
          genel güvenliğini korumak amacıyla kullanılır.
        </p>

        <div className="bg-bg-secondary rounded-xl p-5 mt-8">
          <p className="text-xs text-text-muted">
            Erişim kısıtlamaları hakkında sorularınız için{" "}
            <Link href="/help/contact" className="text-accent-main hover:opacity-80 font-semibold">İletişim</Link> sayfamızdan
            veya <a href="mailto:support@feedim.com" className="text-accent-main hover:opacity-80 font-semibold">support@feedim.com</a> adresinden
            bize ulaşabilirsiniz.
          </p>
        </div>
      </div>
    </>
  );
}
