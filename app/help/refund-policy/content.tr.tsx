export default function RefundPolicyContentTr() {
  return (
    <>
      <h1 className="text-2xl sm:text-3xl font-bold mb-3">İade ve İptal Politikası</h1>
      <p className="text-xs text-text-muted mb-10">Son güncelleme: 21 Şubat 2026</p>

      <div className="space-y-8 text-sm text-text-secondary leading-relaxed">
        <p>
          Feedim olarak müşteri memnuniyetini önemsiyoruz. Aşağıda jeton satın alımları ve premium
          üyelik abonelikleri için geçerli iade ve iptal koşullarını bulabilirsiniz.
        </p>

        <section>
          <h2 className="text-lg font-bold text-text-primary mb-3">1. Jeton Satın Alımları</h2>
          <ul className="list-disc pl-5 space-y-2 mt-3 text-sm text-text-secondary">
            <li>Satın alınan jetonlar dijital ürün niteliğindedir ve varsayılan olarak iade edilemez.</li>
            <li>
              <strong>İstisna:</strong> Satın alınan jetonlardan hiçbiri kullanılmamışsa (hediye gönderilmemişse),
              satın alma tarihinden itibaren 14 gün içinde iade talep edilebilir.
            </li>
            <li>Onaylanan iadeler, güvenli ödeme altyapısı üzerinden işleme alınarak ödeme yapılan karta iade edilir.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-text-primary mb-3">2. Premium Üyelik</h2>
          <ul className="list-disc pl-5 space-y-2 mt-3 text-sm text-text-secondary">
            <li>Premium üyelik özellikleri aktif olarak kullanılmaya başlandıktan sonra iade yapılmaz.</li>
            <li>
              <strong>İstisna:</strong> Üyelik satın alındıktan sonra premium özelliklerin hiçbiri kullanılmamışsa,
              14 gün içinde iade talep edilebilir.
            </li>
            <li>Yıllık premium aboneliklerde, abonelik dönemi başladıktan sonra iade yapılmaz. Kullanılmayan süre için kısmi iade yapılmaz.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-text-primary mb-3">3. Boost Kampanyaları</h2>
          <ul className="list-disc pl-5 space-y-2 mt-3 text-sm text-text-secondary">
            <li>Boost kampanyaları ücretli reklam hizmeti niteliğindedir.</li>
            <li>
              <strong>Henüz başlamamış kampanyalar:</strong> Kampanya başlangıç tarihinden önce iptal edilirse
              tam iade yapılır.
            </li>
            <li>
              <strong>Başlamış veya tamamlanmış kampanyalar:</strong> Aktif olan veya süresi dolmuş
              kampanyalar için iade yapılmaz.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-text-primary mb-3">4. İade Süreci</h2>
          <p>İade talebinizi aşağıdaki adımları izleyerek oluşturabilirsiniz:</p>
          <ol className="list-decimal pl-5 space-y-2 mt-3 text-sm text-text-secondary">
            <li><strong>contact@feedim.com</strong> adresine iade talebinizi iletin.</li>
            <li>İade nedeninizi ve sipariş bilgilerinizi açıklayın.</li>
            <li>Talebiniz 2 iş günü içinde değerlendirilecektir.</li>
            <li>Onaylanan iadeler 1-3 iş günü içinde başlatılır.</li>
          </ol>
          <p className="mt-3 text-xs text-text-muted">İade talepleri güvenli ödeme altyapımız üzerinden işleme alınır.</p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-text-primary mb-3">5. Para İadesi</h2>
          <ul className="list-disc pl-5 space-y-2 mt-3 text-sm text-text-secondary">
            <li>Teknik hata veya mükerrer ödeme gibi durumlarda tam iade yapılır.</li>
            <li>İade, ödeme altyapısı tarafından işleme alınır ve ödeme yapılan karta ortalama 5-10 iş günü içinde yansır.</li>
            <li>Bankanızın işlem süresine bağlı olarak bu süre uzayabilir.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-text-primary mb-3">6. İptal Hakkı</h2>
          <p>
            6502 sayılı Tüketicinin Korunması Hakkında Kanun uyarınca, dijital içeriklerde cayma
            hakkı, tüketicinin onayı ile ifanın başlamasından sonra sona erer. Yukarıda belirtilen
            istisnalar saklıdır.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-text-primary mb-3">7. İletişim</h2>
          <p>
            İade ve iptal ile ilgili tüm sorularınız için <strong>contact@feedim.com</strong> adresinden
            bize ulaşabilirsiniz.
          </p>
        </section>
      </div>
    </>
  );
}
