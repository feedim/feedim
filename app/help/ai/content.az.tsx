import NewTabLink from "@/components/NewTabLink";

export default function ContentAz() {
  return (
    <>
      <h1 className="text-2xl sm:text-3xl font-bold mb-6">AI</h1>
      <div className="space-y-6 text-sm text-text-secondary leading-relaxed">
        <p>
          Feedim AI, platformdakı məzmunların təhlükəsizliyini və keyfiyyətini artırmaq üçün nəzərdə tutulmuş süni intellekt dəstəkli bir sistemdir.
          AI, məzmun moderasiyasından SEO istehsalına, müəllif hüququ yoxlamasından profil xalı hesablamasına qədər bir çox sahədə istifadə olunur.
        </p>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Süni İntellektlə Yaradılmış Məzmunlar</h2>
        <p>
          Feedim, süni intellektlə yaradılmış məzmunların (mətn, şəkil, video) şəffaf şəkildə bildirilməsini tələb edir.
          Məzmun yaradarkən &ldquo;Süni intellekt məzmunu&rdquo; seçimini açaraq məzmununuzun AI tərəfindən istehsal edildiyini bəyan edə bilərsiniz.
        </p>

        <h3 className="text-sm font-bold text-text-primary mt-4">Niyə ayırırıq?</h3>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Şəffaflıq</strong> — İstifadəçilərin məzmunun insan tərəfindən mi yoxsa AI tərəfindən mi yaradıldığını bilmək hüququ var</li>
          <li><strong>Etibar</strong> — Orijinal insan əməyi ilə istehsal edilən məzmunların AI məzmunlarından ayrılması platforma etimadı artırır</li>
          <li><strong>Ədalətli kəşf</strong> — Məzmun tövsiyə alqoritmləri, AI məzmunlarını orijinal məzmunlardan ayrı qiymətləndirərək ədalətli kəşf təcrübəsi təqdim edir</li>
          <li><strong>Hüquqi uyğunluq</strong> — Bir çox ölkədə süni intellektlə istehsal edilən məzmunların etiketlənməsi qanuni tələb halına gəlir</li>
        </ul>

        <h3 className="text-sm font-bold text-text-primary mt-4">Bildirilməzsə nə baş verir?</h3>
        <ul className="list-disc pl-5 space-y-2">
          <li>Feedim AI, mətn və şəkillərdə süni intellekt istehsal nümunələrini avtomatik olaraq aşkarlaya bilir</li>
          <li>AI tərəfindən istehsal edildiyi aşkarlanan lakin bildirilməyən məzmunlar <strong>profil etibar xalını azaldır</strong></li>
          <li>Təkrarlanan hallarda məzmun moderasiyaya göndərilə bilər və hesab məhdudiyyətləri tətbiq oluna bilər</li>
          <li>AI ilə yaradılmış məzmunlarda müəllif hüququ qorunması tələb edilə bilməz</li>
        </ul>

        <p className="text-xs text-text-muted italic">
          Qeyd: AI alətlərini köməkçi olaraq istifadə edən (məs. orfoqrafiya yoxlaması, dil düzəltməsi) lakin məzmunun özünü özü yaradan
          istifadəçilərin bu seçimi açması lazım deyil. Bu seçim, məzmunun böyük ölçüdə və ya tamamilə AI tərəfindən istehsal edildiyi hallar üçündür.
        </p>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">AI Mətn Analizi</h2>
        <p>
          Hər yazı, moment və ya şərh dərc edildikdə mətn məzmunu AI tərəfindən avtomatik olaraq yoxlanılır.
          Sistem məzmunu müxtəlif kateqoriyalarda təhlil edir və icma qaydalarına zidd məzmunları aşkarlayır.
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Nifrət nitqi</strong> &mdash; Irq, din, cins və ya etnik mənşəyə yönəlmiş nifrət ehtiva edən ifadələr</li>
          <li><strong>Söyüş və təhqir</strong> &mdash; Jarqon, söyüş və şəxsi hücum ehtiva edən dil</li>
          <li><strong>Cinsi məzmun</strong> &mdash; Yetkinlərə yönəlik və ya ədəbsiz ifadələr</li>
          <li><strong>Spam</strong> &mdash; Təkrarlanan, mənasız və ya reklam məqsədli məzmunlar</li>
          <li><strong>Yanıldıcı məlumat</strong> &mdash; Qəsdən yanlış və ya dezinformasiya xarakterli məzmunlar</li>
        </ul>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">AI Şəkil Analizi</h2>
        <p>
          Yazılara əlavə olunan şəkillər dərc edilmədən əvvəl AI tərəfindən avtomatik yoxlanılır.
          Şəkil analizi aşağıdakı kateqoriyalarda uyğunsuz məzmunları aşkarlayır:
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Cinsi məzmun</strong> &mdash; Ədəbsiz və ya yetkinlərə yönəlik şəkillər</li>
          <li><strong>Zorakılıq</strong> &mdash; Qan, yaralanma və ya fiziki zorakılıq ehtiva edən şəkillər</li>
          <li><strong>Uyğunsuz şəkil</strong> &mdash; İcma qaydalarına zidd digər vizual məzmunlar</li>
        </ul>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">AI SEO İstehsalı</h2>
        <p>
          Feedim AI, dərc edilən hər yazı üçün avtomatik olaraq SEO meta məlumatları yaradır. Bu sayədə məzmunlarınız
          axtarış motorlarında daha yaxşı sıralanır və daha çox insana çatır.
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Başlıq</strong> — Məzmununuza uyğun SEO başlığı AI tərəfindən avtomatik yaradılır</li>
          <li><strong>Açıqlama</strong> — Meta description AI tərəfindən məzmundan xülasə edilərək istehsal edilir</li>
          <li><strong>Açar Sözlər</strong> — Məzmuna uyğun açar sözlər AI tərəfindən müəyyən edilir</li>
        </ul>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">AI Müəllif Hüququ Yoxlaması</h2>
        <p>
          Feedim AI, müəllif hüququ qorunması açıq olan məzmunlarda mətn, şəkil və video oxşarlıq yoxlaması aparır.
          Kopya məzmun aşkar edildikdə məzmun moderasiyaya alına bilər. Ətraflı məlumat üçün{" "}
          <NewTabLink href="/help/copyright" className="text-accent-main hover:opacity-80 font-semibold">Müəllif Hüququ Qorunması</NewTabLink> səhifəsinə baxa bilərsiniz.
        </p>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">AI Profil Xalı Hesablaması</h2>
        <p>
          Hər istifadəçinin etibarlılıq xalı AI tərəfindən avtomatik olaraq hesablanır. Profil xalı; məzmun keyfiyyəti,
          icma qarşılıqlı əlaqəsi, hesab yaşı və moderasiya tarixçəsi kimi bir çox faktorlara görə müəyyən edilir.
        </p>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">AI Onboarding Yoxlaması</h2>
        <p>
          Yeni istifadəçilər qeydiyyatdan keçərkən seçdikləri istifadəçi adı və yazdıqları bioqrafiya AI tərəfindən yoxlanılır.
          Uyğunsuz, söyüş ehtiva edən və ya yanıldıcı istifadəçi adları və bioqrafiyalar aşkar edildikdə hesab moderasiyaya alınır.
          Bu sayədə platform əvvəldən təhlükəsiz bir mühit təqdim edir.
        </p>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Fail-Open Dizayn</h2>
        <p>
          Feedim AI, <strong>fail-open</strong> prinsipi ilə işləyir. Bu, AI sistemində hər hansı bir
          texniki xəta və ya gecikmə yaşandığında məzmunların bloklanmayacağı deməkdir. İstifadəçi təcrübəsi həmişə
          prioritetdir; AI-da yarana biləcək bir problem, məzmun dərc etmə prosesini pozmaz.
        </p>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">AI və İnsan Moderasiyası</h2>
        <p>
          Feedim AI, insan moderasiyasının yerini almır; onu dəstəkləyir və gücləndirir. AI tərəfindən aşkarlanan məzmunlar
          moderasiya komandasına yönləndirilir və son qərarlar insan moderatorlar tərəfindən verilir. AI, moderatorların iş yükünü
          azaldaraq daha sürətli və ardıcıl bir moderasiya prosesi təmin edir.
        </p>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Gizlilik və Verilənlərin Təhlükəsizliyi</h2>
        <p>
          Feedim AI tərəfindən təhlil edilən məzmunlar və verilənlər yalnız platform daxili moderasiya və təhlükəsizlik məqsədilə
          istifadə olunur. AI proseslərində əldə edilən verilənlər üçüncü tərəflərlə paylaşılmır, satılmır və ya reklam məqsədilə
          istifadə edilmir. Bütün AI analizləri Feedim infrastrukturu daxilində həyata keçirilir.
        </p>

        <p className="text-xs text-text-muted mt-8">
          Feedim AI haqqında suallarınız üçün hesabınıza daxil olduqdan sonra{" "}
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
