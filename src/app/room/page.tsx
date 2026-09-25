"use client";

import { BrainCircuit, Check, Lightbulb, Search, Send, Sparkles, Swords, Users, Zap } from "lucide-react";
import { useMemo, useState, useSyncExternalStore } from "react";
import { getPersonas } from "@/lib/personas";
import { PersonaAvatar } from "@/components/persona-avatar";
import { BackButton } from "@/components/back-button";
import { getCurrentUser, subscribeToAuth } from "@/lib/auth";
import { getProfilePreferences } from "@/lib/profile";
import { MessageActions } from "@/components/message-actions";

type MultiMessage = {
  id: string;
  speaker: string;
  content: string;
  tone: "assistant" | "user";
  personaSlug?: string;
};

const sessionPersonaSet = ["albert-einstein", "leonardo-da-vinci", "abraham-lincoln", "steve-jobs"];
const discussionModes = [
  { value: "Debate", label: "Debate", description: "Challenge assumptions", icon: Swords },
  { value: "Brainstorm", label: "Brainstorm", description: "Generate bold ideas", icon: Lightbulb },
  { value: "Mentor", label: "Mentor", description: "Find practical direction", icon: BrainCircuit },
] as const;

function splitPersonaResponses(content: string, participants: Array<{ name: string; slug: string }>) {
  const markers = participants.map((persona) => `[PERSONA: ${persona.name}]`);
  const responses = participants.flatMap((persona, index) => {
    const marker = markers[index];
    const start = content.indexOf(marker);
    if (start < 0) return [];
    const bodyStart = start + marker.length;
    const nextStarts = markers.slice(index + 1).map((nextMarker) => content.indexOf(nextMarker, bodyStart)).filter((position) => position >= 0);
    const end = nextStarts.length ? Math.min(...nextStarts) : content.length;
    const body = content.slice(bodyStart, end).trim();
    return body ? [{ id: crypto.randomUUID(), speaker: persona.name, content: body, tone: "assistant" as const, personaSlug: persona.slug }] : [];
  });

  return responses.length ? responses : [{ id: crypto.randomUUID(), speaker: "Discussion", content: content.trim(), tone: "assistant" as const }];
}

