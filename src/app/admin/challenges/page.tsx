"use client";

import { useEffect, useState } from "react";
import { RefreshCw, Save } from "lucide-react";
import { AdminShell } from "@/components/admin/admin-shell";

type Row = Record<string, unknown>;

export default function AdminChallengesPage() {
  const [challenges, setChallenges] = useState<Row[]>([]);
  const [personas, setPersonas] = useState<Row[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ personaSlug: "", question: "", difficulty: "Medium", xpReward: "100", deadline: "", expectedAnswer: "" });

  const load = async () => {
    setBusy(true);
    try {
      const [challengeResponse, personaResponse] = await Promise.all([fetch("/api/admin?section=challenges", { cache: "no-store" }), fetch("/api/admin?section=personas", { cache: "no-store" })]);
      const challengeBody = await challengeResponse.json(); const personaBody = await personaResponse.json();
      if (!challengeResponse.ok || !personaResponse.ok) throw new Error(challengeBody.error ?? personaBody.error);
      setChallenges(challengeBody.challenges ?? []); setPersonas(personaBody.personas ?? []); setError("");
      if (!form.personaSlug && personaBody.personas?.[0]?.slug) setForm((current) => ({ ...current, personaSlug: String(personaBody.personas[0].slug) }));
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Challenge data unavailable."); }
    finally { setBusy(false); }
  };

  // Challenge data is loaded once after mount; refresh is explicit.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, []);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!window.confirm("Publish this weekly challenge?")) return;
    setBusy(true);
    try {
      const response = await fetch("/api/admin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "create-challenge", ...form, xpReward: Number(form.xpReward) }) });
      const body = await response.json(); if (!response.ok) throw new Error(body.error);
      setForm((current) => ({ ...current, question: "", expectedAnswer: "" })); await load();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Challenge could not be created."); setBusy(false); }
  }

  async function toggle(id: unknown) {
    if (!window.confirm("Change challenge availability?")) return;
    setBusy(true); try { const response = await fetch("/api/admin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "toggle-challenge", challengeId: id }) }); const body = await response.json(); if (!response.ok) throw new Error(body.error); await load(); } catch (caught) { setError(caught instanceof Error ? caught.message : "Action failed."); setBusy(false); }
  }

  return <AdminShell title="Challenge management"><div className="flex justify-end"><button className="social-button" onClick={() => void load()} disabled={busy}><RefreshCw size={14} className={busy ? "animate-spin" : ""} />Refresh</button></div>{error && <p role="alert" className="mt-4 rounded-xl border border-rose-300/20 bg-rose-400/10 p-3 text-sm text-rose-200">{error}</p>}<section className="social-card mt-5"><h2 className="text-xl font-bold">Publish weekly challenge</h2><p className="mt-2 text-sm text-slate-400">The expected answer stays in the private challenge key table and is never returned to participants.</p><form onSubmit={submit} className="mt-5 grid gap-3 md:grid-cols-2"><select required value={form.personaSlug} onChange={(event) => setForm({ ...form, personaSlug: event.target.value })} className="social-input"><option value="">Select Persona</option>{personas.map((persona) => <option key={String(persona.slug)} value={String(persona.slug)}>{String(persona.name)}</option>)}</select><select value={form.difficulty} onChange={(event) => setForm({ ...form, difficulty: event.target.value })} className="social-input"><option>Easy</option><option>Medium</option><option>Hard</option></select><textarea required minLength={10} maxLength={4000} value={form.question} onChange={(event) => setForm({ ...form, question: event.target.value })} placeholder="Question shown to participants" className="social-input min-h-28 md:col-span-2" /><textarea required minLength={1} value={form.expectedAnswer} onChange={(event) => setForm({ ...form, expectedAnswer: event.target.value })} placeholder="Expected answer (private)" className="social-input min-h-24 md:col-span-2" /><input required type="number" min="10" max="500" value={form.xpReward} onChange={(event) => setForm({ ...form, xpReward: event.target.value })} placeholder="XP reward" className="social-input" /><input required type="datetime-local" value={form.deadline} onChange={(event) => setForm({ ...form, deadline: event.target.value })} className="social-input" /><button disabled={busy} className="social-button primary md:col-span-2"><Save size={14} />Publish challenge</button></form></section><section className="social-card mt-5"><h2 className="text-xl font-bold">Published challenges</h2><div className="social-table-wrap mt-5"><table className="social-table"><thead><tr><th>Persona</th><th>Question</th><th>Difficulty</th><th>XP</th><th>Deadline</th><th>Participants</th><th>Status</th><th /></tr></thead><tbody>{challenges.map((challenge) => <tr key={String(challenge.id)}><td>{String(challenge.persona)}</td><td className="max-w-sm">{String(challenge.question)}</td><td>{String(challenge.difficulty)}</td><td>{String(challenge.xp_reward)}</td><td>{new Date(String(challenge.deadline)).toLocaleString()}</td><td>{String(challenge.participants ?? 0)}</td><td>{challenge.is_active ? "Active" : "Inactive"}</td><td><button className="social-button small" onClick={() => void toggle(challenge.id)}>{challenge.is_active ? "Deactivate" : "Activate"}</button></td></tr>)}</tbody></table></div>{!challenges.length && <div className="social-empty">No challenges yet.</div>}</section></AdminShell>;
}
