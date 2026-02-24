import { Metadata } from "next";

export const metadata: Metadata = {
  robots: { index: false },
};

export default function NotificationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
