"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Globe2, LockKeyhole, Plus, Share2, Trash2, Users } from "lucide-react";
import { useEffect, useState, useSyncExternalStore } from "react";
import { PersonaAvatar } from "@/components/persona-avatar";
import { getCurrentUser, subscribeToAuth } from "@/lib/auth";
import { OFFICIAL_ROOMS, roomPath, type Room } from "@/lib/rooms";

type RoomIndex = { featured?: Room[]; mine?: Room[]; community?: Room[] };

function topics(room: Room) {
  return room.topic.split("·").map((item) => item.trim()).filter(Boolean).slice(0, 4);
}

function PersonaStack({ room }: { room: Room }) {
  return <div className="flex -space-x-2" aria-label={`${room.personas.length} personas`}>
    {room.personas.slice(0, 5).map((persona) => <PersonaAvatar key={persona.slug} slug={persona.slug} name={persona.name} className="h-8 w-8 border-2 border-slate-950" />)}
    {room.personas.length > 5 && <span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-slate-950 bg-slate-700 text-[10px] font-bold text-slate-200">+{room.personas.length - 5}</span>}
  </div>;
}

function RoomCard({ room, own, onDelete }: { room: Room; own?: boolean; onDelete?: (room: Room) => void }) {
  const personaNames = room.personas.map((persona) => persona.name.split(" ").at(-1) ?? persona.name).join(" · ");
  return <article className="group overflow-hidden rounded-[26px] border border-white/10 bg-slate-950/75 shadow-[0_18px_55px_rgba(0,0,0,0.22)] transition duration-300 hover:-translate-y-1 hover:border-cyan-300/35 hover:shadow-[0_22px_65px_rgba(8,145,178,0.17)]">
    <Link href={roomPath(room.slug)} className="relative block aspect-[1.35/1] overflow-hidden bg-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cyan-300">
      <Image src={room.coverImage} alt={`${room.name} cover`} fill sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" className="object-cover transition duration-500 group-hover:scale-[1.035]" />
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent" />
      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2">
        <PersonaStack room={room} />
        <span className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-slate-950/75 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.13em] text-white backdrop-blur"><Users className="h-3 w-3" /> {room.personas.length}</span>
      </div>
    </Link>
    <div className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0"><h3 className="text-xl font-black tracking-[-0.045em] text-white">{room.name}</h3><p className="mt-1 text-sm text-cyan-100/80">{room.description}</p></div>
        {own && <span title={room.visibility} className="mt-1 shrink-0 text-slate-400">{room.visibility === "Private" ? <LockKeyhole className="h-4 w-4" /> : <Globe2 className="h-4 w-4" />}</span>}
      </div>
      <p className="mt-4 truncate text-sm text-slate-300">{personaNames}</p>
      <div className="mt-3 flex flex-wrap gap-1.5">{topics(room).map((topic) => <span key={topic} className="rounded-full bg-cyan-400/[0.08] px-2.5 py-1 text-[10px] font-semibold text-cyan-100">{topic}</span>)}</div>
      {own && room.lastActivity && <p className="mt-4 text-xs text-slate-500">Last activity {new Date(room.lastActivity).toLocaleDateString()}</p>}
      <div className="mt-5 flex flex-wrap gap-2">
        <Link href={roomPath(room.slug)} className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-cyan-300 px-3 py-2 text-sm font-bold text-slate-950 transition hover:bg-cyan-200">Enter Room <ArrowRight className="h-4 w-4" /></Link>
        {own && <>
          <Link href={`${roomPath(room.slug)}/edit`} className="inline-flex min-h-10 items-center justify-center rounded-xl border border-white/10 px-3 text-sm font-semibold text-slate-200 transition hover:border-cyan-300/35 hover:text-white">Edit</Link>
          {room.visibility === "Public" && <button type="button" onClick={() => void navigator.clipboard?.writeText(`${window.location.origin}${roomPath(room.slug)}`)} className="inline-flex min-h-10 items-center justify-center rounded-xl border border-white/10 px-3 text-slate-300 transition hover:border-cyan-300/35 hover:text-white" aria-label={`Share ${room.name}`}><Share2 className="h-4 w-4" /></button>}
          <button type="button" onClick={() => onDelete?.(room)} className="inline-flex min-h-10 items-center justify-center rounded-xl border border-red-300/15 px-3 text-red-200 transition hover:border-red-300/45 hover:bg-red-500/10" aria-label={`Delete ${room.name}`}><Trash2 className="h-4 w-4" /></button>
        </>}
      </div>
    </div>
  </article>;
}

function RoomGrid({ rooms, own, onDelete }: { rooms: Room[]; own?: boolean; onDelete?: (room: Room) => void }) {
  return <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{rooms.map((room) => <RoomCard key={room.slug} room={room} own={own} onDelete={onDelete} />)}</div>;
}

