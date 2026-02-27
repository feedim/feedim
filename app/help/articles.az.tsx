import Link from "next/link";
import { Heart, MessageCircle, Bell, Home, Bookmark } from "lucide-react";
import type { HelpArticle, HelpPageLink, HelpSection } from "./articles.types";

const lnk = "text-accent-main hover:opacity-80 font-semibold";
const ico = "inline-block h-4 w-4 text-accent-main align-text-bottom mx-0.5";

const ShareIcon = () => (
  <svg className={ico} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" />
    <polyline points="16 6 12 2 8 6" />
    <line x1="12" y1="2" x2="12" y2="15" />
  </svg>
);

export const sections: HelpSection[] = [
  { id: "hesap", label: "Hesab və Qeydiyyat" },
  { id: "guvenlik", label: "Gizlilik və Təhlükəsizlik" },
  { id: "profil", label: "Profil və Parametrlər" },
  { id: "icerik", label: "Yazı, Video və Məzmun" },
  { id: "moderasyon", label: "Moderasiya və Məzmun Təhlükəsizliyi" },
  { id: "telif", label: "Müəllif Hüququ və Kopya Məzmun" },
  { id: "etkilesim", label: "Qarşılıqlı Əlaqə və Sosial" },
  { id: "bildirim", label: "Bildirişlər" },
  { id: "jeton", label: "Jeton və Qazanc" },
  { id: "premium", label: "Premium Üzvlük" },
  { id: "kesfet", label: "Kəşf et və Axtarış" },
  { id: "sorun", label: "Problemlərin Həlli" },
];

export const pageLinks: HelpPageLink[] = [
  { title: "Kömək Mərkəzi", href: "/help", description: "Tez-tez verilən suallar və kömək məqalələri" },
  { title: "Haqqımızda", href: "/help/about", description: "Feedim haqqında məlumat" },
  { title: "İstifadə Şərtləri", href: "/help/terms", description: "Platformun istifadə şərtləri və qaydaları" },
  { title: "Gizlilik Siyasəti", href: "/help/privacy", description: "Şəxsi məlumatların qorunması və gizlilik" },
  { title: "Məlumatların Qorunması", href: "/help/privacy", description: "Şəxsi Məlumatların Qorunması Qanunu" },
  { title: "İcma Qaydaları", href: "/help/community-guidelines", description: "Məzmun standartları, davranış qaydaları və sanksiyalar" },
  { title: "Əlaqə", href: "/help/contact", description: "Bizimlə əlaqə saxlayın, dəstək alın" },
  { title: "Müəllif Hüququ Qorunması", href: "/help/copyright", description: "Müəllif hüququ qoruma sistemi, kopya məzmun siyasəti və strike sistemi" },
  { title: "Moderasiya Sistemi", href: "/help/moderation", description: "Məzmun moderasiyası, AI nəzərdən keçirmə və etiraz prosesləri" },
  { title: "Feedim AI", href: "/help/ai", description: "Süni intellektlə dəstəklənən məzmun moderasiyası və tövsiyələr" },
  { title: "Məzmun Növləri", href: "/help/content-types", description: "Yazı, video, moment və məzmun formatları" },
  { title: "Jeton Sistemi", href: "/help/coins", description: "Jeton qazanma, satın alma və balans idarəetməsi" },
  { title: "Pul Qazanma", href: "/help/earning", description: "Məzmun yaradıcıları üçün qazanc modeli və çıxarış" },
  { title: "Analitika", href: "/help/analytics", description: "Yazı statistikaları, profil analitikası və performans" },
  { title: "Məlumat Paylaşımı", href: "/help/data-sharing", description: "Üçüncü tərəflər və dövlət orqanları ilə məlumat paylaşım siyasəti" },
  { title: "Giriş Məhdudiyyətləri", href: "/help/access-restrictions", description: "Yaş məhdudiyyətləri, bölgə və hesab məhdudiyyətləri" },
  { title: "Əlçatanlıq", href: "/help/accessibility", description: "Əlçatanlıq xüsusiyyətləri və uyğunluq" },
  { title: "Profil Xalı Sistemi", href: "/help/profile-score", description: "Profil etibar xalı nədir, necə hesablanır və niyə vacibdir" },
  { title: "Premium", href: "/premium", description: "Premium üzvlük planları və qiymətlər" },
  { title: "Məsuliyyətdən İmtina", href: "/help/disclaimer", description: "Hüquqi məsuliyyətdən imtina bəyanatı" },
  { title: "Məsafəli Satış Müqaviləsi", href: "/help/distance-sales-contract", description: "Jeton və premium satın alma müqaviləsi" },
  { title: "Ön Məlumat Forması", href: "/help/pre-information-form", description: "Məsafəli satışdan əvvəl istehlakçı məlumatlandırması" },
  { title: "Ödəniş Təhlükəsizliyi", href: "/help/payment-security", description: "SSL, 3D Secure və PCI-DSS ödəniş təhlükəsizliyi" },
  { title: "Geri Qaytarma Siyasəti", href: "/help/refund-policy", description: "Jeton və premium üzvlük geri qaytarma şərtləri" },
];

