export default function PreInformationContentAz() {
  return (
    <>
      <h1 className="text-2xl sm:text-3xl font-bold mb-3">Ön Məlumatlandırma Formu</h1>
      <p className="text-xs text-text-muted mb-10">Son yenilənmə: 21 Fevral 2026</p>

      <div className="space-y-8 text-sm text-text-secondary leading-relaxed">
        <p>
          Bu ön məlumatlandırma formu, 27.11.2014 tarixli və 29188 saylı Rəsmi Qəzetdə dərc olunan
          Məsafəli Müqavilələr Qaydalarının 5-ci maddəsinə uyğun olaraq, müqavilə bağlanmadan əvvəl
          istehlakçının məlumatlandırılması məqsədilə hazırlanmışdır.
        </p>

        <section>
          <h2 className="text-lg font-bold text-text-primary mb-3">1. Satıcı Məlumatları</h2>
          <ul className="list-none pl-0 space-y-1 mt-2 text-sm text-text-secondary">
            <li><strong>Adı:</strong> Feedim</li>
            <li><strong>Veb Sayt:</strong> feedim.com</li>
            <li><strong>E-poçt:</strong> contact@feedim.com</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-text-primary mb-3">2. Məhsul/Xidmət Məlumatları</h2>
          <p>Feedim platformasında təqdim olunan rəqəmsal məhsul və xidmətlər:</p>
          <ul className="list-disc pl-5 space-y-2 mt-3 text-sm text-text-secondary">
            <li>
              <strong>Jeton Paketləri:</strong> Platforma daxili rəqəmsal valyuta. Məzmun yaradıcılarına
              hədiyyə göndərmək və platforma xüsusiyyətlərindən yararlanmaq üçün istifadə olunur.
            </li>
            <li>
              <strong>Premium Üzvlük:</strong> Aylıq və ya illik abunəlik planları. Reklamsız təcrübə,
              təsdiqlənmiş nişan, təkmil analitika və daha çox xüsusiyyət təklif edir. Super, Pro, Max və
              Business planları mövcuddur.
            </li>
          </ul>
          <p className="mt-3">Bütün qiymətlərə ƏDV (%20) daxildir. Aktual qiymətlər alış səhifəsində göstərilir.</p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-text-primary mb-3">3. Ödəniş və Çatdırılma</h2>
          <ul className="list-disc pl-5 space-y-2 mt-3 text-sm text-text-secondary">
            <li><strong>Dəstəklənən ödəniş üsulları:</strong> Visa, Mastercard, American Express, Troy</li>
            <li><strong>Təhlükəsizlik:</strong> Bütün ödənişlər SSL şifrələməsi və 3D Secure doğrulaması ilə qorunur.</li>
            <li><strong>Ödəniş infrastrukturu:</strong> PayTR (PCI-DSS uyğun)</li>
            <li><strong>Çatdırılma müddəti:</strong> Rəqəmsal məhsullar dərhal, ən gec 48 saat ərzində hesaba təyin olunur.</li>
            <li><strong>Çatdırılma haqqı:</strong> Rəqəmsal məhsul olduğundan çatdırılma haqqı yoxdur.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-text-primary mb-3">4. İmtina Hüququ</h2>
          <p>
            6502 saylı İstehlakçının Qorunması Haqqında Qanunun 15/ğ maddəsinə əsasən, rəqəmsal
            məzmun və xidmətlərin icrası istehlakçının razılığı ilə başlandıqdan sonra imtina hüququ
            istifadə oluna bilməz.
          </p>
          <ul className="list-disc pl-5 space-y-2 mt-3 text-sm text-text-secondary">
            <li>Satın alınan jetonlar və ya premium üzvlük hələ istifadə olunmayıbsa, 14 gün ərzində imtina hüququ istifadə oluna bilər.</li>
            <li>İmtina hüququ istifadə olunduqda, ödəniş ən gec 14 iş günü ərzində eyni ödəniş üsuluna qaytarılır.</li>
            <li>İmtina tələbi contact@feedim.com ünvanına yazılı olaraq göndərilməlidir.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-text-primary mb-3">5. Şikayət və Etiraz</h2>
          <p>
            Məhsul və xidmətlərlə bağlı şikayətlərinizi aşağıdakı kanallar vasitəsilə bildirə bilərsiniz:
          </p>
          <ul className="list-disc pl-5 space-y-2 mt-3 text-sm text-text-secondary">
            <li>E-poçt: contact@feedim.com</li>
            <li>İstehlakçı Hakem Heyətləri (Nazirlik tərəfindən müəyyən edilmiş pul hədləri daxilində)</li>
            <li>İstehlakçı Məhkəmələri</li>
            <li>Ticarət Nazirliyinin vilayət və rayon müdirlikləri</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-text-primary mb-3">6. Şəxsi Məlumatların Qorunması</h2>
          <p>
            Şəxsi məlumatlarınız 6698 saylı Şəxsi Məlumatların Qorunması Qanunu (KVKK) çərçivəsində
            işlənir. Ətraflı məlumat üçün{" "}
            <a href="/help/privacy" className="text-accent-main hover:underline">Məxfilik Siyasətimizi</a> və{" "}
            <a href="/kvkk" className="text-accent-main hover:underline">KVKK Aydınlatma Mətnimizi</a>{" "}
            nəzərdən keçirə bilərsiniz.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-text-primary mb-3">7. Təsdiq Bəyanatı</h2>
          <p>
            Ödəniş əməliyyatını tamamlayaraq; bu ön məlumatlandırma formunu, məsafəli satış müqaviləsini,
            istifadə şərtlərini, imtina hüququ şərtlərini və məxfilik siyasətini oxuduğunuzu,
            başa düşdüyünüzü və qəbul etdiyinizi bəyan etmiş olursunuz.
          </p>
        </section>
      </div>
    </>
  );
}
