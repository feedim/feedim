import Link from "next/link";

export default function CommunityGuidelinesContentAz() {
  return (
    <>
      <h1 className="text-2xl sm:text-3xl font-bold mb-6">İcma Qaydaları</h1>
      <div className="space-y-6 text-sm text-text-secondary leading-relaxed">
        <p>
          Feedim hər kəsin özünü təhlükəsiz və rahat hiss etdiyi, konstruktiv və hörmətli bir icma
          yaratmağı hədəfləyir. Aşağıdakı qaydalar platformamızın sağlam şəkildə işləməsini və bütün
          istifadəçilərin müsbət təcrübə yaşamasını təmin etmək üçün müəyyən edilmişdir. Bütün istifadəçilər
          bu qaydalara riayət etməyə borcludur.
        </p>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Hörmətli Ünsiyyət</h2>
        <p>
          Feedim-də hər kəs fikirlərini sərbəst ifadə edə bilər, lakin bu ifadə azadlığı başqalarının
          hüquqlarına zərər verməməlidir. Aşağıdakı davranışlar qəti qadağandır:
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Nifrət nitqi:</strong> Irq, din, dil, cins, cinsi yönəlim, etnik mənşə və ya əlillik vəziyyətinə əsaslanan nifrət ifadələri</li>
          <li><strong>Təqib və zorbalıq:</strong> Fərdlərə və ya qruplara yönəlmiş sistematik təqib, hədə və qorxutma</li>
          <li><strong>Ayrı-seçkilik:</strong> Hər hansı bir qrupa və ya fərdə yönəlmiş ayrı-seçkilik ifadələri və davranışları</li>
        </ul>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Orijinal Məzmun</h2>
        <p>
          Feedim orijinal və yaradıcı məzmunların paylaşılmasını təşviq edir. Məzmun paylaşarkən aşağıdakı
          qaydalara riayət olunmalıdır:
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li>Müəllif hüququ ilə qorunan məzmunları icazəsiz paylaşmaq qadağandır</li>
          <li>Başqalarının məzmunlarından sitat gətirərkən mənbə göstərilməlidir</li>
          <li>Başqalarının məzmunlarını öz məzmununuz kimi təqdim etmək (plaqiat) qadağandır</li>
        </ul>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Spam və Manipulyasiya</h2>
        <p>
          Platforma bütövlüyünü qorumaq üçün aşağıdakı davranışlar qadağandır:
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li>Eyni və ya oxşar məzmunu təkrar-təkrar paylaşmaq</li>
          <li>Saxta bəyənmə, şərh və ya izləyici yaratmaq</li>
          <li>Bot və ya avtomatik alətlər istifadə edərək qarşılıqlı əlaqə manipulyasiyası etmək</li>
          <li>Aldadıcı başlıq və ya etiketlər istifadə etmək (clickbait)</li>
        </ul>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Cinsi və Zorakılıq Ehtiva Edən Məzmun</h2>
        <p>
          Feedim platformasında aşağıdakı məzmun növləri qəti qadağandır:
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li>Çılpaqlıq və cinsi məzmun ehtiva edən şəkillər və ya mətnlər</li>
          <li>Pornoqrafik və ya ədəbsiz məzmunlar</li>
          <li>Həddindən artıq zorakılıq, qan və vəhşilik ehtiva edən məzmunlar</li>
          <li>İntiharı və ya özünə zərər verməyi təşviq edən məzmunlar</li>
        </ul>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Aldadıcı Məlumat</h2>
        <p>
          Qəsdən yanlış və ya aldadıcı məlumat paylaşmaq qadağandır. Bu çərçivədə:
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li>Dezinformasiya və təbliğat xarakterli məzmunlar</li>
          <li>Saxta xəbərlər və ya manipulyasiya edilmiş məlumatlar</li>
          <li>Sağlamlıq, təhlükəsizlik və ya ictimai maraq mövzularında aldadıcı məlumatlar</li>
        </ul>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Şəxsi Məlumat Paylaşımı (Doxxing)</h2>
        <p>
          Başqalarının şəxsi məlumatlarını icazəsiz paylaşmaq qəti qadağandır. Bu çərçivədə:
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li>Əsl ad, ünvan, telefon nömrəsi kimi şəxsi məlumatların icazəsiz paylaşımı</li>
          <li>Xüsusi mesajların və ya yazışmaların icazəsiz yayımlanması</li>
          <li>Şəxsin razılığı olmadan xüsusi fotoşəkillərin paylaşımı</li>
        </ul>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Qanunsuz Fəaliyyətlər</h2>
        <p>
          Platformada qanunsuz məzmun paylaşımı və qanunsuz fəaliyyətlərin təşviqi qadağandır:
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li>Qanunsuz maddə və ya silah ticarətini təşviq etmək</li>
          <li>Dələduzluq və saxtakarlıq ehtiva edən məzmunlar</li>
          <li>Terror təşkilatlarının təbliğatını aparmaq</li>
          <li>Hər hansı cinayət əməlini təşviq etmək və ya yönləndirmək</li>
        </ul>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Hesab Təhlükəsizliyi</h2>
        <p>
          Başqalarının hesablarına icazəsiz giriş əldə etmək və ya giriş əldə etməyə cəhd etmək
          qəti qadağandır. Bu çərçivədə:
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li>Başqalarının hesab məlumatlarını ələ keçirməyə çalışmaq</li>
          <li>Fişinq (kimlik oğurluğu) məzmunu və ya keçidləri paylaşmaq</li>
          <li>Saxta və ya təqlidçi hesab yaratmaq</li>
        </ul>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Pozuntuya Görə Sanksiyalar</h2>
        <p>
          İcma qaydalarını pozan istifadəçilərə pilləli sanksiyalar tətbiq olunur:
        </p>
        <div className="bg-bg-secondary rounded-[15px] p-4 space-y-3">
          <div className="flex items-start gap-3">
            <span className="text-warning font-bold text-xs mt-0.5 shrink-0">1. Mərhələ</span>
            <div>
              <p className="font-semibold text-text-primary">Xəbərdarlıq</p>
              <p className="text-text-muted text-xs mt-0.5">İlk pozuntuda istifadəçiyə xəbərdarlıq bildirişi göndərilir və icma qaydaları xatırladılır.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-warning font-bold text-xs mt-0.5 shrink-0">2. Mərhələ</span>
            <div>
              <p className="font-semibold text-text-primary">Məzmunun Silinməsi</p>
              <p className="text-text-muted text-xs mt-0.5">Təkrarlanan pozuntularda qaydaya zidd məzmun qalıcı olaraq silinir.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-error font-bold text-xs mt-0.5 shrink-0">3. Mərhələ</span>
            <div>
              <p className="font-semibold text-text-primary">Müvəqqəti Dayandırma</p>
              <p className="text-text-muted text-xs mt-0.5">Ciddi və ya davam edən pozuntularda hesab müvəqqəti olaraq dayandırılır.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-error font-bold text-xs mt-0.5 shrink-0">4. Mərhələ</span>
            <div>
              <p className="font-semibold text-text-primary">Qalıcı Hesab Bağlanması</p>
              <p className="text-text-muted text-xs mt-0.5">Ağır pozuntular və ya israrla qayda pozuntusu halında hesab qalıcı olaraq bağlanır.</p>
            </div>
          </div>
        </div>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Şikayət Etmə</h2>
        <p>
          İcma qaydalarını pozan bir məzmun və ya istifadəçi ilə qarşılaşdığınızda şikayət mexanizmini
          istifadə edə bilərsiniz:
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li>Məzmunun menyusundakı <strong>&ldquo;Şikayət Et&rdquo;</strong> seçiminə klikləyin</li>
          <li>Şikayət səbəbini seçin (nifrət nitqi, spam, cinsi məzmun və s.)</li>
          <li>İstəyə bağlı olaraq əlavə izahat yazın</li>
          <li>Şikayətiniz moderasiya komandası tərəfindən ən qısa müddətdə nəzərdən keçiriləcəkdir</li>
        </ul>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Etiraz Hüququ</h2>
        <p>
          Məzmunlarınız haqqında verilən moderasiya qərarlarına etiraz etmə hüququnuz var.
          Etiraz prosesi və ətraflı məlumat üçün{" "}
          <Link href="/help/moderation" className="text-accent-main hover:opacity-80 font-semibold">Moderasiya Sistemi</Link> səhifəsini
          nəzərdən keçirə bilərsiniz.
        </p>

        <div className="bg-bg-secondary rounded-[15px] p-5 mt-8">
          <p className="text-xs text-text-muted">
            İcma qaydaları haqqında suallarınız üçün{" "}
            <Link href="/help/contact" className="text-accent-main hover:opacity-80 font-semibold">Əlaqə</Link> səhifəmizdən
            və ya <a href="mailto:support@feedim.com" className="text-accent-main hover:opacity-80 font-semibold">support@feedim.com</a> ünvanından
            bizimlə əlaqə saxlaya bilərsiniz.
          </p>
        </div>
      </div>
    </>
  );
}
