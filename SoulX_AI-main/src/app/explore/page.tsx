"use client";

import Link from "next/link";
import { ArrowRight, Flame, Search } from "lucide-react";
import { useMemo, useState, useSyncExternalStore } from "react";
import { BackButton } from "@/components/back-button";
import { PersonaAvatar } from "@/components/persona-avatar";
import {
  customPersonaToPersona,
  getCustomPersonasSnapshot,
  parseCustomPersonasSnapshot,
  subscribeToCustomPersonas,
} from "@/lib/custom-personas";
import { searchPersonas } from "@/lib/personas";
import {
  getPersonaDomain,
  isPopularPersona,
  personaDomains,
  personaMatchesDomain,
  type PersonaDomainId,
} from "@/lib/persona-categories";

type DiscoverFilterId = PersonaDomainId | "popular" | "mine";

export default function DiscoverPage() {
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<DiscoverFilterId>("all");
  const customPersonasSnapshot = useSyncExternalStore(subscribeToCustomPersonas, getCustomPersonasSnapshot, () => "__loading__");
  const customPersonas = useMemo(
    () => parseCustomPersonasSnapshot(customPersonasSnapshot).map(customPersonaToPersona),
    [customPersonasSnapshot],
  );

  const searchedCustomPersonas = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return customPersonas.filter((persona) => {
      if (!normalizedQuery) return true;
      return [
        persona.name,
        persona.profession,
        persona.category,
        persona.description,
        persona.expertise.join(" "),
        persona.personality.join(" "),
      ].some((value) => value.toLowerCase().includes(normalizedQuery));
    });
  }, [customPersonas, query]);

  const matchingPersonas = useMemo(
    () => [...searchedCustomPersonas, ...searchPersonas(query)],
    [query, searchedCustomPersonas],
  );

  const filteredPersonas = useMemo(() => {
    if (activeFilter === "mine") {
      return searchedCustomPersonas;
    }
    if (activeFilter === "popular") {
      return matchingPersonas.filter(isPopularPersona);
    }
    return matchingPersonas.filter((persona) => personaMatchesDomain(persona, activeFilter));
  }, [activeFilter, matchingPersonas, searchedCustomPersonas]);

  const categoryCounts = useMemo(() => {
    return Object.fromEntries(
      personaDomains.map((domain) => [
        domain.id,
        matchingPersonas.filter((persona) => personaMatchesDomain(persona, domain.id)).length,
      ]),
    );
  }, [matchingPersonas]);

  const popularCount = useMemo(() => matchingPersonas.filter(isPopularPersona).length, [matchingPersonas]);

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 text-white sm:px-6 lg:px-8">
      <div className="relative mb-8 overflow-hidden rounded-[30px] border border-cyan-400/15 bg-slate-950/75 p-5 shadow-[0_0_35px_rgba(34,211,238,0.08)] backdrop-blur-xl">
        <img src="/brand/persona-portraits.png" alt="SoulX historical and expert personas" className="pointer-events-none absolute right-0 top-0 h-full w-1/2 object-contain object-right opacity-20" />
        <div className="mb-5 flex items-center justify-between">
          <BackButton href="/" label="Back" />
          <div className="text-[10px] uppercase tracking-[0.2em] text-cyan-200">Explore minds</div>
        </div>

        <div className="relative z-10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-cyan-300">Explore</p>
            <h1 className="mt-2 text-4xl font-black tracking-[-0.07em] text-white">Find your next mind.</h1>
          </div>

          <div className="flex w-full max-w-lg items-center gap-3 rounded-full border border-white/10 bg-slate-900/80 px-4 py-3 shadow-[0_0_20px_rgba(15,23,42,0.7)]">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              aria-label="Search personas"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by name, profession, expertise, category"
              className="w-full bg-transparent text-sm text-white placeholder:text-slate-400 focus:outline-none"
            />
          </div>
        </div>
      </div>

      <section className="mb-8 rounded-[24px] border border-white/8 bg-slate-950/45 p-3 sm:p-4" aria-label="Persona filters">
        <div className="flex flex-col gap-3 px-1 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">Quick filters</span>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              aria-pressed={activeFilter === "all"}
              onClick={() => setActiveFilter("all")}
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold transition ${
                activeFilter === "all"
                  ? "border-cyan-400/60 bg-cyan-500/12 text-cyan-100"
                  : "border-white/10 bg-white/[0.025] text-slate-300 hover:border-cyan-400/40 hover:text-white"
              }`}
            >
              All minds <span className="rounded-full bg-white/5 px-1.5 py-0.5 text-[10px]">{categoryCounts.all ?? 0}</span>
            </button>
            <button
              type="button"
              aria-pressed={activeFilter === "popular"}
              onClick={() => setActiveFilter("popular")}
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold transition ${
                activeFilter === "popular"
                  ? "border-amber-300/60 bg-amber-300/12 text-amber-100 shadow-[0_0_18px_rgba(251,191,36,0.1)]"
                  : "border-amber-300/20 bg-amber-300/[0.04] text-amber-100/80 hover:border-amber-300/45 hover:bg-amber-300/[0.08]"
              }`}
            >
              <Flame className="h-3.5 w-3.5" aria-hidden="true" /> Popular
              <span className="rounded-full bg-amber-100/10 px-1.5 py-0.5 text-[10px]">{popularCount}</span>
            </button>
            <button
              type="button"
              aria-pressed={activeFilter === "mine"}
              onClick={() => setActiveFilter("mine")}
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold transition ${
                activeFilter === "mine"
                  ? "border-violet-300/50 bg-violet-400/12 text-violet-100"
                  : "border-white/10 bg-white/[0.025] text-slate-400 hover:border-violet-300/30 hover:text-white"
              }`}
            >
              My Personas <span className="rounded-full bg-white/5 px-1.5 py-0.5 text-[10px]">{searchedCustomPersonas.length}</span>
            </button>
          </div>
        </div>

        <div className="my-4 h-px bg-white/8" />
        <div className="mb-3 px-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">Explore by field</div>
        <div className="flex gap-2 overflow-x-auto pb-1 text-sm text-slate-200 [scrollbar-width:none] sm:flex-wrap">
        {personaDomains.filter((filter) => filter.id !== "all").map((filter) => (
          <button
            key={filter.id}
            type="button"
            aria-pressed={activeFilter === filter.id}
            onClick={() => setActiveFilter(filter.id)}
            className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-2 transition ${
              activeFilter === filter.id
                ? "border-cyan-400/60 bg-cyan-500/12 text-cyan-100 shadow-[0_0_18px_rgba(34,211,238,0.08)]"
                : "border-white/10 bg-white/[0.025] hover:border-cyan-400/40 hover:bg-cyan-500/5"
            }`}
          >
            {filter.label}<span className={`rounded-full px-1.5 py-0.5 text-[10px] ${activeFilter === filter.id ? "bg-cyan-300/15 text-cyan-100" : "bg-white/5 text-slate-500"}`}>{categoryCounts[filter.id] ?? 0}</span>
          </button>
        ))}
        </div>
      </section>

      <div className="mb-5 flex items-center justify-between text-sm text-slate-300">
        <span>Showing {filteredPersonas.length} persona{filteredPersonas.length === 1 ? "" : "s"}</span>
        <Link href="/room" className="font-medium text-cyan-300 transition hover:text-cyan-200">Open Rooms →</Link>
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {filteredPersonas.length > 0 ? (
          filteredPersonas.map((persona) => (
            <div key={persona.id} className="rounded-[26px] border border-white/10 bg-slate-900/60 p-5 shadow-[0_0_24px_rgba(15,23,42,0.8)] transition hover:-translate-y-1 hover:border-cyan-400/40">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <PersonaAvatar slug={persona.slug} name={persona.name} className="h-12 w-12 border border-cyan-300/20" />
                  <div>
                    <h2 className="text-xl font-bold tracking-[-0.05em]">{persona.name}</h2>
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{persona.profession}</p>
                  </div>
                </div>
                <span className="rounded-full border border-cyan-400/25 bg-cyan-500/10 px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-cyan-200">
                  {getPersonaDomain(persona.category).label}
                </span>
              </div>

              <p className="mt-4 text-sm leading-6 text-slate-300">{persona.shortDescription}</p>

              <div className="mt-5 flex flex-wrap gap-2">
                {persona.tags.slice(0, 3).map((tag) => (
                  <span key={tag} className="rounded-full border border-white/10 bg-white/3 px-2.5 py-1 text-[11px] text-slate-300">
                    {tag}
                  </span>
                ))}
              </div>

              <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-4">
                <span className="text-xs text-slate-400">{persona.disclaimer}</span>
                <Link href={persona.metadata.custom === true ? `/chat/${persona.slug}` : `/persona/${persona.slug}`} className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2 text-sm font-semibold text-white">
                  {persona.metadata.custom === true ? "Chat" : "Open"} <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full rounded-[26px] border border-dashed border-white/10 bg-slate-900/50 p-8 text-center text-slate-300">
            No personas matched your search. Try a different keyword or category.
          </div>
        )}
      </div>
    </main>
  );
}
