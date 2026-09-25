"use client";

import Link from "next/link";
import { ArrowLeft, Copy, RefreshCcw, Send, Sparkles } from "lucide-react";
import { useParams } from "next/navigation";
import { useMemo, useState, useSyncExternalStore } from "react";
import {
  customPersonaToPersona,
  getCustomPersonasSnapshot,
  parseCustomPersonasSnapshot,
  subscribeToCustomPersonas,
} from "@/lib/custom-personas";
import { getPersonaBySlug } from "@/lib/personas";
import { PersonaAvatar } from "@/components/persona-avatar";
import { MessageActions } from "@/components/message-actions";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

const nexusExpertises = ["Software Engineering", "Artificial Intelligence", "Medicine & Health", "Law", "Business & Entrepreneurship", "Finance & Investing", "Psychology", "Science", "Engineering", "Education & Research"] as const;

export default function ChatPage() {
  const params = useParams<{ conversationId: string }>();
  const personaKey = params?.conversationId ?? "";
  const staticPersona = useMemo(() => getPersonaBySlug(personaKey), [personaKey]);
  const customPersonasSnapshot = useSyncExternalStore(subscribeToCustomPersonas, getCustomPersonasSnapshot, () => "__loading__");
  const customPersona = useMemo(
    () => parseCustomPersonasSnapshot(customPersonasSnapshot).find((item) => item.id === personaKey),
    [personaKey, customPersonasSnapshot],
  );
  const persona = staticPersona ?? (customPersona ? customPersonaToPersona(customPersona) : undefined);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        `Good to see you. What question has been occupying your mind?`,
    },
  ]);
  const [conversationRecordId] = useState(() => crypto.randomUUID());
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedExpertise, setSelectedExpertise] = useState<string | null>(null);
  const [showExpertiseChooser, setShowExpertiseChooser] = useState(true);
  const conversationMessages = useMemo(
    () =>
      customPersona
        ? messages.map((message) =>
            message.id === "welcome" ? { ...message, content: customPersona.greeting } : message,
          )
        : messages,
    [customPersona, messages],
  );

  if (!staticPersona && customPersonasSnapshot === "__loading__") {
    return <div className="flex min-h-[60vh] items-center justify-center p-8 text-sm text-slate-300">Loading your persona...</div>;
  }

  if (!persona) {
    return (
      <main className="mx-auto flex min-h-[60vh] max-w-xl items-center justify-center px-4 py-12 text-center text-white">
        <div className="rounded-[28px] border border-white/10 bg-slate-950/70 p-8">
          <h1 className="text-2xl font-bold">Persona not found</h1>
          <p className="mt-3 text-sm leading-6 text-slate-400">This custom persona may have been removed from this browser.</p>
          <Link href="/create" className="mt-6 inline-flex rounded-full bg-cyan-500 px-5 py-2.5 text-sm font-semibold text-slate-950">Open Persona Builder</Link>
        </div>
      </main>
    );
  }

  if (persona.slug === "nexus" && (!selectedExpertise || showExpertiseChooser)) {
    return (
      <main className="mx-auto flex min-h-screen max-w-5xl items-center px-4 py-10 text-white sm:px-6 lg:px-8">
        <section className="w-full rounded-[32px] border border-cyan-300/20 bg-slate-950/75 p-6 shadow-[0_24px_90px_rgba(2,8,23,0.55)] sm:p-10">
          <div className="mx-auto max-w-3xl text-center">
            <PersonaAvatar slug="nexus" name="NEXUS" className="mx-auto h-24 w-24 border-2 border-cyan-300/40 shadow-[0_0_35px_rgba(34,211,238,0.3)]" />
            <p className="mt-7 text-xs font-bold uppercase tracking-[0.28em] text-cyan-300">NEXUS · One Mind. Ten Expertises.</p>
            <h1 className="mt-4 text-4xl font-black tracking-[-0.07em] sm:text-6xl">Choose Your Expertise</h1>
            <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-slate-400">Select one focus for this conversation. NEXUS will keep every answer centered on your choice.</p>
          </div>
          <div className="mx-auto mt-9 grid max-w-4xl gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {nexusExpertises.map((expertise) => <button key={expertise} type="button" onClick={() => { setSelectedExpertise(expertise); setShowExpertiseChooser(false); }} className="rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-4 text-left text-sm font-semibold text-slate-100 transition hover:-translate-y-0.5 hover:border-cyan-300/45 hover:bg-cyan-400/10">{expertise}</button>)}
          </div>
        </section>
      </main>
    );
  }

  const handleSubmit = async (value?: string) => {
    const trimmed = (value ?? input).trim();
    if (!trimmed || isLoading) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmed,
    };

    setMessages((current) => [...current, userMessage]);
    setInput("");
    setError("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          personaSlug: persona.slug,
          userMessage: trimmed,
          mode: "Casual",
          language: "en",
          history: conversationMessages.map((message) => ({
            role: message.role,
            content: message.content,
          })),
          memory: [
            "User prefers concise and clear explanations.",
            `${persona.name} should maintain a ${persona.tone.toLowerCase()} voice.`,
          ],
          selectedExpertise: persona.slug === "nexus" ? selectedExpertise : undefined,
          customPersona: customPersona ?? undefined,
          conversationId: conversationRecordId,
        }),
      });

      const data = (await response.json()) as { ok?: boolean; content?: string; error?: string };

      if (!response.ok || !data.ok || typeof data.content !== "string" || !data.content.trim()) {
        throw new Error(data.error ?? "The AI service could not generate a response.");
      }

      const assistantContent = data.content.trim();

      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: assistantContent,
        },
      ]);
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : "Something went wrong.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-6 px-4 py-8 text-white sm:px-6 lg:px-8">
      <header className="rounded-[28px] border border-cyan-400/15 bg-slate-950/75 p-4 shadow-[0_0_30px_rgba(34,211,238,0.08)] backdrop-blur-xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Link href={customPersona ? "/create" : "/explore"} className="rounded-full border border-white/10 bg-white/5 p-2 text-slate-200 transition hover:border-cyan-400/50 hover:text-cyan-200">
              <ArrowLeft className="h-4 w-4" />
            </Link>

            <PersonaAvatar slug={persona.slug} name={persona.name} className="h-12 w-12 border border-cyan-300/30 shadow-[0_0_18px_rgba(34,211,238,0.25)]" />

            <div>
              <h1 className="text-xl font-bold tracking-[-0.05em] text-white">{persona.name}{persona.slug === "nexus" && selectedExpertise ? ` · ${selectedExpertise}` : ""}</h1>
              <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">{persona.slug === "nexus" ? "Selected expertise" : persona.profession}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            {persona.slug === "nexus" && <button type="button" onClick={() => setShowExpertiseChooser(true)} className="rounded-full border border-cyan-300/25 bg-cyan-400/10 px-3 py-2 text-sm text-cyan-100 transition hover:border-cyan-300/50">Change Expertise</button>}
            <button type="button" className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 transition hover:border-cyan-400/40 hover:text-cyan-200">
              Regenerate
            </button>
            <button type="button" className="rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-[0_0_22px_rgba(34,211,238,0.35)] transition hover:brightness-110">
              New conversation
            </button>
          </div>
        </div>
      </header>

      <div className="grid flex-1 gap-6 lg:grid-cols-[1.55fr_0.75fr]">
        <section className="flex min-h-[560px] flex-col rounded-[30px] border border-white/10 bg-slate-950/60 p-4 shadow-[0_0_30px_rgba(15,23,42,0.8)] sm:p-6">
          <div className="mb-4 flex items-center justify-between border-b border-white/10 pb-4">
            <div>
              <p className="text-[10px] uppercase tracking-[0.22em] text-cyan-300">Conversation</p>
              <h2 className="mt-1 text-2xl font-bold tracking-[-0.06em] text-white">{persona.name}{persona.slug === "nexus" && selectedExpertise ? ` · ${selectedExpertise}` : ""} • Casual</h2>
            </div>
            <div className="rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.18em] text-cyan-200">
              {isLoading ? "Thinking..." : "Live"}
            </div>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto rounded-[24px] border border-white/5 bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.08),_transparent_35%),rgba(15,23,42,0.85)] p-4">
            {conversationMessages.map((message) => (
              <div
                key={message.id}
                className={`max-w-[88%] rounded-2xl border p-4 leading-7 ${
                  message.role === "user"
                    ? "ml-auto rounded-br-md border-violet-400/20 bg-violet-500/15 text-slate-100 shadow-[0_0_18px_rgba(168,85,247,0.08)]"
                    : "rounded-bl-md border-cyan-400/15 bg-cyan-500/8 text-slate-200"
                }`}
              >
                {message.content}
                {message.role === "assistant" && <MessageActions id={`${persona.slug}:${message.id}`} personaName={persona.name} personaSlug={persona.slug} content={message.content} />}
              </div>
            ))}

            {isLoading && (
              <div className="max-w-[88%] rounded-2xl rounded-bl-md border border-cyan-400/20 bg-cyan-500/8 p-4 text-slate-200 shadow-[0_0_16px_rgba(34,211,238,0.08)]">
                <span className="inline-flex items-center gap-2">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-cyan-300" />
                  Generating response...
                </span>
              </div>
            )}
          </div>

          {error && (
            <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              {error}
            </div>
          )}

          <div className="mt-5 flex flex-col gap-2 rounded-[22px] border border-white/10 bg-slate-900/75 p-2 sm:flex-row">
            <input
              aria-label="Message"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  handleSubmit();
                }
              }}
              placeholder="Type your message..."
              className="min-w-0 flex-1 rounded-full border border-white/5 bg-transparent px-4 py-3 text-sm text-white placeholder:text-slate-400 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => handleSubmit()}
              disabled={isLoading}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-[0_0_20px_rgba(34,211,238,0.28)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Send className="h-4 w-4" /> Send
            </button>
          </div>
        </section>

        <aside className="space-y-6">
          <div className="rounded-[26px] border border-white/10 bg-slate-950/65 p-5 shadow-[0_0_24px_rgba(15,23,42,0.8)]">
            <p className="text-[10px] uppercase tracking-[0.2em] text-cyan-300">Controls</p>
            <div className="mt-4 space-y-3">
              <button type="button" className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/3 px-3 py-2.5 text-sm text-slate-200 transition hover:border-cyan-400/40 hover:text-cyan-100">
                <span>Copy message</span>
                <Copy className="h-4 w-4" />
              </button>
              <button type="button" className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/3 px-3 py-2.5 text-sm text-slate-200 transition hover:border-cyan-400/40 hover:text-cyan-100">
                <span>Regenerate answer</span>
                <RefreshCcw className="h-4 w-4" />
              </button>
              <button type="button" className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/3 px-3 py-2.5 text-sm text-slate-200 transition hover:border-cyan-400/40 hover:text-cyan-100">
                <span>Research mode</span>
                <Sparkles className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="rounded-[26px] border border-white/10 bg-slate-950/65 p-5 shadow-[0_0_24px_rgba(15,23,42,0.8)]">
            <p className="text-[10px] uppercase tracking-[0.2em] text-cyan-300">Suggested prompts</p>
            <ul className="mt-4 space-y-3 text-sm text-slate-200">
              {persona.suggestedPrompts.map((prompt) => (
                <li key={prompt}>
                  <button
                    type="button"
                    onClick={() => handleSubmit(prompt)}
                    disabled={isLoading}
                    className="w-full rounded-xl border border-white/10 bg-slate-900/80 px-3 py-2.5 text-left transition hover:border-cyan-400/40 hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {prompt}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </main>
  );
}
