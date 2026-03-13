import Link from "next/link";

export default function ContactContentTr() {
  return (
    <>
      <h1 className="text-2xl sm:text-3xl font-bold mb-6">İletişim</h1>
      <div className="space-y-10">
        <p className="max-w-[720px] text-sm text-text-secondary leading-relaxed">
          Sorularınız, geri bildirimleriniz veya destek talepleriniz için aşağıdaki kanallardan bize ulaşabilirsiniz. Tüm taleplere en kısa süre içerisinde geri dönüş sağlayacağız.
        </p>
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-text-primary">Moderasyon İtirazı ve Teknik Destek</h2>
          <p className="max-w-[720px] text-sm text-text-secondary leading-relaxed">
            Hesabınıza giriş yaptıktan sonra destek talebi oluşturabilirsiniz. Moderasyon kararlarına itiraz etmek veya teknik bir sorun yaşıyorsanız
            {" "}
            <Link href="/settings/support" className="text-accent-main hover:opacity-80 font-semibold">Destek Talebi Oluştur</Link>
            {" "}sayfasını
            {" "}
            kullanın. İtirazınızı karar numarası ile iletişim sayfasından veya içerik moderasyon sayfasından iletebilirsiniz. Destek talepleriniz hesabınız üzerinden takip edilir ve yanıt verildiğinde bildirim alırsınız.
          </p>
        </section>
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-text-primary">E-posta</h2>
          <p className="max-w-[720px] text-sm text-text-secondary leading-relaxed">
            Eğer henüz üye değilseniz veya hesabınıza erişemiyorsanız aşağıdaki e-posta adreslerini kullanın.
          </p>
        </section>
        <section className="space-y-3">
          <div className="space-y-1.5">
            <p className="text-sm font-semibold text-text-secondary">Genel sorular ve iletişim için:</p>
            <a href="mailto:contact@feedim.com" className="text-accent-main hover:opacity-80 font-semibold">contact@feedim.com</a>
          </div>
          <div className="space-y-1.5">
            <p className="text-sm font-semibold text-text-secondary">Ödeme sorunları için:</p>
            <a href="mailto:payment@feedim.com" className="text-accent-main hover:opacity-80 font-semibold">payment@feedim.com</a>
          </div>
          <div className="space-y-1.5">
            <p className="text-sm font-semibold text-text-secondary">Yardım merkezi ve sıkça sorulan sorular:</p>
            <a href="mailto:help@feedim.com" className="text-accent-main hover:opacity-80 font-semibold">help@feedim.com</a>
          </div>
          <div className="space-y-1.5">
            <p className="text-sm font-semibold text-text-secondary">Telif hakları ve içerik kaldırma talepleri için:</p>
            <a href="mailto:copyright@feedim.com" className="text-accent-main hover:opacity-80 font-semibold">copyright@feedim.com</a>
          </div>
        </section>
        <section className="space-y-2">
          <h2 className="text-lg font-bold text-text-primary">Yanıt Süresi</h2>
          <p className="max-w-[720px] text-sm text-text-secondary leading-relaxed">Genellikle iş günlerinde 48 saat içinde tüm sorulara yanıt veriyoruz.</p>
        </section>
      </div>
    </>
  );
}
