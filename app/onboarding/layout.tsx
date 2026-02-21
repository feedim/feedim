import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Hesap Kurulumu | Feedim",
  robots: { index: false, follow: false },
};

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
