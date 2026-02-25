export default function DistanceSalesContentTr() {
  return (
    <>
      <h1 className="text-2xl sm:text-3xl font-bold mb-3">Mesafeli Satış Sözleşmesi</h1>
      <p className="text-xs text-text-muted mb-10">Son güncelleme: 21 Şubat 2026</p>

      <div className="space-y-8 text-sm text-text-secondary leading-relaxed">
        <section>
          <h2 className="text-lg font-bold text-text-primary mb-3">Madde 1 — Taraflar</h2>
          <p><strong className="text-text-primary">Satıcı:</strong></p>
          <ul className="list-none pl-0 space-y-1 mt-2 text-sm text-text-secondary">
            <li><strong>Unvan:</strong> Feedim</li>
            <li><strong>Web Sitesi:</strong> feedim.com</li>
            <li><strong>E-posta:</strong> contact@feedim.com</li>
          </ul>
          <p className="mt-4"><strong className="text-text-primary">Alıcı:</strong> Feedim platformuna kayıtlı ve satın alma işlemini gerçekleştiren kullanıcıdır. Alıcının bilgileri sipariş sırasında beyan ettiği bilgilerdir.</p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-text-primary mb-3">Madde 2 — Sözleşmenin Konusu</h2>
          <p>
            İşbu sözleşme, 6502 sayılı Tüketicinin Korunması Hakkında Kanun ve Mesafeli Sözleşmeler
            Yönetmeliği hükümleri uyarınca, Alıcının Satıcıya ait feedim.com web sitesi üzerinden
            elektronik ortamda sipariş verdiği dijital ürün ve hizmetlerin satışı ile ilgili tarafların
            hak ve yükümlülüklerini düzenler.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-text-primary mb-3">Madde 3 — Ürün/Hizmet Bilgileri</h2>
          <p>Feedim platformunda satışa sunulan dijital ürün ve hizmetler:</p>
          <ul className="list-disc pl-5 space-y-2 mt-3 text-sm text-text-secondary">
            <li>
              <strong>Jeton (Coin):</strong> Platform içi dijital para birimi. İçerik oluşturuculara hediye göndermek
              ve çeşitli platform özelliklerinden yararlanmak için kullanılır. Farklı paketler halinde satışa sunulur.
            </li>
            <li>
              <strong>Premium Üyelik:</strong> Aylık veya yıllık abonelik planları (Super, Pro, Max, Business).
              Reklamsız deneyim, onaylı rozet, gelişmiş analitik, içerik öne çıkarma ve daha fazla özellik sunar.
            </li>
          </ul>
          <p className="mt-3">
            Tüm fiyatlar KDV (%20) dahildir. Güncel fiyat bilgileri satın alma sayfasında belirtilir.
            Ödeme yöntemi: Kredi/banka kartı ile 3D Secure güvenlikli ödeme (PayTR altyapısı).
            Teslimat yöntemi: Dijital olarak anında hesaba tanımlanır.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-text-primary mb-3">Madde 4 — Cayma Hakkı</h2>
          <p>
            6502 sayılı Kanun&apos;un 15/ğ maddesi uyarınca, dijital içerik ve hizmetlerde cayma hakkı,
            tüketicinin onayı ile hizmetin ifasına başlanmasından sonra kullanılamaz.
          </p>
          <ul className="list-disc pl-5 space-y-2 mt-3 text-sm text-text-secondary">
            <li>
              <strong>Jeton satın alımları:</strong> Satın alınan jetonlar henüz kullanılmamışsa,
              14 gün içinde cayma hakkı kullanılabilir.
            </li>
            <li>
              <strong>Premium üyelik:</strong> Üyelik özellikleri aktif olarak kullanılmaya başlandıktan
              sonra cayma hakkı sona erer. Henüz kullanılmamışsa, satın alma tarihinden itibaren 14 gün
              içinde iade talep edilebilir.
            </li>
          </ul>
          <p className="mt-3">
            Cayma hakkı taleplerinizi <strong>contact@feedim.com</strong> adresine yazılı olarak
            iletebilirsiniz.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-text-primary mb-3">Madde 5 — Ödeme ve Teslimat</h2>
          <ul className="list-disc pl-5 space-y-2 mt-3 text-sm text-text-secondary">
            <li>Tüm ödemeler SSL şifrelemesi ve 3D Secure doğrulaması ile güvenli biçimde gerçekleştirilir.</li>
            <li>Ödeme işlemi PayTR ödeme altyapısı üzerinden yapılır. Kart bilgileri Feedim tarafından saklanmaz.</li>
            <li>Dijital ürün ve hizmetler, ödeme onayı alındıktan sonra en geç 48 saat içinde hesaba tanımlanır.</li>
            <li>Jeton satın alımları genellikle anında, premium üyelik aktivasyonları dakikalar içinde tamamlanır.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-text-primary mb-3">Madde 6 — Tarafların Hak ve Yükümlülükleri</h2>
          <p><strong className="text-text-primary">Alıcı:</strong></p>
          <ul className="list-disc pl-5 space-y-2 mt-3 text-sm text-text-secondary">
            <li>Sipariş sırasında doğru ve güncel bilgiler vermekle yükümlüdür.</li>
            <li>Satın alınan ürün ve hizmetleri yalnızca kişisel kullanım amacıyla kullanabilir.</li>
            <li>Platform kurallarına ve kullanım koşullarına uymakla yükümlüdür.</li>
          </ul>
          <p className="mt-4"><strong className="text-text-primary">Satıcı:</strong></p>
          <ul className="list-disc pl-5 space-y-2 mt-3 text-sm text-text-secondary">
            <li>Satışa sunulan ürün ve hizmetleri eksiksiz ve zamanında teslim etmekle yükümlüdür.</li>
            <li>Kişisel verilerin korunması kapsamında 6698 sayılı KVKK hükümlerine uyar.</li>
            <li>Ödeme güvenliğini sağlamak için gerekli teknik önlemleri alır.</li>
            <li>Hizmet sürekliliğini sağlamak için makul çabayı gösterir.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-text-primary mb-3">Madde 7 — Uyuşmazlık Çözümü</h2>
          <p>
            İşbu sözleşmeden doğan uyuşmazlıklarda İstanbul Mahkemeleri ve İcra Daireleri yetkilidir.
          </p>
          <p className="mt-3">
            Tüketici şikayetlerinde, Bakanlıkça belirlenen parasal sınırlar dahilinde
            Tüketici Hakem Heyetlerine, bu sınırları aşan durumlarda Tüketici Mahkemelerine
            başvurulabilir.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-text-primary mb-3">Madde 8 — Yürürlük</h2>
          <p>
            İşbu sözleşme, Alıcının siparişi onayladığı tarihte yürürlüğe girer. Sipariş onayı ile
            Alıcı, sözleşme şartlarını okuduğunu ve kabul ettiğini beyan eder. İlgili belgeler
            3 yıl süreyle saklanır.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-text-primary mb-3">İletişim</h2>
          <p>
            Sözleşme ile ilgili sorularınız için <strong>contact@feedim.com</strong> adresinden
            bize ulaşabilirsiniz.
          </p>
        </section>
      </div>
    </>
  );
}
