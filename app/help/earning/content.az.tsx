import Link from "next/link";

export default function ContentAz() {
  return (
    <>
      <h1 className="text-2xl sm:text-3xl font-bold mb-6">Pul Qazanma</h1>
      <div className="space-y-6 text-sm text-text-secondary leading-relaxed">
        <p>
          Feedim, keyfiyyətli məzmun istehsal edən müəlliflərə əməklərinin qarşılığını ala biləcəkləri bir qazanc sistemi təqdim edir.
          Məzmunlarınız oxunduqca jeton qazanırsınız və bu jetonları real pula çevirə bilərsiniz.
        </p>

        {/* ── Kimlər Qazana Bilər ── */}
        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Kimlər Qazana Bilər?</h2>
        <p>
          Feedim-də pul qazana bilmək üçün aşağıdakı şərtləri ödəməlisiniz:
        </p>
        <div className="bg-bg-secondary rounded-[15px] p-4 space-y-3">
          <ul className="list-disc pl-5 space-y-2">
            <li><strong>Peşəkar hesab növü:</strong> Hesabınız peşəkar (müəllif) hesab növündə olmalıdır</li>
            <li><strong>Premium üzvlük:</strong> Aktiv bir Premium abunəliyiniz olmalıdır</li>
          </ul>
        </div>
        <p>
          Bu iki şərti ödəyən istifadəçilər, məzmunlarının oxunmasından avtomatik olaraq qazanc əldə etməyə başlayır.
        </p>

        {/* ── Qazanc Mənbələri ── */}
        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Qazanc Mənbələri</h2>
        <p>
          Feedim-dəki qazanc sistemi, <strong>Premium oxucuların</strong> məzmunlarınızı oxumasına əsaslanır.
          Yalnız Premium üzvlüyə sahib oxucuların həyata keçirdiyi keyfiyyətli oxumalar qazanc olaraq sayılır.
        </p>

        {/* ── Qazanc Hesablaması ── */}
        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Qazanc Hesablaması</h2>
        <p>
          Premium oxucular məzmununuzu həqiqətən oxuduqda hesabınıza <strong>jeton</strong> əlavə edilir.
          Jeton, Feedim-in qazanc vahidi olub real pula çevrilə bilər.
          Qazanılmış jetonlar ani olaraq hesabınıza əks olunur və analitika panelinizden izlənilə bilər.
        </p>

        {/* ── Qazanc İzləmə ── */}
        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Qazanc İzləmə</h2>
        <p>
          Qazanclarınızı <strong>Analitika</strong> panelindən ətraflı izləyə bilərsiniz. Analitika panelində
          aşağıdakı verilənlərə çata bilərsiniz:
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li>Toplam qazanılmış jeton miqdarı</li>
          <li>Gündəlik, həftəlik və aylıq qazanc verilənləri</li>
          <li>Hansı məzmunun nə qədər qazanc təmin etdiyi</li>
          <li>Keyfiyyətli oxuma sayıları və nisbətləri</li>
        </ul>

        {/* ── Pul Çəkmə ── */}
        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Pul Çəkmə</h2>
        <p>
          Qazandığınız jetonları Türk Lirası olaraq çəkə bilərsiniz. Çəkim şərtləri, IBAN təyinatı və
          əməliyyat müddətləri haqqında ətraflı məlumat üçün{" "}
          <Link href="/help/coins" className="text-accent-main hover:opacity-80 font-semibold">Jeton və Balans Sistemi</Link> səhifəsinə
          baxa bilərsiniz.
        </p>

        {/* ── Vergi Məlumatı ── */}
        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Vergi Məlumatı</h2>
        <div className="bg-bg-secondary rounded-[15px] p-4">
          <p>
            Feedim vasitəsilə əldə edilən qazanclara aid vergi öhdəlikləri tamamilə istifadəçiyə aiddir.
            İstifadəçilər əldə etdikləri gəliri müvafiq vergi qanunvericiliyinə uyğun bəyan etməklə mükəlləfdir.
            Feedim, istifadəçilər adına vergi tutumu və ya bəyannaməsi vermir.
          </p>
        </div>

        {/* ── Qazancınızı Artırma İpuçları ── */}
        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Qazancınızı Artırma Məsləhətləri</h2>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Keyfiyyətli məzmun istehsal edin:</strong> Dərin və orijinal məzmunlar yazın</li>
          <li><strong>Müntəzəm dərc edin:</strong> Ardıcıl dərc təqvimi ilə izləyici kitlənizi böyüdün</li>
          <li><strong>Qarşılıqlı əlaqə qurun:</strong> Şərhlərə cavab verin və icma ilə əlaqədə qalın</li>
          <li><strong>SEO optimallaşdırması edin:</strong> Başlıq, meta açıqlama və etiketlərinizi optimallaşdırın</li>
          <li><strong>Fərqli məzmun növlərini sınayın:</strong> Yazı, video və moment formatlarını istifadə edin</li>
        </ul>

        <div className="bg-bg-secondary rounded-[15px] p-5 mt-8">
          <p className="text-xs text-text-muted">
            Pul qazanma sistemi haqqında suallarınız üçün{" "}
            <Link href="/help/contact" className="text-accent-main hover:opacity-80 font-semibold">Əlaqə</Link> səhifəmizdən
            və ya <a href="mailto:support@feedim.com" className="text-accent-main hover:opacity-80 font-semibold">support@feedim.com</a> ünvanından
            bizə müraciət edə bilərsiniz.
          </p>
        </div>
      </div>
    </>
  );
}
