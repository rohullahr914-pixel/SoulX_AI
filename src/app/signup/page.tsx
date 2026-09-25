"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { signupUser } from "@/lib/auth";
import { BackButton } from "@/components/back-button";
import { RobotMotion } from "@/components/robot-motion";

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");

    const result = await signupUser(form);

    if (!result.ok) {
      setError(result.error);
      setIsSubmitting(false);
      return;
    }

    router.push("/profile");
    router.refresh();
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl items-center justify-center px-4 py-12 text-white sm:px-6 lg:px-8">
      <div className="w-full max-w-xl rounded-[32px] border border-white/10 bg-slate-950/70 p-6 shadow-[0_0_40px_rgba(34,211,238,0.08)] sm:p-8">
        <BackButton href="/" label="Back" />
        <div className="mt-6 flex items-center gap-3">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-cyan-400/25 bg-cyan-500/10 shadow-[0_0_22px_rgba(34,211,238,0.16)]">
            <RobotMotion />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.24em] text-cyan-300">SoulX</p>
            <p className="mt-1 text-sm text-slate-400">Build your own space for better thinking.</p>
          </div>
        </div>
        <p className="text-sm uppercase tracking-[0.25em] text-cyan-300">Create account</p>
        <h1 className="mt-3 text-4xl font-black tracking-[-0.07em] text-white">Join SoulX</h1>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <div className="rounded-2xl border border-white/10 bg-white/3 p-3">
            <label htmlFor="signup-name" className="text-xs uppercase tracking-[0.2em] text-slate-400">Full name</label>
            <input
              id="signup-name"
              autoComplete="name"
              required
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              className="mt-2 w-full bg-transparent text-sm text-white placeholder:text-slate-500 focus:outline-none"
              placeholder="Your full name"
            />
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/3 p-3">
            <label htmlFor="signup-email" className="text-xs uppercase tracking-[0.2em] text-slate-400">Email</label>
            <input
              id="signup-email"
              type="email"
              autoComplete="email"
              required
              value={form.email}
              onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
              className="mt-2 w-full bg-transparent text-sm text-white placeholder:text-slate-500 focus:outline-none"
              placeholder="you@example.com"
            />
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/3 p-3">
            <label htmlFor="signup-password" className="text-xs uppercase tracking-[0.2em] text-slate-400">Password</label>
            <input
              id="signup-password"
              type="password"
              autoComplete="new-password"
              minLength={6}
              required
              value={form.password}
              onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
              className="mt-2 w-full bg-transparent text-sm text-white placeholder:text-slate-500 focus:outline-none"
              placeholder="Create a password"
            />
          </div>

          {error && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex w-full items-center justify-center rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Creating account..." : "Create account"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-300">
          Already have an account? <Link href="/login" className="font-semibold text-cyan-300">Log in</Link>
        </p>
      </div>
    </main>
  );
}
