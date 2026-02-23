import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Analitik - Feedim",
  description: "Feedim Analitik Paneli: Premium üyelere sunulan detaylı istatistik paneli. Görüntülenme, beğeni, yorum, kazanç, yoğun saatler ve en popüler gönderiler.",
  keywords: ["feedim analitik", "feedim istatistik", "analitik paneli", "içerik istatistikleri", "görüntülenme analizi", "kazanç takibi", "yoğun saatler", "premium analitik"],
};

export default function AnalyticsPage() {
  return (
    <>
      <h1 className="text-2xl sm:text-3xl font-bold mb-6">Analitik Paneli</h1>
      <div className="space-y-6 text-sm text-text-secondary leading-relaxed">
        <p>
          Feedim Analitik Paneli, <strong>Premium üyelere</strong> sunulan kapsamlı bir istatistik aracıdır.
          İçeriklerinizin performansını detaylı olarak takip edebilir, okuyucu davranışlarını analiz edebilir
          ve stratejik kararlar almak için veriye dayalı bilgiler edinebilirsiniz.
        </p>

        {/* ── Premium Gereksinimi ── */}
        <div className="bg-bg-secondary rounded-xl p-4">
          <p className="font-semibold text-text-primary text-xs uppercase tracking-wide mb-2">Premium Üyelik Gerekli</p>
          <p>
            Analitik Paneli yalnızca Premium üyelik sahibi kullanıcılar tarafından erişilebilir.
            Ücretsiz hesapla analitik sayfasını açtığınızda &ldquo;Premium Üyelik Gerekli&rdquo; uyarısı görüntülenir
            ve istatistiklere erişim sağlanamazsınız. Premium üyelik hakkında detaylı bilgi için{" "}
            <Link href="/dashboard/settings/premium" className="text-accent-main hover:opacity-80 font-semibold">Premium sayfasını</Link> ziyaret edebilirsiniz.
          </p>
        </div>

        {/* ── Dönem Seçimi ── */}
        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Dönem Seçimi</h2>
        <p>
          Analitik panelinin en üstünde yer alan dönem seçici ile istatistiklerinizi farklı zaman dilimlerinde
          inceleyebilirsiniz. Seçtiğiniz dönem tüm metrikleri, grafikleri ve karşılaştırmaları etkiler.
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>7 gün</strong> &mdash; Son bir haftanın verileri</li>
          <li><strong>30 gün</strong> &mdash; Son bir ayın verileri (varsayılan)</li>
          <li><strong>90 gün</strong> &mdash; Son üç ayın verileri</li>
        </ul>
        <p>
          Her dönem seçiminde, seçilen döneme ait veriler bir önceki eşdeğer dönemle karşılaştırılır
          ve değişim yüzdeleri hesaplanır.
        </p>

        {/* ── Genel Bakış Metrikleri ── */}
        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Genel Bakış Metrikleri</h2>
        <p>
          Panelin üst kısmında yer alan özet kartları, seçilen dönemdeki temel performans göstergelerinizi
          bir bakışta sunar. Her metrik bir önceki dönemle karşılaştırılır ve artış veya azalış yüzdesi gösterilir.
        </p>
        <div className="bg-bg-secondary rounded-xl p-4 space-y-3">
          <p className="font-semibold text-text-primary text-xs uppercase tracking-wide">Takip Edilen Metrikler</p>
          <ul className="list-disc pl-5 space-y-2">
            <li><strong>Görüntülenme</strong> &mdash; İçeriklerinizin toplam okunma/görüntülenme sayısı</li>
            <li><strong>Beğeni</strong> &mdash; İçeriklerinize gelen toplam beğeni sayısı</li>
            <li><strong>Yorum</strong> &mdash; İçeriklerinize yapılan toplam yorum sayısı</li>
            <li><strong>Kaydetme</strong> &mdash; İçeriklerinizin kaç kez kaydedildiği</li>
            <li><strong>Paylaşım</strong> &mdash; İçeriklerinizin kaç kez paylaşıldığı</li>
            <li><strong>Yeni Takipçi</strong> &mdash; Seçilen dönemde kazandığınız yeni takipçi sayısı</li>
          </ul>
        </div>

        {/* ── Kazanç Kartı ── */}
        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Kazanç Kartı</h2>
        <p>
          Kazanç kartı, içeriklerinizden elde ettiğiniz jeton gelirini detaylı olarak gösterir.
          Bu kart yalnızca <strong>Profesyonel hesap</strong> türüne sahip kullanıcılara açıktır;
          standart Premium hesaplar kazanç kartını bulanık ve kilitli olarak görür.
        </p>
        <div className="bg-bg-secondary rounded-xl p-4 space-y-3">
          <p className="font-semibold text-text-primary text-xs uppercase tracking-wide">Kazanç Metrikleri</p>
          <ul className="list-disc pl-5 space-y-2">
            <li><strong>Jeton Bakiyesi</strong> &mdash; Mevcut jeton bakiyeniz</li>
            <li><strong>Dönemlik Kazanç</strong> &mdash; Seçilen dönemde kazandığınız jeton miktarı</li>
            <li><strong>Toplam Kazanç</strong> &mdash; Hesabınızın toplam kazancı</li>
            <li><strong>Nitelikli Okuma</strong> &mdash; Kazanca dönüşen okuma sayısı</li>
          </ul>
        </div>

        {/* ── Ortalama Metrikler ── */}
        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Ortalama Metrikler</h2>
        <p>
          Hızlı istatistik şeridi, içeriklerinizin ortalama performansını gösteren kompakt göstergeler sunar.
          Bu göstergeler yatay olarak kaydırılabilir ve tek bakışta genel durumunuzu özetler.
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Gönderi başına görüntülenme</strong> &mdash; Tüm gönderilerinizin ortalama görüntülenme sayısı</li>
          <li><strong>Gönderi başına beğeni</strong> &mdash; Tüm gönderilerinizin ortalama beğeni sayısı</li>
          <li><strong>Gönderi başına yorum</strong> &mdash; Tüm gönderilerinizin ortalama yorum sayısı</li>
          <li><strong>Ortalama okuma süresi</strong> &mdash; Okuyucuların içeriklerinizde geçirdiği ortalama süre (dakika)</li>
          <li><strong>Gönderi sayısı</strong> &mdash; Toplam yayınlanmış gönderi sayınız</li>
          <li><strong>Takipçi sayısı</strong> &mdash; Toplam takipçi sayınız</li>
        </ul>

        {/* ── Etkileşim Oranı ── */}
        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Etkileşim Oranı</h2>
        <p>
          Etkileşim oranı, içeriklerinizi görüntüleyen kullanıcıların ne kadarının beğeni, yorum, kaydetme
          veya paylaşım gibi bir eylemde bulunduğunu gösterir. Bu oran yüzde olarak hesaplanır ve
          içeriklerinizin kalitesini değerlendirmenize yardımcı olur.
        </p>
        <div className="bg-bg-secondary rounded-xl p-4">
          <p>
            <strong className="text-text-primary">Hesaplama:</strong> Etkileşim Oranı = (Beğeni + Yorum + Kaydetme + Paylaşım) / Toplam Görüntülenme x 100.
            Oran ne kadar yüksekse, içerikleriniz o kadar etkili ve ilgi çekici demektir.
          </p>
        </div>

        {/* ── Günlük Grafik ── */}
        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Günlük Grafik</h2>
        <p>
          Seçilen dönemdeki günlük değişimleri çubuk grafik olarak görüntüleyebilirsiniz.
          Grafik üzerindeki sekmeleri kullanarak dört farklı metrik arasında geçiş yapabilirsiniz:
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Görüntülenme</strong> &mdash; Günlük görüntülenme trendi</li>
          <li><strong>Beğeni</strong> &mdash; Günlük beğeni trendi</li>
          <li><strong>Yorum</strong> &mdash; Günlük yorum trendi</li>
          <li><strong>Takipçi</strong> &mdash; Günlük yeni takipçi trendi</li>
        </ul>
        <p>
          Grafikteki her çubuğun üzerine geldiğinizde ilgili günün detaylı sayısı ve tarihi görüntülenir.
          Grafik altında dönemin toplam sayısı ve günlük ortalaması da yer alır.
        </p>

        {/* ── Yoğun Saatler Isı Haritası ── */}
        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Yoğun Saatler Isı Haritası</h2>
        <p>
          Isı haritası, günün 24 saatinde içeriklerinizin ne kadar okunduğunu görsel olarak sunar.
          Her saat dilimi, okuma yoğunluğuna göre açıktan koyuya doğru renklendirilir.
        </p>
        <div className="bg-bg-secondary rounded-xl p-4 space-y-3">
          <p className="font-semibold text-text-primary text-xs uppercase tracking-wide">Isı Haritası Nasıl Okunur?</p>
          <ul className="list-disc pl-5 space-y-2">
            <li>Koyu renkli saatler, içeriklerinizin en çok okunduğu saatleri gösterir</li>
            <li>Açık renkli veya boş saatler, düşük aktivite dönemlerini temsil eder</li>
            <li>Sağ üst köşede en yoğun saat bilgisi otomatik olarak gösterilir</li>
            <li>Bu bilgiyi kullanarak içeriklerinizi en uygun saatte yayınlayabilirsiniz</li>
          </ul>
        </div>

        {/* ── Haftalık Gün Dağılımı ── */}
        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Haftalık Gün Dağılımı</h2>
        <p>
          Haftanın hangi günlerinde içeriklerinizin daha fazla görüntülendiğini gösteren yatay çubuk grafik.
          Pazartesi&apos;den Pazar&apos;a kadar her günün görüntülenme sayısı karşılaştırmalı olarak sunulur.
          En iyi performans gösteren gün sağ üst köşede belirtilir.
        </p>
        <p>
          Haftalık dağılım, yayınlama stratejinizi optimize etmenize yardımcı olur. En yoğun günlerde
          yeni içerik yayınlayarak daha fazla okuyucuya ulaşabilirsiniz.
        </p>

        {/* ── En Popüler Gönderiler ── */}
        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">En Popüler Gönderiler Sıralaması</h2>
        <p>
          Seçilen dönemde en çok görüntülenen gönderileriniz sıralı bir liste halinde gösterilir.
          Her gönderi için görüntülenme, beğeni, yorum ve kaydetme sayıları detaylı olarak sunulur.
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li>İlk 5 gönderi varsayılan olarak gösterilir</li>
          <li>5&apos;ten fazla gönderiniz varsa &ldquo;Tüm gönderileri gör&rdquo; butonu ile tam listeyi açabilirsiniz</li>
          <li>Her gönderinin yanında performans çubuğu, en çok görüntülenen gönderiyle oranlanarak gösterilir</li>
          <li>Gönderi kapak görseli, başlığı ve detaylı metrikleri tek satırda sunulur</li>
        </ul>

        {/* ── Video Analitiği ── */}
        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Video Analitiği</h2>
        <p>
          Video analitiği bölümü, video içeriklerinizin performansını ayrıntılı olarak takip etmenizi sağlar.
          Bu bölüm yalnızca <strong>Profesyonel hesap</strong> türüne sahip ve en az bir video yayınlamış
          kullanıcılar için görüntülenir.
        </p>
        <div className="bg-bg-secondary rounded-xl p-4 space-y-3">
          <p className="font-semibold text-text-primary text-xs uppercase tracking-wide">Video Metrikleri</p>
          <ul className="list-disc pl-5 space-y-2">
            <li><strong>Toplam izlenme saati</strong> &mdash; Videolarınızın toplam izlenme süresi (saat cinsinden)</li>
            <li><strong>Ortalama izlenme süresi</strong> &mdash; İzleyicilerin videolarınızda geçirdiği ortalama süre</li>
            <li><strong>Ortalama izlenme yüzdesi</strong> &mdash; Videoların ortalama yüzde kaçının izlendiği</li>
            <li><strong>Tamamlama oranı</strong> &mdash; Videoyu sonuna kadar izleyen kullanıcıların oranı</li>
            <li><strong>Video sayısı</strong> &mdash; Toplam yayınlanmış video sayınız</li>
            <li><strong>Toplam izleyici</strong> &mdash; Videolarınızı izleyen benzersiz kullanıcı sayısı</li>
            <li><strong>En çok izlenen videolar</strong> &mdash; En popüler videolarınızın sıralı listesi</li>
          </ul>
        </div>

        {/* ── Öngörüler ── */}
        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Otomatik Öngörüler</h2>
        <p>
          Analitik paneli, verilerinize dayalı olarak otomatik öngörüler ve değerlendirmeler sunar.
          Bu öngörüler yeterli veri olduğunda (en az 10 görüntülenme) görüntülenir ve şunları içerebilir:
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li>Etkileşim oranınızın değerlendirmesi</li>
          <li>En çok okuma alan gün bilgisi</li>
          <li>Okuyucularınızın en aktif saati</li>
          <li>Önceki döneme kıyasla görüntülenme değişimi</li>
          <li>Gönderi başına ortalama görüntülenme bilgisi</li>
        </ul>

        {/* ── Analitik Paneline Erişim ── */}
        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Analitik Paneline Erişim</h2>
        <p>
          Premium üyeliğiniz varsa analitik paneline doğrudan aşağıdaki bağlantıdan erişebilirsiniz.
          Panel, sol menüdeki &ldquo;Analitik&rdquo; sekmesinden de ulaşılabilir.
        </p>
        <div className="bg-bg-secondary rounded-xl p-4">
          <Link href="/dashboard/analytics" className="text-accent-main hover:opacity-80 font-semibold">
            Analitik Paneline Git &rarr;
          </Link>
        </div>

        <div className="bg-bg-secondary rounded-xl p-5 mt-8">
          <p className="text-xs text-text-muted">
            Analitik paneli hakkında sorularınız için{" "}
            <Link href="/help/contact" className="text-accent-main hover:opacity-80 font-semibold">İletişim</Link> sayfamızdan
            veya <a href="mailto:support@feedim.com" className="text-accent-main hover:opacity-80 font-semibold">support@feedim.com</a> adresinden
            bize ulaşabilirsiniz.
          </p>
        </div>
      </div>
    </>
  );
}
