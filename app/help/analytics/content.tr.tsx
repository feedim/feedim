import NewTabLink from "@/components/NewTabLink";

export default function ContentTr() {
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
        <div className="bg-bg-secondary rounded-[15px] p-4">
          <p>
            <strong>Analitik Paneli yalnızca Premium üyelik sahibi kullanıcılar tarafından erişilebilir.</strong>
            Ücretsiz hesapla analitik sayfasını açtığınızda Premium Üyelik Gerekli uyarısı görüntülenir
            ve istatistiklere erişim izni verilmeyebilir. Premium üyelik hakkında detaylı bilgi için{" "}
            <NewTabLink href="/settings/premium" className="text-accent-main hover:opacity-80 font-semibold">Premium sayfasını</NewTabLink> ziyaret edebilirsiniz.
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
        <div className="bg-bg-secondary rounded-[15px] p-4 space-y-3">
          <p className="font-semibold text-text-primary text-xs uppercase tracking-wide">Takip Edilen Metrikler</p>
          <ul className="list-disc pl-5 space-y-2">
            <li><strong>Görüntülenme</strong> &mdash; İçeriklerinizin toplam okunma/görüntülenme sayısı</li>
            <li><strong>Beğeni</strong> &mdash; İçeriklerinize gelen toplam beğeni sayısı</li>
            <li><strong>Yorum</strong> &mdash; İçeriklerinize yapılan toplam yorum sayısı</li>
            <li><strong>Kaydetme</strong> &mdash; İçeriklerinizin kaç kez kaydedildiği</li>
            <li><strong>Paylaşım</strong> &mdash; İçeriklerinizin kaç kez paylaşıldığı</li>
            <li><strong>Yeni Takipçi</strong> &mdash; Seçilen dönemde kazandığınız yeni takipçi sayısı</li>
            <li><strong>Profil Ziyaretleri</strong> &mdash; Profilinizin kaç kez ziyaret edildiği</li>
          </ul>
        </div>

        {/* ── Özet Kart ── */}
        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Özet Kart</h2>
        <p>
          Metrik kartlarının üzerinde yer alan özet kart, seçilen dönemdeki üç temel göstergeyi büyük rakamlarla sunar:
          Erişim (toplam görüntülenme), Etkileşim (beğeni + yorum + kaydetme + paylaşım toplamı) ve
          yeni Takipçi sayısı. Her gösterge bir önceki dönemle karşılaştırılır.
        </p>

        {/* ── Kazanç Kartı ── */}
        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Kazanç Kartı</h2>
        <p>
          Kazanç kartı, içeriklerinizden elde ettiğiniz jeton gelirini detaylı olarak gösterir.
          Bu kart yalnızca <strong>Profesyonel hesap</strong> türüne sahip kullanıcılara açıktır;
          standart Premium hesaplar kazanç kartını bulanık ve kilitli olarak görür.
        </p>
        <div className="bg-bg-secondary rounded-[15px] p-4 space-y-3">
          <p className="font-semibold text-text-primary text-xs uppercase tracking-wide">Kazanç Metrikleri</p>
          <ul className="list-disc pl-5 space-y-2">
            <li><strong>Jeton Bakiyesi</strong> &mdash; Mevcut jeton bakiyeniz</li>
            <li><strong>Dönemlik Kazanç</strong> &mdash; Seçilen dönemde kazandığınız jeton miktarı</li>
            <li><strong>Toplam Kazanç</strong> &mdash; Hesabınızın toplam kazancı</li>
            <li><strong>Premium Okuma</strong> &mdash; Kazanca dönüşen okuma sayısı</li>
          </ul>
        </div>

        {/* ── Ortalama Metrikler ── */}
        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Ortalama Metrikler</h2>
        <p>
          Hızlı istatistik şeridi, içeriklerinizin ortalama performansını gösteren kompakt göstergeler sunar.
          Bu göstergeler yatay olarak kaydırılabilir ve tek bakışta genel durumunuzu özetler.
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Gönderi sayısı</strong> &mdash; Toplam yayınlanmış gönderi sayınız</li>
          <li><strong>Takipçi sayısı</strong> &mdash; Toplam takipçi sayınız</li>
          <li><strong>Gönderi başına görüntülenme</strong> &mdash; Tüm gönderilerinizin ortalama görüntülenme sayısı</li>
          <li><strong>Ortalama okuma süresi</strong> &mdash; Okuyucuların içeriklerinizde geçirdiği ortalama süre (dakika)</li>
          <li><strong>Gönderi başına beğeni</strong> &mdash; Tüm gönderilerinizin ortalama beğeni sayısı</li>
        </ul>

        {/* ── Okuma Süresi ── */}
        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Okuma Süresi</h2>
        <p>
          Okuma süresi, okuyucuların içeriklerinizde ne kadar zaman geçirdiğini ölçen bir metriktir.
          Bu veri hem analitik panelinde hem de her gönderinin istatistik ekranında görüntülenir.
        </p>
        <div className="bg-bg-secondary rounded-[15px] p-4 space-y-3">
          <p className="font-semibold text-text-primary text-xs uppercase tracking-wide">Nasıl Çalışır?</p>
          <ul className="list-disc pl-5 space-y-2">
            <li>Bir okuyucu gönderinizi açtığında sistem okuma süresini ve kaydırma yüzdesini otomatik olarak kaydeder</li>
            <li>Analitik panelindeki ortalama okuma süresi tüm gönderilerinizin ortalamasını dakika cinsinden gösterir</li>
            <li>Gönderi istatistiklerinde ise o gönderiye özel ortalama okuma süresi yer alır</li>
          </ul>
        </div>
        <p>
          Her görüntülenme kazanca dönüşmez. Sistem, okuyucunun içeriği gerçekten okuyup okumadığını
          okuma süresi ve kaydırma derinliği gibi sinyallerle değerlendirir. Yalnızca yeterli düzeyde
          okunan içerikler premium okuma olarak sayılır ve jeton kazancı oluşturur.
        </p>

        {/* ── Etkileşim Oranı ── */}
        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Etkileşim Oranı</h2>
        <p>
          Etkileşim oranı, içeriklerinizi görüntüleyen kullanıcıların ne kadarının beğeni, yorum, kaydetme
          veya paylaşım gibi bir eylemde bulunduğunu gösterir. Bu oran yüzde olarak hesaplanır ve
          içeriklerinizin kalitesini değerlendirmenize yardımcı olur.
        </p>

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
        <div className="bg-bg-secondary rounded-[15px] p-4 space-y-3">
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
          <li>5&apos;ten fazla gönderiniz varsa <strong>&ldquo;Tüm gönderileri gör&rdquo;</strong> butonu ile tam listeyi açabilirsiniz</li>
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
        <div className="bg-bg-secondary rounded-[15px] p-4 space-y-3">
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
          Bu öngörüler yeterli veri olduğunda (en az 10 görüntülenme veya 5 etkileşim) görüntülenir ve şunları içerebilir:
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li>Etkileşim oranınızın değerlendirmesi</li>
          <li>En çok okuma alan gün bilgisi</li>
          <li>Okuyucularınızın en aktif saati</li>
          <li>Önceki döneme kıyasla görüntülenme değişimi</li>
          <li>Gönderi başına ortalama görüntülenme bilgisi</li>
        </ul>

        {/* ── Takipçi Demografisi ── */}
        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Takipçi Demografisi</h2>
        <p>
          Takipçi demografisi bölümü, takipçilerinizin coğrafi ve demografik dağılımını görsel olarak sunar.
        </p>
        <div className="bg-bg-secondary rounded-[15px] p-4 space-y-3">
          <p className="font-semibold text-text-primary text-xs uppercase tracking-wide">Demografik Veriler</p>
          <ul className="list-disc pl-5 space-y-2">
            <li><strong>Ülke dağılımı</strong> &mdash; Takipçilerinizin hangi ülkelerden geldiği (yüzde oranı ile)</li>
            <li><strong>Yaş aralıkları</strong> &mdash; Takipçilerinizin yaş gruplarına göre dağılımı</li>
            <li><strong>Cinsiyet dağılımı</strong> &mdash; Takipçilerinizin cinsiyet oranları</li>
            <li><strong>Aktif takipçi oranı</strong> &mdash; Son dönemde aktif olan takipçilerinizin yüzdesi</li>
          </ul>
        </div>

        <p className="text-xs text-text-muted mt-8">
            Analitik paneli hakkında sorularınız için{" "}
            <NewTabLink href="/help/contact" className="text-accent-main hover:opacity-80 font-semibold">İletişim</NewTabLink> sayfamızdan
            veya <a href="mailto:help@feedim.com" className="text-accent-main hover:opacity-80 font-semibold">help@feedim.com</a> adresinden
            bize ulaşabilirsiniz.
        </p>
      </div>
    </>
  );
}
