export default function ContactContentAz() {
  return (
    <>
      <h1 className="text-2xl sm:text-3xl font-bold mb-6">Əlaqə</h1>
      <div className="space-y-8">
        <p className="text-sm text-text-secondary leading-relaxed">Suallarınız, rəyləriniz və ya dəstək tələbləriniz üçün aşağıdakı kanallardan bizimlə əlaqə saxlaya bilərsiniz. Bütün müraciətlərə ən qısa müddətdə cavab verəcəyik.</p>
        <div className="rounded-radius-md p-8 space-y-6">
          <div className="mb-4">
            <h2 className="text-lg font-bold text-text-primary">E-poçt</h2>
          </div>
          <div>
            <p className="text-sm text-text-secondary mb-2 font-semibold">Ümumi suallar və əlaqə üçün:</p>
            <a href="mailto:contact@feedim.com" className="text-accent-main hover:opacity-80 font-semibold">contact@feedim.com</a>
          </div>
          <div>
            <p className="text-sm text-text-secondary mb-2 font-semibold">Ödəmə problemləri üçün:</p>
            <a href="mailto:payment@feedim.com" className="text-accent-main hover:opacity-80 font-semibold">payment@feedim.com</a>
          </div>
          <div>
            <p className="text-sm text-text-secondary mb-2 font-semibold">Yardım mərkəzi və tez-tez verilən suallar:</p>
            <a href="mailto:help@feedim.com" className="text-accent-main hover:opacity-80 font-semibold">help@feedim.com</a>
          </div>
          <div>
            <p className="text-sm text-text-secondary mb-2 font-semibold">Müəllif hüquqları və məzmun silmə tələbləri üçün:</p>
            <a href="mailto:copyright@feedim.com" className="text-accent-main hover:opacity-80 font-semibold">copyright@feedim.com</a>
          </div>
        </div>
        <div className="rounded-radius-md p-8">
          <h2 className="text-lg font-bold text-text-primary mb-4">Cavab Müddəti</h2>
          <p className="text-sm text-text-secondary leading-relaxed">Adətən iş günlərində 24 saat ərzində bütün suallara cavab veririk.</p>
        </div>
      </div>
    </>
  );
}
