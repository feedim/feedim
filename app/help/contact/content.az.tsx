import Link from "next/link";

export default function ContactContentAz() {
  return (
    <>
      <h1 className="text-2xl sm:text-3xl font-bold mb-6">Əlaqə</h1>
      <div className="space-y-10">
        <p className="max-w-[720px] text-sm text-text-secondary leading-relaxed">
          Suallarınız, rəyləriniz və ya dəstək tələbləriniz üçün aşağıdakı kanallar vasitəsilə bizimlə əlaqə saxlaya bilərsiniz. Bütün müraciətlərə mümkün olan ən qısa müddətdə cavab verməyə çalışırıq.
        </p>
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-text-primary">Moderasiya Etirazı və Texniki Dəstək</h2>
          <p className="max-w-[720px] text-sm text-text-secondary leading-relaxed">
            Hesabınıza daxil olduqdan sonra dəstək tələbi yarada bilərsiniz. Moderasiya qərarına etiraz etmək və ya texniki problem yaşayırsınızsa{" "}
            <Link href="/settings/support" className="text-accent-main hover:opacity-80 font-semibold">Dəstək Tələbi Yarat</Link>{" "}
            səhifəsini istifadə edin. Qərar nömrəsini qeyd edərək Etibar səhifəsi və ya Moderasiya bölməsindən də yazışma açmaq mümkündür. Dəstək tələbləriniz hesabınız üzərindən izlənilir və cavab verildikdə bildiriş alırsınız.
          </p>
        </section>
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-text-primary">E-poçt</h2>
          <p className="max-w-[720px] text-sm text-text-secondary leading-relaxed">
            Hələ üzv deyilsinizsə və ya hesabınıza daxil ola bilmirsinizsə, aşağıdakı e-poçt ünvanlarından istifadə edin.
          </p>
        </section>
        <section className="space-y-3">
          <div className="space-y-1.5">
            <p className="text-sm font-semibold text-text-secondary">Ümumi suallar və əlaqə üçün:</p>
            <a href="mailto:contact@feedim.com" className="text-accent-main hover:opacity-80 font-semibold">contact@feedim.com</a>
          </div>
          <div className="space-y-1.5">
            <p className="text-sm font-semibold text-text-secondary">Ödəmə problemləri üçün:</p>
            <a href="mailto:payment@feedim.com" className="text-accent-main hover:opacity-80 font-semibold">payment@feedim.com</a>
          </div>
          <div className="space-y-1.5">
            <p className="text-sm font-semibold text-text-secondary">Yardım mərkəzi və tez-tez verilən suallar:</p>
            <a href="mailto:help@feedim.com" className="text-accent-main hover:opacity-80 font-semibold">help@feedim.com</a>
          </div>
          <div className="space-y-1.5">
            <p className="text-sm font-semibold text-text-secondary">Müəllif hüquqları və məzmun silmə tələbləri üçün:</p>
            <a href="mailto:copyright@feedim.com" className="text-accent-main hover:opacity-80 font-semibold">copyright@feedim.com</a>
          </div>
        </section>
        <section className="space-y-2">
          <h2 className="text-lg font-bold text-text-primary">Cavab Müddəti</h2>
          <p className="max-w-[720px] text-sm text-text-secondary leading-relaxed">Adətən iş günlərində 48 saat ərzində bütün suallara cavab veririk.</p>
        </section>
      </div>
    </>
  );
}
