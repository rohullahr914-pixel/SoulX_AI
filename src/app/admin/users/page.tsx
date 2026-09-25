"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { RefreshCw, Search, ShieldCheck } from "lucide-react";
import { AdminShell } from "@/components/admin/admin-shell";

type User = {
  id: string; email: string; full_name: string; plan: string; plan_status: string; account_status: string;
  xp: number; level: number; personas_created: number; total_messages: number;
  last_active?: string | null; created_at: string;
};

export default function AdminUsersPage() {
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setBusy(true);
    try {
      const response = await fetch(`/api/admin?search=${encodeURIComponent(search)}`, { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error);
      setUsers(body.users ?? []);
      setError("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Users unavailable.");
    } finally {
      setBusy(false);
    }
  };

  // User data is fetched once after mount; search and refresh are explicit.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, []);

  async function action(body: Record<string, unknown>) {
    if (!window.confirm("Confirm this admin action?")) return;
    setBusy(true);
    try {
      const response = await fetch("/api/admin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Admin action failed.");
      setBusy(false);
    }
  }

  return <AdminShell title="Users">
    <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-slate-400">Search, inspect and update accounts. All changes are audited.</p><Link href="/admin" className="social-button">Overview</Link></div>
    <form className="mt-5 flex max-w-xl gap-2" onSubmit={(event) => { event.preventDefault(); void load(); }}><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search email or user ID" className="social-input flex-1" /><button className="social-button primary"><Search size={14} />Search</button><button type="button" className="social-button" onClick={() => void load()} disabled={busy}><RefreshCw size={14} className={busy ? "animate-spin" : ""} /></button></form>
    {error && <p role="alert" className="mt-4 rounded-xl border border-rose-300/20 bg-rose-400/10 p-3 text-sm text-rose-200">{error}</p>}
    <section className="social-card mt-5"><div className="flex items-center gap-2"><ShieldCheck size={17} className="text-cyan-300" /><h2 className="text-xl font-bold">Account directory</h2></div><div className="social-table-wrap mt-5"><table className="social-table"><thead><tr><th>User</th><th>Registered</th><th>Plan</th><th>XP / Level</th><th>Personas</th><th>Messages</th><th>Last active</th><th>Status</th><th>Actions</th></tr></thead><tbody>{users.map((user) => <tr key={user.id}><td><p className="font-semibold">{user.full_name || "Unnamed"}</p><p className="text-xs text-slate-500">{user.email}<br />{user.id}</p></td><td>{new Date(user.created_at).toLocaleDateString()}</td><td className="uppercase text-cyan-200">{user.plan}</td><td>{user.xp} / {user.level}</td><td>{user.personas_created}</td><td>{user.total_messages}</td><td>{user.last_active ? new Date(user.last_active).toLocaleDateString() : "Never"}</td><td>{user.account_status}</td><td><div className="flex min-w-56 flex-wrap gap-2"><button className="social-button small" onClick={() => void action({ action: "upgrade-pro", userId: user.id, plan: "pro", months: 1 })}>Upgrade Pro</button><button className="social-button small" onClick={() => void action({ action: "downgrade-free", userId: user.id })}>Free</button><button className="social-button small" onClick={() => void action({ action: user.account_status === "suspended" ? "unsuspend" : "suspend", userId: user.id })}>{user.account_status === "suspended" ? "Reactivate" : "Suspend"}</button><button className="social-button small" onClick={() => void action({ action: "delete-user", userId: user.id })}>Delete</button><Link className="social-button small" href={`/admin?search=${encodeURIComponent(user.email)}`}>View</Link></div></td></tr>)}</tbody></table></div>{!users.length && <div className="social-empty">No users found.</div>}</section>
  </AdminShell>;
}
