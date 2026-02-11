import Link from "next/link";

export default function CTASection() {
  return (
    <section className="border-t border-white/10 py-20">
      <div className="container mx-auto px-6 text-center">
        <h2 className="text-3xl font-bold mb-4">Hazır mısın?</h2>
        <p className="text-gray-400 mb-8 max-w-xl mx-auto">
          Sevdikleri için harika sayfalar oluşturan binlerce kişiye katıl
        </p>
        <Link href="/register" className="btn-primary text-lg">Başlayın</Link>
      </div>
    </section>
  );
}
