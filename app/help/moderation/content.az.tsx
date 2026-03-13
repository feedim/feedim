import NewTabLink from "@/components/NewTabLink";

export default function ContentAz() {
  return (
    <>
      <h1 className="text-2xl sm:text-3xl font-bold mb-6">Moderasiya Sistemi</h1>
      <div className="space-y-6 text-sm text-text-secondary leading-relaxed">
        <p>
          Feedim, təhlükəsiz və keyfiyyətli bir icma mühiti təmin etmək üçün <strong>süni intellekt dəstəkli avtomatik yoxlama</strong> və{" "}
          <strong>insan moderasiyasını</strong> birlikdə istifadə edən çoxqatlı moderasiya sistemi tətbiq edir.
          Bu səhifə moderasiya prosesimizin necə işlədiyini ətraflı izah edir.
        </p>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Moderasiya Necə İşləyir?</h2>
        <p>
          Feedim moderasiya sistemi iki əsas komponentdən ibarətdir: süni intellekt (AI) yoxlaması və insan moderasiyası.
          Hər məzmun dərc edildikdə avtomatik olaraq AI yoxlamasından keçir. AI, məzmunu siyasət pozuntuları
          baxımından təhlil edir və lazım gəldikdə məzmunu aşkarlayaraq moderasiya komandasına ötürür.
        </p>
        <ol className="list-decimal pl-5 space-y-2">
          <li><strong>Avtomatik AI Yoxlaması</strong> — Məzmun dərc edildiyi anda AI tərəfindən avtomatik yoxlanılır.</li>
          <li><strong>Aşkarlama və/və ya Bloklama</strong> — Siyasət pozuntusu aşkar edilərsə məzmun gizlədilir və moderasiya komandasına göndərilir.</li>
          <li><strong>İnsan Nəzərdən Keçirməsi</strong> — Aşkarlanan məzmunlar moderasiya komandası tərəfindən nəzərdən keçirilir və son qərar verilir.</li>
        </ol>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Moderasiya Altındakı Məzmunlar</h2>
        <p>
          Aşkarlanan və ya moderasiyaya alınan məzmunlar ümumi axından gizlədilir və digər istifadəçilər tərəfindən görülə bilməz.
          Lakin <strong>məzmunun müəllifi</strong> moderasiya altındakı məzmununu görməyə və vəziyyətini izləməyə davam edə bilər.
          Məzmunun üzərində moderasiya vəziyyətini göstərən bir bildiriş nişanı göstərilir.
        </p>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">48 Saat Qaydası</h2>
        <p>
          Moderasiyaya alınan bütün məzmunlar <strong>ən gec 48 saat</strong> ərzində nəzərdən keçirilir.
          Bu müddət ərzində məzmun gizli qalır. Nəzərdən keçirmə nəticəsində məzmun təsdiqlənirsə yenidən dərc edilir;
          rədd edilərsə qalıcı olaraq silinir. 48 saat ərzində nəzərdən keçirilməzsə məzmun avtomatik olaraq yenidən dərc edilir.
        </p>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Etiraz Prosesi və Qərar Nömrəsi</h2>
        <p>
          Moderasiya nəticəsində məzmununuz silindisə, sizə bir <strong>qərar nömrəsi</strong> verilir.
          Bu nömrə ilə etiraz prosesini başlada bilərsiniz. Etirazlar moderasiya komandası tərəfindən yenidən qiymətləndirilir.
          Etiraz nəticəsi qətidir.
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li>Moderasiya qərarı bildirişinizdə qərar nömrənizi tapa bilərsiniz</li>
          <li>Etirazınızı qərar nömrəsi ilə birlikdə əlaqə səhifəsindən və ya məzmun moderasiya səhifəsindən göndərə bilərsiniz</li>
          <li>Etirazlar adətən 24-48 saat ərzində nəticələnir</li>
          <li>Hər qərar üçün yalnız bir etiraz hüququnuz var</li>
        </ul>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Moderasiya Kateqoriyaları</h2>
        <p>Feedim-də aşağıdakı kateqoriyalardakı məzmunlar moderasiyaya alınır və ya silinir:</p>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Cinsi / Uyğunsuz Məzmun</strong> — Cinsi məzmun, çılpaqlıq və ya yetkinlərə yönəlik materiallar.</li>
          <li><strong>Nifrət Nitqi</strong> — Irq, din, cins, etnik mənşə və ya digər xüsusiyyətlərə əsaslanan nifrət nitqi və ayrı-seçkilik.</li>
          <li><strong>Spam / Yanıldıcı Məzmun</strong> — Kütləvi paylaşım, clickbait, fırıldaqçılıq və ya yanıldıcı məlumat ehtiva edən yazılar.</li>
          <li><strong>Müəllif Hüququ Pozuntusu</strong> — Başqalarına aid məzmunların icazəsiz istifadəsi. Ətraflı məlumat üçün{" "}
            <NewTabLink href="/help/copyright" className="text-accent-main hover:opacity-80 font-semibold">Müəllif Hüququ Qorunması</NewTabLink> səhifəsinə baxın.</li>
          <li><strong>Kopya Məzmun</strong> — Platformdakı mövcud məzmunların kopyalanması və ya çoxaldılması.</li>
        </ul>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">İcma Şikayətləri</h2>
        <p>
          Feedim, istifadəçilərdən gələn şikayətləri avtomatik olaraq qiymətləndirir.
          Şikayətlər kifayət qədər sayına çatdıqda məzmun AI tərəfindən yenidən yoxlanılır və lazım gəldikdə moderasiya komandasına ötürülür.
          Bu sistem, pis niyyətli kütləvi şikayət cəhdlərinin qarşısını alır və həqiqi pozuntuların tez aşkarlanmasını təmin edir.
        </p>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Profil Moderasiyası</h2>
        <p>
          Moderasiya sistemi yalnız məzmunlarla məhdudlaşmır. İstifadəçi profilləri də moderasiya dairəsindədir.
          Profil şəkli, istifadəçi adı, bioqrafiya və digər profil məlumatları uyğunsuz məzmun ehtiva edərsə
          moderasiyaya alına bilər. Qeydiyyat və onboarding mərhələsində də AI əsaslı söyüş və uyğunsuzluq yoxlaması aparılır.
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li>Uyğunsuz profil şəkilləri avtomatik aşkar edilir və silinir</li>
          <li>İstifadəçi adı və bioqrafiya mətnləri AI yoxlamasından keçir</li>
          <li>Profil pozuntuları təkrarlanırsa hesab dayandırıla bilər</li>
        </ul>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Hesab Dondurma və Dayandırma</h2>
        <p>
          Təkrarlanan pozuntular və ya ciddi siyasət pozuntularında hesabınız dondurula və ya dayandırıla bilər.
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Hesab Dondurma</strong> — Hesabınız müvəqqəti olaraq dondurulur. Bu müddətdə yeni məzmun dərc edə, şərh yaza bilməzsiniz. Mövcud məzmunlarınız bu müddət ərzində əlçatmaz olur.</li>
          <li><strong>Hesab Dayandırma</strong> — Hesabınız qalıcı olaraq dayandırılır. Bütün məzmunlarınız gizlədilir və hesabınıza giriş bloklanır. Ciddi və ya təkrarlanan pozuntularda tətbiq edilir.</li>
        </ul>
        <ul className="list-disc pl-5 space-y-2 mt-4">
          <li>Hesab dondurma müddəti pozuntunun ciddiliyinə görə müəyyən edilir</li>
          <li>Dayandırılmış hesablar üçün etiraz prosesi mövcuddur</li>
          <li>Təkrarlanan müəllif hüququ pozuntularında hesablar qalıcı olaraq dayandırıla bilər</li>
        </ul>

        <p className="text-xs text-text-muted mt-8">
          Moderasiya sistemi haqqında suallarınız və ya qərara etiraz etmək üçün hesabınıza daxil olduqdan sonra{" "}
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
