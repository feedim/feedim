export default function ContactContentTr() {
  return (
    <>
      <h1 className="text-2xl sm:text-3xl font-bold mb-6">İletişim</h1>
      <div className="space-y-8">
        <p className="text-sm text-text-secondary leading-relaxed">Sorularınız, geri bildirimleriniz veya destek talepleriniz için aşağıdaki kanallardan bize ulaşabilirsiniz. Tüm taleplere en kısa süre içerisinde geri dönüş sağlayacağız.</p>
        <div className="rounded-radius-md p-8 space-y-6">
          <div className="mb-4">
            <h2 className="text-lg font-bold text-text-primary">E-posta</h2>
          </div>
          <div>
            <p className="text-sm text-text-secondary mb-2 font-semibold">Genel sorular ve iletişim için:</p>
            <a href="mailto:contact@feedim.com" className="text-accent-main hover:opacity-80 font-semibold">contact@feedim.com</a>
          </div>
          <div>
            <p className="text-sm text-text-secondary mb-2 font-semibold">Ödeme sorunları için:</p>
            <a href="mailto:payment@feedim.com" className="text-accent-main hover:opacity-80 font-semibold">payment@feedim.com</a>
          </div>
          <div>
            <p className="text-sm text-text-secondary mb-2 font-semibold">Yardım merkezi ve sıkça sorulan sorular:</p>
            <a href="mailto:help@feedim.com" className="text-accent-main hover:opacity-80 font-semibold">help@feedim.com</a>
          </div>
          <div>
            <p className="text-sm text-text-secondary mb-2 font-semibold">Telif hakları ve içerik kaldırma talepleri için:</p>
            <a href="mailto:copyright@feedim.com" className="text-accent-main hover:opacity-80 font-semibold">copyright@feedim.com</a>
          </div>
        </div>
        <div className="rounded-radius-md p-8">
          <h2 className="text-lg font-bold text-text-primary mb-4">Yanıt Süresi</h2>
          <p className="text-sm text-text-secondary leading-relaxed">Genellikle iş günlerinde 24 saat içinde tüm sorulara yanıt veriyoruz.</p>
        </div>
      </div>
    </>
  );
}