export default function MultiPersonaChatPage() {
  const allPersonas = getPersonas();
  const [personaQuery, setPersonaQuery] = useState("");
  const [showMore, setShowMore] = useState(false);
  const availablePersonas = useMemo(
    () => {
      const query = personaQuery.trim().toLowerCase();
      if (!query) return allPersonas;
      return allPersonas.filter((persona) => [persona.name, persona.profession, persona.category, ...persona.expertise, ...persona.tags].join(" ").toLowerCase().includes(query));
    },
    [allPersonas, personaQuery],
  );
  const visiblePersonas = useMemo(() => {
    const hasQuery = personaQuery.trim().length > 0;
    if (hasQuery || showMore) return availablePersonas;
    return availablePersonas.slice(0, 6);
  }, [availablePersonas, personaQuery, showMore]);
  const initial = useMemo(
    () => allPersonas.filter((persona) => sessionPersonaSet.includes(persona.slug)).slice(0, 3),
    [allPersonas],
  );

  const [selected, setSelected] = useState(initial);
  const [input, setInput] = useState("How should we combine scientific imagination with product design?");
  const [mode, setMode] = useState<(typeof discussionModes)[number]["value"]>("Debate");
  const [messages, setMessages] = useState<MultiMessage[]>([
    {
      id: "intro-a",
      speaker: "Albert Einstein",
      content: "The question is not only what we build, but what problem deserves our attention most.",
      tone: "assistant",
      personaSlug: "albert-einstein",
    },
    {
      id: "intro-b",
      speaker: "Leonardo da Vinci",
      content: "Observation, curiosity, and craft are the bridge between imagination and invention.",
      tone: "assistant",
      personaSlug: "leonardo-da-vinci",
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const user = useSyncExternalStore(subscribeToAuth, getCurrentUser, () => null);
  const userAvatar = user ? getProfilePreferences(user.id).avatarDataUrl ?? null : null;

  const togglePersona = (persona: (typeof initial)[number]) => {
    setSelected((current) => {
      const exists = current.some((item) => item.id === persona.id);
      if (exists) {
        if (current.length === 2) return current;
        setError("");
        return current.filter((item) => item.id !== persona.id);
      }

      if (current.length === 4) {
        setError("A focused room can include up to four personas.");
        return current;
      }

      setError("");
      return [...current, persona];
    });
  };

  const handleSubmit = async () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading || selected.length < 2) return;

    const userMessage: MultiMessage = {
      id: crypto.randomUUID(),
      speaker: "You",
      content: trimmed,
      tone: "user",
    };

    setMessages((current) => [...current, userMessage]);
    setInput("");
    setError("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat/multi", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          topic: trimmed,
          mode,
          participants: selected.map((persona) => ({
            name: persona.name,
            role: persona.profession,
            expertise: persona.expertise,
            style: persona.speakingStyle,
          })),
          conversationGoal: "Explore the topic from several expert angles while preserving distinct voices.",
          message: trimmed,
          history: messages.slice(-8).map((message) => ({
            role: message.tone === "user" ? "user" : "assistant",
            content: `${message.speaker}: ${message.content}`,
          })),
        }),
      });

      const data = (await response.json()) as { ok?: boolean; content?: string; error?: string };

      if (!response.ok || !data.ok || typeof data.content !== "string" || !data.content.trim()) {
        throw new Error(data.error ?? "The multi-persona conversation could not generate a result.");
      }

      const assistantContent = data.content.trim();

      setMessages((current) => [...current, ...splitPersonaResponses(assistantContent, selected)]);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to generate the discussion.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="mx-auto max-w-7xl px-1 py-4 text-white sm:px-2 sm:py-8">
      <section className="relative overflow-hidden rounded-[28px] border border-cyan-300/15 bg-[#050d1e] p-4 shadow-[0_24px_80px_rgba(2,8,23,0.48)] sm:rounded-[36px] sm:p-8 lg:p-10">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_80%_0%,rgba(34,211,238,0.10),transparent_26%),radial-gradient(circle_at_15%_80%,rgba(99,102,241,0.08),transparent_28%)]" />
        <div className="relative">
        <div className="mb-7 flex items-center justify-between">
          <BackButton href="/explore" label="Back" />
          <span className="inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-200"><Zap className="h-3.5 w-3.5" /> Perspective studio</span>
        </div>

        <div className="grid gap-6 border-b border-white/8 pb-8 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-300">Rooms discussion</p>
            <h1 className="mt-3 max-w-3xl text-4xl font-black leading-[0.98] tracking-[-0.06em] text-white sm:text-6xl">Build your perspective room.</h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">Bring distinct minds into one focused conversation. Compare their reasoning, uncover tensions, and leave with a clearer direction.</p>
          </div>
          <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-3">
            <div className="flex -space-x-2">
              {selected.map((persona) => <PersonaAvatar key={persona.id} slug={persona.slug} name={persona.name} className="h-9 w-9 border-2 border-[#071020]" />)}
            </div>
            <div><p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Room status</p><p className="mt-0.5 text-sm font-semibold text-white">{selected.length} minds · {mode}</p></div>
          </div>
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[0.82fr_1.18fr]">
          <div>
            <div className="flex items-end justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">01 · Discussion mode</p><h2 className="mt-2 text-2xl font-bold tracking-[-0.04em] text-white">Choose the energy</h2></div><span className="text-xs text-slate-500">One mode</span></div>
            <div className="mt-4 grid gap-2" role="group" aria-label="Discussion mode">
              {discussionModes.map((option) => {
                const Icon = option.icon;
                const active = mode === option.value;
                return <button key={option.value} type="button" onClick={() => setMode(option.value)} aria-pressed={active} className={`flex min-h-16 items-center gap-3 rounded-2xl border px-4 text-left transition duration-200 ${active ? "border-cyan-300/45 bg-cyan-400/12 shadow-[0_12px_30px_rgba(2,8,23,0.25)]" : "border-slate-700/80 bg-slate-900/75 hover:border-cyan-300/30 hover:bg-slate-800/90"}`}><span className={`flex h-10 w-10 items-center justify-center rounded-xl ${active ? "bg-cyan-400 text-slate-950" : "bg-slate-800 text-slate-300"}`}><Icon className="h-5 w-5" /></span><span><span className="block text-sm font-bold text-white">{option.label}</span><span className="mt-0.5 block text-xs text-slate-400">{option.description}</span></span>{active && <Check className="ml-auto h-4 w-4 text-cyan-300" />}</button>;
              })}
            </div>

            <div className="mt-5 flex items-center justify-between rounded-2xl border border-white/8 bg-white/2.5 p-3">
              <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl border border-cyan-300/20 bg-cyan-400/8 text-xs font-bold text-cyan-100">{userAvatar ? <img src={userAvatar} alt={user?.name ?? "User"} className="h-full w-full object-cover" /> : user?.name?.slice(0, 2).toUpperCase() ?? "GU"}</div><div><p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Speaking as</p><p className="text-sm font-semibold text-white">{user?.name ?? "Guest"}</p></div></div>
              {!user && <a href="/login" className="text-xs font-semibold text-cyan-300">Personalize</a>}
            </div>
          </div>

          <div>
            <div className="flex items-end justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">02 · Your panel</p><h2 className="mt-2 text-2xl font-bold tracking-[-0.04em] text-white">Select 2–4 minds</h2></div><span className="text-xs text-slate-500">{selected.length}/4 selected · {allPersonas.length} available</span></div>
            <label className="mt-4 flex min-h-12 items-center gap-3 rounded-2xl border border-white/10 bg-white/2.5 px-4 transition focus-within:border-cyan-300/30 focus-within:bg-white/5">
              <Search className="h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
              <span className="sr-only">Search personas</span>
              <input value={personaQuery} onChange={(event) => setPersonaQuery(event.target.value)} placeholder="Search name, category, or expertise" className="min-w-0 flex-1 bg-transparent text-sm text-white placeholder:text-slate-500 focus:outline-none" />
              {personaQuery && <button type="button" onClick={() => setPersonaQuery("")} className="text-xs font-semibold text-cyan-300">Clear</button>}
            </label>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {visiblePersonas.map((persona) => {
            const active = selected.some((item) => item.id === persona.id);

            return (
              <button
                key={persona.id}
                type="button"
                onClick={() => togglePersona(persona)}
                aria-pressed={active}
                className={`group rounded-[20px] border p-4 text-left transition duration-200 ${
                  active
                    ? "border-cyan-300/35 bg-cyan-400/10 shadow-[0_14px_35px_rgba(2,8,23,0.28)]"
                    : "border-white/8 bg-white/2.5 hover:-translate-y-0.5 hover:border-white/15 hover:bg-white/5"
                }`}
              >
                <div className="flex items-center gap-3">
                  <PersonaAvatar slug={persona.slug} name={persona.name} className="h-12 w-12 border border-cyan-300/25 shadow-[0_0_18px_rgba(34,211,238,0.15)]" />
                  <div>
                    <div className="font-bold text-white">{persona.name}</div>
                    <div className="text-[10px] uppercase tracking-[0.18em] text-slate-400">{persona.category}</div>
                  </div>
                  <span className={`ml-auto flex h-6 w-6 items-center justify-center rounded-full border ${active ? "border-cyan-300 bg-cyan-300 text-slate-950" : "border-white/10 text-transparent"}`}><Check className="h-3.5 w-3.5" /></span>
                </div>
                <p className="mt-3 line-clamp-2 text-xs leading-5 text-slate-400">{persona.shortDescription}</p>
              </button>
            );
          })}
              {visiblePersonas.length === 0 && <div className="col-span-full rounded-2xl border border-dashed border-white/10 px-5 py-10 text-center text-sm text-slate-400">No personas match your search.</div>}
            </div>
            {!personaQuery.trim() && availablePersonas.length > visiblePersonas.length && (
              <div className="mt-4 flex justify-center">
                <button
                  type="button"
                  onClick={() => setShowMore(true)}
                  className="inline-flex items-center justify-center rounded-full border border-cyan-300/30 bg-cyan-400/10 px-4 py-2 text-sm font-semibold text-cyan-200 transition hover:border-cyan-300/60 hover:bg-cyan-400/15"
                >
                  More
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="mt-10 rounded-[26px] border border-white/10 bg-slate-950/55 p-4 shadow-[0_18px_55px_rgba(2,8,23,0.35)] sm:p-6">
          <div className="mb-6 flex flex-col gap-3 border-b border-white/8 pb-5 sm:flex-row sm:items-center sm:justify-between">
            <div><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300"><Sparkles className="h-4 w-4" /> 03 · Live discussion</div><p className="mt-2 text-sm text-slate-400">{selected.map((persona) => persona.name).join(" · ")}</p></div>
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-400/8 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-200"><Users className="h-3.5 w-3.5" />{selected.length} active minds</span>
          </div>

          <div className="max-h-155 space-y-4 overflow-y-auto pr-1">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`max-w-[92%] rounded-2xl border p-4 text-sm leading-7 sm:max-w-[82%] ${
                  message.tone === "user"
                    ? "ml-auto rounded-br-md border-violet-400/20 bg-violet-500/15 text-slate-100"
                    : "rounded-bl-md border-cyan-400/20 bg-slate-900/80 text-slate-200 shadow-[0_0_18px_rgba(34,211,238,0.06)]"
                }`}
              >
                <div className="mb-2 flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-slate-400">
                  {message.personaSlug && <PersonaAvatar slug={message.personaSlug} name={message.speaker} className="h-6 w-6 border border-cyan-300/20" />}
                  <span className="font-semibold text-cyan-200">{message.speaker}</span>
                </div>
                <div className="whitespace-pre-wrap">{message.content}</div>
                {message.tone === "assistant" && <MessageActions id={`multi:${message.personaSlug ?? "discussion"}:${message.id}`} personaName={message.speaker} personaSlug={message.personaSlug} content={message.content} />}
              </div>
            ))}

            {isLoading && (
              <div className="max-w-[85%] rounded-2xl rounded-bl-md border border-cyan-400/20 bg-cyan-500/8 p-4 text-slate-200">
                <span className="inline-flex items-center gap-2">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-cyan-300" />
                  Thinking across multiple perspectives...
                </span>
              </div>
            )}
          </div>

          {error && (
            <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              {error}
            </div>
          )}

          <div className="mt-6 rounded-[22px] border border-white/10 bg-slate-900/80 p-2 focus-within:border-cyan-300/25">
            <textarea
              aria-label="Multi persona prompt"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  handleSubmit();
                }
              }}
              placeholder="Ask the group a question..."
              rows={3}
              className="min-h-20 w-full resize-none bg-transparent px-3 py-3 text-sm leading-6 text-white placeholder:text-slate-500 focus:outline-none"
            />
            <div className="flex items-center justify-between gap-3 border-t border-white/8 px-2 pt-2"><span className="text-[11px] text-slate-500">Enter to send · Shift + Enter for a new line</span><button
              type="button"
              onClick={handleSubmit}
              disabled={isLoading || selected.length < 2 || !input.trim()}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-linear-to-r from-cyan-500 to-blue-600 px-5 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(14,165,233,0.22)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-45"
            >
              <Send className="h-4 w-4" /> Send
            </button></div>
          </div>
        </div>
        </div>
      </section>
    </main>
  );
}
