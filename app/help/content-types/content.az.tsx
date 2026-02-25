import Link from "next/link";

export default function ContentAz() {
  return (
    <>
      <h1 className="text-2xl sm:text-3xl font-bold mb-6">Məzmun Növləri</h1>
      <div className="space-y-6 text-sm text-text-secondary leading-relaxed">
        <p>
          Feedim-də üç fərqli məzmun növü ilə özünüzü ifadə edə bilərsiniz: <strong>Yazı (Post)</strong>,{" "}
          <strong>Video</strong> və <strong>Moment</strong>. Hər məzmun növü fərqli məqsədlərə xidmət edir və özünəməxsus
          xüsusiyyətlərə malikdir.
        </p>

        {/* ── Yazı (Post) ── */}
        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Yazı (Post)</h2>
        <p>
          Yazı, Feedim-in əsas mətn əsaslı məzmun formatıdır. Zəngin mətn redaktoru sayəsində məzmununuzu
          formatlayıb şəkillərlə dəstəkləyə bilərsiniz.
        </p>
        <div className="bg-bg-secondary rounded-[15px] p-4 space-y-3">
          <p className="font-semibold text-text-primary text-xs uppercase tracking-wide">Yazı Xüsusiyyətləri</p>
          <ul className="list-disc pl-5 space-y-2">
            <li>Zəngin mətn redaktoru ilə məzmun yazma (qalın, kursiv, başlıq, siyahı və s.)</li>
            <li>Yazı daxilində şəkil əlavə etmə dəstəyi</li>
            <li>Örtük şəkli yükləmə</li>
            <li>Etiket əlavə etmə (maks 5 ədəd)</li>
            <li>SEO meta sahələri (meta başlıq və meta açıqlama)</li>
          </ul>
        </div>

        {/* ── Video ── */}
        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Video</h2>
        <p>
          Video məzmunlar ilə daha uzun və ətraflı vizual hekayələr yarada bilərsiniz.
          Feedim, populyar video formatlarını dəstəkləyir və avtomatik kiçik şəkil yaratma imkanı təqdim edir.
        </p>
        <div className="bg-bg-secondary rounded-[15px] p-4 space-y-3">
          <p className="font-semibold text-text-primary text-xs uppercase tracking-wide">Video Xüsusiyyətləri</p>
          <ul className="list-disc pl-5 space-y-2">
            <li>Dəstəklənən formatlar: <strong>MP4, WebM, MOV</strong> və daha çox</li>
            <li>Maksimum fayl ölçüsü: <strong>500 MB</strong></li>
            <li>Maksimum video müddəti: <strong>30 dəqiqə</strong></li>
            <li>Avtomatik thumbnail (kiçik şəkil) yaratma</li>
            <li>Manual kiçik şəkil yükləmə seçimi</li>
            <li>Video açıqlaması (maksimum <strong>2.000 simvol</strong>)</li>
          </ul>
        </div>

        {/* ── Moment ── */}
        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Moment</h2>
        <p>
          Moment, qısa və təsirli video paylaşımları üçün nəzərdə tutulmuş bir formatdır. Şaquli videolara fokuslanmış
          bu format, sürətli istehlak və sürətli paylaşım üçün idealdır.
        </p>
        <div className="bg-bg-secondary rounded-[15px] p-4 space-y-3">
          <p className="font-semibold text-text-primary text-xs uppercase tracking-wide">Moment Xüsusiyyətləri</p>
          <ul className="list-disc pl-5 space-y-2">
            <li>Maksimum müddət: <strong>60 saniyə</strong></li>
            <li>Şaquli video fokuslu format (9:16 nisbəti tövsiyə edilir)</li>
            <li>Sürətli paylaşım &mdash; sadə və sürətli yaratma axını</li>
            <li>Karusel (sürüşdürülən) görünüşdə göstərilir</li>
          </ul>
        </div>

        {/* ── Ümumi Parametrlər ── */}
        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Bütün Məzmun Növlərində Ümumi Parametrlər</h2>
        <p>
          Hansı məzmun növünü seçməyinizdən asılı olmayaraq, aşağıdakı parametrlər bütün məzmunlar üçün keçərlidir:
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Başlıq:</strong> 3 ilə 200 simvol arasında olmalıdır</li>
          <li><strong>Etiketlər:</strong> Məzmununuza ən çox 5 etiket əlavə edə bilərsiniz</li>
          <li><strong>Şərhlərə icazə:</strong> Məzmununuza şərh yazılıb-yazıla bilməyəcəyini təyin edə bilərsiniz</li>
          <li><strong>Uşaqlar üçün uyğun işarəsi:</strong> Məzmununuzun uşaqlar üçün uyğun olduğunu göstərə bilərsiniz</li>
          <li><strong>Müəllif hüququ qorunması:</strong> Məzmununuzu kopya məzmuna qarşı qoruma altına ala bilərsiniz</li>
        </ul>

        {/* ── Məzmun Yaratma Addımları ── */}
        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Məzmun Yaratma Addımları</h2>
        <p>
          Feedim-də məzmun yaratma prosesi 2 sadə addımdan ibarətdir:
        </p>
        <div className="bg-bg-secondary rounded-[15px] p-4 space-y-4">
          <div className="flex items-start gap-3">
            <span className="bg-accent-main text-white font-bold text-xs w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5">1</span>
            <div>
              <p className="font-semibold text-text-primary">Məzmun Yazma</p>
              <p className="text-text-muted text-xs mt-0.5">
                Məzmun növünə görə mətninizi yazın, videonuzu və ya momentinizi yükləyin. Zəngin mətn redaktorunu
                istifadə edərək məzmununuzu formatlaya bilərsiniz.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="bg-accent-main text-white font-bold text-xs w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5">2</span>
            <div>
              <p className="font-semibold text-text-primary">Detallar</p>
              <p className="text-text-muted text-xs mt-0.5">
                Başlıq, etiketlər, örtük şəkli, SEO parametrləri və digər üstünlükləri təyin edin. Sonra
                məzmununuzu dərc edin.
              </p>
            </div>
          </div>
        </div>

        {/* ── Qaralama və Avtomatik Saxlama ── */}
        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Qaralama Saxlama və Avtomatik Saxlama</h2>
        <p>
          Feedim, məzmun yaradarkən işinizi itirməməyiniz üçün avtomatik saxlama xüsusiyyəti təqdim edir.
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li>Məzmununuz hər <strong>30 saniyədə</strong> bir avtomatik olaraq qaralama halında saxlanılır</li>
          <li>Brauzeri bağlasanız belə, qaralamınıza daha sonra qayıda bilərsiniz</li>
          <li>Dərc etmədən əvvəl istədiyiniz qədər redaktə edə bilərsiniz</li>
        </ul>

        {/* ── Məzmun Redaktə və Silmə ── */}
        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Məzmun Redaktə Etmə və Silmə</h2>
        <p>
          Dərc etdiyiniz məzmunları daha sonra redaktə edə və ya tamamilə silə bilərsiniz.
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li>Məzmun menyusundan <strong>&ldquo;Redaktə et&rdquo;</strong> seçimini istifadə edərək başlığı, mətni, etiketləri və digər parametrləri yeniləyə bilərsiniz</li>
          <li>Məzmun menyusundan <strong>&ldquo;Sil&rdquo;</strong> seçimi ilə məzmununuzu qalıcı olaraq silə bilərsiniz</li>
          <li>Silinmiş məzmunlar geri qaytarıla bilməz &mdash; bu əməliyyat qalıcıdır</li>
        </ul>

        {/* ── Məzmun Qaydaları ── */}
        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Məzmun Qaydaları</h2>
        <p>
          Bütün məzmunlar icma qaydalarına və qanunlara uyğun olmalıdır. Ətraflı qaydalar üçün{" "}
          <Link href="/help/community-guidelines" className="text-accent-main hover:opacity-80 font-semibold">İcma Qaydaları</Link> və{" "}
          <Link href="/help/copyright" className="text-accent-main hover:opacity-80 font-semibold">Müəllif Hüququ Qorunması</Link> səhifələrinə
          baxa bilərsiniz.
        </p>

        <div className="bg-bg-secondary rounded-[15px] p-5 mt-8">
          <p className="text-xs text-text-muted">
            Məzmun yaratma ilə bağlı suallarınız üçün{" "}
            <Link href="/help/contact" className="text-accent-main hover:opacity-80 font-semibold">Əlaqə</Link> səhifəmizdən
            və ya <a href="mailto:support@feedim.com" className="text-accent-main hover:opacity-80 font-semibold">support@feedim.com</a> ünvanından
            bizə müraciət edə bilərsiniz.
          </p>
        </div>
      </div>
    </>
  );
}
