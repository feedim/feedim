export default function RefundPolicyContentAz() {
  return (
    <>
      <h1 className="text-2xl sm:text-3xl font-bold mb-3">Geri Ödəmə və Ləğv Siyasəti</h1>
      <p className="text-xs text-text-muted mb-10">Son yenilənmə: 21 Fevral 2026</p>

      <div className="space-y-8 text-sm text-text-secondary leading-relaxed">
        <p>
          Feedim olaraq müştəri məmnuniyyətinə dəyər veririk. Aşağıda jeton alışları və premium
          üzvlük abunəlikləri üçün keçərli geri ödəmə və ləğv şərtlərini tapa bilərsiniz.
        </p>

        <section>
          <h2 className="text-lg font-bold text-text-primary mb-3">1. Jeton Alışları</h2>
          <ul className="list-disc pl-5 space-y-2 mt-3 text-sm text-text-secondary">
            <li>Satın alınan jetonlar rəqəmsal məhsul xarakterindədir və standart olaraq geri ödənilmir.</li>
            <li>
              <strong>İstisna:</strong> Satın alınan jetonlardan heç biri istifadə olunmayıbsa (hədiyyə göndərilməyibsə),
              alış tarixindən etibarən 14 gün ərzində geri ödəmə tələb oluna bilər.
            </li>
            <li>Təsdiqlənmiş geri ödəmələr ödəniş edilən karta qaytarılır.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-text-primary mb-3">2. Premium Üzvlük</h2>
          <ul className="list-disc pl-5 space-y-2 mt-3 text-sm text-text-secondary">
            <li>Premium üzvlük xüsusiyyətləri aktiv olaraq istifadəyə başlandıqdan sonra geri ödəmə edilmir.</li>
            <li>
              <strong>İstisna:</strong> Üzvlük alındıqdan sonra premium xüsusiyyətlərin heç biri istifadə olunmayıbsa,
              14 gün ərzində geri ödəmə tələb oluna bilər.
            </li>
            <li>İllik planlarda istifadə olunmamış müddət üçün qismən geri ödəmə nəzərdən keçirilə bilər.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-text-primary mb-3">3. Geri Ödəmə Prosesi</h2>
          <p>Geri ödəmə tələbinizi aşağıdakı addımları izləyərək yarada bilərsiniz:</p>
          <ol className="list-decimal pl-5 space-y-2 mt-3 text-sm text-text-secondary">
            <li><strong>contact@feedim.com</strong> ünvanına geri ödəmə tələbinizi göndərin.</li>
            <li>Geri ödəmə səbəbinizi və sifariş məlumatlarınızı açıqlayın.</li>
            <li>Tələbiniz 2 iş günü ərzində nəzərdən keçiriləcəkdir.</li>
            <li>Təsdiqlənmiş geri ödəmələr 1-3 iş günü ərzində başladılır.</li>
          </ol>
        </section>

        <section>
          <h2 className="text-lg font-bold text-text-primary mb-3">4. Pul Geri Ödəməsi</h2>
          <ul className="list-disc pl-5 space-y-2 mt-3 text-sm text-text-secondary">
            <li>Texniki xəta və ya təkrarlanan ödəniş kimi hallarda tam geri ödəmə edilir.</li>
            <li>Geri ödəmə ödəniş edilən karta 5-10 iş günü ərzində əks olunur.</li>
            <li>Bankınızın əməliyyat müddətindən asılı olaraq bu müddət uzana bilər.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-text-primary mb-3">5. Ləğv Hüququ</h2>
          <p>
            6502 saylı İstehlakçının Qorunması Haqqında Qanuna uyğun olaraq, rəqəmsal məzmunlarda
            imtina hüququ istehlakçının razılığı ilə xidmətin göstərilməsinə başlandıqdan sonra sona
            çatır. Yuxarıda qeyd olunan istisnalar qüvvədədir.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-text-primary mb-3">6. Əlaqə</h2>
          <p>
            Geri ödəmə və ləğv ilə bağlı bütün suallarınız üçün <strong>contact@feedim.com</strong> ünvanından
            bizimlə əlaqə saxlaya bilərsiniz.
          </p>
        </section>
      </div>
    </>
  );
}
