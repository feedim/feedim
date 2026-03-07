import NewTabLink from "@/components/NewTabLink";

export default function ContentAz() {
  return (
    <>
      <h1 className="text-2xl sm:text-3xl font-bold mb-6">Müəllif Hüququ Qorunması</h1>
      <div className="space-y-6 text-sm text-text-secondary leading-relaxed">
        <p>
          Feedim, məzmun istehsalçılarının əməyini qorumaq üçün inkişaf etmiş müəllif hüququ qorunma sistemi təqdim edir.
          Bu sistem, məzmunların icazəsiz kopyalanmasının qarşısını almaq və orijinal istehsalı təşviq etmək məqsədilə yaradılmışdır.
        </p>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Müəllif Hüququ Qorunması Necə İşləyir?</h2>
        <p>
          Yazı və ya video yaradarkən parametrlər bölməsindəki <strong>&ldquo;Müəllif hüququ qorunması&rdquo;</strong> xüsusiyyətini aktivləşdirərək məzmununuzu qoruma altına ala bilərsiniz.
          Qorunma aktivləşdirildikdə məzmununuz mətn, şəkil və video üzrə tam həcmli olaraq yoxlanılır.
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li>Mətn məzmununuz mətn müqayisə texnologiyası ilə analiz edilir</li>
          <li>Şəkilləriniz şəkil müqayisə texnologiyası ilə qorunur</li>
          <li>Video məzmunlarınız video müqayisə texnologiyası ilə yoxlanılır</li>
          <li>Sistem, hər yeni paylaşılan məzmunu qorunan məzmunlarınızla avtomatik müqayisə edir</li>
        </ul>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Müəllif Hüququ Qorunması Necə Aktivləşir?</h2>
        <p>
          Müəllif hüququ qorunması, düzgün və orijinal məzmun istehsal edən hesablarda sistem tərəfindən avtomatik aktivləşir.
          Aşağıdakı şərtləri qarşılayan hesaplar avtomatik olaraq müəllif hüququ qorunması qazanır:
        </p>
        <ul className="list-disc pl-5 space-y-2 mt-3">
          <li>E-poçt ünvanınızı doğrulayın</li>
          <li>Müəyyən bir müddətdir platformda məzmun istehsalçısı olun</li>
          <li>Kifayət qədər yazı dərc edin</li>
          <li>Spam etməyin, icma qaydalarına əməl edin</li>
          <li>Müəllif hüququ pozuntusuna yol verməyin, kopyalanmış məzmun paylaşmayın</li>
          <li>Orijinal və keyfiyyətli məzmunlar istehsal edin</li>
        </ul>
        <p className="mt-3">
          Şərtlər ödənildikdən sonra sistem növbəti qiymətləndirmədə müəllif hüququ qorunmanızı avtomatik aktivləşdirəcək.
          Bir dəfə aktivləşdikdən sonra aktiv qalır. Dəstək üçün <NewTabLink href="/help/contact" className="text-accent-main hover:opacity-80 font-semibold">bizimlə əlaqə saxlaya bilərsiniz</NewTabLink>.
        </p>
        <p className="mt-3">
          Şirkətlər və korporativ hesablar isə{" "}
          <NewTabLink href="/settings/copyright" className="text-accent-main hover:opacity-80 font-semibold">müraciət forması</NewTabLink> ilə
          gözləmədən birbaşa müəllif hüququ qorunması tələb edə bilər.
        </p>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Kopya Məzmun Aşkarlanması</h2>
        <p>
          Müəllif hüququ qorunması açılmamış olsa belə, Feedim bütün məzmunlarda <strong>mətn əsaslı kopya məzmun yoxlaması</strong> aparır.
          Yüksək dərəcədə mətn oxşarlığı aşkar edildikdə məzmun &ldquo;Kopya Məzmun&rdquo; olaraq işarələnir və moderasiyaya alınır.
          Bu sistem həmişə aktivdir və söndürülə bilməz.
        </p>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Müəllif Hüququ Pozuntu Sistemi</h2>
        <p>
          Müəllif hüququ və ya kopya məzmun şikayətləri insan moderasiya komandamız tərəfindən nəzərdən keçirilir.
          Pozuntu aşkar edilib moderasiya qərarı verildikdə hesabınıza bir pozuntu qeydi əlavə edilir.
          Pozuntu sayınız artdıqca profil xalınız azalır və hesabınıza mərhələli sanksiyalar tətbiq edilir.
          Təkrarlanan pozuntularda hesabınız qalıcı olaraq dayandırıla bilər.
        </p>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Müəllif Hüququ Şikayəti Necə Açılır?</h2>
        <p>
          Məzmununuzun icazəsiz kopyalandığını düşünürsünüzsə, müvafiq məzmunun menyusundan <strong>&ldquo;Şikayət Et&rdquo;</strong> seçimini
          istifadə edərək müəllif hüququ şikayəti aça bilərsiniz. Şikayət açarkən:
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Orijinal məzmun URL&apos;si</strong> &mdash; Sizin orijinal məzmununuzun linki (məcburi)</li>
          <li><strong>Kopya məzmun URL&apos;si</strong> &mdash; Kopyalandığını düşündüyünüz məzmunun linki (məcburi)</li>
          <li><strong>Açıqlama</strong> &mdash; Pozuntunu ətraflı izah edən açıqlama (ixtiyari)</li>
        </ul>
        <p className="mt-3">
          Şikayətiniz moderasiya komandamız tərəfindən nəzərdən keçirilir. Orijinal məzmun sahibi olduğunuzu sübut etməniz lazım ola bilər.
          Əsassız şikayətlər hesabınızın etibarlılıq xalını mənfi təsir edə bilər.
        </p>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Bildirişlər</h2>
        <p>
          Müəllif hüququ ilə qorunan məzmununuza oxşar bir yazı aşkar edildikdə avtomatik bildiriş alırsınız.
          Bildirişdə uyğunluq faizi və görülən əməliyyat (moderasiya və ya nişan) göstərilir.
        </p>

        <p className="text-xs text-text-muted mt-8">
            Müəllif hüququ qorunması ilə bağlı suallarınız üçün{" "}
            <a href="mailto:copyright@feedim.com" className="text-accent-main hover:opacity-80 font-semibold">copyright@feedim.com</a> ünvanından
            bizə müraciət edə bilərsiniz.
        </p>
      </div>
    </>
  );
}
