import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sorumluluk Reddi - Feedim",
  description: "Feedim platformu sorumluluk reddi beyanı.",
  keywords: ["sorumluluk reddi", "feedim disclaimer"],
};

export default function DisclaimerPage() {
  return (
    <>
      <h1 className="text-2xl sm:text-3xl font-bold mb-3">Sorumluluk Reddi</h1>
      <p className="text-xs text-text-muted mb-10">Son güncelleme: 16 Şubat 2026</p>

      <div className="space-y-8 text-sm text-text-secondary leading-relaxed">
        <section>
          <h2 className="text-lg font-bold text-text-primary mb-3">Genel</h2>
          <p>
            Feedim, kullanıcıların gönderi yazıp video paylaşabildiği bir içerik ve video platformudur.
            Platform üzerinde yayınlanan tüm gönderiler ve içerikler, ilgili kullanıcıların
            sorumluluğundadır.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-text-primary mb-3">Kullanıcı İçerikleri</h2>
          <p>Feedim, kullanıcılar tarafından oluşturulan içeriklerle ilgili olarak:</p>
          <ul className="list-disc pl-5 space-y-2 mt-3 text-sm text-text-secondary">
            <li>İçeriklerin doğruluğunu, güncelliğini veya eksiksizliğini garanti etmez.</li>
            <li>İçeriklerde ifade edilen görüşler yalnızca içerik sahiplerine aittir.</li>
            <li>İçeriklerden kaynaklanan doğrudan veya dolaylı zararlardan sorumlu tutulamaz.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-text-primary mb-3">Platform Hakları</h2>
          <p>Feedim aşağıdaki haklara sahiptir:</p>
          <ul className="list-disc pl-5 space-y-2 mt-3 text-sm text-text-secondary">
            <li>Topluluk kurallarına uymayan içerikleri kaldırma</li>
            <li>Kural ihlali yapan hesapları askıya alma veya sonlandırma</li>
            <li>Platform özelliklerini ve koşullarını değiştirme</li>
            <li>Jeton sistemi kurallarını güncelleme</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-text-primary mb-3">Hizmet Sunumu</h2>
          <p>Feedim hizmeti &quot;olduğu gibi&quot; sunulmaktadır:</p>
          <ul className="list-disc pl-5 space-y-2 mt-3 text-sm text-text-secondary">
            <li>Kesintisiz veya hatasız çalışma garantisi verilmemektedir.</li>
            <li>Teknik sorunlar veya bakım nedeniyle hizmet geçici olarak durabilir.</li>
            <li>Veri kaybına karşı tam koruma garantisi verilmemektedir.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-text-primary mb-3">Değişiklikler</h2>
          <p>
            Feedim, bu sorumluluk reddi beyanını herhangi bir zamanda güncelleme hakkına sahiptir.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-text-primary mb-3">İletişim</h2>
          <p>
            Sorularınız için{" "}
            <a href="mailto:contact@feedim.com" className="text-accent-main hover:opacity-80 font-semibold">
              contact@feedim.com
            </a>{" "}
            adresinden bize ulaşabilirsiniz.
          </p>
        </section>
      </div>
    </>
  );
}
