import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Video | Feedim",
  description: "En yeni videolar.",
};

export default function VideoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
