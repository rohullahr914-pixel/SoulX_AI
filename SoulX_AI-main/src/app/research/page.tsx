"use client";

import { FormEvent, useState } from "react";
import { Search, Sparkles } from "lucide-react";
import { BackButton } from "@/components/back-button";

type ResearchSource = { title: string; url: string; note: string };
type ResearchResult = { ok?: boolean; query?: string; answer?: string; message?: string; error?: string; sources?: ResearchSource[] };

export default function ResearchPage() {
  const [query, setQuery] = useState("How do AI personas combine identity, memory, and prompt design?");
  const [result, setResult] = useState<ResearchResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const submitResearch = async (event: FormEvent) => {
    event.preventDefault();
    if (!query.trim() || isLoading) return;
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const data = (await response.json()) as ResearchResult;
      if (!response.ok) throw new Error(data.message ?? data.error ?? "Research could not be completed.");
      setResult(data);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Research could not be completed.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="mx-auto max-w-6xl px-4 py-12 text-white sm:px-6 lg:px-8">
      <div className="rounded-[32px] border border-cyan-400/15 bg-slate-950/75 p-6 shadow-[0_0_35px_rgba(34,211,238,0.08)] backdrop-blur-xl sm:p-8">
        <div className="mb-6 flex items-center justify-between"><BackButton href="/explore" label="Back" /><span className="text-[10px] uppercase tracking-[0.2em] text-cyan-200">Evidence workspace</span></div>
        <p className="text-sm uppercase tracking-[0.25em] text-cyan-300">Research mode</p>
        <h1 className="mt-3 text-4xl font-black tracking-[-0.07em] text-white">Ask a sharper question.</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">Explore a topic with a clear query, then separate an answer from its source notes and uncertainty.</p>
        <form onSubmit={submitResearch} className="mt-8 flex flex-col gap-3 rounded-[24px] border border-white/10 bg-slate-900/80 p-2 sm:flex-row"><Search className="m-3 hidden h-5 w-5 text-cyan-300 sm:block" /><input value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Research question" className="min-w-0 flex-1 rounded-full bg-transparent px-4 py-3 text-sm text-white placeholder:text-slate-400 focus:outline-none" placeholder="Ask a research question..." /><button type="submit" disabled={isLoading} className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60">{isLoading ? "Researching..." : "Run research"}</button></form>
        {error && <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</div>}
        {result && <div className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]"><div className="rounded-[24px] border border-white/10 bg-white/3 p-5"><div className="flex items-center gap-2 text-sm uppercase tracking-[0.25em] text-cyan-300"><Sparkles className="h-4 w-4" /> Findings</div><h2 className="mt-3 text-2xl font-bold tracking-[-0.06em] text-white">{result.query}</h2><p className="mt-4 leading-7 text-slate-300">{result.answer ?? result.message}</p></div><aside className="rounded-[24px] border border-white/10 bg-white/3 p-5"><p className="text-sm uppercase tracking-[0.25em] text-cyan-300">Source notes</p><ul className="mt-4 space-y-3 text-sm text-slate-300">{(result.sources ?? []).map((source) => <li key={source.title} className="rounded-xl border border-white/10 bg-slate-900/80 p-3"><div className="font-semibold text-white">{source.title}</div><div className="mt-1 break-all text-cyan-200">{source.url}</div><div className="mt-1">{source.note}</div></li>)}</ul></aside></div>}
      </div>
    </main>
  );
}
