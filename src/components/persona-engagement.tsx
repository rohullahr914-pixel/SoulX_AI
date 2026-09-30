"use client";

import { Heart, Star, Users } from "lucide-react";
import { useState, useSyncExternalStore } from "react";
import { getCurrentUser, subscribeToAuth } from "@/lib/auth";
import { socialRequest, type PersonaSocial } from "@/lib/social";
import { useSocial } from "@/components/social/common";

type PersonaEngagementData = PersonaSocial & { liked: boolean; followed: boolean };

export function PersonaEngagement({ slug }: { slug: string }) {
  const { data, error, loading, reload } = useSocial<PersonaEngagementData>(`kind=persona&slug=${encodeURIComponent(slug)}`);
  const user = useSyncExternalStore(subscribeToAuth, getCurrentUser, () => null);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  async function act(action: "like" | "follow-persona" | "rate", active?: boolean, rating?: number) {
    if (!user) {
      setNotice("Log in to join this persona’s community.");
      return;
    }
    setBusy(true);
    try {
      await socialRequest({ action, target: slug, ...(action === "rate" ? { rating } : { active }) });
      setNotice(action === "rate" ? "Rating saved." : active ? "Saved." : "Removed.");
      await reload();
    } catch (cause) {
      setNotice(cause instanceof Error ? cause.message : "That action could not be completed.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <div className="mt-6 h-20 animate-pulse rounded-2xl border border-white/10 bg-white/[0.03]" aria-label="Loading persona activity" />;
  if (!data) return <p className="mt-6 text-sm text-slate-400">{error ? "Live community stats are temporarily unavailable." : "Community activity will appear here."}</p>;

  return (
    <section className="mt-7 rounded-2xl border border-white/10 bg-slate-900/45 p-4 sm:p-5" aria-label="Persona community activity">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-300">
          <span className="inline-flex items-center gap-1.5"><Users className="h-4 w-4 text-cyan-300" />{data.unique_users} explorers</span>
          <span>{data.conversations} conversations</span>
          <span>{data.followers} followers</span>
          <span className="inline-flex items-center gap-1 text-amber-200"><Star className="h-4 w-4 fill-amber-200" />{data.rating ? data.rating.toFixed(1) : "—"}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={busy} onClick={() => void act("like", !data.liked)} aria-pressed={data.liked} className={`rounded-full border px-3 py-2 text-sm transition disabled:opacity-60 ${data.liked ? "border-rose-300/50 bg-rose-400/10 text-rose-100" : "border-white/10 bg-white/[0.03] text-slate-200 hover:border-rose-300/40"}`}><Heart className={`mr-1 inline h-4 w-4 ${data.liked ? "fill-current" : ""}`} />{data.liked ? "Liked" : "Like"} · {data.likes}</button>
          <button type="button" disabled={busy} onClick={() => void act("follow-persona", !data.followed)} aria-pressed={data.followed} className="rounded-full border border-cyan-300/35 bg-cyan-400/10 px-3 py-2 text-sm text-cyan-100 transition hover:border-cyan-300/70 disabled:opacity-60">{data.followed ? "Following" : "Follow"}</button>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-1.5 border-t border-white/8 pt-4">
        <span className="mr-1 text-xs text-slate-400">Rate this persona</span>
        {[1, 2, 3, 4, 5].map((rating) => <button key={rating} type="button" disabled={busy} onClick={() => void act("rate", undefined, rating)} aria-label={`Rate ${rating} out of 5`} className="rounded p-1 text-amber-200 transition hover:bg-amber-300/10 disabled:opacity-60"><Star className="h-4 w-4" /></button>)}
      </div>
      {notice && <p role="status" className="mt-3 text-xs text-cyan-100">{notice}</p>}
    </section>
  );
}
