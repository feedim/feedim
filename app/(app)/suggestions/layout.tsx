import { Metadata } from "next";

export const metadata: Metadata = {
  robots: { index: false },
};

export default function SuggestionsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
