import Link from "next/link";
import { Heart, Instagram, Twitter } from "lucide-react";

export default function PublicFooter() {
  return (
    <footer className="border-t border-white/10 py-12">
      <div className="container mx-auto px-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex flex-col items-center md:items-start gap-3">
            <div className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-pink-500 fill-pink-500" />
              <span className="font-semibold">Forilove</span>
            </div>
            <div className="flex items-center gap-3">
              <a href="https://instagram.com/forilove" target="_blank" rel="noopener noreferrer" className="text-white/60 hover:text-white transition" aria-label="Instagram">
                <Instagram className="h-[18px] w-[18px]" />
              </a>
              <a href="https://tiktok.com/@forilove" target="_blank" rel="noopener noreferrer" className="text-white/60 hover:text-white transition" aria-label="TikTok">
                <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 0 0-.79-.05A6.34 6.34 0 0 0 3.15 15a6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V8.36a8.16 8.16 0 0 0 4.76 1.53v-3.4a4.85 4.85 0 0 1-1-.2z"/></svg>
              </a>
              <a href="https://pinterest.com/forilove" target="_blank" rel="noopener noreferrer" className="text-white/60 hover:text-white transition" aria-label="Pinterest">
                <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0a12 12 0 0 0-4.37 23.17c-.1-.94-.2-2.4.04-3.44l1.4-5.96s-.36-.72-.36-1.78c0-1.66.96-2.9 2.16-2.9 1.02 0 1.52.77 1.52 1.68 0 1.02-.66 2.56-.99 3.98-.28 1.18.59 2.15 1.76 2.15 2.11 0 3.73-2.22 3.73-5.44 0-2.84-2.04-4.83-4.96-4.83-3.38 0-5.36 2.53-5.36 5.15 0 1.02.39 2.11.88 2.71.1.12.11.22.08.34l-.33 1.34c-.05.22-.17.26-.4.16-1.5-.7-2.43-2.88-2.43-4.64 0-3.78 2.74-7.25 7.92-7.25 4.16 0 7.39 2.96 7.39 6.92 0 4.13-2.6 7.46-6.22 7.46-1.22 0-2.36-.63-2.75-1.37l-.75 2.85c-.27 1.04-1 2.35-1.49 3.14A12 12 0 1 0 12 0z"/></svg>
              </a>
              <a href="https://twitter.com/forilove" target="_blank" rel="noopener noreferrer" className="text-white/60 hover:text-white transition" aria-label="Twitter">
                <Twitter className="h-[18px] w-[18px]" />
              </a>
            </div>
          </div>
          <div className="flex flex-col items-center gap-4">
            <div className="flex flex-wrap gap-x-8 gap-y-4 text-sm justify-center max-w-3xl">
              <Link href="/templates" className="text-gray-400 hover:text-white transition">
                Şablonlar
              </Link>
              <Link href="/blog" className="text-gray-400 hover:text-white transition">
                Blog
              </Link>
              <Link href="/about" className="text-gray-400 hover:text-white transition">
                Hakkımızda
              </Link>
              <Link href="/contact" className="text-gray-400 hover:text-white transition">
                İletişim
              </Link>
              <Link href="/distance-sales-contract" className="text-gray-400 hover:text-white transition">
                Mesafeli Satış Sözleşmesi
              </Link>
              <Link href="/pre-information-form" className="text-gray-400 hover:text-white transition">
                Ön Bilgilendirme
              </Link>
              <Link href="/disclaimer" className="text-gray-400 hover:text-white transition">
                Sorumluluk Reddi
              </Link>
              <Link href="/fl-coins" className="text-gray-400 hover:text-white transition">
                FL
              </Link>
              <Link href="/payment-security" className="text-gray-400 hover:text-white transition">
                Ödeme Güvenliği
              </Link>
              <Link href="/refund-policy" className="text-gray-400 hover:text-white transition">
                İade Politikası
              </Link>
              <Link href="/privacy" className="text-gray-400 hover:text-white transition">
                Gizlilik
              </Link>
              <Link href="/terms" className="text-gray-400 hover:text-white transition">
                Kullanım Koşulları
              </Link>
            </div>
            <div className="mt-2">
              <img src="/logo_band_white.svg" alt="Ödeme yöntemleri" height={25} style={{ height: 25, width: 'auto', opacity: 0.7 }} />
            </div>
          </div>
          <p className="text-sm text-gray-500">&copy; 2026 Forilove</p>
        </div>
      </div>
    </footer>
  );
}
