"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { RefreshCw, Save } from "lucide-react";
import { AdminShell } from "./admin-shell";

type Row = Record<string, unknown>;

export function AdminSection({ section, title }: { section: string; title: string }) {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setBusy(true);
    try {
      const response = await fetch(`/api/admin?section=${section}`, { cache: "no-store" });
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

  // Section data is loaded once after mount; refresh is explicit afterwards.
  // eslint-disable-next-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps
  useEffect(() => { void load(); }, []);

  async function action(body: Record<string, unknown>) {
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
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Admin action failed.");
    } finally {
      setBusy(false);
    }
  }

  const list = (key: string) => (Array.isArray(data?.[key]) ? data?.[key] : []) as Row[];

  return (
    <AdminShell title={title}>
      <div className="mb-5 flex justify-end"><button onClick={() => void load()} className="social-button" disabled={busy}><RefreshCw size={14} className={busy ? "animate-spin" : ""} />Refresh</button></div>
      {error && <p role="alert" className="mb-4 rounded-xl border border-rose-300/20 bg-rose-400/10 p-3 text-sm text-rose-200">{error}</p>}
      {!data ? <div className="social-card p-10 text-center text-slate-400">Loading secure admin data...</div> : <SectionContent section={section} list={list} action={action} />}
    </AdminShell>
  );
}

function SectionContent({ section, list, action }: { section: string; list: (key: string) => Row[]; action: (body: Record<string, unknown>) => Promise<void> }) {
  if (section === "personas") return <Table title="Persona moderation and voice" columns={["name", "creator", "voice_id", "voice_agent_id", "voice_enabled", "users", "chats", "likes", "followers", "rating", "trending"]} rows={list("personas")} actions={(row) => <div className="flex min-w-72 flex-col gap-2"><PersonaVoiceEditor key={`${row.slug}:${row.voice_id}:${row.voice_agent_id}:${row.voice_enabled}`} row={row} action={action} /><div className="flex flex-wrap gap-2"><button className="social-button small" onClick={() => action({ action: row.is_featured ? "unfeature-persona" : "feature-persona", personaSlug: row.slug })}>{row.is_featured ? "Unfeature" : "Feature"}</button><button className="social-button small" onClick={() => action({ action: row.is_trending ? "unmark-trending" : "mark-trending", personaSlug: row.slug })}>{row.is_trending ? "Remove trend" : "Mark trending"}</button><button className="social-button small" onClick={() => action({ action: "suspend-persona", personaSlug: row.slug })}>Suspend</button><button className="social-button small" onClick={() => action({ action: "remove-persona", personaSlug: row.slug })}>Remove</button></div></div>} />;
  if (section === "challenges") return <Table title="Weekly challenges" columns={["persona", "question", "difficulty", "xp_reward", "deadline", "participants", "is_active"]} rows={list("challenges")} actions={(row) => <button className="social-button small" onClick={() => action({ action: "toggle-challenge", challengeId: row.id })}>{row.is_active ? "Deactivate" : "Activate"}</button>} />;
  if (section === "leaderboard") return <Table title="Cached leaderboard and suspicious activity review" columns={["kind", "entity_id", "period", "score", "likes", "users", "rank", "previous_rank"]} rows={list("leaderboard")} actions={(row) => row.kind === "creator" ? <button className="social-button small" onClick={() => action({ action: "reset-points", userId: row.entity_id })}>Reset points</button> : <span className="text-xs text-slate-500">Persona cache</span>} />;
  if (section === "analytics") return <div className="grid gap-5 lg:grid-cols-2"><Table title="Registrations · last 30 days" columns={["date", "count"]} rows={list("registrations")} /><Table title="Chat usage · last 30 days" columns={["date", "messages", "tokens", "cost"]} rows={list("usage")} /></div>;
  if (section === "plans") return <div className="space-y-5"><Table title="Plan distribution" columns={["plan", "plan_status", "count"]} rows={list("plans")} /><SettingsTable rows={list("settings")} action={action} /></div>;
  if (section === "settings") return <SettingsTable rows={list("settings")} action={action} />;
  return <div className="social-card"><p className="text-slate-400">Admin section ready.</p></div>;
}

function Table({ title, columns, rows, actions }: { title: string; columns: string[]; rows: Row[]; actions?: (row: Row) => ReactNode }) {
  return <section className="social-card"><h2 className="text-xl font-bold">{title}</h2>{rows.length ? <div className="social-table-wrap mt-5"><table className="social-table"><thead><tr>{columns.map((column) => <th key={column}>{column.replaceAll("_", " ")}</th>)}{actions && <th>Actions</th>}</tr></thead><tbody>{rows.map((row, index) => <tr key={String(row.id ?? row.entity_id ?? index)}>{columns.map((column) => <td key={column} className="max-w-70">{typeof row[column] === "boolean" ? (row[column] ? "Yes" : "No") : String(row[column] ?? "—")}</td>)}{actions && <td>{actions(row)}</td>}</tr>)}</tbody></table></div> : <div className="social-empty">No records found.</div>}</section>;
}

function SettingsTable({ rows, action }: { rows: Row[]; action: (body: Record<string, unknown>) => Promise<void> }) {
  return <section className="social-card"><h2 className="text-xl font-bold">Runtime settings</h2><p className="mt-2 text-sm text-slate-400">These values are stored in Supabase and applied server-side.</p><div className="mt-5 space-y-3">{rows.map((row) => <div key={String(row.key)} className="flex flex-wrap items-center gap-3 border-b border-white/8 pb-3"><code className="min-w-56 text-xs text-cyan-200">{String(row.key)}</code><input defaultValue={String(row.value ?? "")} aria-label={String(row.key)} className="social-input max-w-sm flex-1" onKeyDown={(event) => { if (event.key === "Enter") void action({ action: "setting", key: row.key, value: (event.target as HTMLInputElement).value }); }} /><button className="social-button small" onClick={(event) => { const input = event.currentTarget.previousElementSibling as HTMLInputElement; void action({ action: "setting", key: row.key, value: input.value }); }}><Save size={13} />Save</button></div>)}</div></section>;
}

function PersonaVoiceEditor({ row, action }: { row: Row; action: (body: Record<string, unknown>) => Promise<void> }) {
  const [voiceId, setVoiceId] = useState(String(row.voice_id ?? ""));
  const [agentId, setAgentId] = useState(String(row.voice_agent_id ?? "")); const [enabled, setEnabled] = useState(row.voice_enabled !== false);
  return <div className="flex flex-wrap items-center gap-2">
    <input value={voiceId} onChange={(event) => setVoiceId(event.target.value)} maxLength={160} placeholder="Use default voice" aria-label={`Voice ID for ${String(row.name)}`} className="social-input min-w-40 flex-1" />
    <input value={agentId} onChange={(event) => setAgentId(event.target.value)} maxLength={160} placeholder="ElevenLabs agent ID" aria-label={`ElevenLabs agent ID for ${String(row.name)}`} className="social-input min-w-40 flex-1" />
    <label className="flex items-center gap-1.5 text-xs text-slate-300"><input type="checkbox" checked={enabled} onChange={(event) => setEnabled(event.target.checked)} />Enabled</label>
    <button className="social-button small" onClick={() => void action({ action: "persona-voice", personaSlug: row.slug, voiceId, voiceAgentId: agentId, voiceEnabled: enabled })}><Save size={13} />Save voice</button>
  </div>;
}
