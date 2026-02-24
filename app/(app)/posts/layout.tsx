import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Gönderiler | Feedim",
  description: "En yeni gönderiler ve paylaşımlar.",
};

export default function PostsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
