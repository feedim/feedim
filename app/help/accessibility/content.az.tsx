import Link from "next/link";

export default function ContentAz() {
  return (
    <>
      <h1 className="text-2xl sm:text-3xl font-bold mb-6">Əlçatanlıq</h1>
      <div className="space-y-6 text-sm text-text-secondary leading-relaxed">
        <p>
          Feedim, hamı üçün əlçatan bir platform olmağı hədəfləyir. Fiziki qabiliyyətlərdən,
          cihaz növündən və ya internet bağlantısından asılı olmayaraq bütün istifadəçilərimizin platformumuzu
          rahat istifadə edə bilməsini təmin etmək prioritetlərimiz arasındadır. Əlçatanlıq, Feedim üçün
          davamlı bir inkişaf prosesidir.
        </p>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Tema Dəstəyi</h2>
        <p>
          Feedim, fərqli görmə ehtiyaclarına uyğun olaraq dörd fərqli tema seçimi təqdim edir:
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Açıq rejim:</strong> Aydınlıq mühitlər üçün optimallaşdırılmış, yüksək oxunaqlılıq təqdim edən tema</li>
          <li><strong>Qaranlıq rejim:</strong> Az işıqlı mühitlərdə göz yorğunluğunu azaldan qaranlıq tema</li>
          <li><strong>Dim rejim:</strong> Açıq və qaranlıq arasında, daha yumşaq tonlarla göz rahatlığı təmin edən ara tema</li>
          <li><strong>Sistem rejimi:</strong> Cihazınızın sistem tema üstünlüyünə avtomatik uyğunlaşan rejim</li>
        </ul>
        <p>
          Tema üstünlüklərinizi parametrlər səhifəsindən istədiyiniz zaman dəyişdirə bilərsiniz.
        </p>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Responsive Dizayn</h2>
        <p>
          Feedim, bütün cihaz növlərində problemsiz işləyəcək şəkildə dizayn edilmişdir:
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Mobil cihazlar:</strong> Telefon ekranlarında tam uyğun və toxunma optimallaşdırılmış interfeys</li>
          <li><strong>Planşet:</strong> Orta ölçülü ekranlar üçün optimallaşdırılmış düzən</li>
          <li><strong>Masaüstü:</strong> Geniş ekranlarda tam xüsusiyyətli və səmərəli istifadə təcrübəsi</li>
        </ul>
        <p>
          Platform, ekran ölçüsünə görə avtomatik uyğunlaşır və bütün cihazlarda ardıcıl
          təcrübə təqdim edir.
        </p>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Klaviatura Naviqasiyası</h2>
        <p>
          Feedim-in bütün xüsusiyyətləri klaviatura ilə əlçatandır. Siçan istifadə etmədən platformun bütün funksiyalarını
          klaviatura qısayolları ilə istifadə edə bilərsiniz. Mövcud klaviatura qısayollarını görmək üçün
          istənilən səhifədə <strong>?</strong> düyməsinə basa bilərsiniz.
        </p>
        <div className="bg-bg-secondary rounded-[15px] p-4">
          <p>
            Klaviatura qısayolları siyahısına giriş: İstənilən səhifədə <strong className="text-text-primary">?</strong> düyməsinə basın.
            Tab düyməsi ilə səhifədəki elementlər arasında gəzə, Enter düyməsi ilə seçim edə bilərsiniz.
          </p>
        </div>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Mətn Ölçüsü</h2>
        <p>
          Feedim, brauzerinizin zoom xüsusiyyətini tam dəstəkləyir. Mətn ölçüsünü böyütmək və ya
          kiçiltmək üçün brauzerinizin zoom xüsusiyyətini istifadə edə bilərsiniz (adətən Ctrl/Cmd + və ya -).
          Platform, zoom səviyyəsinə görə avtomatik uyğunlaşır və məzmun oxunaqlılığı qorunur.
        </p>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Şəkil Alternativləri</h2>
        <p>
          Feedim, şəkillərə alternativ mətn (alt text) dəstəyi təqdim edir. Məzmun yaradıcıları
          şəkillərinə açıqlayıcı alt mətn əlavə edə bilər. Bu sayədə ekran oxuyucu istifadə edən istifadəçilər
          şəkillərin məzmununu anlaya bilər. Platform, alt mətn əlavə edilməsini təşviq edir.
        </p>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Rəng Kontrastı</h2>
        <p>
          Feedim interfeysi, <strong>WCAG (Web Content Accessibility Guidelines)</strong> standartlarına uyğun
          kontrast nisbətləri ilə dizayn edilmişdir. Mətn və arxa plan arasındakı kontrast, bütün tema seçimlərində
          oxunaqlılıq üçün kifayət qədər səviyyədə saxlanılır. Bu sayədə görmə çətinliyi yaşayan istifadəçilər
          də məzmunları rahat oxuya bilər.
        </p>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Ekran Oxuyucu Uyğunluğu</h2>
        <p>
          Feedim, ekran oxuyucu proqram təminatları ilə uyğun olacaq şəkildə <strong>semantic HTML</strong> strukturu
          istifadə edir. Səhifə başlıqları, naviqasiya elementləri, formalar və düymələr ekran oxuyucuların
          düzgün şəkildə şərh edə biləcəyi semantik işarələmələrlə yaradılmışdır. ARIA etiketləri
          lazım olan yerlərdə istifadə edilərək əlçatanlıq artırılmışdır.
        </p>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Video Əlçatanlığı</h2>
        <p>
          Feedim video oynadıcısı, bütün istifadəçilər üçün əlçatan kontroller təqdim edir:
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li>Oynat/dayandır, səs parametri və tam ekran kontrolləri</li>
          <li>Klaviatura ilə video kontrol dəstəyi</li>
          <li>Video irəliləmə çubuğu ilə mövqe tənzimləmə</li>
        </ul>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Davamlı Yaxşılaşdırma</h2>
        <p>
          Əlçatanlıq, Feedim üçün davamlı bir inkişaf prosesidir. İstifadəçilərimizdən gələn geri
          bildirişlər doğrultusunda platformumuzu davamlı olaraq daha əlçatan etmək üçün
          çalışırıq. Əlçatanlıq standartlarındakı yeniləmələri izləyirik və platformumuza
          inteqrasiya edirik.
        </p>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Geri Bildiriş</h2>
        <p>
          Əlçatanlıq mövzusunda təklifləriniz, qarşılaşdığınız problemlər və ya yaxşılaşdırma tələbləriniz
          bizim üçün çox dəyərlidir. Platformumuzun əlçatanlığını artırmağımıza kömək etmək üçün
          geri bildirişlərinizi bizə çatdıra bilərsiniz.
        </p>

        <div className="bg-bg-secondary rounded-[15px] p-5 mt-8">
          <p className="text-xs text-text-muted">
            Əlçatanlıq haqqında suallarınız və təklifləriniz üçün{" "}
            <Link href="/help/contact" className="text-accent-main hover:opacity-80 font-semibold">Əlaqə</Link> səhifəmizdən
            və ya <a href="mailto:support@feedim.com" className="text-accent-main hover:opacity-80 font-semibold">support@feedim.com</a> ünvanından
            bizə müraciət edə bilərsiniz.
          </p>
        </div>
      </div>
    </>
  );
}
