import { Metadata } from "next";

export const metadata: Metadata = {
  robots: { index: false },
};

export default function SubscriptionPaymentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
