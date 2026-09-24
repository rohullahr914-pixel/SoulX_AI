"use client";

import { useEffect, useState } from "react";
import { BarChart3, RefreshCw } from "lucide-react";
import { AdminShell } from "@/components/admin/admin-shell";

type Point = { date: string; count?: number; messages?: number; pro?: number; revenue?: number };
type Analytics = { registrations: Point[]; active: Point[]; personas: Point[]; usage: Point[]; subscriptions: Point[] };

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<Analytics | null>(null); const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  const load = async () => { setBusy(true); try { const response = await fetch("/api/admin?section=analytics", { cache: "no-store" }); const body = await response.json(); if (!response.ok) throw new Error(body.error); setData(body); setError(""); } catch (caught) { setError(caught instanceof Error ? caught.message : "Analytics unavailable."); } finally { setBusy(false); } };
  // Analytics are loaded once after mount; refresh is explicit.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, []);
  return <AdminShell title="Analytics"><div className="flex justify-end"><button className="social-button" onClick={() => void load()} disabled={busy}><RefreshCw size={14} className={busy ? "animate-spin" : ""} />Refresh</button></div>{error && <p role="alert" className="mt-4 rounded-xl border border-rose-300/20 bg-rose-400/10 p-3 text-sm text-rose-200">{error}</p>}{!data ? <div className="social-card mt-5 p-10 text-center text-slate-400">Loading analytics...</div> : <div className="mt-5 grid gap-5 lg:grid-cols-2"><Chart title="Daily registrations" points={data.registrations} value="count" color="from-cyan-400 to-blue-500" /><Chart title="Active users" points={data.active} value="count" color="from-violet-400 to-fuchsia-500" /><Chart title="Persona creation" points={data.personas} value="count" color="from-emerald-400 to-teal-500" /><Chart title="Chat usage" points={data.usage} value="messages" color="from-amber-300 to-orange-500" /><Chart title="Pro subscriptions" points={data.subscriptions} value="pro" color="from-pink-400 to-rose-500" /><Chart title="Revenue growth" points={data.subscriptions} value="revenue" color="from-lime-300 to-green-500" /></div>}</AdminShell>;
}

function Chart({ title, points, value, color }: { title: string; points: Point[]; value: "count" | "messages" | "pro" | "revenue"; color: string }) {
  const values = points.map((point) => Number(point[value] ?? 0)); const max = Math.max(...values, 1);
  return <section className="social-card"><div className="flex items-center gap-2"><BarChart3 size={16} className="text-cyan-300" /><h2 className="text-lg font-bold">{title}</h2><span className="ml-auto text-xs text-slate-500">30 days</span></div><div className="mt-7 flex h-48 items-end gap-1 border-b border-white/10 px-1">{points.length ? points.map((point, index) => <div key={`${point.date}-${index}`} className="group relative flex h-full flex-1 items-end" title={`${point.date}: ${values[index]}`}><div className={`w-full rounded-t-md bg-gradient-to-t ${color} opacity-80 transition group-hover:opacity-100`} style={{ height: `${Math.max((values[index] / max) * 100, values[index] ? 4 : 1)}%` }} /></div>) : <p className="m-auto text-sm text-slate-500">No data for this period.</p>}</div><div className="mt-3 flex justify-between text-[10px] text-slate-500"><span>{points[0]?.date ?? ""}</span><span>{points.at(-1)?.date ?? ""}</span></div></section>;
}
