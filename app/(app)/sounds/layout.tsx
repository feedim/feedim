import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sesler | Feedim",
  description: "Popüler sesler ve müzikler.",
};

export default function SoundsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
