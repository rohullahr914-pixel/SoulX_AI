"use client";

import Image from "next/image";
import Link from "next/link";
import { AtSign, ChevronLeft, ChevronRight, Copy, LoaderCircle, LockKeyhole, Send, Share2, Sparkles } from "lucide-react";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { PersonaAvatar } from "@/components/persona-avatar";
import { getCurrentUser, subscribeToAuth } from "@/lib/auth";
import { OFFICIAL_ROOMS, roomPath, type Room, type RoomMessage, type RoomPersona } from "@/lib/rooms";

function isRoom(value: unknown): value is Room {
  return Boolean(value) && typeof value === "object" && typeof (value as Room).slug === "string" && Array.isArray((value as Room).personas);
}

function Message({ message, room }: { message: RoomMessage; room: Room }) {
  const persona = message.personaSlug ? room.personas.find((item) => item.slug === message.personaSlug) : null;
  if (message.role === "user") return <div className="flex justify-end"><div className="max-w-[88%] rounded-[22px] rounded-br-md bg-cyan-300 px-4 py-3 text-sm leading-6 text-slate-950 shadow-[0_8px_25px_rgba(34,211,238,0.15)]"><span className="mb-1 block text-[10px] font-black uppercase tracking-[0.18em] text-slate-700">You</span>{message.content}</div></div>;
  return <div className="flex items-start gap-3"><PersonaAvatar slug={persona?.slug ?? ""} name={persona?.name ?? "SoulX"} className="mt-1 h-9 w-9 border border-cyan-300/20" /><div className="min-w-0 max-w-[88%] rounded-[22px] rounded-tl-md border border-white/10 bg-white/[0.045] px-4 py-3 text-sm leading-6 text-slate-200"><span className="mb-1 block text-xs font-black text-cyan-200">{persona?.name ?? "Room participant"}</span>{message.content}</div></div>;
}

function ParticipantRail({ personas }: { personas: RoomPersona[] }) {
  return <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">{personas.map((persona) => <div key={persona.slug} className="flex shrink-0 items-center gap-2 rounded-full border border-white/10 bg-white/[0.035] py-1 pl-1 pr-3"><PersonaAvatar slug={persona.slug} name={persona.name} className="h-7 w-7" /><span className="max-w-28 truncate text-xs font-semibold text-slate-200">{persona.name}</span></div>)}</div>;
}

