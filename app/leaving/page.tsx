"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { FeedimIcon } from "@/components/FeedimLogo";
import { ExternalLink, ArrowLeft } from "lucide-react";

function LeavingContent() {
  const searchParams = useSearchParams();
  const url = searchParams.get("url") || "";

  const handleOpen = () => {
    if (url) {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  const handleBack = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.location.href = "/";
    }
  };

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center px-6 text-center">
      <FeedimIcon className="h-16 w-16 opacity-80 mb-6" />
      <h1 className="text-xl font-bold mb-2">Feedim&apos;den ayrılıyorsunuz</h1>
      <p className="text-sm text-text-muted mb-6 max-w-sm">
        Aşağıdaki bağlantı Feedim dışında bir sayfaya yönlendirmektedir. Devam etmek istediğinizden emin olun.
      </p>

      {url && (
        <div className="w-full max-w-sm bg-bg-secondary rounded-[15px] px-4 py-3 mb-6 break-all text-sm text-text-muted text-left">
          {url}
        </div>
      )}

      <div className="w-full max-w-sm space-y-2.5">
        <button onClick={handleOpen} className="t-btn accept w-full flex items-center justify-center gap-2">
          <ExternalLink className="h-4 w-4" />
          Bağlantıyı Aç
        </button>
        <button onClick={handleBack} className="t-btn cancel w-full flex items-center justify-center gap-2">
          <ArrowLeft className="h-4 w-4" />
          Geri Dön
        </button>
      </div>
    </div>
  );
}

export default function LeavingPage() {
  return (
    <Suspense fallback={<div className="min-h-[100dvh] flex items-center justify-center"><span className="loader" /></div>}>
      <LeavingContent />
    </Suspense>
  );
}
