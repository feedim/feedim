import Link from "next/link";

export default function ContentTr() {
  return (
    <>
      <h1 className="text-2xl sm:text-3xl font-bold mb-6">Para Kazanma</h1>
      <div className="space-y-6 text-sm text-text-secondary leading-relaxed">
        <p>
          Feedim, kaliteli içerik üreten yazarlara emeklerinin karşılığını alabilecekleri bir kazanç sistemi sunar.
          İçerikleriniz okundukça jeton kazanır ve bu jetonları gerçek paraya dönüştürebilirsiniz.
        </p>

        {/* ── Kimler Kazanabilir ── */}
        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Kimler Kazanabilir?</h2>
        <p>
          Feedim&apos;de para kazanabilmek için aşağıdaki koşulları sağlamanız gerekmektedir:
        </p>
        <div className="bg-bg-secondary rounded-[15px] p-4 space-y-3">
          <ul className="list-disc pl-5 space-y-2">
            <li><strong>Profesyonel hesap türü:</strong> Hesabınızın profesyonel (yazar) hesap türünde olması gerekmektedir</li>
            <li><strong>Premium üyelik:</strong> Aktif bir Premium aboneliğinizin bulunması gerekmektedir</li>
          </ul>
        </div>
        <p>
          Bu iki koşulu sağlayan kullanıcılar, içeriklerinin okunmasından otomatik olarak kazanç elde etmeye başlar.
        </p>

        {/* ── Kazanç Kaynakları ── */}
        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Kazanç Kaynakları</h2>
        <p>
          Feedim&apos;deki kazanç sistemi, <strong>Premium okuyucuların</strong> içeriklerinizi okumasına dayanır.
          Yalnızca Premium üyeliğe sahip okuyucuların gerçekleştirdiği nitelikli okumalar kazanç olarak sayılır.
        </p>

        {/* ── Kazanç Hesaplama ── */}
        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Kazanç Hesaplama</h2>
        <p>
          Premium okuyucular içeriğinizi gerçek anlamda okuduğunda hesabınıza <strong>jeton</strong> eklenir.
          Jeton, Feedim&apos;in kazanç birimi olup gerçek paraya dönüştürülebilir.
          Kazanılan jetonlar anlık olarak hesabınıza yansır ve analitik panelinizden takip edilebilir.
        </p>

        {/* ── Kazanç Takibi ── */}
        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Kazanç Takibi</h2>
        <p>
          Kazançlarınızı <strong>Analitik</strong> panelinden detaylı olarak takip edebilirsiniz. Analitik panelinde
          aşağıdaki verilere ulaşabilirsiniz:
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li>Toplam kazanılan jeton miktarı</li>
          <li>Günlük, haftalık ve aylık kazanç verileri</li>
          <li>Hangi içeriğin ne kadar kazanç sağladığı</li>
          <li>Nitelikli okuma sayıları ve oranları</li>
        </ul>

        {/* ── Para Çekme ── */}
        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Para Çekme</h2>
        <p>
          Kazandığınız jetonları Türk Lirası olarak çekebilirsiniz. Çekim koşulları, IBAN tanımlama ve
          işlem süreleri hakkında detaylı bilgi için{" "}
          <Link href="/help/coins" className="text-accent-main hover:opacity-80 font-semibold">Jeton ve Bakiye Sistemi</Link> sayfasını
          inceleyebilirsiniz.
        </p>

        {/* ── Vergi Bilgisi ── */}
        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Vergi Bilgisi</h2>
        <div className="bg-bg-secondary rounded-[15px] p-4">
          <p>
            Feedim üzerinden elde edilen kazançlara ilişkin vergi yükümlülükleri tamamen kullanıcıya aittir.
            Kullanıcılar, elde ettikleri geliri ilgili vergi mevzuatına uygun şekilde beyan etmekle yükümlüdür.
            Feedim, kullanıcılar adına vergi kesintisi veya beyanı yapmaz.
          </p>
        </div>

        {/* ── Kazancınızı Artırma İpuçları ── */}
        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Kazancınızı Artırma İpuçları</h2>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Kaliteli içerik üretin:</strong> Derinlikli ve özgün içerikler yazın</li>
          <li><strong>Düzenli yayın yapın:</strong> Tutarlı bir yayın takvimi ile takipçi kitlenizi büyütün</li>
          <li><strong>Etkileşim kurun:</strong> Yorumlara yanıt verin ve toplulukla iletişimde kalın</li>
          <li><strong>SEO optimizasyonu yapın:</strong> Başlık, meta açıklama ve etiketlerinizi optimize edin</li>
          <li><strong>Farklı içerik türlerini deneyin:</strong> Gönderi, video ve moment formatlarını kullanın</li>
        </ul>

        <div className="bg-bg-secondary rounded-[15px] p-5 mt-8">
          <p className="text-xs text-text-muted">
            Para kazanma sistemi hakkında sorularınız için{" "}
            <Link href="/help/contact" className="text-accent-main hover:opacity-80 font-semibold">İletişim</Link> sayfamızdan
            veya <a href="mailto:support@feedim.com" className="text-accent-main hover:opacity-80 font-semibold">support@feedim.com</a> adresinden
            bize ulaşabilirsiniz.
          </p>
        </div>
      </div>
    </>
  );
}
