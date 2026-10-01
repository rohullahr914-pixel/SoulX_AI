import { Suspense } from "react";
import { BinancePayment } from "@/components/binance-payment";

export default function BinancePaymentPage() {
  return <Suspense fallback={<main className="social-page min-h-[70vh]" />}><BinancePayment /></Suspense>;
}
