"use client";

import Link from "next/link";
import { Heart, Home, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center px-4 py-12">
      <div className="text-center max-w-md" role="main">
        <Heart
          className="h-20 w-20 mx-auto mb-6 text-pink-500 fill-pink-500 animate-pulse"
          aria-hidden="true"
        />
        <h1 className="text-6xl font-bold mb-4 text-pink-500">404</h1>
        <h2 className="text-2xl font-bold mb-3">Sayfa Bulunamadı</h2>
        <p className="text-gray-400 mb-8">
          Aradığınız sayfa mevcut değil veya taşınmış olabilir
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => window.history.back()}
            className="btn-secondary flex items-center justify-center gap-2"
            aria-label="Geri dön"
          >
            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
            Geri Dön
          </button>
          <Link
            href="/"
            className="btn-primary flex items-center justify-center gap-2"
            aria-label="Ana sayfaya dön"
          >
            <Home className="h-5 w-5" aria-hidden="true" />
            Ana Sayfa
          </Link>
        </div>
      </div>
    </div>
  );
}