export function RoomChat({ slug }: { slug: string }) {
  const router = useRouter();
  const user = useSyncExternalStore(subscribeToAuth, getCurrentUser, () => null);
  const [room, setRoom] = useState<Room | null>(() => OFFICIAL_ROOMS.find((item) => item.slug === slug) ?? null);
  const [messages, setMessages] = useState<RoomMessage[]>([]);
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [copied, setCopied] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);

  const mentions = useMemo(() => {
    const query = input.match(/(?:^|\s)@([^@]*)$/)?.[1]?.trim().toLowerCase();
    if (!query || !room) return [];
    return room.personas.filter((persona) => persona.name.toLowerCase().includes(query)).slice(0, 5);
  }, [input, room]);

  const loadRoom = async () => {
    const response = await fetch(`/api/rooms/${encodeURIComponent(slug)}`, { credentials: "same-origin", cache: "no-store" });
    const data = await response.json().catch(() => ({})) as { room?: unknown; error?: string };
    if (!response.ok || !isRoom(data.room)) { setError(data.error ?? "This Room could not be found."); setLoading(false); return; }
    setRoom(data.room); setLoading(false);
  };
  const loadMessages = async () => {
    if (!user) { setMessages([]); return; }
    const response = await fetch(`/api/rooms/${encodeURIComponent(slug)}/messages`, { credentials: "same-origin", cache: "no-store" });
    const data = await response.json().catch(() => ({})) as { messages?: RoomMessage[]; hasMore?: boolean };
    if (response.ok) { setMessages(data.messages ?? []); setHasMore(Boolean(data.hasMore)); }
  };

  // Fetches resolve asynchronously; the Room is rendered from the static fallback meanwhile.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void loadRoom(); }, [slug]);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void loadMessages(); }, [slug, user?.id]);
  useEffect(() => { bottom.current?.scrollIntoView({ behavior: messages.length > 1 ? "smooth" : "auto" }); }, [messages, sending]);

  const selectMention = (persona: RoomPersona) => setInput((current) => current.replace(/@[^@]*$/, `@${persona.name} `));
  const send = async () => {
    const content = input.trim();
    if (!content || sending || !room) return;
    if (!user) { router.push(`/login?next=${encodeURIComponent(roomPath(slug))}`); return; }
    const optimistic: RoomMessage = { id: crypto.randomUUID(), role: "user", content, createdAt: new Date().toISOString() };
    setMessages((current) => [...current, optimistic]); setInput(""); setError(""); setSending(true);
    try {
      const response = await fetch(`/api/rooms/${encodeURIComponent(slug)}/messages`, { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: content }) });
      const data = await response.json().catch(() => ({})) as { messages?: RoomMessage[]; error?: string };
      if (!response.ok || !data.messages?.length) throw new Error(data.error ?? "The Room could not respond.");
      setMessages((current) => [...current, ...data.messages!]);
    } catch (caught) { setMessages((current) => current.filter((message) => message.id !== optimistic.id)); setInput(content); setError(caught instanceof Error ? caught.message : "The Room could not respond."); } finally { setSending(false); }
  };
  const loadOlder = async () => {
    const first = messages[0]; if (!first) return;
    const response = await fetch(`/api/rooms/${encodeURIComponent(slug)}/messages?before=${encodeURIComponent(first.createdAt)}`, { credentials: "same-origin", cache: "no-store" });
    const data = await response.json().catch(() => ({})) as { messages?: RoomMessage[]; hasMore?: boolean };
    if (response.ok) { setMessages((current) => [...(data.messages ?? []), ...current]); setHasMore(Boolean(data.hasMore)); }
  };
  const share = async () => {
    const url = window.location.href;
    if (navigator.share) { await navigator.share({ title: room?.name, url }); return; }
    await navigator.clipboard?.writeText(url); setCopied(true); window.setTimeout(() => setCopied(false), 1800);
  };

  if (loading && !room) return <main className="mx-auto max-w-5xl py-16 text-slate-400">Loading Room…</main>;
  if (!room) return <main className="mx-auto max-w-5xl py-16"><h1 className="text-3xl font-black">Room not found</h1><Link className="mt-5 inline-block text-cyan-300" href="/room">Return to Rooms</Link></main>;
  return <main className="mx-auto max-w-6xl pb-8 text-white"><Link href="/room" className="inline-flex items-center gap-1 text-sm text-slate-400 transition hover:text-cyan-200"><ChevronLeft className="h-4 w-4" /> All Rooms</Link><section className="mt-5 overflow-hidden rounded-[30px] border border-white/10 bg-slate-950/75 shadow-[0_24px_75px_rgba(0,0,0,0.26)]"><div className="relative min-h-52 overflow-hidden border-b border-white/10 px-5 py-6 sm:min-h-56 sm:px-8"><Image src={room.coverImage} alt="" fill priority sizes="(max-width: 768px) 100vw, 1152px" className="object-cover opacity-50" /><div className="absolute inset-0 bg-gradient-to-r from-[#061127]/95 via-[#061127]/74 to-[#061127]/30" /><div className="relative flex h-full min-h-40 flex-col justify-between gap-5"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.24em] text-cyan-200">SoulX Room</p><h1 className="mt-2 text-3xl font-black tracking-[-0.065em] sm:text-4xl">{room.name}</h1><p className="mt-2 text-sm text-cyan-50/90">{room.description}</p></div>{room.visibility === "Public" ? <button type="button" onClick={() => void share()} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/20 bg-slate-950/50 px-3 text-sm font-semibold backdrop-blur transition hover:border-cyan-300/60"><Share2 className="h-4 w-4" /> <span className="hidden sm:inline">{copied ? "Copied" : "Share"}</span></button> : <span className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-slate-950/50 px-3 py-2 text-xs font-semibold text-slate-200"><LockKeyhole className="h-4 w-4" /> Private</span>}</div><div><p className="mb-2 text-xs font-semibold text-cyan-100">Topic · {room.topic}</p><ParticipantRail personas={room.personas} /></div></div></div><div className="grid min-h-[570px] lg:grid-cols-[minmax(0,1fr)_250px]"><section className="flex min-w-0 flex-col"><div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5 sm:p-7">{hasMore && <button type="button" onClick={() => void loadOlder()} className="mx-auto flex items-center gap-1 text-xs font-semibold text-cyan-300 hover:text-cyan-100">Load earlier messages <ChevronRight className="h-3 w-3" /></button>}{!messages.length && <div className="rounded-2xl border border-cyan-300/15 bg-cyan-400/[0.05] p-5"><p className="text-xs font-bold uppercase tracking-[0.19em] text-cyan-300">Conversation starter</p><p className="mt-2 text-base leading-7 text-slate-200">“{room.starterPrompt || room.topic}”</p><button type="button" onClick={() => setInput(room.starterPrompt || room.topic)} className="mt-4 text-sm font-bold text-cyan-300 hover:text-cyan-100">Use this prompt →</button></div>}{messages.map((message) => <Message key={message.id} message={message} room={room} />)}{sending && <div className="flex items-center gap-3 text-sm text-cyan-100"><LoaderCircle className="h-4 w-4 animate-spin text-cyan-300" /> Choosing the most relevant perspective…</div>}<div ref={bottom} /></div>{error && <p role="alert" className="mx-5 mb-3 rounded-xl border border-red-300/25 bg-red-500/10 px-4 py-3 text-sm text-red-100">{error}</p>}<div className="relative border-t border-white/10 bg-slate-950/80 p-3 sm:p-4">{mentions.length > 0 && <div className="absolute bottom-[calc(100%+0.35rem)] left-3 right-3 z-10 overflow-hidden rounded-2xl border border-cyan-300/25 bg-slate-900 p-1 shadow-2xl sm:left-4 sm:right-auto sm:w-80">{mentions.map((persona) => <button type="button" key={persona.slug} onClick={() => selectMention(persona)} className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition hover:bg-cyan-400/[0.1]"><PersonaAvatar slug={persona.slug} name={persona.name} className="h-7 w-7" /><span className="text-sm font-semibold">{persona.name}</span></button>)}</div>}<div className="flex items-end gap-2 rounded-2xl border border-white/10 bg-white/[0.035] px-3 py-2 focus-within:border-cyan-300/60"><AtSign className="mb-2.5 h-4 w-4 shrink-0 text-slate-500" /><textarea value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void send(); } }} rows={1} maxLength={12000} placeholder="Ask the room, or mention @Einstein…" className="max-h-32 min-h-8 flex-1 resize-y bg-transparent py-1 text-sm leading-6 outline-none placeholder:text-slate-600" /><button type="button" disabled={!input.trim() || sending} onClick={() => void send()} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cyan-300 text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-40" aria-label="Send message"><Send className="h-4 w-4" /></button></div><p className="mt-2 text-[11px] text-slate-500">Enter to send · Shift + Enter for a new line · @ mentions choose who responds.</p></div></section><aside className="hidden border-l border-white/10 bg-white/[0.018] p-5 lg:block"><p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-300">In this Room</p><div className="mt-4 space-y-3">{room.personas.map((persona) => <div key={persona.slug} className="flex items-center gap-3"><PersonaAvatar slug={persona.slug} name={persona.name} className="h-9 w-9" /><div className="min-w-0"><p className="truncate text-sm font-bold">{persona.name}</p><p className="truncate text-xs text-slate-500">{persona.category || "SoulX persona"}</p></div></div>)}</div><div className="mt-8 rounded-2xl border border-cyan-300/15 bg-cyan-400/[0.055] p-4 text-xs leading-5 text-slate-300"><Sparkles className="mb-2 h-4 w-4 text-cyan-300" />SoulX selects one to three relevant personas for each question. Mention a persona to direct the response.</div>{!user && <Link href={`/login?next=${encodeURIComponent(roomPath(slug))}`} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-cyan-300/30 px-3 py-2.5 text-sm font-bold text-cyan-100 transition hover:bg-cyan-400/[0.08]"><Copy className="h-4 w-4" /> Log in to save chat</Link>}</aside></div></section></main>;
}
