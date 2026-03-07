import NewTabLink from "@/components/NewTabLink";

export default function AboutContentAz() {
  return (
    <>
      <h1 className="text-2xl sm:text-3xl font-bold mb-6">Haqqımızda</h1>
      <div className="space-y-6 text-sm text-text-secondary leading-relaxed">
        <p>Feedim, istifadəçilərin yazı və video paylaşa bildiyi, orijinal məzmunlarından Jeton qazana bildiyi sosial məzmun platformasıdır. Məzmun istehsalçıları yazılarını və videolarını paylaşır, premium oxucular bu məzmunları kəşf edib oxuduqca istehsalçılar avtomatik olaraq Jeton qazanır.</p>
        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Missiyamız</h2>
        <p>Keyfiyyətli və orijinal məzmun istehsalını təşviq etmək, məzmun istehsalçılarını zəhmətlərinin müqabilində ədalətli şəkildə mükafatlandırmaq və oxuculara dəyərli, maraqlı məzmunlar təqdim edərək hər kəs üçün mənalı bir platform təcrübəsi yaratmaq.</p>
        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Necə İşləyir?</h2>
        <p>Məzmun istehsalçıları yazı və video paylaşır. Premium oxucular bu məzmunları oxuyub izlədikcə istehsalçılar Jeton qazanır. Bundan əlavə reklam gəlir paylaşımı ilə əlavə qazanc əldə edilir və digər istifadəçilərdən hədiyyə almaq mümkündür. Qazanılan Jetonlar nağd pula çevrilə bilər.</p>
        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Bizimlə Əlaqə</h2>
        <p>Suallarınız və ya rəyləriniz var?{" "}
          <NewTabLink href="/help/contact" className="text-accent-main hover:opacity-80 font-semibold">Əlaqə səhifəmizi</NewTabLink>{" "}
          ziyarət edərək bizimlə əlaqə saxlaya bilərsiniz.
        </p>
      </div>
    </>
  );
}
