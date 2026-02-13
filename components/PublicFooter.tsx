import Link from "next/link";
import { Heart } from "lucide-react";

export default function PublicFooter() {
  return (
    <footer className="border-t border-white/10 py-12">
      <div className="container mx-auto px-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-pink-500 fill-pink-500" />
            <span className="font-semibold">Forilove</span>
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
                FL Coin
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
