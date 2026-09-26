"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import type { ReactNode } from "react";
import { Check, LoaderCircle, ShieldCheck, Sparkles, Zap } from "lucide-react";
import { getCurrentUser, subscribeToAuth } from "@/lib/auth";

export default function PricingPage() {
  const [proPrice, setProPrice] = useState(5);
  const [currency, setCurrency] = useState("USD");
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  const user = useSyncExternalStore(subscribeToAuth, getCurrentUser, () => null);
  const router = useRouter();

  useEffect(() => {
    void fetch("/api/plans", { cache: "no-store" })
      .then((response) => response.json())
      .then((body: { pro?: number; currency?: string }) => {
        if (typeof body.pro === "number") setProPrice(body.pro);
        if (typeof body.currency === "string" && /^[A-Z]{3}$/.test(body.currency)) setCurrency(body.currency);
      })
      .catch(() => undefined);
  }, []);

  const startCheckout = async () => {
    setCheckoutError("");
    if (!user) { router.push("/login?next=/pricing"); return; }
    setCheckoutBusy(true);
    try {
      const response = await fetch("/api/payments/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ plan: "pro" }),
      });
      const data = (await response.json().catch(() => ({}))) as { checkoutUrl?: string; error?: string };
      if (response.status === 401) { router.push("/login?next=/pricing"); return; }
      if (!response.ok || !data.checkoutUrl) throw new Error(data.error || "Could not start checkout.");
      window.location.assign(data.checkoutUrl);
    } catch (error) {
      setCheckoutError(error instanceof Error ? error.message : "Could not start checkout.");
      setCheckoutBusy(false);
    }
  };

  const formattedPrice = new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: proPrice % 1 ? 2 : 0 }).format(proPrice);
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

      <div className="mt-8 grid gap-5 md:grid-cols-2">
        <PlanCard title="Free" price="Free" icon={<Sparkles />} features={["Basic Persona chats", "5 AI messages per day", "3 created Personas", "Basic challenges", "Standard AI experience"]}>
          <Link href={user ? "/profile" : "/signup"} className="social-button mt-8 min-h-12 w-full">{user ? "Open profile" : "Start free"} →</Link>
        </PlanCard>
        <PlanCard title="Pro" price={`${formattedPrice} / month`} icon={<Zap />} featured features={["More daily AI messages", "Priority AI access", "25 created Personas", "Advanced Persona memory", "Premium Personas and voice", "Full weekly challenges", "Advanced creator statistics", "Better XP rewards", "Premium profile customization", "Early feature access"]}>
          <button type="button" onClick={() => void startCheckout()} disabled={checkoutBusy || (user?.plan === "pro" && user.planStatus === "active")} className="social-button primary mt-8 min-h-12 w-full disabled:cursor-not-allowed disabled:opacity-60">
            {checkoutBusy ? <><LoaderCircle className="h-4 w-4 animate-spin" />Opening secure checkout…</> : user?.plan === "pro" && user.planStatus === "active" ? "Pro is active" : "Continue with HesabPay →"}
          </button>
        </PlanCard>
      </div>
      {checkoutError && <p role="alert" className="mx-auto mt-5 max-w-xl rounded-2xl border border-rose-300/25 bg-rose-400/10 px-4 py-3 text-center text-sm text-rose-100">{checkoutError}</p>}
      <p className="mt-6 text-center text-xs leading-5 text-slate-500">Checkout is hosted securely by HesabPay. Your plan changes only after SoulX receives and verifies HesabPay’s signed confirmation.</p>
    </main>
  );
}

function PlanCard({ title, price, icon, features, children, featured = false }: { title: string; price: string; icon: ReactNode; features: string[]; children: ReactNode; featured?: boolean }) {
  return <article className={`relative rounded-[30px] border p-6 sm:p-7 ${featured ? "border-cyan-300/50 bg-gradient-to-b from-cyan-400/12 to-slate-950/80 shadow-[0_20px_70px_rgba(34,211,238,.14)]" : "border-white/10 bg-slate-950/65"}`}>{featured && <span className="absolute right-5 top-5 rounded-full bg-cyan-400 px-3 py-1 text-[9px] font-bold uppercase tracking-[.14em] text-slate-950 sm:right-6 sm:top-6 sm:text-[10px]">Most popular</span>}<div className="flex items-center gap-3 pr-24"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/5 text-cyan-300">{icon}</span><div className="min-w-0"><p className="text-xs uppercase tracking-[.2em] text-slate-400">{title}</p><h2 className="mt-1 text-2xl font-black sm:text-3xl">{price}</h2></div></div><ul className="mt-7 space-y-3">{features.map((feature) => <li key={feature} className="flex items-start gap-3 text-sm text-slate-300"><Check size={15} className="mt-0.5 shrink-0 text-cyan-300" />{feature}</li>)}</ul>{children}</article>;
}
