"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import { ArrowRight, CheckCircle2, CreditCard, Info, KeyRound, Link2, LockKeyhole, LogOut, Mail, Palette, ShieldCheck, UserRound } from "lucide-react";
import { ThemeSelector } from "@/components/theme-switcher";
import { getCurrentUser, logoutUser, subscribeToAuth } from "@/lib/auth";

export default function SettingsPage() {
  const user = useSyncExternalStore(subscribeToAuth, getCurrentUser, () => null);
  const [account, setAccount] = useState<{ email: string; providers: string[] } | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  useEffect(() => { void fetch("/api/auth/account", { cache: "no-store", credentials: "same-origin" }).then((response) => response.ok ? response.json() : null).then(setAccount); }, []);

  async function changePassword(event: React.FormEvent) {
    event.preventDefault();
    if (password !== confirmPassword) { setMessage("Passwords do not match."); return; }
    setBusy(true); setMessage("");
    const response = await fetch("/api/auth/password", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin", body: JSON.stringify({ password }) });
    const data = await response.json() as { error?: string };
    setMessage(response.ok ? "Password updated securely." : data.error ?? "Could not update your password.");
    if (response.ok) { setPassword(""); setConfirmPassword(""); }
    setBusy(false);
  }

  async function logOut() {
    await logoutUser();
    router.push("/");
    router.refresh();
  }

  return (
    <main className="mx-auto max-w-6xl px-0 pb-10 pt-2 text-white sm:px-3 sm:py-10 lg:px-6">
      <div className="theme-profile-card rounded-[28px] border border-white/10 bg-slate-950/70 p-4 sm:rounded-[34px] sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-300">Settings</p>
        <h1 className="mt-3 text-4xl font-black tracking-[-0.065em] sm:text-5xl">One place for your account.</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">Identity, privacy, appearance, billing, and SoulX information.</p>

        <div className="mt-8 grid gap-5 lg:grid-cols-2">
          <section id="account" className="rounded-[24px] border border-white/10 bg-white/3 p-5 sm:p-6">
            <div className="flex items-center gap-3"><span className="rounded-xl bg-cyan-400/10 p-2.5 text-cyan-300"><UserRound className="h-5 w-5" /></span><div><h2 className="text-lg font-bold">Account information</h2><p className="text-xs text-slate-500">Your authenticated SoulX identity</p></div></div>
            {account ? <div className="mt-5"><p className="text-xs font-semibold uppercase tracking-[.14em] text-slate-500">Email</p><p className="mt-2 break-all text-sm text-slate-200">{account.email}</p><Link href="/profile" className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-full border border-white/10 px-4 text-sm font-semibold text-cyan-200">Open profile <ArrowRight className="h-4 w-4" /></Link></div> : <div className="mt-5"><p className="text-sm text-slate-400">Log in to view and manage account information.</p><Link href="/login" className="mt-4 inline-flex rounded-full bg-cyan-300 px-5 py-2.5 text-sm font-bold text-slate-950">Log in</Link></div>}
          </section>

          <section id="providers" className="rounded-[24px] border border-white/10 bg-white/3 p-5 sm:p-6">
            <div className="flex items-center gap-3"><span className="rounded-xl bg-blue-400/10 p-2.5 text-blue-300"><Link2 className="h-5 w-5" /></span><div><h2 className="text-lg font-bold">Linked login providers</h2><p className="text-xs text-slate-500">Verified by your authentication account</p></div></div>
            {account?.providers.length ? <div className="mt-5 space-y-2">{account.providers.map((provider) => <div key={provider} className="flex items-center justify-between rounded-xl border border-white/8 bg-slate-950/55 px-4 py-3 text-sm"><span className="capitalize text-slate-200">{provider === "email" ? "Email and password" : provider}</span><CheckCircle2 className="h-4 w-4 text-emerald-300" /></div>)}</div> : <p className="mt-5 text-sm text-slate-400">No linked providers are available for this session.</p>}
          </section>
        </div>

        <section id="privacy" className="mt-5 rounded-[24px] border border-white/10 bg-white/3 p-5 sm:p-6">
          <div className="flex items-center gap-3"><span className="rounded-xl bg-violet-400/10 p-2.5 text-violet-300"><ShieldCheck className="h-5 w-5" /></span><div><h2 className="text-lg font-bold">Privacy and Security</h2><p className="text-xs text-slate-500">Profile visibility and account protection</p></div></div>
          <div className="mt-5 grid gap-5 lg:grid-cols-[.7fr_1.3fr]">
            <div><p className="text-sm leading-6 text-slate-300">Public identity fields and profile visibility are managed from your profile. Private profiles remain visible only to their owner.</p><Link href="/profile" className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-full border border-white/10 px-4 text-sm font-semibold text-cyan-200"><UserRound className="h-4 w-4" />Edit profile privacy</Link></div>
            <form onSubmit={changePassword} className="grid gap-3 rounded-[20px] border border-white/8 bg-slate-950/35 p-4 sm:grid-cols-2"><div className="flex items-center gap-2 sm:col-span-2"><KeyRound className="h-4 w-4 text-amber-300" /><h3 className="text-sm font-bold">Change password</h3></div><label className="text-xs font-semibold text-slate-400">New password<input type="password" minLength={8} maxLength={128} required value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none focus:border-cyan-300/40" /></label><label className="text-xs font-semibold text-slate-400">Confirm password<input type="password" minLength={8} maxLength={128} required value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none focus:border-cyan-300/40" /></label><button disabled={busy} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 px-5 text-sm font-bold text-white disabled:opacity-60 sm:col-span-2 sm:justify-self-start"><LockKeyhole className="h-4 w-4" />{busy ? "Updating…" : "Update password"}</button>{message && <p role="status" className="text-sm text-cyan-200 sm:col-span-2">{message}</p>}</form>
          </div>
        </section>

        <section id="appearance" className="theme-settings-panel mt-5 scroll-mt-24 rounded-[24px] border border-white/10 bg-white/3 p-5 sm:p-6"><div className="flex items-center gap-3"><span className="rounded-xl bg-pink-400/10 p-2.5 text-pink-300"><Palette className="h-5 w-5" /></span><div><h2 className="text-lg font-bold">Appearance and Themes</h2><p className="text-xs text-slate-500">Cosmic, Editorial, or Neon</p></div></div><div className="mt-5"><ThemeSelector /></div></section>

        <section id="billing" className="mt-5 rounded-[24px] border border-white/10 bg-white/3 p-5 sm:p-6"><div className="flex items-center gap-3"><span className="rounded-xl bg-emerald-400/10 p-2.5 text-emerald-300"><CreditCard className="h-5 w-5" /></span><div><h2 className="text-lg font-bold">Subscription and Billing</h2><p className="text-xs text-slate-500">Current plan: {(user?.plan ?? "guest").toUpperCase()}</p></div></div><Link href="/pricing" className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-full border border-white/10 px-4 text-sm font-semibold text-cyan-200">View plans and billing options <ArrowRight className="h-4 w-4" /></Link></section>

        <section id="about" className="mt-5 rounded-[24px] border border-white/10 bg-white/3 p-5 sm:p-6">
          <h2 className="text-lg font-bold">SoulX information</h2>
          <div className="mt-4 divide-y divide-white/8 overflow-hidden rounded-[18px] border border-white/8">
            <Link href="/about" className="flex min-h-14 items-center gap-3 px-4 transition hover:bg-white/4"><Info className="h-4 w-4 text-cyan-300" /><span className="flex-1 text-sm font-medium">About SoulX</span><ArrowRight className="h-4 w-4 text-slate-600" /></Link>
            <Link href="/about#contact" className="flex min-h-14 items-center gap-3 px-4 transition hover:bg-white/4"><Mail className="h-4 w-4 text-cyan-300" /><span className="flex-1 text-sm font-medium">Contact Us</span><ArrowRight className="h-4 w-4 text-slate-600" /></Link>
            <div className="flex min-h-14 items-center gap-3 px-4 text-slate-500"><ShieldCheck className="h-4 w-4" /><span className="flex-1 text-sm">Privacy Policy</span><span className="text-[10px] uppercase tracking-[.12em]">Not published</span></div>
            <div className="flex min-h-14 items-center gap-3 px-4 text-slate-500"><Info className="h-4 w-4" /><span className="flex-1 text-sm">Terms of Service</span><span className="text-[10px] uppercase tracking-[.12em]">Not published</span></div>
          </div>
        </section>

        {user && <button type="button" onClick={logOut} className="mt-5 flex min-h-14 w-full items-center gap-3 rounded-[18px] border border-rose-300/12 bg-rose-400/[0.035] px-4 text-left text-sm font-semibold text-rose-200 transition hover:bg-rose-400/[0.07]"><LogOut className="h-4 w-4" />Log Out</button>}
      </div>
    </main>
  );
}
