import NewTabLink from "@/components/NewTabLink";

export default function ContentAz() {
  return (
    <>
      <h1 className="text-2xl sm:text-3xl font-bold mb-6">Profil Xalı Sistemi</h1>
      <div className="space-y-6 text-sm text-text-secondary leading-relaxed">
        <p>
          Feedim hörmətli və təhlükəsiz bir cəmiyyət qurmağı hədəfləyir. Profil xalı sistemi bu hədəfin əsas tikinti daşlarından biridir.
          Bu səhifə profil xalının nə olduğunu, niyə mövcud olduğunu və necə təsirləndiyini izah edir.
        </p>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Profil Xalı Nədir?</h2>
        <p>
          Profil xalı, hesabınızın sağlamlığını və etibarlılığını göstərən bir etibar xalıdır.
          Xalınız nə qədər yüksəkdirsə, platformdakı etibarlılığınız bir o qədər çoxdur.
        </p>
        <div className="bg-bg-secondary rounded-[15px] p-4 space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-success" />
            <span className="text-xs font-semibold text-text-primary">Sağlam hesab</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-accent-main" />
            <span className="text-xs font-semibold text-text-primary">Orta səviyyə</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-error" />
            <span className="text-xs font-semibold text-text-primary">Risk altında</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-error/60" />
            <span className="text-xs font-semibold text-text-primary">Spam ola bilər</span>
          </div>
        </div>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Niyə Mövcuddur?</h2>
        <ul className="list-disc pl-5 space-y-2">
          <li>Təhlükəsiz və hörmətli bir icma mühiti təmin etmək</li>
          <li>Spam, bot və pis niyyətli hesabların qarşısını almaq</li>
          <li>Keyfiyyətli kontent yaradılmasını təşviq etmək</li>
          <li>Kəşf et və tövsiyə sistemlərində ədalətli sıralama təmin etmək</li>
        </ul>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Kimlər Üçündür?</h2>
        <p>
          Profil xalı <strong>bütün istifadəçilər</strong> üçün avtomatik hesablanır. Ayrıca müraciət və ya aktivasiya tələb olunmur.
          Xalınız hesabınızı yaratdığınız andan etibarən müəyyən edilir və davranışlarınıza görə yenilənir.
        </p>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Xalınıza Nələr Təsir Edir?</h2>
        <p>Profil xalı bir çox faktora görə müəyyən edilir. Alqoritm detalları paylaşılmasa da ümumi olaraq aşağıdakı sahələrə diqqət edilir:</p>
        <div className="bg-bg-secondary rounded-[15px] p-4 space-y-3">
          <div className="flex items-start gap-3">
            <span className="text-accent-main font-bold text-xs mt-0.5 shrink-0">1</span>
            <div>
              <p className="font-semibold text-text-primary">Profil Məlumatlarının Tamlığı</p>
              <p className="text-text-muted text-xs mt-0.5">Ad, bioqrafiya, profil şəkli və digər məlumatların tamamlanmış olması.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-accent-main font-bold text-xs mt-0.5 shrink-0">2</span>
            <div>
              <p className="font-semibold text-text-primary">Kontent Keyfiyyəti</p>
              <p className="text-text-muted text-xs mt-0.5">Paylaşdığınız kontentin keyfiyyəti, orijinallığı və icma qaydalarına uyğunluğu.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-accent-main font-bold text-xs mt-0.5 shrink-0">3</span>
            <div>
              <p className="font-semibold text-text-primary">İcma Əlaqəsi</p>
              <p className="text-text-muted text-xs mt-0.5">Digər istifadəçilərlə olan əlaqəniz, aldığınız və verdiyiniz rəylər.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-accent-main font-bold text-xs mt-0.5 shrink-0">4</span>
            <div>
              <p className="font-semibold text-text-primary">Qaydalara Riayət</p>
              <p className="text-text-muted text-xs mt-0.5">İcma qaydalarına və platform siyasətlərinə riayət dərəcəniz.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-accent-main font-bold text-xs mt-0.5 shrink-0">5</span>
            <div>
              <p className="font-semibold text-text-primary">Pozuntu Keçmişi</p>
              <p className="text-text-muted text-xs mt-0.5">Keçmişdə aldığınız pozuntu və xəbərdarlıq sayı.</p>
            </div>
          </div>
        </div>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Xalınızı Necə Artırarsınız?</h2>
        <ul className="list-disc pl-5 space-y-2">
          <li>Profil məlumatlarınızı tam doldurun</li>
          <li>Keyfiyyətli və orijinal kontent yaradın</li>
          <li>İcma qaydalarına riayət edin</li>
          <li>Platformda müntəzəm və aktiv olun</li>
          <li>Digər istifadəçilərə hörmətlə yanaşın</li>
        </ul>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Xalınızı Nə Aşağı Salır?</h2>
        <ul className="list-disc pl-5 space-y-2">
          <li>İcma qaydalarını pozmaq</li>
          <li>Spam və ya təkrarlanan kontent paylaşmaq</li>
          <li>Digər istifadəçilərdən şikayət almaq</li>
          <li>Uyğunsuz, müəllif hüququ pozuntusu və ya kopya kontent paylaşmaq</li>
        </ul>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Moderasiya və Cəza Prosesi</h2>
        <div className="bg-bg-secondary rounded-[15px] p-5">
          <p>
            Feedim-də bütün cəzalar <strong>insan moderasiya komandası</strong> tərəfindən verilir. Süni intellekt (AI) yalnız şübhəli məzmunları aşkarlayır
            və moderasiya növbəsinə göndərir. Heç bir cəza AI tərəfindən avtomatik tətbiq olunmur.
            Moderasiya komandası nəzərdən keçirdikdən sonra lazım görərsə pozuntu qeydi əlavə edir.
          </p>
        </div>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Etiraz</h2>
        <p>
          Profil xalınızın haqsız yerə aşağı olduğunu düşünürsünüzsə və ya moderasiya qərarına etiraz etmək istəyirsinizsə, hesabınıza daxil olduqdan sonra{" "}
          <NewTabLink href="/settings/support" className="text-accent-main hover:opacity-80 font-semibold">Dəstək Tələbi Yarat</NewTabLink>{" "}
          səhifəsini istifadə edin. Etirazlar moderasiya komandası tərəfindən yenidən qiymətləndirilir.
        </p>

        <p className="text-xs text-text-muted mt-8">
          Profil xalı sistemi haqqında suallarınız üçün hesabınıza daxil olduqdan sonra{" "}
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
