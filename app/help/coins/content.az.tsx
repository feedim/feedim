import Link from "next/link";

export default function ContentAz() {
  return (
    <>
      <h1 className="text-2xl sm:text-3xl font-bold mb-6">Jeton və Balans Sistemi</h1>
      <div className="space-y-6 text-sm text-text-secondary leading-relaxed">
        <p>
          Feedim-in jeton sistemi, məzmun istehsalçılarının əməyinin qarşılığını almasını təmin edən
          virtual valyuta sistemidir. Bu səhifə jetonların necə qazanılacağını, satın alınacağını,
          istifadə ediləcəyini və çəkiləcəyini ətraflı izah edir.
        </p>

        {/* ── Jeton Nədir ── */}
        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Jeton Nədir?</h2>
        <p>
          Jeton, Feedim-in virtual valyutasıdır. Məzmun istehsalçıları yazıları oxunduqda jeton
          qazanır; oxucular isə jeton satın alaraq məzmun istehsalçılarını dəstəkləyir. Jeton sistemi,
          keyfiyyətli məzmun istehsalını təşviq etmək və məzmun istehsalçılarını mükafatlandırmaq məqsədilə
          yaradılmışdır.
        </p>
        {/* ── Jeton Necə Qazanılır ── */}
        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Jeton Necə Qazanılır?</h2>
        <p>
          Feedim-də jeton qazanmaq üçün məzmun istehsal etməniz və bu məzmunların Premium abunəçilər
          tərəfindən həqiqətən oxunması kifayətdir. Sistem, həqiqi oxumaları avtomatik olaraq doğrulayır
          və qazancınızı hesabınıza əks etdirir.
        </p>

        {/* ── Jeton Satın Alma ── */}
        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Jeton Satın Alma</h2>
        <p>
          Oxucular, məzmun istehsalçılarını dəstəkləmək və platformdakı xüsusiyyətləri istifadə etmək üçün
          jeton satın ala bilər. Jeton paketləri fərqli məbləğlərdə təqdim edilir və böyük paketlərdə bonus
          jetonlar qazanılır.
        </p>
        <div className="bg-bg-secondary rounded-[15px] p-4 space-y-3">
          <p className="font-semibold text-text-primary text-xs uppercase tracking-wide">Paketlər və Bonuslar</p>
          <ul className="list-disc pl-5 space-y-2">
            <li>Fərqli büdcələrə uyğun jeton paketləri mövcuddur</li>
            <li>Daha böyük paketlər satın alındıqda <strong>bonus jeton</strong> qazanılır</li>
            <li>Paket detallarını{" "}
              <Link href="/coins" className="text-accent-main hover:opacity-80 font-semibold">Jeton Səhifəsi</Link>ndən
              görüntüləyə bilərsiniz
            </li>
          </ul>
        </div>
        <div className="bg-bg-secondary rounded-[15px] p-4 space-y-3 mt-3">
          <p className="font-semibold text-text-primary text-xs uppercase tracking-wide">Ödəniş Təhlükəsizliyi</p>
          <ul className="list-disc pl-5 space-y-2">
            <li>Bütün ödənişlər <strong>SSL şifrələmə</strong> ilə qorunur</li>
            <li><strong>3D Secure</strong> doğrulama ilə təhlükəsiz ödəniş edilir</li>
            <li>Kart məlumatlarınız Feedim serverlərində saxlanılmır</li>
            <li>Ətraflı məlumat üçün{" "}
              <Link href="/help/payment-security" className="text-accent-main hover:opacity-80 font-semibold">Ödəniş Təhlükəsizliyi</Link> səhifəsinə
              baxa bilərsiniz
            </li>
          </ul>
        </div>

        {/* ── Jeton Balansı ── */}
        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Jeton Balansı</h2>
        <p>
          Mövcud jeton balansınızı və qazanc tarixçənizi asanlıqla izləyə bilərsiniz.
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li>Profil səhifənizdəki balans göstəricisindən ani jeton balansınızı görə bilərsiniz</li>
          <li><Link href="/coins" className="text-accent-main hover:opacity-80 font-semibold">Jeton Səhifəsi</Link>ndən
            ətraflı balans məlumatı, qazanc tarixçəsi və satınalma tarixçənizi nəzərdən keçirə bilərsiniz</li>
        </ul>

        {/* ── Jeton Çəkimi ── */}
        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Jeton Çəkimi (Nağdlaşdırma)</h2>
        <p>
          Qazandığınız jetonları müəyyən şərtlər daxilində Türk Lirası olaraq çəkə bilərsiniz.
        </p>
        <div className="bg-bg-secondary rounded-[15px] p-4 space-y-3">
          <p className="font-semibold text-text-primary text-xs uppercase tracking-wide">Çəkim Şərtləri</p>
          <ul className="list-disc pl-5 space-y-2">
            <li>Minimum çəkim məbləği: <strong>100 jeton</strong> (10 TL)</li>
            <li>Çəkim üçün hesabınıza <strong>IBAN məlumatı</strong> təyin etməlisiniz</li>
            <li>Çəkim tələbləri <strong>iş günlərində</strong> emal edilir</li>
            <li>Çəkim məbləği göstərdiyiniz IBAN nömrəsinə köçürmə yolu ilə göndərilir</li>
          </ul>
        </div>

        {/* ── Jeton İstifadə Sahələri ── */}
        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Jeton İstifadə Sahələri</h2>
        <p>
          Jetonlar Feedim platformasında müxtəlif məqsədlər üçün istifadə edilə bilər:
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li>Məzmun oxuma dəstəyi &mdash; Premium oxucu olaraq məzmun istehsalçılarını dəstəkləmə</li>
          <li>Nağdlaşdırma &mdash; Qazanılmış jetonları Türk Lirası olaraq çəkmə</li>
          <li>Platform daxili xüsusiyyətlər &mdash; Feedim-in təqdim etdiyi əlavə xüsusiyyətlərdən yararlanma</li>
        </ul>

        {/* ── Sui-istifadə ── */}
        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Sui-istifadə və Sanksiyalar</h2>
        <p>
          Feedim, jeton sisteminin ədalətli istifadəsini təmin etmək üçün inkişaf etmiş aşkarlama mexanizmlərinə
          malikdir. Aşağıdakı davranışlar sui-istifadə olaraq qiymətləndirilir:
        </p>
        <div className="bg-bg-secondary rounded-[15px] p-4 space-y-3">
          <ul className="list-disc pl-5 space-y-2">
            <li><strong>Saxta oxuma</strong> &mdash; Həqiqi oxuma olmadan jeton qazanmağa çalışmaq</li>
            <li><strong>Bot istifadəsi</strong> &mdash; Avtomatik alətlər ilə süni oxuma yaratmaq</li>
            <li><strong>Çoxlu hesab sui-istifadəsi</strong> &mdash; Birdən çox hesabla öz məzmunlarını oxutmaq</li>
            <li><strong>Koordinə edilmiş manipulyasiya</strong> &mdash; Digər istifadəçilərlə razılaşaraq saxta oxuma istehsal etmək</li>
          </ul>
        </div>
        <p className="mt-3">
          Sui-istifadə aşkar edildikdə aşağıdakı sanksiyalar tətbiq edilir:
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li>Haqsız qazanılmış jetonlar <strong>ləğv</strong> edilir</li>
          <li>Hesab müvəqqəti və ya qalıcı olaraq <strong>dayandırılır</strong></li>
          <li>Gözləyən çəkim tələbləri ləğv edilir</li>
          <li>Təkrarlanan pozuntularda hesab qalıcı olaraq bağlana bilər</li>
        </ul>

        {/* ── Jeton Səhifəsi Yönləndirmə ── */}
        <div className="bg-bg-secondary rounded-[15px] p-5 mt-8 flex flex-col gap-3">
          <p className="text-sm text-text-primary font-semibold">
            Jeton balansınızı görüntüləmək, jeton satın almaq və ya çəkim tələbi yaratmaq üçün:
          </p>
          <Link
            href="/coins"
            className="text-accent-main hover:opacity-80 font-semibold text-sm"
          >
            Jeton Səhifəsinə Get &rarr;
          </Link>
        </div>

        <div className="bg-bg-secondary rounded-[15px] p-5 mt-8">
          <p className="text-xs text-text-muted">
            Jeton sistemi haqqında suallarınız üçün{" "}
            <Link href="/help/contact" className="text-accent-main hover:opacity-80 font-semibold">Əlaqə</Link> səhifəmizdən
            və ya <a href="mailto:support@feedim.com" className="text-accent-main hover:opacity-80 font-semibold">support@feedim.com</a> ünvanından
            bizə müraciət edə bilərsiniz.
          </p>
        </div>
      </div>
    </>
  );
}
