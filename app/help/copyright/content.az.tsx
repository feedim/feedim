import Link from "next/link";

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
          Yazı, video və ya moment yaradarkən parametrlər bölməsindəki <strong>&ldquo;Müəllif hüququ qorunması&rdquo;</strong> xüsusiyyətini aktivləşdirərək məzmununuzu qoruma altına ala bilərsiniz.
          Qorunma aktivləşdirildikdə məzmununuz mətn, şəkil və video üzrə tam həcmli olaraq yoxlanılır.
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li>Mətn məzmununuz söz səviyyəsində oxşarlıq analizi (Jaccard Similarity) ilə müqayisə edilir</li>
          <li>Şəkilləriniz perseptual hash (dHash) texnologiyası ilə qorunur</li>
          <li>Video məzmunlarınız URL və müddət müqayisəsi ilə yoxlanılır</li>
          <li>Sistem, hər yeni paylaşılan məzmunu qorunan məzmunlarınızla avtomatik müqayisə edir</li>
        </ul>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Müəllif Hüququ Qorunması Necə Aktivləşir?</h2>
        <p>
          Müəllif hüququ qorunması, düzgün və orijinal məzmun istehsal edən hesablarda sistem tərəfindən avtomatik aktivləşir.
          Aşağıdakı şərtləri qarşılayan hesaplar avtomatik olaraq müəllif hüququ qorunması qazanır:
        </p>
        <ul className="list-disc pl-5 space-y-2 mt-3">
          <li>E-poçt ünvanınızı doğrulayın</li>
          <li>Ən azı 7 gündür platformda məzmun istehsalçısı olun</li>
          <li>Ən azı 3 yazı dərc edin</li>
          <li>Spam etməyin, icma qaydalarına əməl edin</li>
          <li>Müəllif hüququ pozuntusuna yol verməyin, kopyalanmış məzmun paylaşmayın</li>
          <li>Orijinal və keyfiyyətli məzmunlar istehsal edin</li>
        </ul>
        <p className="mt-3">
          Şərtlər ödənildikdən sonra sistem növbəti qiymətləndirmədə müəllif hüququ qorunmanızı avtomatik aktivləşdirəcək.
          Bir dəfə aktivləşdikdən sonra aktiv qalır. Dəstək üçün <a href="/help/contact" className="text-accent-main hover:opacity-80 font-semibold">bizimlə əlaqə saxlaya bilərsiniz</a>.
        </p>
        <p className="mt-3">
          Şirkətlər və korporativ hesablar isə{" "}
          <Link href="/settings/copyright" className="text-accent-main hover:opacity-80 font-semibold">müraciət forması</Link> ilə
          gözləmədən birbaşa müəllif hüququ qorunması tələb edə bilər.
        </p>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Kopya Məzmun Aşkarlanması</h2>
        <p>
          Müəllif hüququ qorunması açılmamış olsa belə, Feedim bütün məzmunlarda <strong>mətn əsaslı kopya məzmun yoxlaması</strong> aparır.
          %90 və daha yuxarı mətn oxşarlığı aşkar edildikdə məzmun &ldquo;Kopya Məzmun&rdquo; olaraq işarələnir və moderasiyaya alınır.
          Bu sistem həmişə aktivdir və söndürülə bilməz.
        </p>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Müəllif Hüququ Strike Sistemi</h2>
        <p>
          Hər müəllif hüququ və ya kopya məzmun pozuntusunda hesabınıza bir &ldquo;strike&rdquo; əlavə edilir.
          Strike sayınız artdıqca profil xalınız azalır və hesabınıza mərhələli sanksiyalar tətbiq edilir.
          Müəyyən strike sayına çatdıqda hesabınız qalıcı olaraq dayandırıla bilər.
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

        <div className="bg-bg-secondary rounded-[15px] p-5 mt-8">
          <p className="text-xs text-text-muted">
            Müəllif hüququ qorunması ilə bağlı suallarınız üçün{" "}
            <Link href="/help/contact" className="text-accent-main hover:opacity-80 font-semibold">Əlaqə</Link> səhifəmizdən
            və ya <a href="mailto:support@feedim.com" className="text-accent-main hover:opacity-80 font-semibold">support@feedim.com</a> ünvanından
            bizə müraciət edə bilərsiniz.
          </p>
        </div>
      </div>
    </>
  );
}
