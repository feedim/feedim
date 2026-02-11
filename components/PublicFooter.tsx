import Link from "next/link";
import { Heart } from "lucide-react";

export default function PublicFooter() {
  return (
    <footer className="border-t border-white/10 py-12">
      <div className="container mx-auto px-6">
        <div className="flex flex-col items-center gap-8">
          <div className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-pink-500 fill-pink-500" />
            <span className="font-semibold">Forilove</span>
          </div>
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
          <div className="flex items-center gap-3">
            {/* Visa */}
            <svg width="40" height="26" viewBox="0 0 750 471" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Visa">
              <rect width="750" height="471" rx="40" fill="#1A1F71"/>
              <path d="M278.198 334.228l33.36-195.763h53.358l-33.384 195.763H278.198zM524.308 142.687c-10.57-3.966-27.135-8.222-47.822-8.222-52.725 0-89.863 26.551-90.181 64.604-.318 28.129 26.509 43.821 46.754 53.185 20.771 9.597 27.752 15.716 27.654 24.283-.14 13.123-16.586 19.116-31.924 19.116-21.355 0-32.701-2.967-50.225-10.274l-6.879-3.112-7.488 43.822c12.463 5.467 35.508 10.199 59.438 10.445 56.09 0 92.502-26.248 92.916-66.884.199-22.27-14.016-39.215-44.801-53.188-18.65-9.056-30.072-15.099-29.951-24.269 0-8.137 9.668-16.838 30.559-16.838 17.447-.271 30.088 3.534 39.936 7.5l4.781 2.259 7.233-42.427zM661.615 138.464h-41.231c-12.773 0-22.332 3.486-27.941 16.234l-79.244 179.53h56.031s9.16-24.122 11.232-29.418c6.123 0 60.555.084 68.336.084 1.596 6.854 6.492 29.334 6.492 29.334h49.512l-43.187-195.764zm-65.417 126.408c4.414-11.279 21.26-54.724 21.26-54.724-.317.503 4.377-11.322 7.074-18.661l3.606 16.859s10.217 46.729 12.352 56.527h-44.292zM232.903 138.464L180.664 271.96l-5.565-27.129c-9.726-31.274-40.025-65.157-73.898-82.12l47.767 171.204 56.455-.065 84.004-195.386h-56.524" fill="#fff"/>
              <path d="M131.92 138.464H45.879l-.682 4.073c66.938 16.204 111.232 55.363 129.618 102.415l-18.709-89.96c-3.229-12.396-12.597-16.095-24.186-16.528" fill="#F9A533"/>
            </svg>
            {/* Mastercard */}
            <svg width="40" height="26" viewBox="0 0 750 471" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Mastercard">
              <rect width="750" height="471" rx="40" fill="#0A0A0A"/>
              <circle cx="301" cy="236" r="150" fill="#EB001B"/>
              <circle cx="449" cy="236" r="150" fill="#F79E1B"/>
              <path d="M375 117.4a149.5 149.5 0 0 0-55.8 118.6c0 47.8 22.4 90.3 57.3 117.6a149.5 149.5 0 0 0 55.5-117.6A149.5 149.5 0 0 0 375 117.4z" fill="#FF5F00"/>
            </svg>
            {/* Troy */}
            <svg width="40" height="26" viewBox="0 0 750 471" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Troy">
              <rect width="750" height="471" rx="40" fill="#004B8D"/>
              <text x="375" y="260" textAnchor="middle" fill="white" fontSize="160" fontWeight="bold" fontFamily="Arial, sans-serif">TROY</text>
            </svg>
          </div>
          <p className="text-sm text-gray-500">&copy; 2026 Forilove</p>
        </div>
      </div>
    </footer>
  );
}
