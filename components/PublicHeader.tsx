"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Heart, ArrowLeft } from "lucide-react";

interface PublicHeaderProps {
  variant?: "home" | "back";
  backLabel?: string;
}

export default function PublicHeader({ variant = "back", backLabel = "Geri" }: PublicHeaderProps) {
  const router = useRouter();

  return (
    <header>
      <nav className="container mx-auto px-6 py-6 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2" aria-label="Forilove Ana Sayfa">
          <Heart className="h-7 w-7 text-pink-500 fill-pink-500" aria-hidden="true" />
          <span className="text-xl font-bold">Forilove</span>
        </Link>
        {variant === "home" ? (
          <div className="flex items-center gap-3">
            <Link href="/login" className="btn-secondary px-4 py-3 sm:px-8">
                Giriş Yap
            </Link>
          </div>
        ) : (
          <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-400 hover:text-white transition">
            <ArrowLeft className="h-5 w-5" />
            <span>{backLabel}</span>
          </button>
        )}
      </nav>
    </header>
  );
}
