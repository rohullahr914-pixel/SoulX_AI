"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Check, Sparkles, Zap } from "lucide-react";

const proPurchaseWhatsAppUrl = "https://wa.me/93707763729?text=" + encodeURIComponent("سلام، می‌خواهم نسخه پرو SoulX را خریداری کنم.");

export default function PricingPage() {
  const [proPrice, setProPrice] = useState(5);
  // Price is public configuration supplied by the server-side settings table.
  useEffect(() => { void fetch("/api/plans", { cache: "no-store" }).then((response) => response.json()).then((body: { pro?: number }) => { if (typeof body.pro === "number") setProPrice(body.pro); }).catch(() => undefined); }, []);
  return <main className="social-page"><header className="social-hero"><div><p className="social-eyebrow"><span />SOULX plans</p><h1>More room for better thinking.</h1><p className="social-description">Start free, then unlock more conversations, richer Personas, and priority access when your ideas outgrow the basics.</p></div><Sparkles className="hidden text-cyan-300 sm:block" size={100} strokeWidth={1} /></header><div className="mt-8 grid gap-5 md:grid-cols-2"><PlanCard title="Free" price="Free" icon={<Sparkles />} features={["Basic Persona chats", "5 AI messages per day", "3 created Personas", "Basic challenges", "Standard AI experience"]} href="/signup" action="Start free" /><PlanCard title="Pro" price={`$${proPrice} / month`} icon={<Zap />} featured features={["More daily AI messages", "Priority AI access", "25 created Personas", "Advanced Persona memory", "Premium Personas and voice", "Full weekly challenges", "Advanced creator statistics", "Better XP rewards", "Premium profile customization", "Early feature access"]} href={proPurchaseWhatsAppUrl} action="Buy Pro on WhatsApp" /></div><p className="mt-6 text-center text-xs text-slate-500">Pro pricing is controlled in the protected admin settings and is ready for Stripe or PayPal webhooks.</p></main>;
}

function PlanCard({ title, price, icon, features, href, action, featured = false }: { title: string; price: string; icon: ReactNode; features: string[]; href: string; action: string; featured?: boolean }) {
  return <article className={`relative rounded-[30px] border p-7 ${featured ? "border-cyan-300/50 bg-gradient-to-b from-cyan-400/12 to-slate-950/80 shadow-[0_20px_70px_rgba(34,211,238,.14)]" : "border-white/10 bg-slate-950/65"}`}>{featured && <span className="absolute right-6 top-6 rounded-full bg-cyan-400 px-3 py-1 text-[10px] font-bold uppercase tracking-[.16em] text-slate-950">Most popular</span>}<div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/5 text-cyan-300">{icon}</span><div><p className="text-xs uppercase tracking-[.2em] text-slate-400">{title}</p><h2 className="mt-1 text-3xl font-black">{price}</h2></div></div><ul className="mt-7 space-y-3">{features.map((feature) => <li key={feature} className="flex items-center gap-3 text-sm text-slate-300"><Check size={15} className="text-cyan-300" />{feature}</li>)}</ul><Link href={href} className={`mt-8 w-full ${featured ? "social-button primary" : "social-button"}`}>{action} →</Link></article>;
}
