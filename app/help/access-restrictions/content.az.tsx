import NewTabLink from "@/components/NewTabLink";

export default function ContentAz() {
  return (
    <>
      <h1 className="text-2xl sm:text-3xl font-bold mb-6">Giriş Məhdudiyyətləri</h1>
      <div className="space-y-6 text-sm text-text-secondary leading-relaxed">
        <p>
          Feedim, təhlükəsiz və keyfiyyətli istifadəçi təcrübəsi təqdim etmək məqsədilə müxtəlif giriş məhdudiyyətləri
          tətbiq edir. Bu məhdudiyyətlər, platformun sağlam işləməsini və bütün istifadəçilərin
          təhlükəsizliyini təmin etmək üçün nəzərdə tutulmuşdur.
        </p>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Yaş Məhdudiyyəti</h2>
        <p>
          Feedim platformunu istifadə edə bilmək üçün ən azı <strong>15 yaşında</strong> olmalısınız.
          15 yaşdan kiçik istifadəçilər hesab yarada və platformu istifadə edə bilməzlər. Bu məhdudiyyət,
          uşaq təhlükəsizliyi qanunları və beynəlxalq tənzimləmələr çərçivəsində tətbiq edilir.
          Qeydiyyat zamanı göstərilən doğum tarixi doğrulanır və yaş şərtini ödəməyən hesablar avtomatik bloklanır.
        </p>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Coğrafi Məhdudiyyətlər</h2>
        <p>
          Feedim, Türkiyə mərkəzli bir platformdur. Xidmətlərimiz əsasən Türkiyədəki istifadəçilər üçün
          optimallaşdırılmışdır. Ödəniş sistemləri, hüquqi tənzimləmələr və məzmun siyasətləri Türkiyə qanunvericiliyinə uyğun
          olaraq qurulmuşdur. Platform Türkcə, İngiliscə və Azərbaycan Türkcəsi olmaq üzrə üç dildə xidmət göstərir.
        </p>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Hesab Doğrulaması</h2>
        <p>
          Platformdakı bəzi xüsusiyyətlər e-poçt doğrulaması edilmədən məhduddur. Hesabınızı yaratdıqdan sonra
          e-poçt ünvanınızı doğrulamalısınız. Doğrulanmamış hesablar aşağıdakı məhdudiyyətlərlə qarşılaşa bilər:
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li>Yazı paylaşma və şərh yazma məhdudlaşdırıla bilər</li>
          <li>Digər istifadəçilərlə qarşılıqlı əlaqə məhdud ola bilər</li>
          <li>Premium xüsusiyyətlərə giriş təmin edilmir</li>
          <li>Bildiriş üstünlükləri məhdud ola bilər</li>
        </ul>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Gizli Hesab Məhdudiyyətləri</h2>
        <p>
          Gizli olaraq təyin edilmiş hesabların məzmunları yalnız təsdiqlənmiş izləyicilərə görünür.
          Gizli hesab sahiblərinin yazıları, momentləri və profil məlumatları izləyici olmayan
          istifadəçilər tərəfindən görülə bilməz. İzləmə istəkləri hesab sahibi tərəfindən əl ilə
          təsdiqlənməlidir.
        </p>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Bloklama</h2>
        <p>
          Bir istifadəçini blokladığınızda, bloklanan istifadəçi sizin məzmunlarınıza daxil ola bilməz,
          profilinizi görüntüləyə bilməz və sizinlə qarşılıqlı əlaqəyə girə bilməz. Eyni şəkildə, siz də blokladığınız
          istifadəçinin məzmunlarına daxil ola bilməzsiniz. Bloklama ikitərəfli işləyir və hər iki istifadəçi
          üçün keçərlidir.
        </p>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Moderasiya Məhdudiyyətləri</h2>
        <p>
          Moderasiya prosesindəki məzmunlar xüsusi qaydalara tabedir:
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Moderasiya altındakı məzmunlar:</strong> Yalnız məzmun sahibi tərəfindən görülə bilər, digər istifadəçilərə göstərilmir</li>
          <li><strong>Silinən məzmunlar:</strong> Tamamilə gizlədilir və heç bir istifadəçi tərəfindən (məzmun sahibi daxil) görüntülənə bilməz</li>
          <li><strong>NSFW işarəli məzmunlar:</strong> Axında və axtarış nəticələrində gizlədilir</li>
        </ul>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Premium Məhdudiyyətlər</h2>
        <p>
          Bəzi inkişaf etmiş xüsusiyyətlər yalnız Premium üzvlərə təqdim edilir:
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Analitika:</strong> Ətraflı məzmun statistikası və performans analizləri</li>
          <li><strong>Pul qazanma:</strong> Məzmunlardan gəlir əldə etmə xüsusiyyəti</li>
          <li><strong>Reklamsız təcrübə:</strong> Platform genelində reklam göstərilmir</li>
          <li><strong>Prioritet dəstək:</strong> Dəstək tələbləriniz prioritet olaraq qiymətləndirilir</li>
        </ul>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Hesab Dayandırma</h2>
        <p>
          İcma qaydalarını və ya istifadə şərtlərini pozan hesablar müvəqqəti və ya qalıcı olaraq
          dayandırıla bilər. Hesab dondurma, dayandırma və etiraz prosesi haqqında ətraflı məlumat üçün{" "}
          <NewTabLink href="/help/moderation" className="text-accent-main hover:opacity-80 font-semibold">Moderasiya Sistemi</NewTabLink> səhifəsinə
          baxa bilərsiniz.
        </p>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">IP Əsaslı Məhdudiyyətlər</h2>
        <p>
          Sui-istifadə, spam və ya təhlükəsizlik təhdidi aşkar edildiyi halda Feedim, müəyyən IP ünvanlarına
          müvəqqəti məhdudiyyət tətbiq edə bilər. Bu məhdudiyyətlər avtomatik sistemlər tərəfindən tətbiq edilir və
          adətən müəyyən müddətdən sonra avtomatik olaraq götürülür. IP əsaslı məhdudiyyətlər, platformun
          ümumi təhlükəsizliyini qorumaq məqsədilə istifadə edilir.
        </p>

        <p className="text-xs text-text-muted mt-8">
            Giriş məhdudiyyətləri haqqında suallarınız üçün{" "}
            <NewTabLink href="/help/contact" className="text-accent-main hover:opacity-80 font-semibold">Əlaqə</NewTabLink> səhifəmizdən
            və ya <a href="mailto:help@feedim.com" className="text-accent-main hover:opacity-80 font-semibold">help@feedim.com</a> ünvanından
            bizə müraciət edə bilərsiniz.
        </p>
      </div>
    </>
  );
}
