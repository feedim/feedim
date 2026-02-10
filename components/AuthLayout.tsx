"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

interface AuthLayoutProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}

export default function AuthLayout({ title, subtitle, children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-black px-4 py-12 relative">
      <Link
        href="/"
        className="absolute top-6 left-4 flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
        aria-label="Ana sayfaya dön"
      >
        <ArrowLeft className="h-5 w-5" />
        <span className="text-sm font-medium">Ana Sayfa</span>
      </Link>

      <div className="flex items-center justify-center min-h-[calc(100vh-96px)]">
        <div className="w-full max-w-md">
          <div className="space-y-8">
            <div className="text-center">
              <h1 className="text-3xl font-bold mb-2 text-white">{title}</h1>
              <p className="text-gray-400">{subtitle}</p>
            </div>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
