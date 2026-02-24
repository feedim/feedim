import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Keşfet | Feedim",
  description: "Popüler içerikler, trendler ve yeni yazarlar keşfet.",
};

export default function ExploreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
