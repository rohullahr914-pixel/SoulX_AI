"use client";

import Image from "next/image";
import Link from "next/link";
import { Check, ChevronLeft, Globe2, LockKeyhole, Search, Sparkles, X } from "lucide-react";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { PersonaAvatar } from "@/components/persona-avatar";
import { getCurrentUser, subscribeToAuth } from "@/lib/auth";
import { getPersonas } from "@/lib/personas";
import { ROOM_COVER_OPTIONS, roomPath, type Room, type RoomVisibility } from "@/lib/rooms";

type FormState = { name: string; description: string; topic: string; coverImage: string; visibility: RoomVisibility; personaSlugs: string[] };
const initialForm: FormState = { name: "", description: "", topic: "", coverImage: ROOM_COVER_OPTIONS[0].value, visibility: "Public", personaSlugs: [] };

export function RoomEditor({ slug }: { slug?: string }) {
  const router = useRouter();
  const user = useSyncExternalStore(subscribeToAuth, getCurrentUser, () => null);
  const [form, setForm] = useState<FormState>(initialForm);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(Boolean(slug));
  const [submitting, setSubmitting] = useState(false);
  const allPersonas = useMemo(() => getPersonas().filter((persona) => persona.visibility === "Public"), []);
  const categories = useMemo(() => ["All", ...new Set(allPersonas.map((persona) => persona.category))], [allPersonas]);
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allPersonas.filter((persona) => (category === "All" || persona.category === category) && (!q || [persona.name, persona.profession, persona.category, ...persona.expertise].join(" ").toLowerCase().includes(q)));
  }, [allPersonas, category, search]);

  useEffect(() => {
    if (!user) { router.replace(`/login?next=${encodeURIComponent(slug ? `${roomPath(slug)}/edit` : "/room/create")}`); return; }
    if (!slug) return;
    let alive = true;
    void fetch(`/api/rooms/${encodeURIComponent(slug)}`, { credentials: "same-origin", cache: "no-store" }).then(async (response) => {
      const data = await response.json() as { room?: Room; canEdit?: boolean; error?: string };
      if (!alive) return;
      if (!response.ok || !data.room || !data.canEdit) { setError(data.error ?? "This Room cannot be edited."); setLoading(false); return; }
      setForm({ name: data.room.name, description: data.room.description, topic: data.room.topic, coverImage: data.room.coverImage, visibility: data.room.visibility, personaSlugs: data.room.personas.map((persona) => persona.slug) });
      setLoading(false);
    }).catch(() => { if (alive) { setError("Unable to load this Room."); setLoading(false); } });
    return () => { alive = false; };
  }, [router, slug, user]);

  const togglePersona = (personaSlug: string) => setForm((current) => current.personaSlugs.includes(personaSlug) ? { ...current, personaSlugs: current.personaSlugs.filter((selected) => selected !== personaSlug) } : current.personaSlugs.length >= 8 ? current : { ...current, personaSlugs: [...current.personaSlugs, personaSlug] });
  const selected = form.personaSlugs.map((selectedSlug) => allPersonas.find((persona) => persona.slug === selectedSlug)).filter(Boolean);

  const save = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setError("");
    if (!form.name.trim() || !form.topic.trim() || !form.personaSlugs.length) { setError("Add a Room name, topic, and at least one persona."); return; }
    setSubmitting(true);
    try {
      const response = await fetch(slug ? `/api/rooms/${encodeURIComponent(slug)}` : "/api/rooms", { method: slug ? "PATCH" : "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const data = await response.json() as { room?: Room; error?: string };
      if (!response.ok || !data.room) throw new Error(data.error ?? "Unable to save the Room.");
      router.push(roomPath(data.room.slug)); router.refresh();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to save the Room."); } finally { setSubmitting(false); }
  };

  if (loading) return <main className="mx-auto max-w-5xl py-16 text-slate-400">Loading your Room…</main>;
  return <main className="mx-auto max-w-5xl pb-10 text-white"><Link href={slug ? roomPath(slug) : "/room"} className="inline-flex items-center gap-1 text-sm text-slate-400 transition hover:text-cyan-200"><ChevronLeft className="h-4 w-4" /> Back to Rooms</Link><div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px]"><form onSubmit={save} className="rounded-[28px] border border-white/10 bg-slate-950/75 p-5 shadow-[0_18px_60px_rgba(0,0,0,0.22)] sm:p-8"><p className="text-xs font-bold uppercase tracking-[0.24em] text-cyan-300">{slug ? "Room settings" : "Create your Room"}</p><h1 className="mt-3 text-3xl font-black tracking-[-0.06em]">{slug ? "Edit your Room" : "Gather the right minds."}</h1>{error && <p role="alert" className="mt-5 rounded-xl border border-red-300/25 bg-red-500/10 px-4 py-3 text-sm text-red-100">{error}</p>}<div className="mt-8 grid gap-5"><label className="block text-sm font-semibold text-slate-200">Room name<input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} maxLength={120} placeholder="The Future of Intelligence" className="mt-2 h-12 w-full rounded-xl border border-white/10 bg-white/[0.035] px-4 text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-300/60" /></label><label className="block text-sm font-semibold text-slate-200">Description <span className="font-normal text-slate-500">optional</span><textarea value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} maxLength={1000} placeholder="What makes this group special?" className="mt-2 min-h-24 w-full rounded-xl border border-white/10 bg-white/[0.035] p-4 text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-300/60" /></label><label className="block text-sm font-semibold text-slate-200">Conversation topic<input value={form.topic} onChange={(event) => setForm((current) => ({ ...current, topic: event.target.value }))} maxLength={1000} placeholder="Can AI become conscious?" className="mt-2 h-12 w-full rounded-xl border border-white/10 bg-white/[0.035] px-4 text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-300/60" /></label></div><fieldset className="mt-8"><legend className="text-sm font-semibold text-slate-200">Visibility</legend><div className="mt-3 grid gap-3 sm:grid-cols-2">{(["Public", "Private"] as const).map((visibility) => <button key={visibility} type="button" onClick={() => setForm((current) => ({ ...current, visibility }))} className={`flex items-center gap-3 rounded-2xl border p-4 text-left transition ${form.visibility === visibility ? "border-cyan-300/60 bg-cyan-400/[0.09]" : "border-white/10 bg-white/[0.025] hover:border-white/20"}`}>{visibility === "Public" ? <Globe2 className="h-5 w-5 text-cyan-300" /> : <LockKeyhole className="h-5 w-5 text-slate-300" />}<span><strong className="block text-sm">{visibility}</strong><span className="mt-1 block text-xs text-slate-400">{visibility === "Public" ? "Anyone can discover and enter this Room." : "Only you can discover and enter this Room."}</span></span></button>)}</div></fieldset><fieldset className="mt-8"><legend className="text-sm font-semibold text-slate-200">Cover</legend><div className="mt-3 grid grid-cols-3 gap-2">{ROOM_COVER_OPTIONS.map((cover) => <button type="button" key={cover.value} onClick={() => setForm((current) => ({ ...current, coverImage: cover.value }))} className={`relative aspect-square overflow-hidden rounded-xl border ${form.coverImage === cover.value ? "border-cyan-300 ring-2 ring-cyan-300/30" : "border-white/10"}`} aria-label={`Use ${cover.label} cover`}><Image src={cover.value} alt="" fill sizes="130px" className="object-cover" /></button>)}</div></fieldset><button disabled={submitting} className="mt-8 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-cyan-300 px-5 text-sm font-black text-slate-950 transition hover:bg-cyan-200 disabled:cursor-wait disabled:opacity-70"><Sparkles className="h-4 w-4" /> {submitting ? "Saving Room…" : slug ? "Save changes" : "Create Room"}</button></form><aside className="min-w-0"><section className="rounded-[28px] border border-white/10 bg-slate-950/75 p-5 sm:p-6"><h2 className="text-lg font-black">Choose personas</h2><p className="mt-1 text-sm leading-6 text-slate-400">Select up to eight existing SoulX personas.</p><div className="relative mt-5"><Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-500" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search personas…" className="h-11 w-full rounded-xl border border-white/10 bg-white/[0.035] pl-9 pr-3 text-sm outline-none placeholder:text-slate-600 focus:border-cyan-300/60" /></div><select value={category} onChange={(event) => setCategory(event.target.value)} className="mt-2 h-10 w-full rounded-xl border border-white/10 bg-slate-900 px-3 text-sm text-slate-200 outline-none focus:border-cyan-300/60">{categories.map((item) => <option key={item}>{item}</option>)}</select><div className="mt-4 flex max-h-[21rem] flex-col gap-1 overflow-y-auto pr-1">{filtered.map((persona) => { const active = form.personaSlugs.includes(persona.slug); return <button type="button" key={persona.slug} onClick={() => togglePersona(persona.slug)} className={`flex min-h-12 items-center gap-3 rounded-xl px-2 text-left transition ${active ? "bg-cyan-400/[0.12] text-cyan-50" : "hover:bg-white/[0.05]"}`}><PersonaAvatar slug={persona.slug} name={persona.name} className="h-8 w-8" /><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{persona.name}</span><span className="block truncate text-xs text-slate-500">{persona.category}</span></span><span className={`flex h-5 w-5 items-center justify-center rounded-full border ${active ? "border-cyan-300 bg-cyan-300 text-slate-950" : "border-slate-600"}`}>{active && <Check className="h-3 w-3 stroke-[3]" />}</span></button>; })}</div></section><section className="mt-4 rounded-[24px] border border-white/10 bg-white/[0.025] p-5"><h2 className="text-sm font-bold text-slate-200">Selected personas</h2>{selected.length ? <div className="mt-4 flex flex-wrap gap-2">{selected.map((persona) => persona && <button type="button" onClick={() => togglePersona(persona.slug)} key={persona.slug} className="inline-flex items-center gap-1.5 rounded-full border border-cyan-300/25 bg-cyan-400/[0.08] py-1 pl-1 pr-2.5 text-xs text-cyan-50"><PersonaAvatar slug={persona.slug} name={persona.name} className="h-5 w-5" />{persona.name}<X className="h-3 w-3" /></button>)}</div> : <p className="mt-2 text-sm text-slate-500">None selected yet.</p>}</section></aside></div></main>;
}
