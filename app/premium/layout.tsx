import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Feedim Premium — Ayrıcalıklı Deneyim",
  description: "Feedim Premium ile reklamsız deneyim, onaylı rozet, analitik paneli ve daha fazlası. Super, Pro, Max ve Business planlarını keşfet.",
  keywords: ["feedim premium", "premium üyelik", "onaylı rozet", "reklamsız"],
  openGraph: {
    title: "Feedim Premium — Ayrıcalıklı Deneyim",
    description: "Feedim Premium ile reklamsız deneyim, onaylı rozet, analitik paneli ve daha fazlası.",
    type: "website",
    siteName: "Feedim",
    locale: "tr_TR",
  },
  twitter: {
    card: "summary_large_image",
    title: "Feedim Premium — Ayrıcalıklı Deneyim",
    description: "Feedim Premium ile reklamsız deneyim, onaylı rozet, analitik paneli ve daha fazlası.",
  },
};

export default function PremiumLayout({ children }: { children: React.ReactNode }) {
  return children;
}
