import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Topluluk Notları | Feedim",
  description: "Topluluktan kısa paylaşımlar.",
};

export default function NotesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
