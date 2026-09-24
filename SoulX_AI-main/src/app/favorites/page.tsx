"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { ArrowRight, Heart } from "lucide-react";
import { BackButton } from "@/components/back-button";
import { PersonaAvatar } from "@/components/persona-avatar";
import { getCurrentUser, subscribeToAuth } from "@/lib/auth";
import { getFavoritePersonaSlugs, getProfilePreferencesSnapshot, ProfilePreferences, subscribeToProfile, toggleFavoritePersona } from "@/lib/profile";
import { personas } from "@/lib/personas";

export default function FavoritesPage() {
  const user = useSyncExternalStore(subscribeToAuth, getCurrentUser, () => null);
  const profileSnapshot = useSyncExternalStore(subscribeToProfile, getProfilePreferencesSnapshot, () => "");
  let profileStore: Record<string, ProfilePreferences> = {};
  try {
    profileStore = profileSnapshot ? JSON.parse(profileSnapshot) as Record<string, ProfilePreferences> : {};
  } catch {
    profileStore = {};
  }
  const favoriteSlugs = user ? getFavoritePersonaSlugs(profileStore[user.id]) : [];

  return (
    <main className="mx-auto max-w-7xl px-4 py-12 text-white sm:px-6 lg:px-8">
      <div className="rounded-[32px] border border-cyan-400/15 bg-slate-950/75 p-6 shadow-[0_0_35px_rgba(34,211,238,0.08)] backdrop-blur-xl sm:p-8">
        <div className="mb-6 flex items-center justify-between"><BackButton href="/profile" label="Profile" /><span className="text-[10px] uppercase tracking-[0.2em] text-cyan-200">{favoriteSlugs.length} selected</span></div>
        <p className="text-sm uppercase tracking-[0.25em] text-cyan-300">Your collection</p>
        <h1 className="mt-3 text-4xl font-black tracking-[-0.07em] text-white">Favorite minds</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">Choose as many personas as you like. They will appear together on your public profile.</p>

        {!user && <div className="mt-6 rounded-2xl border border-amber-400/20 bg-amber-500/10 p-4 text-sm text-amber-100">Log in to build your collection. <Link href="/login" className="font-semibold underline">Log in</Link></div>}

        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{personas.map((persona) => { const active = favoriteSlugs.includes(persona.slug); return <article key={persona.id} className={`rounded-[24px] border p-5 transition duration-300 ${active ? "border-cyan-400/60 bg-cyan-500/10 shadow-[0_0_25px_rgba(34,211,238,0.12)]" : "border-white/10 bg-white/[0.03] hover:-translate-y-1 hover:border-cyan-400/40"}`}><div className="flex items-start justify-between"><PersonaAvatar slug={persona.slug} name={persona.name} className="h-14 w-14 border border-cyan-300/25" />{active && <span className="rounded-full bg-cyan-300/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-cyan-200">Saved</span>}</div><h2 className="mt-4 text-xl font-bold tracking-[-0.05em] text-white">{persona.name}</h2><p className="mt-2 min-h-10 text-sm text-slate-300">{persona.profession}</p><p className="mt-3 text-xs uppercase tracking-[0.2em] text-cyan-300">{persona.category}</p><div className="mt-5 flex items-center justify-between"><button type="button" disabled={!user} onClick={() => user && toggleFavoritePersona(user.id, persona.slug)} className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs transition disabled:cursor-not-allowed disabled:opacity-50 ${active ? "border-cyan-300/30 bg-cyan-300/10 text-cyan-200" : "border-white/10 text-slate-200 hover:border-cyan-300/30"}`}><Heart className={`h-3.5 w-3.5 ${active ? "fill-cyan-300 text-cyan-300" : ""}`} />{active ? "Remove" : "Add favorite"}</button><Link href={`/persona/${persona.slug}`} className="inline-flex items-center gap-1 text-xs text-cyan-300">Open <ArrowRight className="h-3 w-3" /></Link></div></article>; })}</div>
      </div>
    </main>
  );
}
