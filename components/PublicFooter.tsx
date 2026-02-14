import Link from "next/link";
import { Heart } from "lucide-react";

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
            <div className="flex items-center gap-2.5">
              <a href="https://instagram.com/forilovecom" target="_blank" rel="noopener noreferrer" className="text-white/40 hover:text-white/70 transition" aria-label="Forilove Instagram">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
              </a>
              <a href="https://tiktok.com/@forilove" target="_blank" rel="noopener noreferrer" className="text-white/40 hover:text-white/70 transition" aria-label="Forilove TikTok">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 0 0-.79-.05A6.34 6.34 0 0 0 3.15 15a6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V8.36a8.16 8.16 0 0 0 4.76 1.53v-3.4a4.85 4.85 0 0 1-1-.2z"/></svg>
              </a>
              <a href="https://pinterest.com/forilovecom" target="_blank" rel="noopener noreferrer" className="text-white/40 hover:text-white/70 transition" aria-label="Forilove Pinterest">
                <svg width="15" height="15" viewBox="0 0 1024 1024" fill="currentColor"><path d="M467.669333 538.24c0.426667 1.408 0.768 2.858667 1.024 4.352C480.768 611.285333 512.426667 640 573.013333 640 669.610667 640 768 520.106667 768 395.093333 768 264.832 663.082667 170.666667 493.056 170.666667 345.728 170.666667 256 279.466667 256 395.093333c0 56.874667 11.690667 93.653333 32.085333 112.512a42.666667 42.666667 0 1 1-57.984 62.634667C189.482667 532.608 170.666667 473.514667 170.666667 395.093333 170.666667 235.52 294.570667 85.333333 493.056 85.333333 708.266667 85.333333 853.333333 215.509333 853.333333 395.093333c0 168.789333-132.437333 330.24-280.32 330.24-57.514667 0-103.424-18.474667-136.149333-53.546666l-53.973333 233.813333a42.666667 42.666667 0 1 1-83.114667-19.2l128-554.666667a42.666667 42.666667 0 0 1 83.114667 19.2l-43.221334 187.306667z"/></svg>
              </a>
              <a href="https://x.com/forilovecom" target="_blank" rel="noopener noreferrer" className="text-white/40 hover:text-white/70 transition" aria-label="Forilove X">
                <svg width="15" height="15" viewBox="0 0 512 512" fill="currentColor"><path d="M389.2 48h70.6L305.6 224.2 487 464H345L233.7 318.6 106.5 464H35.8L200.7 275.5 26.8 48H172.4L272.9 180.9 389.2 48zM364.4 421.8h39.1L151.1 88h-42L364.4 421.8z"/></svg>
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
