import PublicHeader from "@/components/PublicHeader";
import PublicFooter from "@/components/PublicFooter";
import { ReactNode } from "react";

interface LegalPageLayoutProps {
  title: string;
  lastUpdated?: string;
  maxWidth?: "3xl" | "4xl";
  children: ReactNode;
}

export default function LegalPageLayout({
  title,
  lastUpdated = "8 Şubat 2026",
  maxWidth = "3xl",
  children,
}: LegalPageLayoutProps) {
  const maxWidthClass = maxWidth === "4xl" ? "max-w-4xl" : "max-w-3xl";

  return (
    <div className="min-h-screen bg-black text-white">
      <PublicHeader variant="back" />

      <main className={`container mx-auto px-6 py-16 ${maxWidthClass}`}>
        <h1 className="text-4xl font-bold mb-6">{title}</h1>
        {lastUpdated && (
          <p className="text-gray-500 mb-8">Son güncelleme: {lastUpdated}</p>
        )}

        <div className="space-y-8 text-gray-400 leading-loose sm:leading-8">{children}</div>
      </main>

      <PublicFooter />
    </div>
  );
}
