import Link from "next/link";

export default function ContentTr() {
  return (
    <>
      <h1 className="text-2xl sm:text-3xl font-bold mb-6">Jeton ve Bakiye Sistemi</h1>
      <div className="space-y-6 text-sm text-text-secondary leading-relaxed">
        <p>
          Feedim&apos;in jeton sistemi, içerik üreticilerinin emeklerinin karşılığını almasını sağlayan
          sanal para birimi sistemidir. Bu sayfa, jetonların nasıl kazanılacağını, satın alınacağını,
          kullanılacağını ve çekileceğini detaylı olarak açıklar.
        </p>

        {/* ── Jeton Nedir ── */}
        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Jeton Nedir?</h2>
        <p>
          Jeton, Feedim&apos;in sanal para birimidir. İçerik üreticileri, gönderileri okunduğunda jeton
          kazanır; okuyucular ise jeton satın alarak içerik üreticilerini destekler. Jeton sistemi,
          kaliteli içerik üretimini teşvik etmek ve içerik üreticilerini ödüllendirmek amacıyla
          tasarlanmıştır.
        </p>
        {/* ── Jeton Nasıl Kazanılır ── */}
        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Jeton Nasıl Kazanılır?</h2>
        <p>
          Feedim&apos;de jeton kazanmak için içerik üretmeniz ve bu içeriklerin Premium aboneler
          tarafından gerçek anlamda okunması yeterlidir. Sistem, gerçek okumaları otomatik olarak doğrular
          ve kazancınızı hesabınıza yansıtır.
        </p>

        {/* ── Jeton Satın Alma ── */}
        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Jeton Satın Alma</h2>
        <p>
          Okuyucular, içerik üreticilerini desteklemek ve platformdaki özellikleri kullanmak için
          jeton satın alabilir. Jeton paketleri farklı miktarlarda sunulur ve büyük paketlerde bonus
          jetonlar kazanılır.
        </p>
        <div className="bg-bg-secondary rounded-[15px] p-4 space-y-3">
          <p className="font-semibold text-text-primary text-xs uppercase tracking-wide">Paketler ve Bonuslar</p>
          <ul className="list-disc pl-5 space-y-2">
            <li>Farklı bütçelere uygun jeton paketleri mevcuttur</li>
            <li>Daha büyük paketler satın alındığında <strong>bonus jeton</strong> kazanılır</li>
            <li>Paket detaylarını{" "}
              <Link href="/coins" className="text-accent-main hover:opacity-80 font-semibold">Jeton Sayfası</Link>&apos;ndan
              görüntüleyebilirsiniz
            </li>
          </ul>
        </div>
        <div className="bg-bg-secondary rounded-[15px] p-4 space-y-3 mt-3">
          <p className="font-semibold text-text-primary text-xs uppercase tracking-wide">Ödeme Güvenliği</p>
          <ul className="list-disc pl-5 space-y-2">
            <li>Tüm ödemeler <strong>SSL şifreleme</strong> ile korunur</li>
            <li><strong>3D Secure</strong> doğrulama ile güvenli ödeme yapılır</li>
            <li>Kart bilgileriniz Feedim sunucularında saklanmaz</li>
            <li>Detaylı bilgi için{" "}
              <Link href="/help/payment-security" className="text-accent-main hover:opacity-80 font-semibold">Ödeme Güvenliği</Link> sayfasını
              inceleyebilirsiniz
            </li>
          </ul>
        </div>

        {/* ── Jeton Bakiyesi ── */}
        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Jeton Bakiyesi</h2>
        <p>
          Mevcut jeton bakiyenizi ve kazanım geçmişinizi kolayca takip edebilirsiniz.
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li>Profil sayfanızdaki bakiye göstergesinden anlık jeton bakiyenizi görebilirsiniz</li>
          <li><Link href="/coins" className="text-accent-main hover:opacity-80 font-semibold">Jeton Sayfası</Link>&apos;ndan
            detaylı bakiye bilgisi, kazanım geçmişi ve satın alma geçmişinizi inceleyebilirsiniz</li>
        </ul>

        {/* ── Jeton Çekimi ── */}
        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Jeton Çekimi (Nakde Çevirme)</h2>
        <p>
          Kazandığınız jetonları belirli koşullar dahilinde Türk Lirası olarak çekebilirsiniz.
        </p>
        <div className="bg-bg-secondary rounded-[15px] p-4 space-y-3">
          <p className="font-semibold text-text-primary text-xs uppercase tracking-wide">Çekim Koşulları</p>
          <ul className="list-disc pl-5 space-y-2">
            <li>Minimum çekim miktarı: <strong>100 jeton</strong> (10 TL)</li>
            <li>Çekim için hesabınıza <strong>IBAN bilgisi</strong> tanımlamanız gereklidir</li>
            <li>Çekim talepleri <strong>iş günlerinde</strong> işlenir</li>
            <li>Çekim tutarı belirttiğiniz IBAN numarasına havale/EFT yoluyla gönderilir</li>
          </ul>
        </div>

        {/* ── Jeton Kullanım Alanları ── */}
        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Jeton Kullanım Alanları</h2>
        <p>
          Jetonlar, Feedim platformunda çeşitli amaçlarla kullanılabilir:
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li>İçerik okuma desteği &mdash; Premium okuyucu olarak içerik üreticilerini destekleme</li>
          <li>Nakde çevirme &mdash; Kazanılan jetonları Türk Lirası olarak çekme</li>
          <li>Platform içi özellikler &mdash; Feedim&apos;in sunduğu ek özelliklerden yararlanma</li>
        </ul>

        {/* ── Kötüye Kullanım ── */}
        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Kötüye Kullanım ve Yaptırımlar</h2>
        <p>
          Feedim, jeton sisteminin adil kullanımını sağlamak için gelişmiş tespit mekanizmalarına
          sahiptir. Aşağıdaki davranışlar kötüye kullanım olarak değerlendirilir:
        </p>
        <div className="bg-bg-secondary rounded-[15px] p-4 space-y-3">
          <ul className="list-disc pl-5 space-y-2">
            <li><strong>Sahte okuma</strong> &mdash; Gerçek okuma olmadan jeton kazanmaya çalışmak</li>
            <li><strong>Bot kullanımı</strong> &mdash; Otomatik araçlar ile yapay okuma oluşturmak</li>
            <li><strong>Çoklu hesap kötüye kullanımı</strong> &mdash; Birden fazla hesapla kendi içeriklerini okutmak</li>
            <li><strong>Koordineli manipülasyon</strong> &mdash; Diğer kullanıcılarla anlaşarak sahte okuma üretmek</li>
          </ul>
        </div>
        <p className="mt-3">
          Kötüye kullanım tespit edildiğinde aşağıdaki yaptırımlar uygulanır:
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li>Haksız kazanılmış jetonlar <strong>iptal</strong> edilir</li>
          <li>Hesap geçici veya kalıcı olarak <strong>askıya</strong> alınır</li>
          <li>Bekleyen çekim talepleri iptal edilir</li>
          <li>Tekrarlayan ihlallerde hesap kalıcı olarak kapatılabilir</li>
        </ul>

        {/* ── Jeton Sayfası Yönlendirme ── */}
        <div className="bg-bg-secondary rounded-[15px] p-5 mt-8 flex flex-col gap-3">
          <p className="text-sm text-text-primary font-semibold">
            Jeton bakiyenizi görüntülemek, jeton satın almak veya çekim talebi oluşturmak için:
          </p>
          <Link
            href="/coins"
            className="text-accent-main hover:opacity-80 font-semibold text-sm"
          >
            Jeton Sayfasına Git &rarr;
          </Link>
        </div>

        <div className="bg-bg-secondary rounded-[15px] p-5 mt-8">
          <p className="text-xs text-text-muted">
            Jeton sistemi hakkında sorularınız için{" "}
            <Link href="/help/contact" className="text-accent-main hover:opacity-80 font-semibold">İletişim</Link> sayfamızdan
            veya <a href="mailto:support@feedim.com" className="text-accent-main hover:opacity-80 font-semibold">support@feedim.com</a> adresinden
            bize ulaşabilirsiniz.
          </p>
        </div>
      </div>
    </>
  );
}
