"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import type { ReactNode } from "react";
import { Check, LoaderCircle, ShieldCheck, Sparkles, Zap, Crown } from "lucide-react";
import { getCurrentUser, subscribeToAuth } from "@/lib/auth";

type PaidPlan = "pro" | "ultra";

export default function PricingPage() {
  const [prices, setPrices] = useState({ pro: 5, ultra: 10 });
  const [checkoutBusy, setCheckoutBusy] = useState<PaidPlan | null>(null);
  const [checkoutError, setCheckoutError] = useState("");
  const user = useSyncExternalStore(subscribeToAuth, getCurrentUser, () => null);
  const router = useRouter();

  useEffect(() => {
    void fetch("/api/plans", { cache: "no-store" })
      .then((response) => response.json())
      .then((body: { pro?: number; ultra?: number }) => {
        setPrices({
          pro: typeof body.pro === "number" && body.pro > 0 ? body.pro : 5,
          ultra: typeof body.ultra === "number" ? body.ultra : 10,
        });
      })
      .catch(() => undefined);
  }, []);

  const startCheckout = async (plan: PaidPlan) => {
    setCheckoutError("");
    if (!user) { router.push("/login?next=/pricing"); return; }
    setCheckoutBusy(plan);
    try {
      const response = await fetch("/api/payments/binance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ plan }),
      });
      const data = (await response.json().catch(() => ({}))) as { paymentRequest?: { id: string }; error?: string };
      if (response.status === 401) { router.push("/login?next=/pricing"); return; }
      if (!response.ok || !data.paymentRequest?.id) throw new Error(data.error || "Could not start your payment.");
      router.push(`/payment/binance?paymentRequestId=${encodeURIComponent(data.paymentRequest.id)}`);
    } catch (error) {
      setCheckoutError(error instanceof Error ? error.message : "Could not start your payment.");
      setCheckoutBusy(null);
    }
  };

  const paidCta = (plan: PaidPlan) => {
    const active = user?.plan === plan && user.planStatus === "active";
    const unavailable = plan === "ultra" && prices.ultra <= 0;
    return (
      <>
        <button type="button" onClick={() => void startCheckout(plan)} disabled={Boolean(checkoutBusy) || active || unavailable} className="social-button primary mt-8 min-h-12 w-full disabled:cursor-not-allowed disabled:opacity-60">
          {checkoutBusy === plan ? <><LoaderCircle className="h-4 w-4 animate-spin" />Preparing payment…</> : active ? `${plan === "ultra" ? "Ultra" : "Pro"} is active` : unavailable ? "Price not configured" : `Pay ${prices[plan]} USDT`}
        </button>
        <p className="mt-3 text-center text-xs leading-5 text-slate-500">Secure crypto payment · Manual activation after verification</p>
      </>
    );
  };

  return (
    <main className="social-page">
      <header className="social-hero">
        <div>
          <p className="social-eyebrow"><span />SOULX plans</p>
          <h1>More room for better thinking.</h1>
          <p className="social-description">Start free, then unlock more conversations, richer Personas, and priority access when your ideas outgrow the basics.</p>
          {user && <p className="mt-5 inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-400/8 px-3 py-2 text-xs text-cyan-100"><ShieldCheck className="h-4 w-4" />Current plan: <strong>{(user.plan ?? "free").toUpperCase()}</strong></p>}
        </div>
        <Sparkles className="hidden text-cyan-300 sm:block" size={100} strokeWidth={1} />
      </header>

      <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        <PlanCard title="Free" price="Free" icon={<Sparkles />} features={["Basic Persona chats", "5 AI messages per day", "3 created Personas", "Basic challenges", "Standard AI experience"]}>
          <Link href={user ? "/profile" : "/signup"} className="social-button mt-8 min-h-12 w-full">{user ? "Open profile" : "Start free"} →</Link>
        </PlanCard>
        <PlanCard title="Pro" price={`${prices.pro} USDT / month`} icon={<Zap />} featured features={["More daily AI messages", "Priority AI access", "25 created Personas", "Advanced Persona memory", "Premium Personas and voice", "Full weekly challenges", "Advanced creator statistics", "Better XP rewards", "Premium profile customization", "Early feature access"]}>
          {paidCta("pro")}
        </PlanCard>
        <PlanCard title="Ultra" price={prices.ultra > 0 ? `${prices.ultra} USDT / month` : "Price coming soon"} icon={<Crown />} features={["200 AI messages per day", "100 created Personas", "Priority AI access", "Premium Personas and voice", "Advanced memory and statistics", "Full weekly challenges"]}>
          {paidCta("ultra")}
          {prices.ultra <= 0 && <p className="mt-3 text-center text-xs text-slate-500">Ultra checkout will open once its price is configured.</p>}
        </PlanCard>
      </div>
      {checkoutError && <p role="alert" className="mx-auto mt-5 max-w-xl rounded-2xl border border-rose-300/25 bg-rose-400/10 px-4 py-3 text-center text-sm text-rose-100">{checkoutError}</p>}
    </main>
  );
}

function PlanCard({ title, price, icon, features, children, featured = false }: { title: string; price: string; icon: ReactNode; features: string[]; children: ReactNode; featured?: boolean }) {
  return <article className={`relative rounded-[30px] border p-6 sm:p-7 ${featured ? "border-cyan-300/50 bg-gradient-to-b from-cyan-400/12 to-slate-950/80 shadow-[0_20px_70px_rgba(34,211,238,.14)]" : "border-white/10 bg-slate-950/65"}`}>{featured && <span className="absolute right-5 top-5 rounded-full bg-cyan-400 px-3 py-1 text-[9px] font-bold uppercase tracking-[.14em] text-slate-950 sm:right-6 sm:top-6 sm:text-[10px]">Most popular</span>}<div className="flex items-center gap-3 pr-24"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/5 text-cyan-300">{icon}</span><div className="min-w-0"><p className="text-xs uppercase tracking-[.2em] text-slate-400">{title}</p><h2 className="mt-1 text-2xl font-black sm:text-3xl">{price}</h2></div></div><ul className="mt-7 space-y-3">{features.map((feature) => <li key={feature} className="flex items-start gap-3 text-sm text-slate-300"><Check size={15} className="mt-0.5 shrink-0 text-cyan-300" />{feature}</li>)}</ul>{children}</article>;
}
