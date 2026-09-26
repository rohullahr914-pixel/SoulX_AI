"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { AlertCircle, ArrowRight, CheckCircle2, Clock3, CreditCard, LoaderCircle, RotateCcw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { refreshCurrentUser } from "@/lib/auth";

type Payment = {
  id: string;
  plan: "pro" | "ultra";
  amount: number | string;
  currency: string;
  status: "pending" | "paid" | "failed" | "cancelled" | "expired";
  created_at: string;
  paid_at: string | null;
  subscription_expires_at: string | null;
};

export function PaymentStatus() {
  const { paymentId } = useParams<{ paymentId: string }>();
  const returnHint = useSearchParams().get("return");
  const [payment, setPayment] = useState<Payment | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);

  const load = useCallback(async () => {
    const response = await fetch(`/api/payments/${encodeURIComponent(paymentId)}`, { cache: "no-store", credentials: "same-origin" });
    const data = (await response.json().catch(() => ({}))) as { payment?: Payment; error?: string };
    if (!response.ok || !data.payment) throw new Error(data.error || "Could not load payment status.");
    setPayment(data.payment);
    setError("");
    setLoading(false);
    if (data.payment.status === "paid") await refreshCurrentUser();
    return data.payment.status;
  }, [paymentId]);

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let attempts = 0;
    const poll = async () => {
      try {
        const status = await load();
        if (!active || status !== "pending" || attempts >= 14) return;
        attempts += 1;
        timer = setTimeout(poll, 2000);
      } catch (reason) {
        if (!active) return;
        setError(reason instanceof Error ? reason.message : "Could not load payment status.");
        setLoading(false);
      }
    };
    void poll();
    return () => { active = false; if (timer) clearTimeout(timer); };
  }, [load]);

  const cancel = async () => {
    setCancelling(true);
    const response = await fetch(`/api/payments/${encodeURIComponent(paymentId)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "cancel" }) });
    if (response.ok) await load();
    else setError("The payment could not be cancelled. Its verified status has not been changed.");
    setCancelling(false);
  };

  if (loading) return <StatusShell icon={<LoaderCircle className="h-9 w-9 animate-spin" />} eyebrow="Checking payment" title="Payment processing" copy="We’re securely checking for HesabPay’s confirmation." />;
  if (error || !payment) return <StatusShell tone="error" icon={<AlertCircle className="h-9 w-9" />} eyebrow="Payment status" title="We couldn’t load this payment" copy={error || "Please sign in again and reopen your payment."}><Link href="/pricing" className="social-button primary">Return to plans</Link></StatusShell>;

  if (payment.status === "paid") {
    const expiration = payment.subscription_expires_at ? new Date(payment.subscription_expires_at).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" }) : null;
    return <StatusShell tone="success" icon={<CheckCircle2 className="h-9 w-9" />} eyebrow="Payment successful" title={`${payment.plan === "ultra" ? "Ultra" : "Pro"} is active`} copy={expiration ? `Your plan is active through ${expiration}. Your account has already been updated.` : "Your plan is active and your account has already been updated."}><Link href="/profile" className="social-button primary">Open profile <ArrowRight className="h-4 w-4" /></Link><Link href="/explore" className="social-button">Explore minds</Link></StatusShell>;
  }

  if (payment.status === "pending") {
    const returnedWithoutPayment = returnHint === "failure";
    return <StatusShell icon={returnedWithoutPayment ? <CreditCard className="h-9 w-9" /> : <Clock3 className="h-9 w-9" />} eyebrow={returnedWithoutPayment ? "Payment not completed" : "Awaiting confirmation"} title={returnedWithoutPayment ? "Your plan has not changed" : "Payment processing"} copy={returnedWithoutPayment ? "HesabPay returned without a completed payment. If a verified confirmation arrives, this page will update automatically." : "HesabPay has not confirmed the payment yet. Keep this page open for a moment or check again shortly."}><button type="button" onClick={() => void load()} className="social-button primary"><RotateCcw className="h-4 w-4" />Check again</button><button type="button" onClick={() => void cancel()} disabled={cancelling} className="social-button">{cancelling ? "Cancelling…" : "Cancel payment"}</button><Link href="/pricing" className="social-button">Back to plans</Link></StatusShell>;
  }

  const statusLabel = payment.status === "cancelled" ? "Payment cancelled" : payment.status === "expired" ? "Payment expired" : "Payment failed";
  return <StatusShell tone="error" icon={<AlertCircle className="h-9 w-9" />} eyebrow={statusLabel} title="Your plan has not changed" copy="No subscription was activated. You can safely return to the plans page and try again."><Link href="/pricing" className="social-button primary">Try again <ArrowRight className="h-4 w-4" /></Link><Link href="/profile" className="social-button">Open profile</Link></StatusShell>;
}

function StatusShell({ icon, eyebrow, title, copy, tone = "pending", children }: { icon: React.ReactNode; eyebrow: string; title: string; copy: string; tone?: "pending" | "success" | "error"; children?: React.ReactNode }) {
  const toneClasses = tone === "success" ? "border-emerald-300/25 bg-emerald-400/10 text-emerald-200" : tone === "error" ? "border-rose-300/25 bg-rose-400/10 text-rose-200" : "border-cyan-300/25 bg-cyan-400/10 text-cyan-200";
  return <main className="social-page flex min-h-[68vh] items-center justify-center"><section aria-live="polite" className="relative w-full max-w-2xl overflow-hidden rounded-[34px] border border-white/10 bg-slate-950/75 p-6 text-center shadow-[0_28px_80px_rgba(2,8,23,0.5)] sm:p-10"><div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(34,211,238,0.13),transparent_38%)]" /><div className="relative"><span className={`mx-auto flex h-20 w-20 items-center justify-center rounded-[26px] border ${toneClasses}`}>{icon}</span><p className="mt-6 text-xs font-bold uppercase tracking-[0.22em] text-cyan-300">{eyebrow}</p><h1 className="mt-3 text-4xl font-black tracking-[-0.055em] text-white sm:text-5xl">{title}</h1><p className="mx-auto mt-4 max-w-lg text-sm leading-7 text-slate-300">{copy}</p>{children && <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row [&_.social-button]:min-h-12">{children}</div>}</div></section></main>;
}
