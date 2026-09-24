"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, AtSign, Eye, EyeOff, Heart, LockKeyhole, MessagesSquare, ShieldCheck, Sparkles } from "lucide-react";
import { loginUser } from "@/lib/auth";
import { BackButton } from "@/components/back-button";
import { RobotMotion } from "@/components/robot-motion";

const benefits = [
  { icon: Heart, title: "Build your collection", text: "Keep several favorite minds together on your profile." },
  { icon: MessagesSquare, title: "Save meaningful answers", text: "Like standout messages and return to them whenever you want." },
  { icon: Sparkles, title: "Continue your conversations", text: "Your personal space keeps the experience focused and familiar." },
];

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [resetStatus, setResetStatus] = useState("");
  const sendReset = async () => { if (!form.email.trim()) { setResetStatus("Enter your email address first."); return; } const response = await fetch("/api/auth/forgot-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: form.email.trim() }) }); setResetStatus(response.ok ? "If an account exists, a reset link is on its way." : "Please try again."); };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (!form.email.trim() || !form.password) {
      setError("Enter your email and password to continue.");
      return;
    }

    setIsSubmitting(true);
    const result = await loginUser({ email: form.email.trim(), password: form.password });

    if (!result.ok) {
      setError(result.error);
      setIsSubmitting(false);
      return;
    }

    router.push("/profile");
    router.refresh();
  };

  return (
    <main className="relative flex min-h-screen items-center overflow-hidden px-4 py-8 text-white sm:px-6 lg:px-8">
      <div aria-hidden="true" className="pointer-events-none absolute left-[-12rem] top-[-10rem] h-[30rem] w-[30rem] rounded-full bg-cyan-500/10 blur-[110px]" />
      <div aria-hidden="true" className="pointer-events-none absolute bottom-[-12rem] right-[-8rem] h-[32rem] w-[32rem] rounded-full bg-blue-600/10 blur-[120px]" />

      <section className="relative mx-auto grid w-full max-w-6xl overflow-hidden rounded-[32px] border border-white/10 bg-slate-950/75 shadow-[0_30px_100px_rgba(0,0,0,0.45)] backdrop-blur-2xl lg:grid-cols-[1.08fr_0.92fr]">
        <div className="relative hidden min-h-[680px] overflow-hidden border-r border-white/10 bg-gradient-to-br from-cyan-500/12 via-blue-500/5 to-transparent p-10 lg:flex lg:flex-col lg:justify-between">
          <div aria-hidden="true" className="absolute -right-24 top-20 h-72 w-72 rounded-full border border-cyan-300/10" />
          <div aria-hidden="true" className="absolute -right-12 top-32 h-48 w-48 rounded-full border border-cyan-300/10" />
          <div className="relative">
            <Link href="/" className="inline-flex items-center gap-3" aria-label="SoulX home">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-300/25 bg-cyan-400/10 shadow-[0_0_26px_rgba(34,211,238,0.14)]"><RobotMotion /></span>
              <span><span className="block text-[10px] uppercase tracking-[0.26em] text-cyan-300">SoulX</span><span className="mt-1 block text-sm text-slate-300">A thousand minds. One place.</span></span>
            </Link>
            <p className="mt-16 text-xs font-semibold uppercase tracking-[0.28em] text-cyan-300">Your personal thinking space</p>
            <h1 className="mt-4 max-w-md text-5xl font-black leading-[0.98] tracking-[-0.07em]">Return to the ideas worth keeping.</h1>
            <p className="mt-5 max-w-md text-base leading-7 text-slate-300">Sign in to curate favorite personas, keep remarkable responses, and shape a profile around the perspectives that inspire you.</p>
          </div>

          <div className="relative space-y-3">
            {benefits.map(({ icon: Icon, title, text }) => (
              <div key={title} className="flex gap-4 rounded-2xl border border-white/8 bg-white/[0.035] p-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-400/10 text-cyan-300"><Icon className="h-4 w-4" /></span>
                <span><strong className="block text-sm text-white">{title}</strong><span className="mt-1 block text-xs leading-5 text-slate-400">{text}</span></span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex min-h-[620px] flex-col justify-center p-6 sm:p-10 lg:p-12">
          <div className="mb-10 flex items-center justify-between">
            <BackButton href="/" label="Back home" />
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-slate-400"><ShieldCheck className="h-4 w-4 text-cyan-300" /> Private space</div>
          </div>

          <div className="lg:hidden">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-300/25 bg-cyan-400/10"><RobotMotion /></div>
          </div>
          <p className="mt-6 text-xs font-semibold uppercase tracking-[0.25em] text-cyan-300 lg:mt-0">Welcome back</p>
          <h2 className="mt-3 text-4xl font-black tracking-[-0.06em] sm:text-5xl">Log in to your profile</h2>
          <p className="mt-3 text-sm leading-6 text-slate-400">Your saved minds and favorite answers are waiting.</p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5" noValidate>
            <div>
              <label htmlFor="login-email" className="mb-2 block text-sm font-medium text-slate-200">Email address</label>
              <div className="group flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.035] px-4 transition focus-within:border-cyan-400/55 focus-within:bg-cyan-400/[0.035] focus-within:shadow-[0_0_0_4px_rgba(34,211,238,0.06)]">
                <AtSign className="h-4 w-4 text-slate-500 transition group-focus-within:text-cyan-300" />
                <input id="login-email" type="email" inputMode="email" autoComplete="email" required value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} className="h-14 w-full bg-transparent text-sm text-white placeholder:text-slate-600 focus:outline-none" placeholder="you@example.com" />
              </div>
            </div>

            <button type="button" onClick={() => void sendReset()} className="text-left text-xs text-cyan-300 hover:text-cyan-200">Forgot password?</button>
            {resetStatus && <p role="status" className="text-xs text-slate-400">{resetStatus}</p>}

            <div>
              <label htmlFor="login-password" className="mb-2 block text-sm font-medium text-slate-200">Password</label>
              <div className="group flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.035] px-4 transition focus-within:border-cyan-400/55 focus-within:bg-cyan-400/[0.035] focus-within:shadow-[0_0_0_4px_rgba(34,211,238,0.06)]">
                <LockKeyhole className="h-4 w-4 text-slate-500 transition group-focus-within:text-cyan-300" />
                <input id="login-password" type={showPassword ? "text" : "password"} autoComplete="current-password" required value={form.password} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} className="h-14 min-w-0 flex-1 bg-transparent text-sm text-white placeholder:text-slate-600 focus:outline-none" placeholder="Enter your password" />
                <button type="button" onClick={() => setShowPassword((current) => !current)} className="rounded-lg p-2 text-slate-500 transition hover:bg-white/5 hover:text-white" aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
              </div>
            </div>

            {error && <div role="alert" aria-live="polite" className="rounded-2xl border border-red-400/25 bg-red-500/10 px-4 py-3 text-sm text-red-100">{error}</div>}

            <button type="submit" disabled={isSubmitting} className="group inline-flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-400 to-blue-600 px-5 text-sm font-bold text-slate-950 shadow-[0_16px_40px_rgba(6,182,212,0.18)] transition hover:-translate-y-0.5 hover:shadow-[0_20px_48px_rgba(6,182,212,0.28)] disabled:cursor-not-allowed disabled:opacity-60">
              {isSubmitting ? "Logging in…" : "Log in"}<ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </button>
          </form>

          <div className="mt-8 border-t border-white/10 pt-6 text-center">
            <p className="text-sm text-slate-400">New to SoulX? <Link href="/signup" className="font-semibold text-cyan-300 transition hover:text-cyan-200">Create your account</Link></p>
            <p className="mt-4 text-[11px] leading-5 text-slate-600">Protected with an encrypted password and a secure server session.</p>
          </div>
        </div>
      </section>
    </main>
  );
}
