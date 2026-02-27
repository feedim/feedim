import Link from "next/link";

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
        <div className="bg-bg-secondary rounded-[15px] p-4 space-y-3">
          <div className="flex items-start gap-3">
            <span className="text-accent-main font-bold text-xs mt-0.5 shrink-0">1.</span>
            <div>
              <p className="font-semibold text-text-primary">Avtomatik AI Yoxlaması</p>
              <p className="text-text-muted text-xs mt-0.5">Məzmun dərc edildiyi anda AI tərəfindən avtomatik yoxlanılır.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-accent-main font-bold text-xs mt-0.5 shrink-0">2.</span>
            <div>
              <p className="font-semibold text-text-primary">Aşkarlama və/və ya Bloklama</p>
              <p className="text-text-muted text-xs mt-0.5">Siyasət pozuntusu aşkar edilərsə məzmun gizlədilir və moderasiya komandasına göndərilir.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-accent-main font-bold text-xs mt-0.5 shrink-0">3.</span>
            <div>
              <p className="font-semibold text-text-primary">İnsan Nəzərdən Keçirməsi</p>
              <p className="text-text-muted text-xs mt-0.5">Aşkarlanan məzmunlar moderasiya komandası tərəfindən nəzərdən keçirilir və son qərar verilir.</p>
            </div>
          </div>
        </div>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Moderasiya Altındakı Məzmunlar</h2>
        <p>
          Aşkarlanan və ya moderasiyaya alınan məzmunlar ümumi axından gizlədilir və digər istifadəçilər tərəfindən görülə bilməz.
          Lakin <strong>məzmunun müəllifi</strong> moderasiya altındakı məzmununu görməyə və vəziyyətini izləməyə davam edə bilər.
          Məzmunun üzərində moderasiya vəziyyətini göstərən bir bildiriş nişanı göstərilir.
        </p>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">48 Saat Qaydası</h2>
        <div className="bg-bg-secondary rounded-[15px] p-5">
          <p>
            Moderasiyaya alınan bütün məzmunlar <strong className="text-text-primary">ən gec 48 saat</strong> ərzində nəzərdən keçirilir.
            Bu müddət ərzində məzmun gizli qalır. Nəzərdən keçirmə nəticəsində məzmun təsdiqlənirsə yenidən dərc edilir;
            rədd edilərsə qalıcı olaraq silinir. 48 saat ərzində nəzərdən keçirilməzsə məzmun avtomatik olaraq yenidən dərc edilir.
          </p>
        </div>

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
        <div className="bg-bg-secondary rounded-[15px] p-4 space-y-3">
          <div className="flex items-start gap-3">
            <span className="text-error font-bold text-xs mt-0.5 shrink-0">NSFW</span>
            <div>
              <p className="font-semibold text-text-primary">Cinsi / Uyğunsuz Məzmun</p>
              <p className="text-text-muted text-xs mt-0.5">Cinsi məzmun, çılpaqlıq və ya yetkinlərə yönəlik materiallar.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-error font-bold text-xs mt-0.5 shrink-0">NİFRƏT</span>
            <div>
              <p className="font-semibold text-text-primary">Nifrət Nitqi</p>
              <p className="text-text-muted text-xs mt-0.5">Irq, din, cins, etnik mənşə və ya digər xüsusiyyətlərə əsaslanan nifrət nitqi və ayrı-seçkilik.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-warning font-bold text-xs mt-0.5 shrink-0">SPAM</span>
            <div>
              <p className="font-semibold text-text-primary">Spam / Yanıldıcı Məzmun</p>
              <p className="text-text-muted text-xs mt-0.5">Kütləvi paylaşım, clickbait, fırıldaqçılıq və ya yanıldıcı məlumat ehtiva edən yazılar.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-warning font-bold text-xs mt-0.5 shrink-0">MÜƏLLİF</span>
            <div>
              <p className="font-semibold text-text-primary">Müəllif Hüququ Pozuntusu</p>
              <p className="text-text-muted text-xs mt-0.5">Başqalarına aid məzmunların icazəsiz istifadəsi. Ətraflı məlumat üçün{" "}
                <Link href="/help/copyright" className="text-accent-main hover:opacity-80 font-semibold">Müəllif Hüququ Qorunması</Link> səhifəsinə baxın.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-warning font-bold text-xs mt-0.5 shrink-0">KOPYA</span>
            <div>
              <p className="font-semibold text-text-primary">Kopya Məzmun</p>
              <p className="text-text-muted text-xs mt-0.5">Platformdakı mövcud məzmunların kopyalanması və ya çoxaldılması.</p>
            </div>
          </div>
        </div>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">İcma Şikayətləri</h2>
        <p>
          Feedim, istifadəçilərdən gələn şikayətləri <strong>ağırlıqlı şikayət sistemi</strong> ilə qiymətləndirir.
          Hər istifadəçinin şikayəti bərabər ağırlıqda deyil; profil xalı yüksək və etibarlı istifadəçilərin
          şikayətləri daha yüksək ağırlığa malikdir. Bu sistem, pis niyyətli kütləvi şikayət cəhdlərinin qarşısını alır
          və həqiqi pozuntuların tez aşkarlanmasını təmin edir.
        </p>
        <div className="bg-bg-secondary rounded-[15px] p-4 space-y-3">
          <div className="flex items-start gap-3">
            <span className="text-accent-main font-bold text-xs mt-0.5 shrink-0">3+</span>
            <div>
              <p className="font-semibold text-text-primary">Ağırlıqlı Şikayət &rarr; AI Dərin Yoxlama</p>
              <p className="text-text-muted text-xs mt-0.5">Bir məzmun 3 və ya daha çox ağırlıqlı şikayət aldıqda, AI tərəfindən dərindən yenidən yoxlanılır.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-error font-bold text-xs mt-0.5 shrink-0">10+</span>
            <div>
              <p className="font-semibold text-text-primary">Ağırlıqlı Şikayət &rarr; Prioritet Moderasiya Növbəsi</p>
              <p className="text-text-muted text-xs mt-0.5">10 və ya daha çox ağırlıqlı şikayət alan məzmunlar prioritet olaraq moderasiya komandasına yönləndirilir.</p>
            </div>
          </div>
        </div>

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
        <div className="bg-bg-secondary rounded-[15px] p-4 space-y-3">
          <div className="flex items-start gap-3">
            <span className="text-warning font-bold text-xs mt-0.5 shrink-0">DONDURMA</span>
            <div>
              <p className="font-semibold text-text-primary">Hesab Dondurma</p>
              <p className="text-text-muted text-xs mt-0.5">Hesabınız müvəqqəti olaraq dondurulur. Bu müddətdə yeni məzmun dərc edə, şərh yaza bilməzsiniz. Mövcud məzmunlarınız görünən qalır.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-error font-bold text-xs mt-0.5 shrink-0">DAYANDIRMA</span>
            <div>
              <p className="font-semibold text-text-primary">Hesab Dayandırma</p>
              <p className="text-text-muted text-xs mt-0.5">Hesabınız qalıcı olaraq dayandırılır. Bütün məzmunlarınız gizlədilir və hesabınıza giriş bloklanır. Ciddi və ya təkrarlanan pozuntularda tətbiq edilir.</p>
            </div>
          </div>
        </div>
        <ul className="list-disc pl-5 space-y-2 mt-4">
          <li>Hesab dondurma müddəti pozuntunun ciddiliyinə görə müəyyən edilir</li>
          <li>Dayandırılmış hesablar üçün etiraz prosesi mövcuddur</li>
          <li>Müəllif hüququ strike sistemi ilə 10 strike-a çatan hesablar qalıcı olaraq dayandırılır və silinir</li>
        </ul>

        <div className="bg-bg-secondary rounded-[15px] p-5 mt-8">
          <p className="text-xs text-text-muted">
            Moderasiya sistemi haqqında suallarınız və ya etirazlarınız üçün{" "}
            <Link href="/help/contact" className="text-accent-main hover:opacity-80 font-semibold">Əlaqə</Link> səhifəmizdən
            və ya <a href="mailto:support@feedim.com" className="text-accent-main hover:opacity-80 font-semibold">support@feedim.com</a> ünvanından
            bizə müraciət edə bilərsiniz.
          </p>
        </div>
      </div>
    </>
  );
}
