export default function DisclaimerContentAz() {
  return (
    <>
      <h1 className="text-2xl sm:text-3xl font-bold mb-3">Məsuliyyətin Rəddi</h1>
      <p className="text-xs text-text-muted mb-10">Son yenilənmə: 16 Fevral 2026</p>

      <div className="space-y-8 text-sm text-text-secondary leading-relaxed">
        <section>
          <h2 className="text-lg font-bold text-text-primary mb-3">Ümumi</h2>
          <p>
            Feedim, istifadəçilərin paylaşım yazıb video paylaşa bildiyi bir məzmun və video platformasıdır.
            Platforma üzərində dərc olunan bütün paylaşımlar və məzmunlar müvafiq istifadəçilərin
            məsuliyyətindədir.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-text-primary mb-3">İstifadəçi Məzmunları</h2>
          <p>Feedim, istifadəçilər tərəfindən yaradılan məzmunlarla əlaqədar olaraq:</p>
          <ul className="list-disc pl-5 space-y-2 mt-3 text-sm text-text-secondary">
            <li>Məzmunların doğruluğunu, aktuallığını və ya tamlığını zəmanət etmir.</li>
            <li>Məzmunlarda ifadə olunan fikirlər yalnız məzmun sahiblərinə aiddir.</li>
            <li>Məzmunlardan yaranan birbaşa və ya dolayı zərərlərə görə məsuliyyət daşımır.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-text-primary mb-3">Platforma Hüquqları</h2>
          <p>Feedim aşağıdakı hüquqlara malikdir:</p>
          <ul className="list-disc pl-5 space-y-2 mt-3 text-sm text-text-secondary">
            <li>İcma qaydalarına uymayan məzmunları silmə</li>
            <li>Qayda pozuntusu edən hesabları dayandırma və ya sonlandırma</li>
            <li>Platforma xüsusiyyətlərini və şərtlərini dəyişdirmə</li>
            <li>Jeton sistemi qaydalarını yeniləmə</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-text-primary mb-3">Xidmət Təqdimatı</h2>
          <p>Feedim xidməti &quot;olduğu kimi&quot; təqdim olunur:</p>
          <ul className="list-disc pl-5 space-y-2 mt-3 text-sm text-text-secondary">
            <li>Fasiləsiz və ya xətasız işləmə zəmanəti verilmir.</li>
            <li>Texniki problemlər və ya texniki xidmət səbəbilə xidmət müvəqqəti dayandırıla bilər.</li>
            <li>Məlumat itkisinə qarşı tam qoruma zəmanəti verilmir.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-text-primary mb-3">Dəyişikliklər</h2>
          <p>
            Feedim bu məsuliyyətin rəddi bəyanatını istənilən vaxt yeniləmə hüququna malikdir.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-text-primary mb-3">Əlaqə</h2>
          <p>
            Suallarınız üçün{" "}
            <a href="mailto:contact@feedim.com" className="text-accent-main hover:opacity-80 font-semibold">
              contact@feedim.com
            </a>{" "}
            ünvanından bizimlə əlaqə saxlaya bilərsiniz.
          </p>
        </section>
      </div>
    </>
  );
}
