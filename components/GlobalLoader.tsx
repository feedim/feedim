"use client";

import { Heart } from "lucide-react";

export function GlobalLoader() {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center">
      <Heart className="h-12 w-12 text-pink-500 fill-pink-500 animate-pulse" />
    </div>
  );
}

export function PageLoader() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <Heart className="h-12 w-12 text-pink-500 fill-pink-500 animate-pulse" />
    </div>
  );
}
