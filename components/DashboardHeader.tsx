"use client";

import Link from "next/link";
import { Heart } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface DashboardHeaderProps {
  coinBalance?: number;
  showCoinWallet?: boolean;
  showMyPages?: boolean;
  showBackToDashboard?: boolean;
}

export default function DashboardHeader({
  coinBalance,
  showCoinWallet = false,
  showMyPages = false,
  showBackToDashboard = false,
}: DashboardHeaderProps) {
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Başarıyla çıkış yapıldı");
    router.push("/");
    router.refresh();
  };

  return (
    <header className="sticky top-0 z-50 bg-black/90 backdrop-blur-xl border-b border-white/10">
      <nav className="container mx-auto px-6 py-5 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-2" aria-label="Forilove Dashboard">
          <Heart className="h-7 w-7 text-pink-500 fill-pink-500" aria-hidden="true" />
          <span className="text-2xl font-bold">Forilove</span>
        </Link>

        <div className="flex items-center gap-4">
          {showCoinWallet && coinBalance !== undefined && (
            <Link href="/dashboard/coins">
              <div className="flex items-center gap-2 bg-white/5 hover:bg-white/10 px-4 py-2 rounded-lg transition cursor-pointer">
                <svg className="h-5 w-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
                </svg>
                <span className="font-semibold">{coinBalance} FL</span>
              </div>
            </Link>
          )}

          {showMyPages && (
            <Link href="/dashboard/my-pages">
              <button className="text-gray-400 hover:text-white px-4 py-2 transition">
                Sayfalarım
              </button>
            </Link>
          )}

          {showBackToDashboard && (
            <Link href="/dashboard">
              <button className="text-gray-400 hover:text-white px-4 py-2 transition">
                Ana Sayfa
              </button>
            </Link>
          )}

          <button
            onClick={handleLogout}
            className="text-gray-400 hover:text-white px-4 py-2 transition"
          >
            Çıkış Yap
          </button>
        </div>
      </nav>
    </header>
  );
}
