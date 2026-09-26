import type { Metadata } from "next";
import { Suspense } from "react";
import { PaymentStatus } from "@/components/payment-status";

export const metadata: Metadata = { title: "Payment status", robots: { index: false, follow: false } };

export default function PaymentStatusPage() {
  return <Suspense fallback={<main className="social-page min-h-[68vh]" />}><PaymentStatus /></Suspense>;
}
