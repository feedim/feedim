import { Mail } from "lucide-react";

export default function ContactContentAz() {
  return (
    <>
      <h1 className="text-2xl sm:text-3xl font-bold mb-6">Əlaqə</h1>
      <div className="space-y-8">
        <p className="text-sm text-text-secondary leading-relaxed">Sizdən xəbər almaq istəyirik. Suallarınız, rəyləriniz və ya dəstək tələbləriniz üçün aşağıdakı kanallardan bizimlə əlaqə saxlaya bilərsiniz.</p>
        <div className="rounded-radius-md p-8 space-y-6">
          <div className="flex items-center gap-3 mb-4">
            <Mail className="h-6 w-6 text-accent-main" />
            <h2 className="text-lg font-bold text-text-primary">E-poçt</h2>
          </div>
          <div>
            <p className="text-sm text-text-secondary mb-2">Ümumi suallar və əlaqə üçün:</p>
            <a href="mailto:contact@feedim.com" className="text-accent-main hover:opacity-80 font-semibold">contact@feedim.com</a>
          </div>
          <div>
            <p className="text-sm text-text-secondary mb-2">Texniki dəstək və yardım üçün:</p>
            <a href="mailto:support@feedim.com" className="text-accent-main hover:opacity-80 font-semibold">support@feedim.com</a>
          </div>
          <div>
            <p className="text-sm text-text-secondary mb-2">Yardım mərkəzi və tez-tez verilən suallar:</p>
            <a href="mailto:help@feedim.com" className="text-accent-main hover:opacity-80 font-semibold">help@feedim.com</a>
          </div>
          <div>
            <p className="text-sm text-text-secondary mb-2">Əməkdaşlıq və reklam üçün:</p>
            <a href="mailto:marketing@feedim.com" className="text-accent-main hover:opacity-80 font-semibold">marketing@feedim.com</a>
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
