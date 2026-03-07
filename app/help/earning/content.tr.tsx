import NewTabLink from "@/components/NewTabLink";

export default function ContentTr() {
  return (
    <>
      <h1 className="text-2xl sm:text-3xl font-bold mb-6">Para Kazanma</h1>
      <div className="space-y-6 text-sm text-text-secondary leading-relaxed">
        <p>
          Feedim, kaliteli içerik üreten yazarlara emeklerinin karşılığını alabilecekleri bir kazanç sistemi sunar.
          İçeriklerinizin okunması ve diğer kullanıcılardan hediye almak yoluyla jeton kazanır ve bu jetonları gerçek paraya dönüştürebilirsiniz.
        </p>

        {/* ── Kimler Kazanabilir ── */}
        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Kimler Kazanabilir?</h2>
        <p>
          Feedim&apos;de para kazanabilmek için aşağıdaki koşulları sağlamanız gerekmektedir:
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Profesyonel hesap:</strong> Hesabınızın profesyonel (creator veya business) hesap türünde olması gerekmektedir</li>
          <li><strong>Para kazanma onayı:</strong> Ayarlar &gt; Para Kazanma bölümünden başvuru yapmanız ve moderatör onayı almanız gerekmektedir</li>
        </ul>
        <p>
          Bu koşulları sağlayan ve başvurusu onaylanan kullanıcılar otomatik olarak kazanç elde etmeye başlar.
        </p>

        {/* ── Kazanç Kaynakları ── */}
        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Kazanç Kaynakları</h2>
        <p>
          Feedim&apos;de birden fazla kazanç kaynağı bulunur: <strong>Premium okuyucuların</strong> içeriklerinizi okuması,
          reklam gelir paylaşımı ve diğer kullanıcılardan hediye almak.
          Premium üyeliğe sahip okuyucuların gerçekleştirdiği premium okumalar jeton kazancı olarak sayılır.
        </p>

        {/* ── Kazanç Hesaplama ── */}
        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Kazanç Hesaplama</h2>
        <p>
          Premium okuyucular içeriğinizi gerçek anlamda okuduğunda hesabınıza <strong>jeton</strong> eklenir.
          Bunun yanı sıra diğer kullanıcıların gönderdiği hediyelerden de jeton kazanırsınız.
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
          <li>Premium okuma sayıları ve oranları</li>
        </ul>

        {/* ── Para Çekme ── */}
        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Para Çekme</h2>
        <p>
          Kazandığınız jetonları nakit olarak çekebilirsiniz. Çekim koşulları, IBAN tanımlama ve
          işlem süreleri hakkında detaylı bilgi için{" "}
          <NewTabLink href="/help/coins" className="text-accent-main hover:opacity-80 font-semibold">Jeton ve Bakiye Sistemi</NewTabLink> sayfasını
          inceleyebilirsiniz.
        </p>

        {/* ── Vergi Bilgisi ── */}
        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Vergi Bilgisi</h2>
        <p>
          Feedim üzerinden elde edilen kazançlara ilişkin vergi yükümlülükleri tamamen kullanıcıya aittir.
          Kullanıcılar, elde ettikleri geliri ilgili vergi mevzuatına uygun şekilde beyan etmekle yükümlüdür.
          Feedim, kullanıcılar adına vergi kesintisi veya beyanı yapmaz.
        </p>

        {/* ── Kazancınızı Artırma İpuçları ── */}
        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Kazancınızı Artırma İpuçları</h2>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Kaliteli içerik üretin:</strong> Derinlikli ve özgün içerikler yazın</li>
          <li><strong>Düzenli yayın yapın:</strong> Tutarlı bir yayın takvimi ile takipçi kitlenizi büyütün</li>
          <li><strong>Etkileşim kurun:</strong> Yorumlara yanıt verin ve toplulukla iletişimde kalın</li>
          <li><strong>SEO optimizasyonu yapın:</strong> Başlık, meta açıklama ve etiketlerinizi optimize edin</li>
          <li><strong>Farklı içerik türlerini deneyin:</strong> Gönderi, video ve moment formatlarını kullanın</li>
        </ul>

        <p className="text-xs text-text-muted mt-8">
            Para kazanma sistemi hakkında sorularınız için{" "}
            <NewTabLink href="/help/contact" className="text-accent-main hover:opacity-80 font-semibold">İletişim</NewTabLink> sayfamızdan
            veya <a href="mailto:help@feedim.com" className="text-accent-main hover:opacity-80 font-semibold">help@feedim.com</a> adresinden
            bize ulaşabilirsiniz.
        </p>
      </div>
    </>
  );
}
