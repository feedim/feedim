import { Metadata } from "next";

export const metadata: Metadata = {
  robots: { index: false },
};

export default function ModerationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
