import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Moments | Feedim",
  description: "Kısa video içerikler, anlar ve highlights.",
};

export default function MomentsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