export const articles: HelpArticle[] = [
  // ─── Hesab və Qeydiyyat ─────────────────────────────────────
  {
    section: "hesap",
    question: "Hesabı necə yaradım?",
    searchText: "Ana səhifədəki Hesab yarat düyməsinə klikləyin. Ad, soyad, istifadəçi adı, e-poçt və şifrə məlumatlarınızı daxil edin. Google hesabınızla da qeydiyyatdan keçə bilərsiniz. Qeydiyyatdan sonra e-poçtunuza doğrulama linki göndərilir.",
    answer: <>Ana səhifədəki <strong>&lsquo;Hesab yarat&rsquo;</strong> düyməsinə klikləyin. Ad, soyad, istifadəçi adı, e-poçt və şifrə məlumatlarınızı daxil edin. Google hesabınızla da sürətlə qeydiyyatdan keçə bilərsiniz. Qeydiyyatdan sonra e-poçt ünvanınıza doğrulama linki göndərilir &mdash; bu linkə klikləyərək hesabınızı aktivləşdirin.</>,
  },
  {
    section: "hesap",
    question: "Google ilə necə qeydiyyatdan keçirəm və ya daxil oluram?",
    searchText: "Google ilə davam et düyməsinə klikləyərək Google hesabınızla birbaşa daxil ola bilərsiniz. Hesabınız yoxdursa avtomatik yaradılır. Google profil şəkliniz və adınız köçürülür.",
    answer: <><strong>&lsquo;Google ilə davam et&rsquo;</strong> düyməsinə klikləyərək Google hesabınızla birbaşa daxil ola bilərsiniz. Əvvəlcədən Feedim hesabınız yoxdursa avtomatik olaraq yaradılır. Google hesabınızdakı ad və profil şəkli avtomatik köçürülür. Ayrıca şifrə təyin etməyinizə ehtiyac yoxdur.</>,
  },
  {
    section: "hesap",
    question: "E-poçt doğrulaması necə edilir?",
    searchText: "Qeydiyyatdan sonra e-poçt ünvanınıza doğrulama linki göndərilir. Bu linkə klikləyərək hesabınızı doğrulayın. Doğrulama edilməzsə bəzi xüsusiyyətlər məhdud ola bilər.",
    answer: <>Qeydiyyatdan sonra e-poçt ünvanınıza doğrulama linki göndərilir. Bu linkə klikləyərək hesabınızı doğrulayın. Doğrulanmamış hesablarda yazı yaratma və bəzi qarşılıqlı əlaqə xüsusiyyətləri məhdud ola bilər. Link gəlməzsə spam qovluğunuzu yoxlayın. <Link href="/help/contact" className={lnk}>Dəstək komandamıza</Link> müraciət edərək kömək ala bilərsiniz.</>,
  },
  {
    section: "hesap",
    question: "E-poçt ünvanımı dəyişə bilərəmmi?",
    searchText: "Parametrlər Təhlükəsizlik bölməsindən e-poçt ünvanınızı yeniləyə bilərsiniz. Yeni ünvanınıza doğrulama linki göndərilir.",
    answer: <>Bəli. <strong>Parametrlər &rarr; Təhlükəsizlik</strong> bölməsindən e-poçt ünvanınızı yeniləyə bilərsiniz. Dəyişiklikdən sonra yeni e-poçt ünvanınıza doğrulama linki göndərilir. Doğrulamadan əvvəl köhnə e-poçt ünvanınız aktiv qalır.</>,
  },
  {
    section: "hesap",
    question: "Birdən çox cihazdan daxil ola bilərəmmi?",
    searchText: "Bəli, hesabınıza eyni anda birdən çox cihazdan daxil ola bilərsiniz. Təhlükəsizlik bölməsindən sessiyaları idarə edə bilərsiniz.",
    answer: "Bəli, hesabınıza eyni anda birdən çox cihazdan daxil ola bilərsiniz. Hər cihazda ayrı bir sessiya açılır. Bütün sessiyaları sonlandırmaq istəyirsinizsə Parametrlər \u2192 Təhlükəsizlik bölməsindən aktiv sessiyaları görə və bağlaya bilərsiniz.",
  },
  {
    section: "hesap",
    question: "Daxil olmadan platformu istifadə edə bilərəmmi?",
    searchText: "Bəli, daxil olmadan ana səhifə və kəşf et bölməsini gəzə, yazıları oxuya bilərsiniz. Yazı yaratma, bəyənmə, şərh yazma və izləmə üçün hesab lazımdır.",
    answer: <>Bəli, daxil olmadan ana səhifə və <Link href="/explore" className={lnk}>kəşf et</Link> bölməsini gəzə, yazıları oxuya bilərsiniz. Lakin yazı yaratma, bəyənmə, şərh yazma və izləmə kimi qarşılıqlı əlaqələr üçün hesab yaratmalısınız.</>,
  },
  {
    section: "hesap",
    question: "Saxlanılmış hesablar xüsusiyyəti nədir?",
    searchText: "Daxil olduqda hesabınız cihazınıza saxlanılır. Növbəti girişdə bir klikdə seçə bilərsiniz. Son istifadə edilən 1 hesab saxlanılır.",
    answer: "Daxil olduqda hesabınız avtomatik olaraq cihazınıza saxlanılır. Növbəti girişinizdə bir klikdə hesabınızı seçərək sürətlə daxil ola bilərsiniz. Son istifadə edilən 1 hesab saxlanılır. İstədiyiniz hesabı siyahıdan silə bilərsiniz. Saxlanılmış hesab məlumatı yalnız cihazınızda saxlanılır.",
  },
  {
    section: "hesap",
    question: "Hesab növləri hansılardır?",
    searchText: "Feedim-də pulsuz standart hesab və Premium hesab olmaqla iki növ var. Premium üzvlər əlavə xüsusiyyətlərdən istifadə edir.",
    answer: <>Feedim-də iki hesab növü var: <strong>Standart</strong> (pulsuz) və <strong>Premium</strong>. Standart hesabla yazı yarada, şərh yaza və qarşılıqlı əlaqəyə girə bilərsiniz. Premium hesab əlavə xüsusiyyətlər təqdim edir: reklamsız təcrübə, prioritet dəstək, xüsusi nişan və daha çox. Ətraflı məlumat üçün <Link href="/premium" className={lnk}>Premium səhifəsini</Link> nəzərdən keçirin.</>,
  },

  // ─── Gizlilik və Təhlükəsizlik ───────────────────────────────
  {
    section: "guvenlik",
    question: "Şifrəmi unutdum, nə etməliyəm?",
    searchText: "Giriş səhifəsindəki Şifrəmi Unutdum linkinə klikləyin. E-poçt ünvanınızı daxil edin, şifrə sıfırlama linki göndərilir.",
    answer: <>Giriş səhifəsindəki <strong>&lsquo;Şifrəmi Unutdum&rsquo;</strong> linkinə klikləyin. E-poçt ünvanınızı daxil edin, sizə şifrə sıfırlama linki göndəriləcək. Linkə klikləyərək yeni şifrənizi təyin edin. Link gəlməzsə spam qovluğunuzu yoxlayın.</>,
  },
  {
    section: "guvenlik",
    question: "Şifrəmi necə dəyişdirirəm?",
    searchText: "Parametrlər Təhlükəsizlik bölməsindən mövcud şifrənizi və yeni şifrənizi daxil edərək dəyişə bilərsiniz. Şifrə ən azı 6 simvol olmalıdır.",
    answer: <><strong>Parametrlər &rarr; Təhlükəsizlik</strong> bölməsindən mövcud şifrənizi və yeni şifrənizi daxil edərək dəyişə bilərsiniz. Şifrəniz ən azı 6 simvol olmalıdır. Dəyişiklikdən sonra digər cihazlardakı sessiyalarınız açıq qalır. Təhlükəsizliyiniz üçün güclü və unikal bir şifrə seçməyinizi tövsiyə edirik.</>,
  },
  {
    section: "guvenlik",
    question: "İki faktorlu doğrulama (MFA) nədir?",
    searchText: "İki faktorlu doğrulama hesabınıza əlavə təhlükəsizlik qatı əlavə edir. Hər girişdə şifrədən əlavə doğrulama kodu daxil etməlisiniz.",
    answer: "İki faktorlu doğrulama (MFA), hesabınıza əlavə bir təhlükəsizlik qatı əlavə edir. Aktivləşdirdikdən sonra hər girişdə şifrənizdən əlavə bir doğrulama kodu daxil etməlisiniz. Bu xüsusiyyət hesabınızı icazəsiz girişlərdən qoruyur. Parametrlər \u2192 Təhlükəsizlik bölməsindən aktivləşdirə bilərsiniz.",
  },
  {
    section: "guvenlik",
    question: "Gizli hesab nədir?",
    searchText: "Gizli hesab açdıqda yazılarınız yalnız izləyicilərinizə görünür. Yeni izləmə sorğuları sizin təsdiqinizi gözləyir.",
    answer: <>Gizli hesab açdıqda yazılarınız yalnız izləyicilərinizə görünür. Kimsə sizi izləmək istədikdə sizdən təsdiq gözləyir. Mövcud izləyiciləriniz təsirlənmir. <strong>Parametrlər &rarr; Gizlilik</strong> bölməsindən hesabınızı gizliyə ala və ya yenidən hamıya açıq edə bilərsiniz.</>,
  },
  {
    section: "guvenlik",
    question: "Bir istifadəçini necə bloklayıram?",
    searchText: "Bloklamaq istədiyiniz istifadəçinin profilindəki menüdən Blokla seçimini istifadə edin. Bloklanan istifadəçilər məzmununuzu görə bilmir.",
    answer: <>Bloklamaq istədiyiniz istifadəçinin profilindəki üç nöqtə menüsündən <strong>&lsquo;Blokla&rsquo;</strong> seçimini istifadə edin. Bloklanan istifadəçilər məzmununuzu görə bilmir, sizə şərh yaza və mesaj göndərə bilmir. Bloklama əməliyyatı qarşı tərəfə bildirilmir. Bloku istənilən vaxt qaldıra bilərsiniz.</>,
  },
  {
    section: "guvenlik",
    question: "Bloku necə qaldırıram?",
    searchText: "Parametrlər Gizlilik bölməsindəki bloklanan istifadəçilər siyahısından bloku qaldıra bilərsiniz.",
    answer: "Parametrlər \u2192 Gizlilik \u2192 Bloklanan İstifadəçilər bölməsindən blokladığınız şəxslərin siyahısını görə bilərsiniz. Bloku qaldırmaq istədiyiniz istifadəçinin yanındakı düyməyə klikləyin. Blok qaldırıldıqda həmin istifadəçi yenidən məzmununuzu görə və sizinlə qarşılıqlı əlaqəyə girə bilər.",
  },
  {
    section: "guvenlik",
    question: "Bir məzmunu və ya istifadəçini necə şikayət edirəm?",
    searchText: "Məzmunun və ya profilin menüsündən Şikayət Et seçimini istifadə edin. Şikayət səbəbini seçin və göndərin. Komandamız tərəfindən nəzərdən keçirilir.",
    answer: <>Məzmunun və ya profilin üç nöqtə menüsündən <strong>&lsquo;Şikayət Et&rsquo;</strong> seçimini istifadə edin. Şikayət səbəbini seçin (spam, nifrət nitqi, təcavüz və s.) və göndərin. Şikayətiniz komandamız tərəfindən ən qısa zamanda nəzərdən keçirilir və lazımi tədbir görülür. Şikayətiniz anonim saxlanılır.</>,
  },
  {
    section: "guvenlik",
    question: "Hesabımı necə dondururam?",
    searchText: "Parametrlər Təhlükəsizlik bölməsindən hesabınızı dondura bilərsiniz. Dondurulan hesab axtarışda və profildə görünməz olur. Yenidən daxil olaraq aktivləşdirin.",
    answer: "Parametrlər \u2192 Təhlükəsizlik bölməsindən hesabınızı müvəqqəti olaraq dondura bilərsiniz. Dondurulan hesab axtarış nəticələrində görünməz olur və profilinizə giriş mümkün olmur. Məzmununuz və məlumatlarınız qorunur. Yenidən daxil olaraq hesabınızı istənilən vaxt aktivləşdirə bilərsiniz.",
  },
  {
    section: "guvenlik",
    question: "Hesabımı həmişəlik necə silirəm?",
    searchText: "Parametrlər Təhlükəsizlik bölməsindən hesabınızı həmişəlik silə bilərsiniz. Bu əməliyyat geri qaytarıla bilməz. Bütün məlumatlarınız 30 gün ərzində silinir.",
    answer: <>Parametrlər &rarr; Təhlükəsizlik bölməsindən hesabınızı həmişəlik silə bilərsiniz. <strong>Bu əməliyyat geri qaytarıla bilməz.</strong> Bütün yazılarınız, şərhləriniz, Jeton balansınız və şəxsi məlumatlarınız 30 gün ərzində həmişəlik silinir. Silmə əməliyyatını təsdiqləmək üçün &lsquo;DELETE&rsquo; yazmalısınız. Daha ətraflı məlumat üçün <Link href="/help/privacy" className={lnk}>Gizlilik Siyasəti</Link> səhifəmizə baxın.</>,
  },
  {
    section: "guvenlik",
    question: "Məlumatlarım necə qorunur?",
    searchText: "Şifrələr təhlükəsiz hash ilə saxlanılır. SSL/TLS şifrələmə istifadə edilir. Məlumatlar reklam məqsədilə satılmır. Məlumat qoruma qanunlarına uyğun emal.",
    answer: <>Şifrələriniz təhlükəsiz şəkildə hash edilərək saxlanılır və heç vaxt düz mətn olaraq saxlanılmır. Bütün əlaqə SSL/TLS ilə şifrələnir. Məlumatlarınız reklam məqsədilə üçüncü tərəflərə satılmır. Şəxsi məlumatlarınız məlumat qoruma qanunları çərçivəsində qorunur. Ətraflı məlumat üçün <Link href="/help/privacy" className={lnk}>Gizlilik Siyasəti</Link> və <Link href="/help/terms" className={lnk}>İstifadə Şərtləri</Link> səhifələrimizə baxa bilərsiniz.</>,
  },

  // ─── Profil və Parametrlər ──────────────────────────────────
  {
    section: "profil",
    question: "Profilimi necə redaktə edirəm?",
    searchText: "Profil səhifənizdəki Profili Redaktə et düyməsinə klikləyin. Ad, soyad, istifadəçi adı, bioqrafiya, profil şəkli, doğum tarixi və veb sayt məlumatlarınızı yeniləyə bilərsiniz.",
    answer: <>Profil səhifənizdəki <strong>&lsquo;Profili Redaktə et&rsquo;</strong> düyməsinə klikləyin. Ad, soyad, istifadəçi adı, bioqrafiya, profil şəkli, doğum tarixi, cins və veb sayt məlumatlarınızı yeniləyə bilərsiniz. Dəyişikliklər saxladıqdan sonra dərhal əks olunur.</>,
  },
  {
    section: "profil",
    question: "İstifadəçi adı nədir və necə dəyişdirilir?",
    searchText: "İstifadəçi adı profilinizin unikal identifikatorudur. 3-15 simvol, hərf, rəqəm, nöqtə və alt xətt istifadə edə bilərsiniz. Profil redaktə ekranından dəyişə bilərsiniz.",
    answer: "İstifadəçi adı profilinizin unikal identifikatorudur və URL-nizdə görünür (feedim.com/u/istifadeciadı). Profil redaktə ekranından dəyişə bilərsiniz. İstifadəçi adı 3-15 simvol arasında olmalı, yalnız hərf, rəqəm, nöqtə və alt xətt ehtiva edə bilər. Seçdiyiniz istifadəçi adı mövcud olmalıdır \u2014 ani olaraq yoxlanılır.",
  },
  {
    section: "profil",
    question: "Profil şəklimi necə dəyişdirirəm?",
    searchText: "Profil redaktə ekranındakı kamera simgesinə klikləyin, şəkil seçin və kəsmə aləti ilə tənzimləyin. Maksimum 10 MB.",
    answer: "Profil redaktə ekranındakı kamera simgesinə klikləyin, bir şəkil seçin və kəsmə aləti ilə istədiyiniz şəkildə tənzimləyin. Maksimum fayl ölçüsü 10 MB-dır. Şəklinizi istənilən vaxt silə və ya yenisi ilə əvəz edə bilərsiniz.",
  },
  {
    section: "profil",
    question: "Bioqrafiya nədir?",
    searchText: "Bioqrafiya profilinizdə görünən qısa bir tanıtım mətnidir. Ən çox 150 simvol. Özünüzü qısa tanıdın.",
    answer: "Bioqrafiya profilinizdə görünən qısa bir tanıtım mətnidir. Ən çox 150 simvol ola bilər. Özünüzü qısa tanıdın, maraq dairələrinizdən və ya ixtisasınızdan bəhs edin. Yaxşı bir bioqrafiya profilinizi daha cəlbedici edir və digər istifadəçilərin sizi tanımasını asanlaşdırır.",
  },
  {
    section: "profil",
    question: "Tema parametrlərini necə dəyişdirirəm?",
    searchText: "Sol menüdəki tema düyməsinə klikləyərək Açıq, Qaranlıq, Dim və ya Sistem rejimləri arasında keçid edə bilərsiniz.",
    answer: "Sol menüdəki tema düyməsinə klikləyərək Açıq, Qaranlıq, Dim və ya Sistem rejimləri arasında keçid edə bilərsiniz. Sistem rejimi cihazınızın parametrlərini avtomatik izləyir. Seçdiyiniz tema cihazınıza saxlanılır və sonrakı ziyarətlərinizdə avtomatik tətbiq edilir.",
  },
  {
    section: "profil",
    question: "Doğrulanmış hesab nişanı nədir?",
    searchText: "Doğrulanmış hesab nişanı (mavi tik), platformda etibarlılığı sübut edilmiş hesablara verilir. Profil tamamlama, məzmun keyfiyyəti və icma qarşılıqlı əlaqəsi dəyərləndirilir.",
    answer: "Doğrulanmış hesab nişanı (mavi tik), platformda etibarlılığı sübut edilmiş hesablara verilir. Nişan avtomatik qiymətləndirmə və komanda təsdiqi ilə verilir. Profil tamamlama faizi, məzmun keyfiyyəti, icma qarşılıqlı əlaqəsi və hesab yaşı kimi meyarlar dəyərləndirilir. Premium üzvlər prioritet olaraq dəyərləndirilir.",
  },

  // ─── Yazı və Məzmun ──────────────────────────────────────
  {
    section: "icerik",
    question: "Yazı nədir?",
    searchText: "Yazı, Feedim-də paylaşdığınız məzmundur. Mətn, şəkil və zəngin mətn formatlarını dəstəkləyir. Yazılarınız profilinizdə və axında görünür.",
    answer: <>Yazı, Feedim-də yaradıb paylaşdığınız məzmundur. Mətn, şəkil, link və zəngin mətn formatlarını dəstəkləyir. Yazılarınız profilinizdə siyahılanır, izləyicilərinizin ana səhifəsində və <Link href="/explore" className={lnk}>kəşf et</Link> bölməsində görünür. Hər yazıya etiket əlavə edə, bəyəni və şərh ala bilərsiniz.</>,
  },
  {
    section: "icerik",
    question: "Yazını necə yaradıram?",
    searchText: "Sol menüdəki Yarat düyməsinə klikləyin. Başlıq daxil edin, məzmununuzu zəngin mətn redaktoru ilə yazın, etiket və üz qabığı şəkli əlavə edin. Qaralama olaraq saxlaya və ya dərc edə bilərsiniz.",
    answer: <>Sol menüdəki <strong>&lsquo;Yarat&rsquo;</strong> düyməsinə klikləyin. Başlıq daxil edin (ən azı 3 simvol), məzmununuzu zəngin mətn redaktoru ilə yazın. İstəyə bağlı olaraq üz qabığı şəkli və etiketlər əlavə edin. Yazınızı qaralama olaraq saxlaya və ya birbaşa dərc edə bilərsiniz. Məzmun ən azı 50 simvol olmalıdır.</>,
  },
  {
    section: "icerik",
    question: "Etiket nədir və necə əlavə edilir?",
    searchText: "Etiketlər yazınızın mövzusunu müəyyən edir. Ən çox 5 etiket əlavə edə bilərsiniz. Etiketlər kəşf et bölməsində kateqoriyalara ayrılmanızı təmin edir.",
    answer: <>Etiketlər yazınızın mövzusunu və kateqoriyasını müəyyən edir. Yazı yaradarkən ən çox 5 etiket əlavə edə bilərsiniz. Etiketlər yazınızın <Link href="/explore" className={lnk}>kəşf et</Link> bölməsində düzgün kateqoriyada görünməsini və digər istifadəçilərin məzmununuzu asanlıqla tapmasını təmin edir. Populyar etiketlər trend siyahısında yer alır.</>,
  },
  {
    section: "icerik",
    question: "Yazımı redaktə edə bilərəmmi?",
    searchText: "Bəli, dərc etdiyiniz yazını redaktə edə bilərsiniz. Yazının menüsündən Redaktə et seçimi ilə başlığı, məzmunu və etiketləri yeniləyin. Dəyişikliklər dərhal əks olunur.",
    answer: <>Bəli, dərc etdiyiniz yazını istənilən vaxt redaktə edə bilərsiniz. Yazının sağ üst küncündəki menüdən <strong>&lsquo;Redaktə et&rsquo;</strong> seçiminə klikləyin. Başlığı, məzmunu, üz qabığı şəklini və etiketləri yeniləyə bilərsiniz. Dəyişikliklər saxlandıqdan sonra dərhal əks olunur.</>,
  },
  {
    section: "icerik",
    question: "Yazımı necə silirəm?",
    searchText: "Yazının menüsündən Sil seçimi ilə silə bilərsiniz. Silinən yazılar geri qaytarıla bilməz. Bütün bəyənilər, şərhlər və Jeton qazancları da silinir.",
    answer: <>Yazının menüsündən <strong>&lsquo;Sil&rsquo;</strong> seçimini istifadə edərək silə bilərsiniz. Silmə əməliyyatı təsdiq tələb edir. Silinən yazılar geri qaytarıla bilməz. Yazıya aid bütün <Heart className={ico} /> bəyənilər, <MessageCircle className={ico} /> şərhlər və Jeton qazancları da həmişəlik silinir.</>,
  },
  {
    section: "icerik",
    question: "Qaralama nədir?",
    searchText: "Qaralama, hələ dərc edilməmiş yazıdır. Qaralama olaraq saxlayıb daha sonra redaktə edə və dərc edə bilərsiniz. Profilinizdəki qaralamalar bölməsindən çata bilərsiniz.",
    answer: <>Qaralama, hələ dərc edilməmiş və yalnız sizə görünən bir yazıdır. Yazı yaradarkən <strong>&lsquo;Qaralama olaraq saxla&rsquo;</strong> seçimi ilə saxlayın. Qaralamaları daha sonra redaktə edə, dərc edə və ya silə bilərsiniz. Profilinizdəki qaralamalar bölməsindən bütün qaralamalarınıza çata bilərsiniz.</>,
  },
  {
    section: "icerik",
    question: "Üz qabığı şəkli əlavə etmək məcburidirmi?",
    searchText: "Xeyr, üz qabığı şəkli ixtiyaridir. Üz qabığı şəkli olan yazılar kəşf et və ana səhifədə daha diqqətçəkici görünür.",
    answer: "Xeyr, üz qabığı şəkli ixtiyaridir. Lakin üz qabığı şəkli olan yazılar kəşf et və ana səhifədə daha diqqətçəkici görünür və daha çox klik alır. Yüksək keyfiyyətli, mövzu ilə əlaqəli bir şəkil seçməyinizi tövsiyə edirik.",
  },
  {
    section: "icerik",
    question: "Zəngin mətn redaktoru necə istifadə edilir?",
    searchText: "Yazı yazarkən qalın, kursiv, başlıq, siyahı, link, şəkil və sitat kimi formatlaşdırma seçimlərini istifadə edə bilərsiniz.",
    answer: "Yazı yazarkən redaktor alət çubuğunu istifadə edərək məzmununuzu zənginləşdirə bilərsiniz. Qalın, kursiv, başlıq (H2, H3), sıralı və nöqtəli siyahılar, link əlavəsi, şəkil yükləmə və sitat kimi formatlaşdırma seçimləri mövcuddur. Şəkillər sürüklə-burax ilə də əlavə edilə bilər.",
  },
  {
    section: "icerik",
    question: "Məzmun qaydaları hansılardır?",
    searchText: "Məzmunlar orijinal olmalı, müəllif hüququ pozuntusu edilməməlidir. Nifrət nitqi, zorakılıq, təcavüz, spam və qanunsuz məzmunlar qadağandır. Qayda pozuntusunda məzmun silinə bilər.",
    answer: <>Məzmunlar orijinal olmalı, müəllif hüququ pozuntusu edilməməlidir. Nifrət nitqi, zorakılıq, təcavüz, spam və qanunsuz fəaliyyətləri təşviq edən məzmunlar qadağandır. Şəxsi məlumatların icazəsiz paylaşımı qadağandır. Qayda pozuntusunda məzmun silinə və hesab dayandırıla bilər. Ətraflı qaydalar üçün <Link href="/help/terms" className={lnk}>İstifadə Şərtləri</Link> səhifəmizə baxın.</>,
  },
  {
    section: "icerik",
    question: "Yazım niyə silinmiş ola bilər?",
    searchText: "Yazınız icma qaydalarına zidd tapılmış ola bilər. Müəllif hüququ pozuntusu, spam, nifrət nitqi və ya şikayət nəticəsində silinmiş ola bilər.",
    answer: <>Yazınız icma qaydalarına zidd tapıldığı üçün silinmiş ola bilər. Ən çox rast gəlinən səbəblər: müəllif hüququ pozuntusu, spam məzmun, nifrət nitqi, aldadıcı məlumat və ya digər istifadəçilərdən gələn şikayətlər. Silmə əməliyyatı barədə ətraflı məlumat almaq və ya etiraz etmək üçün <a href="mailto:support@feedim.com" className={lnk}>support@feedim.com</a> ünvanına yaza bilərsiniz.</>,
  },

  // ─── Moderasiya və Məzmun Təhlükəsizliyi ────────────────────
  {
    section: "moderasyon",
    question: "Moderasiya sistemi necə işləyir?",
    searchText: "Feedim moderasiya sistemi AI dəstəkli avtomatik nəzərdən keçirmə və insan moderator nəzarəti ilə işləyir. Məzmunlar dərc edilmədən əvvəl AI tərəfindən taranır.",
    answer: <>Feedim, AI dəstəkli avtomatik moderasiya və insan moderator nəzərdən keçirməsi olmaqla iki qatlı bir sistem istifadə edir. Yeni məzmunlar dərc edildikdə AI tərəfindən taranır. Problemli məzmunlar moderasiyaya alınır və yalnız müəllifə görünür. Ətraflı məlumat üçün <Link href="/help/moderation" className={lnk}>Moderasiya Sistemi</Link> səhifəsinə baxın.</>,
  },
  {
    section: "moderasyon",
    question: "Məzmunum niyə moderasiyaya alındı?",
    searchText: "Məzmun icma qaydalarına zidd tapılarsa moderasiyaya alınır. NSFW, nifrət nitqi, müəllif hüququ pozuntusu, spam kimi səbəblərlə gizlənə bilər.",
    answer: <>Məzmununuz icma qaydalarına zidd tapıldığı üçün moderasiyaya alınmış ola bilər. Ən çox rast gəlinən səbəblər: NSFW/cinsi məzmun, nifrət nitqi, müəllif hüququ pozuntusu, kopya məzmun və ya spam. Moderasiyaya alınan məzmun yalnız sizə görünür. Moderasiya vəziyyətinizi yazı üzərindəki &ldquo;Nəzərdən keçirilir&rdquo; nişanına klikləyərək görə bilərsiniz.</>,
  },
  {
    section: "moderasyon",
    question: "Feedim AI nə edir?",
    searchText: "Feedim AI məzmunları avtomatik olaraq tarayır. NSFW aşkarlanması, nifrət nitqi nəzarəti, spam aşkarlanması və müəllif hüququ müqayisəsi aparır.",
    answer: <>Feedim AI, məzmunları dərc edildiyi anda avtomatik olaraq nəzərdən keçirir. NSFW/cinsi məzmun aşkarlanması, nifrət nitqi və söyüş nəzarəti, spam aşkarlanması və müəllif hüququ müqayisəsi aparır. Problemli tapılan məzmunlar moderasiyaya alınır. Ətraflı məlumat üçün <Link href="/help/ai" className={lnk}>Feedim AI</Link> səhifəsinə baxın.</>,
  },
  {
    section: "moderasyon",
    question: "NSFW məzmun nədir və necə qorunuram?",
    searchText: "NSFW cinsi və ya uyğunsuz məzmundur. Feedim AI avtomatik olaraq aşkar edir və moderasiyaya alır. İstifadəçilər bu cür məzmunlardan avtomatik olaraq qorunur.",
    answer: <>NSFW (Not Safe For Work) cinsi, zorakılıq və ya uyğunsuz məzmunları ifadə edir. Feedim AI bu cür məzmunları avtomatik aşkar edir və moderasiyaya alır. Platforma genelində təhlükəsiz bir mühit təmin edilir. Ətraflı məlumat üçün <Link href="/help/moderation" className={lnk}>Moderasiya Sistemi</Link> səhifəsinə baxın.</>,
  },
  {
    section: "moderasyon",
    question: "Moderasiya qərarına etiraz edə bilərəmmi?",
    searchText: "Moderasiya qərarına etiraz etmək üçün support@feedim.com ünvanına yaza bilərsiniz. İnsan moderatorlar tərəfindən yenidən dəyərləndirilir.",
    answer: <>Bəli. Moderasiya qərarının ədalətsiz olduğunu düşünürsünüzsə <a href="mailto:support@feedim.com" className={lnk}>support@feedim.com</a> ünvanına yazaraq etiraz edə bilərsiniz. Etirazınız insan moderatorlar tərəfindən yenidən dəyərləndirilir. Ətraflı məlumat üçün <Link href="/help/moderation" className={lnk}>Moderasiya Sistemi</Link> səhifəsinə baxın.</>,
  },

  // ─── Müəllif Hüququ və Kopya Məzmun ─────────────────────────
  {
    section: "telif",
    question: "Müəllif hüququ qorunması nədir?",
    searchText: "Müəllif hüququ qorunması məzmununuzun kopyalanmasının qarşısını alan bir sistemdir. Mətn, şəkil və video əsaslı müqayisə aparılır.",
    answer: <>Müəllif hüququ qorunması, məzmununuzun icazəsiz kopyalanmasının qarşısını almaq üçün hazırlanmış bir sistemdir. Qorumanı açdıqda mətn, şəkil və video əsaslı tam həcmli tarama aparılır. Oxşarlıq aşkar edildikdə məzmun moderasiyaya alınır və ya müəllif hüququ nişanı əlavə edilir. Ətraflı məlumat üçün <Link href="/help/copyright" className={lnk}>Müəllif Hüququ Qorunması</Link> səhifəsinə baxın.</>,
  },
  {
    section: "telif",
    question: "Müəllif hüququ qorunmasını necə açıram?",
    searchText: "Yazı, video və ya moment yaradarkən parametrlərdəki müəllif hüququ qorunması toggle-ını açaraq məzmununuzu qoruya bilərsiniz.",
    answer: <>Yazı, video və ya moment yaradarkən parametrlər bölməsindəki <strong>&ldquo;Müəllif hüququ qorunması&rdquo;</strong> xüsusiyyətini aktivləşdirərək məzmununuzu qoruma altına ala bilərsiniz. Qoruma aktivləşdirildikdə məzmununuz mətn, şəkil və video əsasında taranır.</>,
  },
  {
    section: "telif",
    question: "Kopya məzmun nədir?",
    searchText: "Kopya məzmun başqa bir istifadəçinin məzmunu ilə %90 və daha çox mətn oxşarlığı olan məzmundur. Həmişə aktiv olaraq taranır və moderasiyaya alınır.",
    answer: <>Kopya məzmun, platformdakı mövcud bir məzmunla %90 və daha çox mətn oxşarlığı aşkar edilən məzmundur. Bu tarama <strong>həmişə aktiv</strong>dir və söndürülə bilməz &mdash; müəllif hüququ qorunması açılmamış olsa belə işləyir. Aşkar edilən kopya məzmun moderasiyaya alınır.</>,
  },
  {
    section: "telif",
    question: "Müəllif hüququ strike sistemi necə işləyir?",
    searchText: "Hər müəllif hüququ və ya kopya pozuntusu üçün hesaba strike əlavə edilir. 3 strike-dan sonra profil bal cəzaları başlayır. 10 strike-da hesab həmişəlik silinir.",
    answer: <>Hər müəllif hüququ və ya kopya məzmun pozuntusu üçün hesabınıza bir strike əlavə edilir. Strike sayınız artdıqca profil balınız düşür və hesabınıza mərhələli sanksiyalar tətbiq edilir. Müəyyən bir strike sayına çatdıqda hesabınız həmişəlik dayandırıla bilər. Ətraflı məlumat üçün <Link href="/help/copyright" className={lnk}>Müəllif Hüququ Qorunması</Link> səhifəsinə baxın.</>,
  },
  {
    section: "telif",
    question: "Müəllif hüququ şikayəti necə açılır?",
    searchText: "Məzmununuzun kopyalandığını düşünürsünüzsə Şikayət Et menüsündən müəllif hüququ şikayəti aça bilərsiniz. Orijinal və kopya URL lazımdır.",
    answer: <>Məzmununuzun icazəsiz kopyalandığını düşünürsünüzsə, əlaqədar məzmunun menüsündən <strong>&ldquo;Şikayət Et&rdquo;</strong> seçimi ilə müəllif hüququ şikayəti aça bilərsiniz. Orijinal məzmun URL-si və kopya məzmun URL-si məcburidir. Əsl məzmun sahibi olduğunuzu sübut etməyiniz lazım ola bilər. Haqsız şikayətlər etibarlılıq balınıza mənfi təsir göstərir.</>,
  },

  // ─── Qarşılıqlı Əlaqə və Sosial ────────────────────────────────
  {
    section: "etkilesim",
    question: "Bəyəni nədir?",
    searchText: "Bəyəni, bir yazının xoşunuza gəldiyini ifadə etməyin ən asan yoludur. Ürək simgesinə klikləyərək bəyənə bilərsiniz. Yazı sahibi bildiriş alır.",
    answer: <>Bəyəni, bir yazının xoşunuza gəldiyini ifadə etməyin ən asan yoludur. Yazının altındakı <Heart className={ico} /> ürək simgesinə klikləyərək bəyənə bilərsiniz. Bəyənini geri almaq üçün eyni simgeyə yenidən klikləyin. Yazı sahibi bəyəndiyinizdə <Bell className={ico} /> bildiriş alır. Bəyəni sayı yazının altında görünür.</>,
  },
  {
    section: "etkilesim",
    question: "Şərh nədir?",
    searchText: "Şərh, bir yazı haqqında düşüncələrinizi paylaşmanızı təmin edir. Ən çox 250 simvol. Şərhlərə cavab verə və @ ilə qeyd edə bilərsiniz.",
    answer: <>Şərh, bir yazı haqqında düşüncələrinizi paylaşmanızı təmin edir. Yazının altındakı <MessageCircle className={ico} /> şərh bölməsindən yaza bilərsiniz. Şərhlər ən çox 250 simvol ola bilər. Digər istifadəçiləri @ ilə qeyd edə bilərsiniz. Şərhlərə cavab verilə və <Heart className={ico} /> bəyənilə bilər. Yazı sahibi şərh <Bell className={ico} /> bildirişini alır.</>,
  },
  {
    section: "etkilesim",
    question: "İzləmə nədir?",
    searchText: "İzləmək, bir istifadəçinin yeni yazılarını ana səhifənizdə görməyinizi təmin edir. Profildəki İzlə düyməsinə klikləyin. İzləmə bildiriş göndərir.",
    answer: <>Bir istifadəçini izlədiyinizdə yeni yazıları <Home className={ico} /> ana səhifənizdə görünür. İstifadəçinin profil səhifəsindəki <strong>&lsquo;İzlə&rsquo;</strong> düyməsinə klikləyin. İzlədiyinizdə qarşı tərəf <Bell className={ico} /> bildiriş alır. Gizli hesabları izləmək üçün təsdiq lazımdır. İzləməni istənilən vaxt dayandıra bilərsiniz.</>,
  },
  {
    section: "etkilesim",
    question: "Saxlama nədir?",
    searchText: "Saxlama, bəyəndiyiniz yazıları əlfəcinlərə əlavə etməyinizi təmin edir. Saxla simgesinə klikləyin. Saxlanılanlar bölməsindən çata bilərsiniz.",
    answer: <>Saxlama, marağınızı çəkən yazıları əlfəcinlərə əlavə etməyinizi təmin edir. Yazının altındakı <Bookmark className={ico} /> saxla simgesinə klikləyin. Saxladığınız yazılara sol menüdəki <Bookmark className={ico} /> <Link href="/bookmarks" className={lnk}>Saxlanılanlar</Link> bölməsindən çata bilərsiniz. Saxlama əməliyyatı gizlidir &mdash; yazı sahibi görə bilmir.</>,
  },
  {
    section: "etkilesim",
    question: "Paylaşma necə edilir?",
    searchText: "Yazının altındakı paylaş düyməsi ilə linki kopyalaya bilər və ya WhatsApp, X, Facebook, LinkedIn, Pinterest və e-poçt ilə paylaşa bilərsiniz.",
    answer: <>Yazının altındakı <ShareIcon /> paylaş düyməsinə klikləyin. Linki kopyalaya bilər və ya birbaşa WhatsApp, X (Twitter), Facebook, LinkedIn, Pinterest və e-poçt ilə paylaşa bilərsiniz. Mobil cihazda cihazınızın yerli paylaşım menüsü də istifadə edilə bilər.</>,
  },
  {
    section: "etkilesim",
    question: "Qeyd etmə (@mention) nədir?",
    searchText: "Şərh və ya məzmunda @ işarəsi ilə istifadəçi adını yazaraq qeyd edə bilərsiniz. Qeyd edilən şəxs bildiriş alır. Ən çox 3 qeyd edilə bilər.",
    answer: <>Şərh və ya məzmunda bir istifadəçini qeyd etmək üçün <strong>@istifadeciadı</strong> yazın. Yazdıqca təkliflər açılır. Qeyd edilən şəxs bildiriş alır. Bir şərhdə ən çox 3 qeyd edilə bilər. Qeyd etmələr profil linkinə çevrilir.</>,
  },
  {
    section: "etkilesim",
    question: "Şərhi necə silirəm?",
    searchText: "Öz şərhinizi silmək üçün şərhin üzərinə gəlin və silmə düyməsinə klikləyin. Yazı sahibləri öz yazılarındakı bütün şərhləri silə bilər.",
    answer: "Öz şərhinizi silmək üçün şərhin üzərinə gəlin (və ya basılı saxlayın) və silmə düyməsinə klikləyin. Yazı sahibləri öz yazılarındakı bütün şərhləri silə bilər. Silinən şərhlər geri qaytarıla bilməz. Şərhə verilən cavablar da birlikdə silinir.",
  },
  {
    section: "etkilesim",
    question: "Yazı sahibinin profilini necə ziyarət edirəm?",
    searchText: "Yazı üzərindəki istifadəçi adına və ya profil şəklinə klikləyərək istifadəçinin profilinə gedə bilərsiniz.",
    answer: <>Yazı üzərindəki istifadəçi adına və ya profil şəklinə klikləyərək istifadəçinin profilinə gedə bilərsiniz. Həmçinin yazının menüsündən <strong>&lsquo;İstifadəçinin profili&rsquo;</strong> seçimini də istifadə edə bilərsiniz. Profil səhifəsində bütün yazıları, izləyici sayını və bioqrafiyanı görə bilərsiniz.</>,
  },

  // ─── Bildirişlər ────────────────────────────────────────────
  {
    section: "bildirim",
    question: "Bildirişlər necə işləyir?",
    searchText: "Bəyəni, şərh, cavab, qeyd etmə, izləmə və Jeton qazancı kimi qarşılıqlı əlaqələrdə bildiriş alırsınız. Bildirişlər bölməsindən görə bilərsiniz.",
    answer: <><Heart className={ico} /> Bəyəni, <MessageCircle className={ico} /> şərh, cavab, qeyd etmə, izləmə və Jeton qazancı kimi qarşılıqlı əlaqələrdə <Bell className={ico} /> bildiriş alırsınız. Sol menüdəki <Bell className={ico} /> <Link href="/notifications" className={lnk}>Bildirişlər</Link> bölməsindən bütün bildirişlərinizi görə bilərsiniz. Oxunmamış bildirişlər mavi nöqtə ilə işarələnir. Hamısını oxunmuş olaraq işarələyə bilərsiniz.</>,
  },
  {
    section: "bildirim",
    question: "Hansı bildiriş növləri var?",
    searchText: "Bəyəni, şərh, cavab, qeyd etmə, izləmə, izləmə sorğusu, izləmə qəbulu, nailiyyət, Jeton qazancı, premium sona çatma və sistem bildirişləri.",
    answer: <>Feedim-də aşağıdakı bildiriş növləri mövcuddur: <Heart className={ico} /> Bəyəni, <MessageCircle className={ico} /> Şərh və Cavab, Qeyd etmə, İzləmə və İzləmə Sorğusu, Jeton Qazancı, Premium Sona Çatma, Nailiyyət və Sistem bildirişləri.</>,
  },
  {
    section: "bildirim",
    question: "Bildiriş parametrlərini necə idarə edirəm?",
    searchText: "Parametrlər Bildirişlər bölməsindən hər bildiriş növünü ayrı-ayrılıqda aça və bağlaya bilərsiniz. 24 saat fasilə xüsusiyyəti də mövcuddur.",
    answer: <>Parametrlər &rarr; Bildirişlər bölməsindən hər bildiriş növünü ayrı-ayrılıqda aça və bağlaya bilərsiniz (<Heart className={ico} /> bəyəni, <MessageCircle className={ico} /> şərh, izləmə, Jeton qazancı və s.). Bütün bildirişləri müvəqqəti olaraq bağlamaq üçün <strong>&lsquo;24 saat fasilə&rsquo;</strong> xüsusiyyətini istifadə edə bilərsiniz.</>,
  },
  {
    section: "bildirim",
    question: "Bildirişlərim niyə gəlmir?",
    searchText: "Brauzer bildiriş icazələrini yoxlayın. Parametrlərdən bildiriş seçimlərinin açıq olduğundan əmin olun. Səhifə yeniləməsi problemi həll edə bilər.",
    answer: "Brauzer bildiriş icazələrini yoxlayın. Parametrlər \u2192 Bildirişlər bölməsindən bildiriş seçimlərinin açıq olduğundan əmin olun. Bildiriş fasiləsi aktiv ola bilər \u2014 yoxlayın. Səhifə yeniləməsi və ya çıxış-giriş etmə problemi həll edə bilər.",
  },

  // ─── Jeton və Qazanc ───────────────────────────────────────
  {
    section: "jeton",
    question: "Jeton nədir?",
    searchText: "Jeton, Feedim-in virtual valyutasıdır. Məzmun oxuma və satın alma yolu ilə qazanılır və ya xərclənir. Jetonlar TL-yə çevrilə bilər.",
    answer: <>Jeton, Feedim-in virtual valyutasıdır. İstifadəçilər yazı oxuma və satın alma yolu ilə Jeton qazanır və ya xərcləyir. Yığdığınız Jetonları TL-yə çevirə bilərsiniz. Jeton balansınızı profilinizdən və <Link href="/coins" className={lnk}>Jeton səhifəsindən</Link> izləyə bilərsiniz.</>,
  },
  {
    section: "jeton",
    question: "Jeton necə qazanıram?",
    searchText: "Premium oxucular yazınızı oxuduqda avtomatik Jeton qazanırsınız. Məzmununuzun həqiqətən oxunması lazımdır.",
    answer: "Premium üzvlüyə sahib oxucular yazınızı həqiqətən oxuduqda avtomatik olaraq Jeton qazanırsınız. Sistem keyfiyyətli oxumaları avtomatik olaraq doğrulayır və qazancınızı hesabınıza əks etdirir.",
  },
  {
    section: "jeton",
    question: "Jeton çıxarışı necə edilir?",
    searchText: "Minimum 100 Jeton yığdıqda çıxarış sorğusu yarada bilərsiniz. Parametrlər Qazanc bölməsindən bank məlumatlarınızı daxil edin və çıxarış sorğunuzu göndərin.",
    answer: "Minimum 100 Jeton yığdıqda çıxarış sorğusu yarada bilərsiniz. Parametrlər \u2192 Qazanc bölməsindən bank məlumatlarınızı (IBAN) daxil edin və çıxarış sorğunuzu göndərin. Çıxarış sorğuları iş günlərində emal edilir.",
  },
  {
    section: "jeton",
    question: "Jeton satın alma necə edilir?",
    searchText: "Jeton səhifəsindən paket seçərək satın ala bilərsiniz. Bonus Jetonlu paketlər mövcuddur. Ödəniş təhlükəsiz şəkildə emal edilir.",
    answer: <><Link href="/coins" className={lnk}>Jeton səhifəsindən</Link> istədiyiniz paketi seçərək satın ala bilərsiniz. Müxtəlif məbləğlərdə paketlər mövcuddur və bəzilərində bonus Jetonlar var.</>,
  },
  {
    section: "jeton",
    question: "Jeton qazanma limiti varmı?",
    searchText: "Ədalətli istifadə üçün gündəlik və yazı əsaslı qazanma limitləri tətbiq edilir.",
    answer: "Bəli, ədalətli istifadəni təmin etmək məqsədilə gündəlik və yazı əsaslı qazanma limitləri tətbiq edilir. Ətraflı məlumat üçün Jeton səhifəsinə baxa bilərsiniz.",
  },
  {
    section: "jeton",
    question: "Jetonlarım niyə silindi?",
    searchText: "Saxta oxuma, bot istifadəsi və ya sistemin sui-istifadəsi aşkar edilərsə qazanılan Jetonlar ləğv edilə və hesab dayandırıla bilər.",
    answer: "Saxta oxuma, bot istifadəsi, özünə oxuma və ya Jeton sisteminin hər hansı bir şəkildə sui-istifadəsi aşkar edilərsə qazanılan Jetonlar ləğv edilə və hesab dayandırıla bilər. Feedim ədalətli istifadəni təmin etmək üçün avtomatik aşkarlama sistemləri istifadə edir.",
  },

  // ─── Premium Üzvlük ─────────────────────────────────────────
  {
    section: "premium",
    question: "Premium üzvlük nədir?",
    searchText: "Premium üzvlük əlavə xüsusiyyətlər təqdim edir: reklamsız təcrübə, doğrulanmış nişan, prioritet dəstək, uzun yazı, pul qazanma və daha çox.",
    answer: <>Premium üzvlük ilə reklamsız təcrübə yaşayır, doğrulanmış nişan alır, prioritet dəstək və simvol limitsiz yazı kimi imtiyazlardan istifadə edirsiniz. Həmçinin oxuduğunuz yazıların müəlliflərinə Jeton qazandırırsınız. Ətraflı məlumat üçün <Link href="/premium" className={lnk}>Premium səhifəsini</Link> nəzərdən keçirin.</>,
  },
  {
    section: "premium",
    question: "Premium planları və qiymətləri hansılardır?",
    searchText: "Super (39,99 TL/ay), Pro (79,99 TL/ay), Max (129 TL/ay) və Business (249 TL/ay) planları mövcuddur. Hər plan fərqli xüsusiyyətlər təqdim edir.",
    answer: <>Feedim-də dörd Premium plan mövcuddur: <strong>Super</strong> (39,99 TL/ay), <strong>Pro</strong> (79,99 TL/ay), <strong>Max</strong> (129 TL/ay) və <strong>Business</strong> (249 TL/ay). Hər plan fərqli imtiyazlar təqdim edir. Pro və yuxarı planlarda Jeton qazanma, analitika və öndə göstərmə kimi əlavə xüsusiyyətlər mövcuddur. Business planı müəssisələr üçün nəzərdə tutulub. Planları müqayisə etmək üçün <Link href="/premium" className={lnk}>Premium səhifəsini</Link> ziyarət edin.</>,
  },
  {
    section: "premium",
    question: "Premium üzvlüyümü necə ləğv edirəm?",
    searchText: "Parametrlər Üzvlük bölməsindən ləğv edə bilərsiniz. Cari dövr sonuna qədər Premium xüsusiyyətləri istifadə edə bilərsiniz. Qismən geri qaytarma edilmir.",
    answer: "Parametrlər \u2192 Üzvlük bölməsindən ləğv əməliyyatı edə bilərsiniz. Ləğv, cari ödəniş dövrünün sonunda qüvvəyə minir. Dövr sonuna qədər Premium imtiyazlarınız davam edir. Qismən geri qaytarma edilmir. İstənilən vaxt yenidən abunə ola bilərsiniz.",
  },
  {
    section: "premium",
    question: "Premium müddəti bitdikdə nə olur?",
    searchText: "Premium müddətiniz bitdikdə bildiriş alırsınız. Üzvlük yenilənməzsə Premium imtiyazları sona çatır. Hesabınız və məzmunlarınız qorunur.",
    answer: "Premium müddətiniz bitdikdə bildiriş alırsınız. Üzvlük yenilənməzsə Premium imtiyazları (nişan, reklamsız təcrübə, prioritet dəstək və s.) sona çatır. Lakin hesabınız, yazılarınız və Jeton balansınız qorunur. İstənilən vaxt yenidən Premium ola bilərsiniz.",
  },
  {
    section: "premium",
    question: "Premium nişanı nədir?",
    searchText: "Premium üzvlər profillərində xüsusi bir nişan göstərir. Bu nişan etibarlılığınızı artırır. Plan növünə görə nişan fərqlənə bilər.",
    answer: "Premium üzvlər profillərində xüsusi bir nişan göstərir. Bu nişan digər istifadəçilərə etibarlı bir hesab olduğunuzu göstərir. Premium sona çatdıqda nişan silnir. Doğrulanmış hesab nişanı ilə Premium nişanı fərqlidir \u2014 ikisi birlikdə də görünə bilər.",
  },

  // ─── Kəşf et və Axtarış ───────────────────────────────────────
  {
    section: "kesfet",
    question: "Kəşf et səhifəsi nədir?",
    searchText: "Kəşf et, fərqli istifadəçilərin yazılarını kəşf etməyinizi təmin edir. Trend etiketlər, populyar məzmunlar və kateqoriyalar mövcuddur.",
    answer: <><Link href="/explore" className={lnk}>Kəşf et</Link> səhifəsi fərqli istifadəçilərin yazılarını kəşf etməyinizi təmin edir. Trend etiketlər, populyar məzmunlar və kateqoriyalara görə yazılar siyahılanır. İzləmədiyiniz istifadəçilərin keyfiyyətli məzmunlarını da burada tapa bilərsiniz.</>,
  },
  {
    section: "kesfet",
    question: "Trend etiketlər necə müəyyən edilir?",
    searchText: "Trend etiketlər, müəyyən bir zaman kəsiyində ən çox istifadə edilən və qarşılıqlı əlaqə alan etiketlərdir. Avtomatik yenilənir.",
    answer: "Trend etiketlər, müəyyən bir zaman kəsiyində ən çox istifadə edilən və ən çox qarşılıqlı əlaqə alan etiketlərdir. Avtomatik olaraq yenilənir. Trend bir etiketə klikləyərək həmin mövzudakı bütün yazıları görə bilərsiniz. Etiketləri izləyərək maraq dairələrinizə görə axışınızı fərdiləşdirə bilərsiniz.",
  },
  {
    section: "kesfet",
    question: "Axtarış necə istifadə edilir?",
    searchText: "Kəşf et səhifəsindəki axtarış çubuğundan istifadəçi, yazı və etiket axtara bilərsiniz. Nəticələr dərhal görünür.",
    answer: "Kəşf et səhifəsindəki axtarış çubuğundan istifadəçi adı, yazı başlığı və ya etiket axtara bilərsiniz. Yazdıqca nəticələr dərhal görünür. Nəticələr istifadəçilər və etiketlər olaraq qruplaşdırılır.",
  },
  {
    section: "kesfet",
    question: "Ana səhifə axışı necə işləyir?",
    searchText: "Ana səhifə, izlədiyiniz istifadəçilərin yeni yazılarını xronoloji sıra ilə göstərir. İzləmə siyahısı boşdursa tövsiyə edilən məzmunlar göstərilir.",
    answer: <><Home className={ico} /> Ana səhifəniz, izlədiyiniz istifadəçilərin yeni yazılarını xronoloji sıra ilə göstərir. Hələ heç kimi izləmirsinizsə populyar və tövsiyə edilən məzmunlar göstərilir. Daha çox istifadəçi izlədikçə axışınız zənginləşir.</>,
  },

  // ─── Problemlərin Həlli ─────────────────────────────────────
  {
    section: "sorun",
    question: "Daxil ola bilmirəm, nə etməliyəm?",
    searchText: "E-poçt və şifrənizi yoxlayın. Şifrəmi Unutdum ilə sıfırlayın. E-poçt doğrulaması edin. Problem davam edərsə support@feedim.com ünvanına yazın.",
    answer: <>Əvvəlcə e-poçt ünvanınızı və şifrənizi yoxlayın. Şifrənizi xatırlamırsınızsa <strong>&lsquo;Şifrəmi Unutdum&rsquo;</strong> ilə sıfırlayın. E-poçt doğrulaması etmədiyinizsə spam qovluğunuzu yoxlayın. Brauzer çərəzlərini və keşi təmizləməyi sınayın. Problem davam edərsə <a href="mailto:support@feedim.com" className={lnk}>support@feedim.com</a> ünvanına yazın.</>,
  },
  {
    section: "sorun",
    question: "E-poçt doğrulama linki gəlmir",
    searchText: "Spam və ya lazımsız qovluğunuzu yoxlayın. E-poçt ünvanınızı düzgün yazdığınızdan əmin olun. Bir neçə dəqiqə gözləyin. Gmail, Outlook, Yahoo dəstəklənir.",
    answer: "Spam və ya lazımsız e-poçt qovluğunuzu yoxlayın. E-poçt ünvanınızı düzgün yazdığınızdan əmin olun. Bir neçə dəqiqə gözləyib yenidən sınayın. Gmail, Outlook, Yahoo və iCloud kimi geniş yayılmış e-poçt provayderlər dəstəklənir. Problem davam edərsə fərqli bir e-poçt ünvanı ilə qeydiyyatdan keçməyi sınayın.",
  },
  {
    section: "sorun",
    question: "Hesabım niyə dayandırıldı?",
    searchText: "İstifadə şərtləri pozuntusu, spam məzmun, Jeton sui-istifadəsi və ya təcavüz kimi səbəblərlə hesab dayandırıla bilər. Etiraz üçün support@feedim.com.",
    answer: <>İstifadə şərtlərinin pozulması, spam məzmun istehsalı, Jeton sisteminin sui-istifadəsi və ya digər istifadəçilərə təcavüz kimi səbəblərlə hesablar dayandırıla bilər. Ətraflı məlumat və etiraz üçün <a href="mailto:support@feedim.com" className={lnk}>support@feedim.com</a> ünvanına yaza bilərsiniz. <Link href="/help/terms" className={lnk}>İstifadə Şərtləri</Link> səhifəmizdə bütün qaydalar ətraflı şəkildə açıqlanmışdır.</>,
  },
  {
    section: "sorun",
    question: "Yazılar yüklənmir və ya xəta alıram",
    searchText: "İnternet bağlantınızı yoxlayın. Səhifəni yeniləyin və ya brauzer keşini təmizləyin. Fərqli bir brauzer sınayın.",
    answer: "İnternet bağlantınızı yoxlayın. Səhifəni yeniləyin və ya brauzer keşini təmizləyin. Fərqli bir brauzer sınayın. Yazı yaradarkən xəta alırsınızsa məzmun ölçüsünün limitləri aşmadığından əmin olun (başlıq 3-200 simvol, məzmun ən azı 50 simvol). Problem davam edərsə çıxış edib yenidən daxil olmağı sınayın.",
  },
  {
    section: "sorun",
    question: "Feedim nədir?",
    searchText: "Feedim, ilham verən məzmunları kəşf edib paylaşa biləcəyiniz bir məzmun və video platformasıdır. İstifadəçilər yazı və video paylaşır, oxucular kəşf edir. Premium oxucular Jeton qazandırır.",
    answer: <>Feedim, ilham verən məzmunları kəşf edib paylaşa biləcəyiniz bir məzmun və video platformasıdır. İstifadəçilər yazı və video paylaşır, oxucular keyfiyyətli məzmunları kəşf edir. Premium oxucular tərəfindən oxunan yazılar müəlliflərə Jeton qazandırır. Jetonlar TL-yə çevrilə bilər. Ətraflı məlumat üçün <Link href="/help/about" className={lnk}>Haqqımızda</Link> səhifəmizə baxın.</>,
  },
  {
    section: "sorun",
    question: "Başqa bir problemim var, necə əlaqə saxlaya bilərəm?",
    searchText: "support@feedim.com və ya Əlaqə səhifəsindən bizə müraciət edə bilərsiniz. İş günlərində 24 saat ərzində cavab veririk.",
    answer: <>Bu səhifədə cavabını tapa bilmədiyiniz suallarınız üçün <a href="mailto:support@feedim.com" className={lnk}>support@feedim.com</a> ünvanına yaza bilər və ya <Link href="/help/contact" className={lnk}>Əlaqə səhifəmizi</Link> ziyarət edə bilərsiniz. İş günlərində 24 saat ərzində bütün suallara cavab veririk.</>,
  },
];
