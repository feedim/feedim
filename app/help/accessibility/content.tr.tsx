import Link from "next/link";

export default function ContentTr() {
  return (
    <>
      <h1 className="text-2xl sm:text-3xl font-bold mb-6">Erişilebilirlik</h1>
      <div className="space-y-6 text-sm text-text-secondary leading-relaxed">
        <p>
          Feedim, herkes için erişilebilir bir platform olmayı hedeflemektedir. Fiziksel yeteneklerden,
          cihaz türünden veya internet bağlantısından bağımsız olarak tüm kullanıcılarının platformumuzu
          rahatlıkla kullanabilmesini sağlamak önceliklerimiz arasındadır. Erişilebilirlik, Feedim için
          sürekli bir geliştirme sürecidir.
        </p>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Tema Desteği</h2>
        <p>
          Feedim, farklı görme ihtiyaçlarına uygun olarak dört farklı tema seçeneği sunmaktadır:
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Açık mod:</strong> Aydınlık ortamlar için optimize edilmiş, yüksek okunabilirlik sunan tema</li>
          <li><strong>Koyu mod:</strong> Düşük ışıklı ortamlarda göz yorgunluğunu azaltan karanlık tema</li>
          <li><strong>Dim mod:</strong> Açık ve koyu arasında, daha yumuşak tonlarla göz konforu sağlayan ara tema</li>
          <li><strong>Sistem modu:</strong> Cihazınızın sistem tema tercihine otomatik olarak uyum sağlayan mod</li>
        </ul>
        <p>
          Tema tercihlerinizi ayarlar sayfasından istediğiniz zaman değiştirebilirsiniz.
        </p>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Responsive Tasarım</h2>
        <p>
          Feedim, tüm cihaz türlerinde sorunsuz çalışacak şekilde tasarlanmıştır:
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Mobil cihazlar:</strong> Telefon ekranlarında tam uyumlu ve dokunmatik optimizasyonlu arayüz</li>
          <li><strong>Tablet:</strong> Orta boyutlu ekranlar için optimize edilmiş düzen</li>
          <li><strong>Masaüstü:</strong> Geniş ekranlarda tam özellikli ve verimli kullanım deneyimi</li>
        </ul>
        <p>
          Platform, ekran boyutuna göre otomatik olarak uyum sağlar ve tüm cihazlarda tutarlı bir
          deneyim sunar.
        </p>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Klavye Navigasyonu</h2>
        <p>
          Feedim&apos;in tüm özellikleri klavye ile erişilebilir. Fare kullanmadan platformun tüm işlevlerini
          klavye kısayollarıyla kullanabilirsiniz. Mevcut klavye kısayollarını görmek için
          herhangi bir sayfada <strong>?</strong> tuşuna basabilirsiniz.
        </p>
        <div className="bg-bg-secondary rounded-[15px] p-4">
          <p>
            Klavye kısayolları listesine erişim: Herhangi bir sayfada <strong className="text-text-primary">?</strong> tuşuna basın.
            Tab tuşu ile sayfadaki öğeler arasında gezinebilir, Enter tuşu ile seçim yapabilirsiniz.
          </p>
        </div>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Metin Boyutu</h2>
        <p>
          Feedim, tarayıcınızın zoom özelliğini tam olarak destekler. Metin boyutunu büyütmek veya
          küçültmek için tarayıcınızın zoom özelliğini kullanabilirsiniz (genellikle Ctrl/Cmd + veya -).
          Platform, zoom seviyesine göre otomatik olarak uyum sağlar ve içerik okunabilirliği korunur.
        </p>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Görsel Alternatifler</h2>
        <p>
          Feedim, görsellere alternatif metin (alt text) desteği sunmaktadır. İçerik oluşturucular
          görsellerine açıklayıcı alt metin ekleyebilir. Bu sayede ekran okuyucu kullanan kullanıcılar
          görsellerin içeriğini anlayabilir. Platform, alt metin eklenmesini teşvik eder.
        </p>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Renk Kontrastı</h2>
        <p>
          Feedim arayüzü, <strong>WCAG (Web Content Accessibility Guidelines)</strong> standartlarına uygun
          kontrast oranlarıyla tasarlanmıştır. Metin ve arka plan arasındaki kontrast, tüm tema seçeneklerinde
          okunabilirlik için yeterli seviyede tutulmaktadır. Bu sayede görme güçlüğü yaşayan kullanıcılar
          da içerikleri rahatlıkla okuyabilir.
        </p>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Ekran Okuyucu Uyumluluğu</h2>
        <p>
          Feedim, ekran okuyucu yazılımlarla uyumlu olacak şekilde <strong>semantic HTML</strong> yapısı
          kullanmaktadır. Sayfa başlıkları, navigasyon öğeleri, formlar ve düğmeler ekran okuyucuların
          doğru şekilde yorumlayabileceği anlamsal işaretlemelerle oluşturulmuştur. ARIA etiketleri
          gerekli yerlerde kullanılarak erişilebilirlik artırılmıştır.
        </p>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Video Erişilebilirliği</h2>
        <p>
          Feedim video oynatıcısı, tüm kullanıcılar için erişilebilir kontroller sunmaktadır:
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li>Oynat/duraklat, ses ayarı ve tam ekran kontrolleri</li>
          <li>Klavye ile video kontrol desteği</li>
          <li>Video ilerleme çubuğu ile konum ayarlama</li>
        </ul>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Sürekli İyileştirme</h2>
        <p>
          Erişilebilirlik, Feedim için sürekli bir geliştirme sürecidir. Kullanıcılarımızdan gelen geri
          bildirimler doğrultusunda platformumuzu sürekli olarak daha erişilebilir hale getirmek için
          çalışıyoruz. Erişilebilirlik standartlarındaki güncellemeleri takip ediyor ve platformumuza
          entegre ediyoruz.
        </p>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Geri Bildirim</h2>
        <p>
          Erişilebilirlik konusunda önerileriniz, karşılaştığınız sorunlar veya iyileştirme talepleriniz
          bizim için çok değerlidir. Platformumuzun erişilebilirliğini artırmamıza yardımcı olmak için
          geri bildirimlerinizi bize iletebilirsiniz.
        </p>

        <div className="bg-bg-secondary rounded-[15px] p-5 mt-8">
          <p className="text-xs text-text-muted">
            Erişilebilirlik hakkında sorularınız ve önerileriniz için{" "}
            <Link href="/help/contact" className="text-accent-main hover:opacity-80 font-semibold">İletişim</Link> sayfamızdan
            veya <a href="mailto:support@feedim.com" className="text-accent-main hover:opacity-80 font-semibold">support@feedim.com</a> adresinden
            bize ulaşabilirsiniz.
          </p>
        </div>
      </div>
    </>
  );
}
