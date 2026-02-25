import Link from "next/link";

export default function AboutContentAz() {
  return (
    <>
      <h1 className="text-2xl sm:text-3xl font-bold mb-6">Haqqımızda</h1>
      <div className="space-y-6 text-sm text-text-secondary leading-relaxed">
        <p>Feedim, istifadəçilərin paylaşım və video paylaşıb, premium oxucular tərəfindən oxunan məzmunlarından Jeton qazana bildiyi bir məzmun və video platformasıdır.</p>
        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Missiyamız</h2>
        <p>Keyfiyyətli məzmun istehsalını təşviq etmək və istifadəçiləri zəhmətlərinin müqabilində mükafatlandırmaq. Oxuculara ən keyfiyyətli məzmunları təqdim etmək.</p>
        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Necə İşləyir?</h2>
        <p>Məzmunları kəşf et və paylaş. Premium oxucular paylaşımları oxuduqda istifadəçilər Jeton qazanır. Jetonlar nağd pula çevrilə bilər.</p>
        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Bizimlə Əlaqə</h2>
        <p>Suallarınız və ya rəyləriniz var?{" "}
          <Link href="/help/contact" className="text-accent-main hover:opacity-80 font-semibold">Əlaqə səhifəmizi</Link>{" "}
          ziyarət edərək bizimlə əlaqə saxlaya bilərsiniz.
        </p>
      </div>
    </>
  );
}
