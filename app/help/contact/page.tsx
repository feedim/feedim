import { Mail } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "İletişim - Feedim",
  description: "Feedim ile iletişime geçin. Sorularınız, geri bildirimleriniz ve destek talepleriniz için bize ulaşın.",
  keywords: ["iletişim", "destek", "feedim iletişim"],
};

export default function ContactPage() {
  return (
    <>
      <h1 className="text-2xl sm:text-3xl font-bold mb-6">İletişim</h1>
      <div className="space-y-8">
        <p className="text-sm text-text-secondary leading-relaxed">Sizden haber almak isteriz. Sorularınız, geri bildirimleriniz veya destek talepleriniz için aşağıdaki kanallardan bize ulaşabilirsiniz.</p>
        <div className="rounded-radius-md p-8 space-y-6">
          <div className="flex items-center gap-3 mb-4">
            <Mail className="h-6 w-6 text-accent-main" />
            <h2 className="text-lg font-bold text-text-primary">E-posta</h2>
          </div>
          <div>
            <p className="text-sm text-text-secondary mb-2">Genel sorular ve iletişim için:</p>
            <a href="mailto:contact@feedim.com" className="text-accent-main hover:opacity-80 font-semibold">contact@feedim.com</a>
          </div>
          <div>
            <p className="text-sm text-text-secondary mb-2">Teknik destek ve yardım için:</p>
            <a href="mailto:support@feedim.com" className="text-accent-main hover:opacity-80 font-semibold">support@feedim.com</a>
          </div>
          <div>
            <p className="text-sm text-text-secondary mb-2">Yardım merkezi ve sıkça sorulan sorular:</p>
            <a href="mailto:help@feedim.com" className="text-accent-main hover:opacity-80 font-semibold">help@feedim.com</a>
          </div>
          <div>
            <p className="text-sm text-text-secondary mb-2">İş birlikleri ve reklam için:</p>
            <a href="mailto:marketing@feedim.com" className="text-accent-main hover:opacity-80 font-semibold">marketing@feedim.com</a>
          </div>
        </div>
        <div className="rounded-radius-md p-8">
          <h2 className="text-lg font-bold text-text-primary mb-4">Yanıt Süresi</h2>
          <p className="text-sm text-text-secondary leading-relaxed">Genellikle iş günlerinde 24 saat içinde tüm sorulara yanıt veriyoruz.</p>
        </div>
      </div>
    </>
  );
}
