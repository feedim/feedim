import Link from "next/link";

export default function ContentAz() {
  return (
    <>
      <h1 className="text-2xl sm:text-3xl font-bold mb-6">Verilənlərin Paylaşılması və Üçüncü Tərəf Girişi</h1>
      <div className="space-y-6 text-sm text-text-secondary leading-relaxed">
        <p>
          Feedim, istifadəçilərinin gizliliyinə və verilənlərin təhlükəsizliyinə böyük əhəmiyyət verir.
          Bu səhifədə hansı verilənlərin toplandığını, necə istifadə edildiyini və kimlərlə paylaşıldığını
          şəffaf şəkildə izah edirik.
        </p>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Feedim Hansı Verilənləri Toplayır?</h2>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Profil məlumatları:</strong> İstifadəçi adı, e-poçt ünvanı, doğum tarixi, profil şəkli və bioqrafiya</li>
          <li><strong>Məzmun verilənləri:</strong> Yazılar, şərhlər, momentlər və paylaşılan media faylları</li>
          <li><strong>Qarşılıqlı əlaqə verilənləri:</strong> Bəyənmələr, şərhlər, izləmə əlaqələri və oxuma tarixçəsi</li>
          <li><strong>Cihaz və IP məlumatları:</strong> Brauzer növü, əməliyyat sistemi, IP ünvanı və giriş vaxtları</li>
          <li><strong>Ödəniş məlumatları:</strong> Abunəlik və satınalma əməliyyatları ilə bağlı faktura məlumatları</li>
        </ul>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Üçüncü Tərəf Paylaşımı</h2>
        <p>
          Feedim, istifadəçi verilənlərini reklam məqsədilə <strong>satmır</strong> və üçüncü tərəf reklam şəbəkələri ilə
          paylaşmır. Verilənlər yalnız platformun işləməsi üçün zəruri olan xidmət təminatçıları ilə minimum
          səviyyədə paylaşılır:
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Hostinq təminatçısı:</strong> Platformun yerləşdirildiyi server xidmətləri</li>
          <li><strong>Ödəniş emalçısı:</strong> Ödəniş əməliyyatlarının həyata keçirilməsi üçün</li>
          <li><strong>E-poçt xidməti:</strong> Bildiriş və doğrulama e-poçtlarının göndərilməsi üçün</li>
        </ul>
        <p>
          Bu xidmət təminatçıları ilə yalnız xidmətin yerinə yetirilməsi üçün zəruri olan minimum səviyyə
          verilən paylaşılır və bütün təminatçılar verilənlərin qorunması müqavilələrinə tabedir.
        </p>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Ödəniş Verilənləri</h2>
        <p>
          Feedim üzərindəki bütün ödəniş əməliyyatları <strong>PayTR</strong> ödəniş infrastrukturu vasitəsilə həyata keçirilir.
          Kredit kartı və bank kartı məlumatlarınız Feedim serverlərində <strong>saxlanılmır</strong>. Ödəniş məlumatları
          birbaşa PayTR tərəfindən təhlükəsiz şəkildə emal edilir və saxlanılır. Feedim yalnız əməliyyat nəticəsini
          (uğurlu/uğursuz) və faktura məlumatlarını saxlayır.
        </p>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Dövlət Orqanları ilə Paylaşım</h2>
        <p>
          Feedim, qanuni məcburiyyət halında istifadəçi verilənlərini səlahiyyətli orqanlarla paylaşmaq məcburiyyətində qala bilər.
          Bu paylaşım yalnız aşağıdakı hallarda və minimum səviyyədə həyata keçirilir:
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li>Məhkəmə qərarı ilə tələb olunan verilənlər</li>
          <li>Prokurorluq istintaqı çərçivəsindəki tələblər</li>
          <li>Qanunvericiliyin məcburi etdiyi digər hallar</li>
        </ul>
        <p>
          Bütün verilən paylaşımları <strong>6698 saylı Fərdi Verilənlərin Qorunması Qanunu (KVKK)</strong> çərçivəsində
          və müvafiq qanunvericiliyə uyğun olaraq həyata keçirilir.
        </p>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Çerezlər və İzləmə</h2>
        <p>
          Feedim, platformun düzgün işləməsi üçün sessiya və üstünlük çerezləri istifadə edir.
        </p>
        <div className="bg-bg-secondary rounded-[15px] p-4">
          <p>
            Feedim, <strong className="text-text-primary">3-cü tərəf izləmə çerezləri istifadə etmir</strong>. İstifadəçi davranışları
            üçüncü tərəf reklam şəbəkələri və ya analitika xidmətləri tərəfindən izlənilmir.
          </p>
        </div>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Hüquqlarınız və Verilənlərin Təhlükəsizliyi</h2>
        <p>
          KVKK çərçivəsindəki hüquqlarınız, verilənlərin saxlanma müddətləri və verilənlərin təhlükəsizliyi tədbirlərimiz haqqında
          ətraflı məlumat üçün{" "}
          <Link href="/help/privacy" className="text-accent-main hover:opacity-80 font-semibold">Gizlilik Siyasəti</Link> səhifəmizə
          baxa bilərsiniz.
        </p>

        <div className="bg-bg-secondary rounded-[15px] p-5 mt-8">
          <p className="text-xs text-text-muted">
            Verilənlərin paylaşılması haqqında suallarınız üçün{" "}
            <Link href="/help/contact" className="text-accent-main hover:opacity-80 font-semibold">Əlaqə</Link> səhifəmizdən
            və ya <a href="mailto:support@feedim.com" className="text-accent-main hover:opacity-80 font-semibold">support@feedim.com</a> ünvanından
            bizə müraciət edə bilərsiniz.
          </p>
        </div>
      </div>
    </>
  );
}
