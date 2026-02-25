export default function PaymentSecurityContentAz() {
  return (
    <>
      <h1 className="text-2xl sm:text-3xl font-bold mb-3">Ödəniş Təhlükəsizliyi</h1>
      <p className="text-xs text-text-muted mb-10">Son yenilənmə: 21 Fevral 2026</p>

      <div className="space-y-8 text-sm text-text-secondary leading-relaxed">
        <p>
          Feedim olaraq ödəniş təhlükəsizliyinizi ən yüksək səviyyədə saxlamağı öhdəmizə götürürük.
          Bütün ödəniş əməliyyatlarınız sənaye standartı təhlükəsizlik protokolları ilə qorunur.
        </p>

        <section>
          <h2 className="text-lg font-bold text-text-primary mb-3">SSL Şifrələmə</h2>
          <p>
            Feedim platformasındakı bütün məlumat rabitəsi 256-bit SSL (Secure Socket Layer) şifrələməsi
            ilə qorunur. Ödəniş səhifələrimizdə paylaşdığınız bütün məlumatlar şifrələnərək ötürülür
            və üçüncü tərəflərin girişinə bağlıdır.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-text-primary mb-3">3D Secure Doğrulama</h2>
          <p>
            Bütün kredit kartı və bank kartı ödənişləriniz 3D Secure texnologiyası ilə qorunur.
            Ödəniş zamanı bankınız tərəfindən şəxsiyyət doğrulaması aparılır və yalnız təsdiqlənmiş
            əməliyyatlar həyata keçirilir.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-text-primary mb-3">Kart Məlumatlarınızın Təhlükəsizliyi</h2>
          <ul className="list-disc pl-5 space-y-2 mt-3 text-sm text-text-secondary">
            <li>Kredit kartı və bank kartı məlumatlarınız Feedim serverlərində <strong>saxlanılmır</strong>.</li>
            <li>Kart məlumatlarınız yalnız ödəniş anında şifrələnərək birbaşa ödəniş təminatçısına (PayTR) ötürülür.</li>
            <li>PayTR PCI-DSS Level 1 sertifikatına sahib, beynəlxalq təhlükəsizlik standartlarına uyğun ödəniş infrastrukturudur.</li>
            <li>Əməliyyatdan sonra kart məlumatlarınız heç bir yerdə saxlanılmır.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-text-primary mb-3">Dəstəklənən Ödəniş Üsulları</h2>
          <ul className="list-disc pl-5 space-y-2 mt-3 text-sm text-text-secondary">
            <li>Visa</li>
            <li>Mastercard</li>
            <li>American Express</li>
            <li>Troy</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-text-primary mb-3">Geri Ödəmə Əməliyyatları</h2>
          <p>
            Ödəniş ilə bağlı geri ödəmə tələbləriniz geri ödəmə siyasətimiz çərçivəsində nəzərdən keçirilir.
            Təsdiqlənmiş geri ödəmələr ödəniş etdiyiniz karta qaytarılır. Ətraflı məlumat üçün{" "}
            <a href="/help/refund-policy" className="text-accent-main hover:underline">Geri Ödəmə və Ləğv Siyasətimizi</a>{" "}
            nəzərdən keçirə bilərsiniz.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-text-primary mb-3">Dəstək</h2>
          <p>
            Ödəniş ilə bağlı hər hansı problem yaşadığınız halda{" "}
            <strong>contact@feedim.com</strong> ünvanından bizimlə əlaqə saxlaya bilərsiniz.
            Ödəniş problemləriniz ən qısa müddətdə həll olunacaqdır.
          </p>
        </section>
      </div>
    </>
  );
}
