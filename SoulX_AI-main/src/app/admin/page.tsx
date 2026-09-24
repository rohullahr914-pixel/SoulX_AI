"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  BarChart3,
  CreditCard,
  Gauge,
  MessageSquare,
  RefreshCw,
  Search,
  ShieldCheck,
  Trophy,
  Users,
  Wallet,
} from "lucide-react";
import { AdminShell } from "@/components/admin/admin-shell";

type User = {
  id: string;
  email: string;
  full_name: string;
  role: string;
  plan: string;
  plan_status: string;
  account_status: string;
  plan_expires_at?: string | null;
  daily_message_limit: number;
  monthly_message_limit: number;
};

type Payload = {
  stats: Record<string, string>;
  users: User[];
  logs: Array<{ created_at: string; action: string; target_user_id: string }>;
  detail?: {
    conversations: Array<Record<string, unknown>>;
    usage: Array<Record<string, unknown>>;
    payments: Array<Record<string, unknown>>;
  };
};

const planDurations: Array<[string, number | "lifetime"]> = [
  ["1 month", 1],
  ["3 months", 3],
  ["6 months", 6],
  ["12 months", 12],
  ["Lifetime", "lifetime"],
];

export default function AdminPage() {
  const [data, setData] = useState<Payload | null>(null);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<User | null>(null);

  const load = async () => {
    setBusy(true);
    try {
      const response = await fetch(`/api/admin?search=${encodeURIComponent(search)}`, { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error);
      setData(body);
      setError("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Admin data unavailable.");
    } finally {
      setBusy(false);
    }
  };

  // The overview is intentionally loaded once after mount; subsequent reloads are explicit.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, []);

  const openUser = async (user: User) => {
    setSelected(user);
    const response = await fetch(`/api/admin?userId=${encodeURIComponent(user.id)}`, { cache: "no-store" });
    const detail = await response.json();
    setData((current) => current ? { ...current, detail: detail.detail } : current);
  };

  const action = async (body: Record<string, unknown>) => {
    if (!window.confirm("Confirm this admin action?")) return;
    setBusy(true);
    try {
      const response = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      await load();
      setSelected(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Admin action failed.");
    } finally {
      setBusy(false);
    }
  };

  if (error && !data) {
    return (
      <main className="mx-auto max-w-xl px-5 py-24 text-center text-white">
        <ShieldCheck className="mx-auto text-rose-300" size={44} />
        <h1 className="mt-5 text-3xl font-black">Admin access unavailable</h1>
        <p className="mt-3 text-slate-400">{error}</p>
        <Link href="/admin/login" className="social-button primary mt-6">Open admin login</Link>
      </main>
    );
  }
  if (!data) return <main className="p-20 text-center text-slate-400">Loading admin controls...</main>;

  const cards: Array<[string, string, typeof Users]> = [
    ["Total users", data.stats.total, Users],
    ["Active users", data.stats.active_users, Users],
    ["Free users", data.stats.free, Users],
    ["Pro users", data.stats.pro, ShieldCheck],
    ["New users today", data.stats.new_today, Users],
    ["New users this month", data.stats.new_month, Users],
    ["Active subscriptions", data.stats.active, ShieldCheck],
    ["Expired subscriptions", data.stats.expired, ShieldCheck],
    ["Messages today", data.stats.messages_today, MessageSquare],
    ["Total Personas", data.stats.total_personas, CreditCard],
    ["Total chats", data.stats.total_chats, MessageSquare],
    ["Total likes", data.stats.total_likes, MessageSquare],
    ["Challenge participants", data.stats.challenge_participants, Trophy],
    ["Estimated revenue", `$${data.stats.revenue}`, Wallet],
    ["Pro conversion", `${data.stats.conversion}%`, Gauge],
  ];

  return (
    <AdminShell title="Overview">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-400">Plans, usage, subscriptions and support data from Supabase.</p>
        <div className="flex gap-2">
          <Link href="/pricing" className="social-button"><CreditCard size={14} />Pricing</Link>
          <button className="social-button" onClick={() => void load()} disabled={busy}><RefreshCw size={14} className={busy ? "animate-spin" : ""} />Refresh</button>
        </div>
      </div>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map(([label, value, Icon]) => (
          <div key={label} className="social-card">
            <Icon size={18} className="text-cyan-300" />
            <p className="mt-5 text-xs text-slate-400">{label}</p>
            <strong className="mt-1 block text-3xl">{value || "0"}</strong>
          </div>
        ))}
      </div>

      <section className="social-card mt-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="text-xl font-bold">Users</h2><p className="mt-1 text-xs text-slate-500">Search by email or Supabase user ID.</p></div>
          <form className="flex gap-2" onSubmit={(event) => { event.preventDefault(); void load(); }}>
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="email or UUID" className="social-input w-64" />
            <button className="social-button primary"><Search size={14} />Search</button>
          </form>
        </div>
        <div className="social-table-wrap mt-5">
          <table className="social-table"><thead><tr><th>User</th><th>Plan</th><th>Status</th><th>Expires</th><th>Limits</th><th /></tr></thead>
            <tbody>{data.users.map((user) => <tr key={user.id}>
              <td><p className="font-semibold">{user.full_name || "Unnamed"}</p><p className="text-xs text-slate-500">{user.email}<br />{user.id}</p></td>
              <td className="uppercase text-cyan-200">{user.plan}</td><td>{user.account_status}</td>
              <td>{user.plan_expires_at ? new Date(user.plan_expires_at).toLocaleDateString() : "Never"}</td>
              <td>{user.daily_message_limit}/day · {user.monthly_message_limit}/month</td>
              <td><button className="social-button small" onClick={() => void openUser(user)}>Manage</button></td>
            </tr>)}</tbody>
          </table>
        </div>
        {!data.users.length && <div className="social-empty">No users match this search.</div>}
      </section>

      <section className="social-card mt-7">
        <div className="flex items-center gap-2"><BarChart3 size={17} className="text-cyan-300" /><h2 className="text-xl font-bold">Admin action log</h2></div>
        <div className="mt-4 space-y-2">{data.logs.map((log, index) => <div key={`${log.created_at}-${index}`} className="flex flex-wrap justify-between gap-3 border-b border-white/8 py-3 text-xs"><span className="text-cyan-200">{log.action}</span><span className="text-slate-500">{log.target_user_id || "system"}</span><time className="text-slate-500">{new Date(log.created_at).toLocaleString()}</time></div>)}</div>
      </section>

      {selected && <div className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-black/70 p-4" role="dialog" aria-modal="true">
        <section className="w-full max-w-2xl rounded-3xl border border-cyan-300/20 bg-slate-950 p-6">
          <div className="flex items-center justify-between"><div><p className="text-xs uppercase tracking-[.2em] text-cyan-300">Manage user</p><h2 className="mt-2 text-2xl font-bold">{selected.email}</h2></div><button className="text-slate-400" onClick={() => setSelected(null)}>Close</button></div>
          <p className="mt-2 text-xs text-slate-500">{selected.id}</p>
          <div className="mt-6"><p className="mb-2 text-xs uppercase tracking-[.16em] text-slate-500">Activate Pro</p><div className="grid grid-cols-2 gap-2 sm:grid-cols-5">{planDurations.map(([label, months]) => <button key={label} disabled={busy} className="social-button" onClick={() => void action({ action: "upgrade-pro", userId: selected.id, plan: "pro", months })}>{label}</button>)}</div><button disabled={busy} className="social-button mt-2 w-full" onClick={() => void action({ action: "set-plan", userId: selected.id, plan: "ultra", months: "lifetime" })}>Enable optional Ultra</button></div>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4"><button className="social-button" onClick={() => void action({ action: "downgrade-free", userId: selected.id })}>Downgrade Free</button><button className="social-button" onClick={() => void action({ action: "cancel-pro", userId: selected.id })}>Cancel Pro</button><button className="social-button" onClick={() => void action({ action: "reset-usage", userId: selected.id })}>Reset usage</button><button className="social-button" onClick={() => void action({ action: selected.account_status === "suspended" ? "unsuspend" : "suspend", userId: selected.id })}>{selected.account_status === "suspended" ? "Reactivate" : "Suspend"}</button></div><div className="mt-3 grid grid-cols-2 gap-2"><button className="social-button" onClick={() => { const amount = Number(window.prompt("XP to give", "100")); if (Number.isInteger(amount) && amount > 0) void action({ action: "give-xp", userId: selected.id, amount }); }}>Give XP</button><button className="social-button" onClick={() => { const amount = Number(window.prompt("XP to remove", "100")); if (Number.isInteger(amount) && amount > 0) void action({ action: "remove-xp", userId: selected.id, amount }); }}>Remove XP</button><button className="social-button" onClick={() => { const badgeId = window.prompt("Badge ID (for example top-10)"); if (badgeId) void action({ action: "give-badge", userId: selected.id, badgeId }); }}>Give badge</button><button className="social-button" onClick={() => { const badgeId = window.prompt("Badge ID to remove"); if (badgeId) void action({ action: "remove-badge", userId: selected.id, badgeId }); }}>Remove badge</button></div><button className="mt-3 w-full rounded-full border border-rose-300/30 px-4 py-2 text-xs font-semibold text-rose-200" onClick={() => void action({ action: "delete-user", userId: selected.id })}>Delete account</button>
          <button className="social-button mt-3 w-full" onClick={() => { const daily = Number(window.prompt("Daily message limit", String(selected.daily_message_limit))); const monthly = Number(window.prompt("Monthly message limit", String(selected.monthly_message_limit))); if (Number.isInteger(daily) && Number.isInteger(monthly) && daily >= 0 && monthly >= 0) void action({ action: "limits", userId: selected.id, daily, monthly }); }}>Change message limits</button><div className="mt-6 grid grid-cols-3 gap-3 text-xs"><div><p className="text-slate-500">Conversations</p><strong>{data.detail?.conversations.length ?? "-"}</strong></div><div><p className="text-slate-500">Usage days</p><strong>{data.detail?.usage.length ?? "-"}</strong></div><div><p className="text-slate-500">Payments</p><strong>{data.detail?.payments.length ?? "-"}</strong></div></div>{data.detail && <div className="mt-6 grid gap-3 text-xs sm:grid-cols-3"><div className="rounded-2xl border border-white/8 p-3"><p className="mb-2 text-slate-500">Recent conversations</p>{data.detail.conversations.slice(0, 5).map((item) => <p key={String(item.id)} className="truncate text-slate-300">{String(item.title ?? "Untitled")} · {String(item.updated_at ?? "")}</p>)}</div><div className="rounded-2xl border border-white/8 p-3"><p className="mb-2 text-slate-500">Usage metadata</p>{data.detail.usage.slice(0, 5).map((item, index) => <p key={`${String(item.date)}-${index}`} className="text-slate-300">{String(item.date)} · {String(item.messages_used)} messages · {String(item.tokens_used)} tokens</p>)}</div><div className="rounded-2xl border border-white/8 p-3"><p className="mb-2 text-slate-500">Payments</p>{data.detail.payments.slice(0, 5).map((item, index) => <p key={`${String(item.transaction_id)}-${index}`} className="text-slate-300">{String(item.plan)} · {String(item.amount)} {String(item.currency)} · {String(item.status)}</p>)}</div></div>}
          <p className="mt-5 text-xs leading-5 text-slate-500">Sensitive actions require confirmation and are written to the admin log. Support metadata is visible only to administrators.</p>
        </section>
      </div>}
    </AdminShell>
  );
}
