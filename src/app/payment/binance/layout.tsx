import type { Metadata } from "next";

export const metadata: Metadata = { title: "Pay with USDT", robots: { index: false, follow: false } };

export default function BinancePaymentLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
