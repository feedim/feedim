import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Feedim'den ayrılıyorsunuz",
  robots: { index: false, follow: false },
};

export default function LeavingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