export function RoomDirectory() {
  const user = useSyncExternalStore(subscribeToAuth, getCurrentUser, () => null);
  const [featured, setFeatured] = useState<Room[]>(OFFICIAL_ROOMS);
  const [mine, setMine] = useState<Room[]>([]);
  const [community, setCommunity] = useState<Room[]>([]);
  const [notice, setNotice] = useState("");

  const load = async () => {
    const response = await fetch("/api/rooms", { credentials: "same-origin", cache: "no-store" });
    if (!response.ok) return;
    const data = await response.json() as RoomIndex;
    if (data.featured?.length) setFeatured(data.featured);
    setMine(data.mine ?? []);
    setCommunity(data.community ?? []);
  };

  // The static cards render immediately; authenticated and community data layer in after hydration.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [user?.id]);

  const deleteRoom = async (room: Room) => {
    if (!window.confirm(`Delete “${room.name}”? This permanently removes its Room and conversation history.`)) return;
    const response = await fetch(`/api/rooms/${encodeURIComponent(room.slug)}`, { method: "DELETE", credentials: "same-origin" });
    if (!response.ok) { const data = await response.json().catch(() => ({})) as { error?: string }; setNotice(data.error ?? "Unable to delete this Room."); return; }
    setNotice(`“${room.name}” was deleted.`);
    await load();
  };

  const createHref = user ? "/room/create" : "/login?next=%2Froom%2Fcreate";
  return <main className="mx-auto max-w-7xl pb-8 text-white">
    <section className="relative overflow-hidden rounded-[30px] border border-cyan-300/15 bg-[radial-gradient(circle_at_90%_5%,rgba(34,211,238,0.15),transparent_28%),radial-gradient(circle_at_5%_100%,rgba(99,102,241,0.16),transparent_33%),#061127] px-5 py-10 shadow-[0_24px_85px_rgba(2,8,23,0.52)] sm:px-8 sm:py-14 lg:px-12">
      <div aria-hidden="true" className="absolute -right-16 -top-16 h-72 w-72 rounded-full border border-cyan-300/10" />
      <div className="relative flex flex-col justify-between gap-7 sm:flex-row sm:items-end">
        <div><p className="text-xs font-bold uppercase tracking-[0.28em] text-cyan-200">SoulX Rooms</p><h1 className="mt-4 max-w-2xl text-4xl font-black tracking-[-0.07em] sm:text-5xl">Where great minds meet.</h1><p className="mt-4 max-w-xl text-sm leading-7 text-slate-300 sm:text-base">Enter a conversation where distinct perspectives can challenge, build on, and refine an idea together.</p></div>
        <Link href={createHref} className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-2xl bg-cyan-300 px-5 text-sm font-black text-slate-950 transition hover:bg-cyan-200"><Plus className="h-4 w-4" /> Create Room</Link>
      </div>
    </section>

    {notice && <p role="status" className="mt-4 rounded-xl border border-cyan-300/20 bg-cyan-400/10 px-4 py-3 text-sm text-cyan-100">{notice}</p>}
    <section className="mt-12"><div className="mb-6"><p className="text-xs font-bold uppercase tracking-[0.22em] text-cyan-300">Start here</p><h2 className="mt-2 text-3xl font-black tracking-[-0.06em]">Featured Rooms</h2></div><RoomGrid rooms={featured} /></section>
    {user && <section className="mt-14"><div className="mb-6 flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.22em] text-cyan-300">Your collection</p><h2 className="mt-2 text-3xl font-black tracking-[-0.06em]">My Rooms</h2></div><Link href="/room/create" className="text-sm font-semibold text-cyan-300 hover:text-cyan-200">Create another room →</Link></div>{mine.length ? <RoomGrid rooms={mine} own onDelete={deleteRoom} /> : <div className="rounded-[24px] border border-dashed border-white/15 bg-white/[0.025] p-7 text-sm leading-6 text-slate-400">Build a focused space around your own question, selected personas, and visibility setting.</div>}</section>}
    <section className="mt-14"><div className="mb-6"><p className="text-xs font-bold uppercase tracking-[0.22em] text-cyan-300">Open invitations</p><h2 className="mt-2 text-3xl font-black tracking-[-0.06em]">Explore Community Rooms</h2></div>{community.length ? <RoomGrid rooms={community} /> : <div className="rounded-[24px] border border-dashed border-white/15 bg-white/[0.025] p-7 text-sm leading-6 text-slate-400">Public Rooms created by the community will appear here. No activity metrics are shown until there is real activity to report.</div>}</section>
  </main>;
}
