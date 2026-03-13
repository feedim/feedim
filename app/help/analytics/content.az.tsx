import NewTabLink from "@/components/NewTabLink";

export default function ContentAz() {
  return (
    <>
      <h1 className="text-2xl sm:text-3xl font-bold mb-6">Analitika Paneli</h1>
      <div className="space-y-6 text-sm text-text-secondary leading-relaxed">
        <p>
          Feedim Analitika Paneli, <strong>Premium üzvlərə</strong> təqdim edilən əhatəli statistika alətidir.
          Məzmunlarınızın performansını ətraflı izləyə, oxucu davranışlarını təhlil edə
          və strateji qərarlar qəbul etmək üçün verilənlərə əsaslanan bilgilər əldə edə bilərsiniz.
        </p>

        <div className="bg-bg-secondary rounded-[15px] p-4">
          <p className="font-semibold text-text-primary text-xs uppercase tracking-wide mb-2">Premium Üzvlük Tələb Olunur</p>
          <p>
            Analitika Paneli yalnız Premium üzvlük sahibi istifadəçilər tərəfindən əlçatandır.
            Pulsuz hesabla analitika səhifəsini açdığınızda &ldquo;Premium Üzvlük Tələb Olunur&rdquo; xəbərdarlığı göstərilir
            və statistikaya giriş təmin edilmir. Premium üzvlük haqqında ətraflı məlumat üçün{" "}
            <NewTabLink href="/settings/premium" className="text-accent-main hover:opacity-80 font-semibold">Premium səhifəsini</NewTabLink> ziyarət edə bilərsiniz.
          </p>
        </div>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Dövr Seçimi</h2>
        <p>
          Analitika panelinin ən yuxarısında yerləşən dövr seçicisi ilə statistikalarınızı fərqli vaxt intervallarında
          nəzərdən keçirə bilərsiniz. Seçdiyiniz dövr bütün metrikləri, qrafikləri və müqayisələri təsir edir.
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>7 gün</strong> &mdash; Son bir həftənin verilənləri</li>
          <li><strong>30 gün</strong> &mdash; Son bir ayın verilənləri (standart)</li>
          <li><strong>90 gün</strong> &mdash; Son üç ayın verilənləri</li>
        </ul>
        <p>
          Hər dövr seçimində seçilən dövrə aid verilənlər əvvəlki ekvivalent dövrə ilə müqayisə edilir
          və dəyişiklik faizləri hesablanır.
        </p>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Ümumi Baxış Metrikləri</h2>
        <p>
          Panelin yuxarı hissəsindəki xülasə kartları, seçilən dövrdəki əsas performans göstəricilərini
          bir baxışda təqdim edir. Hər metrik əvvəlki dövrə ilə müqayisə edilir və artım və ya azalma faizi göstərilir.
        </p>
        <div className="bg-bg-secondary rounded-[15px] p-4 space-y-3">
          <p className="font-semibold text-text-primary text-xs uppercase tracking-wide">İzlənilən Metriklər</p>
          <ul className="list-disc pl-5 space-y-2">
            <li><strong>Baxışlar</strong> &mdash; Məzmunlarınızın toplam oxunma/baxış sayı</li>
            <li><strong>Bəyənmələr</strong> &mdash; Məzmunlarınıza gələn toplam bəyənmə sayı</li>
            <li><strong>Şərhlər</strong> &mdash; Məzmunlarınıza edilən toplam şərh sayı</li>
            <li><strong>Saxlamalar</strong> &mdash; Məzmunlarınızın neçə dəfə saxlanıldığı</li>
            <li><strong>Paylaşımlar</strong> &mdash; Məzmunlarınızın neçə dəfə paylaşıldığı</li>
            <li><strong>Yeni İzləyicilər</strong> &mdash; Seçilən dövrdə qazandığınız yeni izləyici sayı</li>
            <li><strong>Profil Ziyarətləri</strong> &mdash; Profilinizin neçə dəfə ziyarət edildiyi</li>
          </ul>
        </div>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Xülasə Kartı</h2>
        <p>
          Metrik kartlarının üzərində yerləşən xülasə kartı, seçilən dövrdəki üç əsas göstəricini böyük rəqəmlərlə təqdim edir:
          Əhatə (toplam baxış), Qarşılıqlı əlaqə (bəyənmə + şərh + saxlama + paylaşım cəmi) və
          yeni İzləyici sayı. Hər göstərici əvvəlki dövrə ilə müqayisə edilir.
        </p>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Qazanc Kartı</h2>
        <p>
          Qazanc kartı, məzmunlarınızdan əldə etdiyiniz jeton gəlirini ətraflı göstərir.
          Bu kart yalnız <strong>Peşəkar hesab</strong> növünə sahib istifadəçilərə açıqdır;
          standart Premium hesablar qazanc kartını bulanıq və kilidli görür.
        </p>
        <div className="bg-bg-secondary rounded-[15px] p-4 space-y-3">
          <p className="font-semibold text-text-primary text-xs uppercase tracking-wide">Qazanc Metrikləri</p>
          <ul className="list-disc pl-5 space-y-2">
            <li><strong>Jeton Balansı</strong> &mdash; Mövcud jeton balansınız</li>
            <li><strong>Dövr Qazancı</strong> &mdash; Seçilən dövrdə qazandığınız jeton miqdarı</li>
            <li><strong>Toplam Qazanc</strong> &mdash; Hesabınızın toplam qazancı</li>
            <li><strong>Premium Oxumalar</strong> &mdash; Qazanca çevrilən oxuma sayı</li>
          </ul>
        </div>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Ortalama Metriklər</h2>
        <p>
          Sürətli statistika zolağı, məzmunlarınızın ortalama performansını göstərən kompakt göstəricilər təqdim edir.
          Bu göstəricilər üfüqi olaraq sürüşdürülə bilər və bir baxışda ümumi vəziyyətinizi xülasə edir.
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Yazı sayı</strong> &mdash; Toplam dərc edilmiş yazı sayınız</li>
          <li><strong>İzləyici sayı</strong> &mdash; Toplam izləyici sayınız</li>
          <li><strong>Yazı başına baxış</strong> &mdash; Bütün yazılarınızın ortalama baxış sayı</li>
          <li><strong>Ortalama oxuma müddəti</strong> &mdash; Oxucuların məzmunlarınızda keçirdiyi ortalama müddət (dəqiqə)</li>
          <li><strong>Yazı başına bəyənmə</strong> &mdash; Bütün yazılarınızın ortalama bəyənmə sayı</li>
        </ul>

        {/* ── Oxuma Müddəti ── */}
        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Oxuma Müddəti</h2>
        <p>
          Oxuma müddəti, oxucuların məzmunlarınızda nə qədər vaxt keçirdiyini ölçən bir metrikdir.
          Bu verilən həm analitika panelində, həm də hər yazının statistika ekranında göstərilir.
        </p>
        <div className="bg-bg-secondary rounded-[15px] p-4 space-y-3">
          <p className="font-semibold text-text-primary text-xs uppercase tracking-wide">Necə İşləyir?</p>
          <ul className="list-disc pl-5 space-y-2">
            <li>Oxucu yazınızı açdıqda sistem oxuma müddətini və sürüşdürmə faizini avtomatik olaraq qeyd edir</li>
            <li>Analitika panelindəki ortalama oxuma müddəti bütün yazılarınızın ortalamasını dəqiqə ilə göstərir</li>
            <li>Yazı statistikasında isə o yazıya xas ortalama oxuma müddəti yer alır</li>
          </ul>
        </div>
        <div className="bg-bg-secondary rounded-[15px] p-4 space-y-3 mt-3">
          <p className="font-semibold text-text-primary text-xs uppercase tracking-wide">Premium Oxuma</p>
          <p>
            Hər baxış qazanca çevrilmir. Sistem, oxucunun məzmunu həqiqətən oxuyub-oxumadığını
            oxuma müddəti və sürüşdürmə dərinliyi kimi siqnallarla qiymətləndirir. Yalnız kifayət qədər
            oxunan məzmunlar premium oxuma olaraq sayılır və jeton qazancı yaradır.
          </p>
        </div>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Qarşılıqlı Əlaqə Nisbəti</h2>
        <p>
          Qarşılıqlı əlaqə nisbəti, məzmunlarınızı baxan istifadəçilərin nə qədərinin bəyənmə, şərh, saxlama
          və ya paylaşım kimi bir hərəkət etdiyini göstərir. Bu nisbət faiz olaraq hesablanır və
          məzmunlarınızın keyfiyyətini qiymətləndirməyinizə kömək edir.
        </p>
        <div className="bg-bg-secondary rounded-[15px] p-4">
          <p>
            <strong className="text-text-primary">Hesablama:</strong> Qarşılıqlı Əlaqə Nisbəti = (Bəyənmə + Şərh + Saxlama + Paylaşım) / Toplam Baxış x 100.
            Nisbət nə qədər yüksəkdirsə, məzmunlarınız o qədər təsirli və maraqlıdır.
          </p>
        </div>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Gündəlik Qrafik</h2>
        <p>
          Seçilən dövrdəki gündəlik dəyişiklikləri sütun qrafik olaraq görüntüləyə bilərsiniz.
          Qrafik üzərindəki tabları istifadə edərək dörd fərqli metrik arasında keçid edə bilərsiniz:
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Baxışlar</strong> &mdash; Gündəlik baxış trendi</li>
          <li><strong>Bəyənmələr</strong> &mdash; Gündəlik bəyənmə trendi</li>
          <li><strong>Şərhlər</strong> &mdash; Gündəlik şərh trendi</li>
          <li><strong>İzləyicilər</strong> &mdash; Gündəlik yeni izləyici trendi</li>
        </ul>
        <p>
          Qrafigdəki hər sütunun üzərinə gəldikdə müvafiq günün ətraflı sayı və tarixi göstərilir.
          Qrafik altında dövrün toplam sayı və gündəlik ortalaması da yer alır.
        </p>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Pik Saatlar İstilik Xəritəsi</h2>
        <p>
          İstilik xəritəsi, günün 24 saatında məzmunlarınızın nə qədər oxunduğunu vizual olaraq təqdim edir.
          Hər saat aralığı oxuma yoğunluğuna görə açıqdan tündə doğru rəngləndirilir.
        </p>
        <div className="bg-bg-secondary rounded-[15px] p-4 space-y-3">
          <p className="font-semibold text-text-primary text-xs uppercase tracking-wide">İstilik Xəritəsi Necə Oxunur?</p>
          <ul className="list-disc pl-5 space-y-2">
            <li>Tünd rəngli saatlar, məzmunlarınızın ən çox oxunduğu saatları göstərir</li>
            <li>Açıq rəngli və ya boş saatlar, aşağı aktivlik dövrlərini təmsil edir</li>
            <li>Sağ yuxarı küncündə ən yoğun saat məlumatı avtomatik göstərilir</li>
            <li>Bu məlumatı istifadə edərək məzmunlarınızı ən uyğun saatda dərc edə bilərsiniz</li>
          </ul>
        </div>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Həftəlik Gün Paylanması</h2>
        <p>
          Həftənin hansı günlərində məzmunlarınızın daha çox baxıldığını göstərən üfüqi sütun qrafik.
          Bazar ertəsindən Bazara qədər hər günün baxış sayı müqayisəli olaraq təqdim edilir.
          Ən yaxşı performans göstərən gün sağ yuxarı küncündə göstərilir.
        </p>
        <p>
          Həftəlik paylanma, dərc strategiyanızı optimallaşdırmağınıza kömək edir. Ən yoğun günlərdə
          yeni məzmun dərc edərək daha çox oxucuya çata bilərsiniz.
        </p>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Ən Populyar Yazılar Sıralaması</h2>
        <p>
          Seçilən dövrdə ən çox baxılan yazılarınız sıralı siyahı halında göstərilir.
          Hər yazı üçün baxış, bəyənmə, şərh və saxlama sayıları ətraflı təqdim edilir.
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li>İlk 5 yazı standart olaraq göstərilir</li>
          <li>5-dən çox yazınız varsa &ldquo;Bütün yazıları gör&rdquo; düyməsi ilə tam siyahını aça bilərsiniz</li>
          <li>Hər yazının yanında performans çubuğu, ən çox baxılan yazı ilə nisbətləndirilərək göstərilir</li>
          <li>Yazı örtük şəkli, başlığı və ətraflı metrikləri tək sətirdə təqdim edilir</li>
        </ul>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Video Analitikası</h2>
        <p>
          Video analitikası bölməsi, video məzmunlarınızın performansını ətraflı izləməyinizi təmin edir.
          Bu bölmə yalnız <strong>Peşəkar hesab</strong> növünə sahib və ən azı bir video dərc etmiş
          istifadəçilər üçün göstərilir.
        </p>
        <div className="bg-bg-secondary rounded-[15px] p-4 space-y-3">
          <p className="font-semibold text-text-primary text-xs uppercase tracking-wide">Video Metrikləri</p>
          <ul className="list-disc pl-5 space-y-2">
            <li><strong>Toplam izləmə saatı</strong> &mdash; Videolarınızın toplam izləmə müddəti (saat ilə)</li>
            <li><strong>Ortalama izləmə müddəti</strong> &mdash; İzləyicilərin videolarınızda keçirdiyi ortalama müddət</li>
            <li><strong>Ortalama izləmə faizi</strong> &mdash; Videoların ortalama neçə faizinin izləndiyi</li>
            <li><strong>Tamamlama nisbəti</strong> &mdash; Videonu sonuna qədər izləyən istifadəçilərin nisbəti</li>
            <li><strong>Video sayı</strong> &mdash; Toplam dərc edilmiş video sayınız</li>
            <li><strong>Toplam izləyici</strong> &mdash; Videolarınızı izləyən unikal istifadəçi sayı</li>
            <li><strong>Ən çox izlənilən videolar</strong> &mdash; Ən populyar videolarınızın sıralı siyahısı</li>
          </ul>
        </div>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Avtomatik Proqnozlar</h2>
        <p>
          Analitika paneli, verilənlərinizə əsaslanaraq avtomatik proqnozlar və qiymətləndirmələr təqdim edir.
          Bu proqnozlar kifayət qədər verilən olduqda (ən azı 10 baxış və ya 5 qarşılıqlı əlaqə) göstərilir və bunları ehtiva edə bilər:
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li>Qarşılıqlı əlaqə nisbətinizin qiymətləndirilməsi</li>
          <li>Ən çox oxuma alan gün məlumatı</li>
          <li>Oxucularınızın ən aktiv saatı</li>
          <li>Əvvəlki dövrə nisbətən baxış dəyişikliyi</li>
          <li>Yazı başına ortalama baxış məlumatı</li>
        </ul>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">İzləyici Demografiyası</h2>
        <p>
          İzləyici demografiyası bölməsi, izləyicilərinizin coğrafi və demoqrafik paylanmasını vizual olaraq təqdim edir.
        </p>
        <div className="bg-bg-secondary rounded-[15px] p-4 space-y-3">
          <p className="font-semibold text-text-primary text-xs uppercase tracking-wide">Demoqrafik Verilənlər</p>
          <ul className="list-disc pl-5 space-y-2">
            <li><strong>Ölkə paylanması</strong> &mdash; İzləyicilərinizin hansı ölkələrdən gəldiyi (faiz nisbəti ilə)</li>
            <li><strong>Yaş aralıqları</strong> &mdash; İzləyicilərinizin yaş qruplarına görə paylanması</li>
            <li><strong>Cins paylanması</strong> &mdash; İzləyicilərinizin cins nisbətləri</li>
            <li><strong>Aktiv izləyici nisbəti</strong> &mdash; Son dövrdə aktiv olan izləyicilərinizin faizi</li>
          </ul>
        </div>

        <p className="text-xs text-text-muted mt-8">
          Analitika paneli haqqında suallarınız üçün hesabınıza daxil olduqdan sonra{" "}
          <NewTabLink href="/settings/support" className="text-accent-main hover:opacity-80 font-semibold">Dəstək Tələbi Yarat</NewTabLink>{" "}
          səhifəsini istifadə edin. Hesabınıza girişiniz yoxdursa{" "}
          <NewTabLink href="/help/contact" className="text-accent-main hover:opacity-80 font-semibold">Əlaqə</NewTabLink>{" "}
          səhifəmizdəki e-poçt kanallarını və ya <a href="mailto:help@feedim.com" className="text-accent-main hover:opacity-80 font-semibold">help@feedim.com</a>{" "}
          ünvanını istifadə edin.
        </p>
      </div>
    </>
  );
}
