"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { ArrowRight, Heart, Search } from "lucide-react";
import { BackButton } from "@/components/back-button";
import { PersonaAvatar } from "@/components/persona-avatar";
import { getCurrentUser, subscribeToAuth } from "@/lib/auth";
import { getFavoritePersonaSlugs, getProfilePreferencesSnapshot, ProfilePreferences, subscribeToProfile, toggleFavoritePersona } from "@/lib/profile";
import { personas } from "@/lib/personas";

export default function FavoritesPage() {
  const [query, setQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(24);
  const user = useSyncExternalStore(subscribeToAuth, getCurrentUser, () => null);
  const profileSnapshot = useSyncExternalStore(subscribeToProfile, getProfilePreferencesSnapshot, () => "");
  let profileStore: Record<string, ProfilePreferences> = {};
  try {
    profileStore = profileSnapshot ? JSON.parse(profileSnapshot) as Record<string, ProfilePreferences> : {};
  } catch {
    profileStore = {};
  }
  const favoriteSlugs = user ? getFavoritePersonaSlugs(profileStore[user.id]) : [];
  const normalizedQuery = query.trim().toLowerCase();
  const filteredPersonas = normalizedQuery
    ? personas.filter((persona) => [persona.name, persona.profession, persona.category].some((value) => value.toLowerCase().includes(normalizedQuery)))
    : personas;
  const visiblePersonas = filteredPersonas.slice(0, visibleCount);

  return (
    <main className="mx-auto max-w-7xl px-3 py-8 text-white sm:px-6 sm:py-12 lg:px-8">
      <div className="rounded-[24px] border border-cyan-400/15 bg-slate-950/75 p-4 shadow-[0_0_35px_rgba(34,211,238,0.08)] backdrop-blur-xl sm:rounded-[32px] sm:p-8">
        <div className="mb-6 flex items-center justify-between"><BackButton href="/profile" label="Profile" /><span className="text-[10px] uppercase tracking-[0.2em] text-cyan-200">{favoriteSlugs.length} selected</span></div>
        <p className="text-sm uppercase tracking-[0.25em] text-cyan-300">Your collection</p>
        <h1 className="mt-3 text-4xl font-black tracking-[-0.07em] text-white">Favorite minds</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">Choose as many personas as you like. They will appear together on your public profile.</p>

        {!user && <div className="mt-6 rounded-2xl border border-amber-400/20 bg-amber-500/10 p-4 text-sm text-amber-100">Log in to build your collection. <Link href="/login" className="font-semibold underline">Log in</Link></div>}

        <label className="mt-7 flex min-h-12 items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.025] px-4 focus-within:border-cyan-300/40">
          <Search className="h-4 w-4 shrink-0 text-slate-500" />
          <span className="sr-only">Search favorite minds</span>
          <input value={query} onChange={(event) => { setQuery(event.target.value); setVisibleCount(24); }} placeholder="Search minds, fields, or professions" className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-slate-500" />
        </label>

        <div className="mt-5 grid grid-cols-2 gap-3 sm:mt-8 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">{visiblePersonas.map((persona) => { const active = favoriteSlugs.includes(persona.slug); return <article key={persona.id} className={`flex min-w-0 flex-col rounded-[20px] border p-3 transition duration-300 sm:rounded-[24px] sm:p-5 ${active ? "border-cyan-400/60 bg-cyan-500/10 shadow-[0_0_25px_rgba(34,211,238,0.12)]" : "border-white/10 bg-white/[0.03] hover:-translate-y-1 hover:border-cyan-400/40"}`}><div className="flex items-start justify-between gap-2"><PersonaAvatar slug={persona.slug} name={persona.name} className="h-11 w-11 border border-cyan-300/25 sm:h-14 sm:w-14" />{active && <span className="rounded-full bg-cyan-300/15 px-1.5 py-1 text-[8px] font-semibold uppercase tracking-wider text-cyan-200 sm:px-2.5 sm:text-[10px]">Saved</span>}</div><h2 className="mt-3 line-clamp-2 text-base font-bold leading-5 tracking-[-0.04em] text-white sm:mt-4 sm:text-xl sm:leading-6">{persona.name}</h2><p className="mt-2 line-clamp-2 min-h-9 text-xs leading-4 text-slate-300 sm:min-h-10 sm:text-sm sm:leading-5">{persona.profession}</p><p className="mt-3 truncate text-[9px] uppercase tracking-[0.14em] text-cyan-300 sm:text-xs sm:tracking-[0.2em]">{persona.category}</p><div className="mt-auto flex flex-col gap-2 pt-4 sm:mt-5 sm:flex-row sm:items-center sm:justify-between sm:pt-0"><button type="button" disabled={!user} onClick={() => user && toggleFavoritePersona(user.id, persona.slug)} className={`inline-flex min-h-10 items-center justify-center gap-1.5 rounded-full border px-2 text-[10px] transition disabled:cursor-not-allowed disabled:opacity-50 sm:px-3 sm:text-xs ${active ? "border-cyan-300/30 bg-cyan-300/10 text-cyan-200" : "border-white/10 text-slate-200 hover:border-cyan-300/30"}`}><Heart className={`h-3.5 w-3.5 ${active ? "fill-cyan-300 text-cyan-300" : ""}`} />{active ? "Remove" : "Add"}</button><Link href={`/persona/${persona.slug}`} className="inline-flex min-h-10 items-center justify-center gap-1 rounded-full border border-white/8 px-2 text-[10px] text-cyan-300 sm:min-h-0 sm:border-0 sm:px-0 sm:text-xs">Open <ArrowRight className="h-3 w-3" /></Link></div></article>; })}</div>

        {!visiblePersonas.length && <p className="mt-8 rounded-2xl border border-dashed border-white/10 p-8 text-center text-sm text-slate-400">No minds match that search.</p>}
        {visibleCount < filteredPersonas.length && <button type="button" onClick={() => setVisibleCount((count) => count + 24)} className="mx-auto mt-7 flex min-h-12 items-center justify-center rounded-full border border-cyan-300/25 bg-cyan-400/8 px-6 text-sm font-semibold text-cyan-100">Show more minds</button>}
      </div>
    </main>
  );
}
