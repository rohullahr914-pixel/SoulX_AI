"use client";

import Link from "next/link";
import { ArrowLeft, Check, Copy, Mic2, MoreHorizontal, PanelRightClose, PanelRightOpen, Plus, RefreshCcw, Send, Sparkles, Volume2, X } from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { customPersonaToPersona, getCustomPersonasSnapshot, parseCustomPersonasSnapshot, subscribeToCustomPersonas } from "@/lib/custom-personas";
import { getPersonaBySlug } from "@/lib/personas";
import { MessageActions } from "@/components/message-actions";
import { PersonaAvatar } from "@/components/persona-avatar";
import { VoiceConversation } from "@/components/voice-conversation";

type ChatMessage = { id: string; role: "user" | "assistant"; content: string; recordingUrl?: string; voiceTranscript?: boolean };
const WELCOME: ChatMessage = { id: "welcome", role: "assistant", content: "Good to see you. What question has been occupying your mind?" };
const EXPERTISES = ["Software Engineering", "Artificial Intelligence", "Medicine & Health", "Law", "Business & Entrepreneurship", "Finance & Investing", "Psychology", "Science", "Engineering", "Education & Research"];

export function ChatExperience() {
  const params = useParams<{ conversationId: string }>();
  const personaKey = params?.conversationId ?? "";
  const personaSlug = personaKey === "lyra-2099" ? "lyra-voss" : personaKey;
  const staticPersona = useMemo(() => getPersonaBySlug(personaSlug), [personaSlug]);
  const customSnapshot = useSyncExternalStore(subscribeToCustomPersonas, getCustomPersonasSnapshot, () => "__loading__");
  const customPersona = useMemo(() => parseCustomPersonasSnapshot(customSnapshot).find((item) => item.id === personaKey), [customSnapshot, personaKey]);
  const persona = staticPersona ?? (customPersona ? customPersonaToPersona(customPersona) : undefined);
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME]);
  const [conversationId, setConversationId] = useState(() => crypto.randomUUID());
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [researchMode, setResearchMode] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(true);
  const [mobileToolsOpen, setMobileToolsOpen] = useState(false);
  const [expertise, setExpertise] = useState<string | null>(null);
  const [choosingExpertise, setChoosingExpertise] = useState(true);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const visibleMessages = useMemo(() => customPersona ? messages.map((message) => message.id === "welcome" ? { ...message, content: customPersona.greeting } : message) : messages, [customPersona, messages]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: messages.length > 1 ? "smooth" : "auto", block: "end" }); }, [isLoading, messages.length]);
  useEffect(() => {
    if (!mobileToolsOpen) return;
    const oldOverflow = document.body.style.overflow;
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") setMobileToolsOpen(false); };
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", close);
    return () => { document.body.style.overflow = oldOverflow; document.removeEventListener("keydown", close); };
  }, [mobileToolsOpen]);

  if (!staticPersona && customSnapshot === "__loading__") return <div className="flex min-h-[60vh] items-center justify-center p-8 text-sm text-slate-300">Loading your persona...</div>;
  if (!persona) return <main className="mx-auto flex min-h-[60vh] max-w-xl items-center justify-center px-4 text-center"><div className="rounded-[28px] border border-white/10 bg-slate-950/70 p-8"><h1 className="text-2xl font-bold">Persona not found</h1><p className="mt-3 text-sm text-slate-400">This custom persona may have been removed from this browser.</p><Link href="/create" className="mt-6 inline-flex rounded-full bg-cyan-500 px-5 py-2.5 text-sm font-semibold text-slate-950">Open Persona Builder</Link></div></main>;

  if (persona.slug === "nexus" && (!expertise || choosingExpertise)) return (
    <main className="mx-auto flex min-h-screen max-w-5xl items-center px-4 py-10 text-white">
      <section className="w-full rounded-[32px] border border-cyan-300/20 bg-slate-950/75 p-6 shadow-[0_24px_90px_rgba(2,8,23,0.55)] sm:p-10">
        <div className="mx-auto max-w-3xl text-center"><PersonaAvatar slug="nexus" name="NEXUS" className="mx-auto h-24 w-24 border-2 border-cyan-300/40 shadow-[0_0_35px_rgba(34,211,238,0.3)]" /><p className="mt-7 text-xs font-bold uppercase tracking-[0.28em] text-cyan-300">NEXUS · One Mind. Ten Expertises.</p><h1 className="mt-4 text-4xl font-black tracking-[-0.07em] sm:text-6xl">Choose Your Expertise</h1><p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-slate-400">Select one focus for this conversation.</p></div>
        <div className="mx-auto mt-9 grid max-w-4xl gap-3 sm:grid-cols-2 lg:grid-cols-3">{EXPERTISES.map((item) => <button key={item} type="button" onClick={() => { setExpertise(item); setChoosingExpertise(false); }} className="rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-4 text-left text-sm font-semibold transition hover:border-cyan-300/45 hover:bg-cyan-400/10">{item}</button>)}</div>
      </section>
    </main>
  );

  async function requestAnswer(userMessage: string, history: ChatMessage[]) {
    if (!persona) return;
    setError(""); setIsLoading(true);
    try {
      const response = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
        personaSlug: persona.slug, userMessage, mode: researchMode ? "Research" : "Casual", researchMode,
        language: /[\u0600-\u06ff]/.test(userMessage) ? "fa" : "en",
        history: history.map(({ role, content }) => ({ role, content })),
        memory: ["User prefers concise and clear explanations.", `${persona.name} should maintain a ${persona.tone.toLowerCase()} voice.`],
        selectedExpertise: persona.slug === "nexus" ? expertise : undefined, customPersona: customPersona ?? undefined, conversationId,
      }) });
      const data = await response.json() as { ok?: boolean; content?: string; error?: string };
      if (!response.ok || !data.ok || !data.content?.trim()) throw new Error(data.error ?? "The AI service could not generate a response.");
      setMessages((current) => [...current, { id: crypto.randomUUID(), role: "assistant", content: data.content!.trim() }]);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Something went wrong."); }
    finally { setIsLoading(false); }
  }

  function submit(value?: string, recordingUrl?: string) {
    const text = (value ?? input).trim();
    if (!text || isLoading) return;
    const history = visibleMessages;
    setMessages((current) => [...current, { id: crypto.randomUUID(), role: "user", content: text, recordingUrl }]);
    setInput(""); if (inputRef.current) inputRef.current.style.height = "auto";
    void requestAnswer(text, history);
  }

  function regenerate() {
    if (isLoading) return;
    const assistantIndex = messages.findLastIndex((message) => message.role === "assistant" && message.id !== "welcome");
    if (assistantIndex < 0) { setStatus("Ask a question first."); return; }
    const userIndex = messages.slice(0, assistantIndex).findLastIndex((message) => message.role === "user");
    if (userIndex < 0) return;
    const next = messages.slice(0, assistantIndex);
    setMessages(next); setStatus("Generating a fresh answer...");
    void requestAnswer(messages[userIndex].content, next.slice(0, userIndex));
  }

  function newConversation() { setMessages([WELCOME]); setConversationId(crypto.randomUUID()); setInput(""); setError(""); setStatus("New conversation started."); inputRef.current?.focus(); }
  async function copyLast() { const answer = visibleMessages.findLast((message) => message.role === "assistant"); if (answer) try { await navigator.clipboard.writeText(answer.content); setStatus("Answer copied."); } catch { setStatus("Copy is unavailable in this browser."); } }
  function speak(content: string) { if (!("speechSynthesis" in window)) return setStatus("Read aloud is unavailable in this browser."); window.speechSynthesis.cancel(); const speech = new SpeechSynthesisUtterance(content); speech.lang = /[\u0600-\u06ff]/.test(content) ? "fa-IR" : "en-US"; window.speechSynthesis.speak(speech); setStatus("Reading the answer aloud."); }
  const onVoiceTranscript = (message: ChatMessage) => setMessages((current) => current.some((item) => item.id === message.id) ? current : [...current, { ...message, voiceTranscript: true }]);

  const tools = <div className="space-y-5">
    <div><div className="flex items-center justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[0.22em] text-cyan-300">Conversation tools</p><p className="mt-1 text-xs text-slate-500">Quick actions for this chat</p></div><Sparkles className="h-4 w-4 text-cyan-300" /></div>
      <div className="mt-4 space-y-2">
        <button type="button" onClick={() => void copyLast()} className="chat-tool"><span>Copy last answer</span><Copy className="h-4 w-4" /></button>
        <button type="button" onClick={regenerate} disabled={isLoading} className="chat-tool"><span>Regenerate answer</span><RefreshCcw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} /></button>
        <button type="button" onClick={() => setResearchMode((active) => !active)} aria-pressed={researchMode} className={`chat-tool ${researchMode ? "border-violet-300/35 bg-violet-400/10 text-violet-100" : ""}`}><span className="flex items-center gap-2"><Sparkles className="h-4 w-4" />Research mode</span><span className={`flex h-5 w-9 items-center rounded-full p-0.5 ${researchMode ? "justify-end bg-violet-400" : "justify-start bg-slate-700"}`}><span className="h-4 w-4 rounded-full bg-white" /></span></button>
      </div>
    </div>
    <div className="border-t border-white/8 pt-5"><p className="text-[10px] font-bold uppercase tracking-[0.22em] text-cyan-300">Suggested prompts</p><div className="mt-3 space-y-2">{persona.suggestedPrompts.slice(0, 4).map((prompt) => <button key={prompt} type="button" onClick={() => { submit(prompt); setMobileToolsOpen(false); }} disabled={isLoading} className="flex w-full items-start gap-3 rounded-2xl border border-white/8 bg-slate-900/60 px-3 py-3 text-left text-xs leading-5 text-slate-300 transition hover:border-cyan-300/30 hover:bg-cyan-400/[0.06] hover:text-white disabled:opacity-50"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-300" />{prompt}</button>)}</div></div>
    {status && <p role="status" className="rounded-xl border border-cyan-300/15 bg-cyan-400/[0.06] px-3 py-2 text-xs text-cyan-100">{status}</p>}
  </div>;

  return <main className="mx-auto flex h-[calc(100dvh-7.5rem)] min-h-[620px] w-full max-w-none flex-col gap-3 pb-2 text-white sm:h-[calc(100dvh-9rem)] sm:min-h-[680px] sm:gap-4 lg:h-[calc(100dvh-10rem)]">
    <header className="flex shrink-0 items-center justify-between gap-3 rounded-[22px] border border-cyan-400/15 bg-slate-950/80 p-2.5 shadow-[0_12px_40px_rgba(2,8,23,0.35)] backdrop-blur-xl sm:rounded-[26px] sm:px-4 sm:py-3">
      <div className="flex min-w-0 items-center gap-2.5"><Link href={customPersona ? "/create" : "/explore"} aria-label="Back" className="chat-icon-button"><ArrowLeft className="h-4 w-4" /></Link><div className="relative shrink-0"><PersonaAvatar slug={persona.slug} name={persona.name} className="h-10 w-10 border border-cyan-300/35 shadow-[0_0_20px_rgba(34,211,238,0.28)] sm:h-12 sm:w-12" /><span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-slate-950 bg-emerald-400" /></div><div className="min-w-0"><div className="flex items-center gap-2"><h1 className="truncate text-base font-bold tracking-[-0.04em] sm:text-xl">{persona.name}{expertise ? ` · ${expertise}` : ""}</h1>{researchMode && <span className="hidden rounded-full border border-violet-300/25 bg-violet-400/10 px-2 py-0.5 text-[9px] font-bold uppercase text-violet-200 sm:inline">Research</span>}</div><p className="truncate text-[9px] uppercase tracking-[0.16em] text-slate-500 sm:text-[10px]">{isLoading ? "Thinking..." : `${persona.profession} · Online`}</p></div></div>
      <div className="flex shrink-0 items-center gap-2">{persona.slug === "nexus" && <button type="button" onClick={() => setChoosingExpertise(true)} className="hidden rounded-full border border-cyan-300/25 bg-cyan-400/10 px-3 py-2 text-xs text-cyan-100 sm:block">Change expertise</button>}<button type="button" onClick={newConversation} className="chat-icon-button w-auto gap-2 px-3"><Plus className="h-4 w-4" /><span className="hidden sm:inline">New chat</span></button><button type="button" onClick={() => setMobileToolsOpen(true)} aria-label="Open tools" className="chat-icon-button border-cyan-300/25 bg-cyan-400/10 text-cyan-100 lg:hidden"><MoreHorizontal className="h-5 w-5" /></button><button type="button" onClick={() => setToolsOpen((open) => !open)} aria-label={toolsOpen ? "Hide tools" : "Show tools"} className="chat-icon-button hidden lg:inline-flex">{toolsOpen ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}</button></div>
    </header>

    <div className={`grid min-h-0 flex-1 gap-4 transition-[grid-template-columns] duration-300 ${toolsOpen ? "lg:grid-cols-[minmax(0,1fr)_18rem]" : "lg:grid-cols-[minmax(0,1fr)_0rem]"}`}>
      <section className="flex min-h-0 flex-col overflow-hidden rounded-[24px] border border-white/10 bg-[linear-gradient(160deg,rgba(5,13,30,0.96),rgba(2,8,23,0.98))] shadow-[0_18px_60px_rgba(2,8,23,0.4)] sm:rounded-[30px]">
        <div className="flex shrink-0 items-center justify-between border-b border-white/8 px-4 py-3 sm:px-6"><div><p className="text-[9px] font-bold uppercase tracking-[0.22em] text-cyan-300">Conversation</p><h2 className="mt-0.5 text-sm font-semibold text-slate-200 sm:text-base">{researchMode ? "Research mode" : "Casual conversation"}</h2></div><span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/[0.07] px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-[0.16em] text-emerald-200"><span className={`h-1.5 w-1.5 rounded-full bg-emerald-400 ${isLoading ? "animate-pulse" : ""}`} />{isLoading ? "Thinking" : "Live"}</span></div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain scroll-smooth px-3 py-5 sm:px-6 sm:py-7"><div className="mx-auto flex w-full max-w-4xl flex-col gap-5">
          {visibleMessages.map((message, index) => <article key={message.id} dir="auto" className={`group flex max-w-[94%] items-start gap-2.5 sm:max-w-[86%] sm:gap-3 ${message.role === "user" ? "ml-auto flex-row-reverse" : ""}`}>
            {message.role === "assistant" ? <PersonaAvatar slug={persona.slug} name={persona.name} className="mt-1 h-8 w-8 shrink-0 border border-cyan-300/25 sm:h-9 sm:w-9" /> : <span className="mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-full border border-violet-300/25 bg-violet-400/10 text-[9px] font-black text-violet-100 sm:h-9 sm:w-9">YOU</span>}
            <div className="min-w-0"><div className={`mb-1.5 flex gap-2 text-[10px] font-semibold ${message.role === "user" ? "justify-end text-violet-200/70" : "text-cyan-200/70"}`}><span>{message.role === "user" ? "You" : persona.name}</span><span className="font-normal text-slate-600">now</span></div><div className={`relative rounded-2xl border px-4 py-3 text-[15px] leading-7 shadow-lg sm:px-5 sm:py-4 sm:text-base ${message.role === "user" ? "rounded-tr-md border-violet-300/20 bg-gradient-to-br from-violet-500/18 to-blue-500/12 text-slate-100" : "rounded-tl-md border-cyan-300/15 bg-cyan-400/[0.07] text-slate-200"}`}>
              {message.recordingUrl && <audio controls preload="metadata" src={message.recordingUrl} className="mb-3 h-8 w-full" />}{message.voiceTranscript && <p className="mb-1 text-[10px] font-semibold uppercase text-cyan-200">Live voice transcript</p>}<p className="whitespace-pre-wrap">{message.content}</p>
              {message.role === "assistant" && <><div className="mt-3 flex gap-1 border-t border-white/8 pt-2.5 md:absolute md:-right-2 md:-top-9 md:mt-0 md:rounded-full md:border md:border-white/10 md:bg-slate-950/95 md:p-1 md:opacity-0 md:shadow-xl md:transition md:group-hover:opacity-100 md:group-focus-within:opacity-100"><button type="button" onClick={() => void navigator.clipboard.writeText(message.content).then(() => setStatus("Message copied."))} aria-label="Copy message" className="message-quick-action"><Copy className="h-3.5 w-3.5" /></button><button type="button" onClick={() => speak(message.content)} aria-label="Read aloud" className="message-quick-action"><Volume2 className="h-3.5 w-3.5" /></button>{index === visibleMessages.length - 1 && message.id !== "welcome" && <button type="button" onClick={regenerate} aria-label="Regenerate" className="message-quick-action"><RefreshCcw className="h-3.5 w-3.5" /></button>}</div><MessageActions id={`${persona.slug}:${message.id}`} personaName={persona.name} personaSlug={persona.slug} content={message.content} /></>}
            </div></div>
          </article>)}
          {isLoading && <div className="flex items-start gap-3"><PersonaAvatar slug={persona.slug} name={persona.name} className="mt-1 h-8 w-8 border border-cyan-300/25" /><div className="rounded-2xl rounded-tl-md border border-cyan-300/15 bg-cyan-400/[0.07] px-5 py-4"><span className="inline-flex gap-1.5"><span className="chat-typing-dot [animation-delay:-0.3s]" /><span className="chat-typing-dot [animation-delay:-0.15s]" /><span className="chat-typing-dot" /></span></div></div>}<div ref={endRef} />
        </div></div>
        <div className="shrink-0 border-t border-white/8 bg-slate-950/90 p-2.5 backdrop-blur-2xl sm:p-4"><div className="mx-auto w-full max-w-4xl">
          {visibleMessages.length <= 1 && <div className="mb-2 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">{persona.suggestedPrompts.slice(0, 3).map((prompt) => <button key={prompt} type="button" onClick={() => submit(prompt)} className="shrink-0 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[11px] text-slate-300 hover:border-cyan-300/30 hover:text-cyan-100">{prompt}</button>)}</div>}
          {error && <div role="alert" className="mb-2 rounded-xl border border-red-500/25 bg-red-500/10 px-3 py-2 text-xs text-red-200">{error}</div>}
          <div className="rounded-[22px] border border-white/10 bg-slate-900/85 p-2 shadow-[0_12px_35px_rgba(2,8,23,0.35)] focus-within:border-cyan-300/30"><div className="flex items-end gap-2"><div className="hidden min-w-0 flex-1 sm:flex"><VoiceConversation personaSlug={persona.slug} conversationId={conversationId} onTranscript={onVoiceTranscript} /></div><button type="button" onClick={() => setMobileToolsOpen(true)} aria-label="Voice tools" className="chat-icon-button border-cyan-300/20 bg-cyan-400/[0.08] text-cyan-100 sm:hidden"><Mic2 className="h-4 w-4" /></button><textarea ref={inputRef} rows={1} value={input} onChange={(event) => { setInput(event.target.value); event.currentTarget.style.height = "auto"; event.currentTarget.style.height = `${Math.min(event.currentTarget.scrollHeight, 132)}px`; }} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); submit(); } }} placeholder={`Message ${persona.name}...`} dir="auto" className="max-h-[132px] min-h-11 min-w-0 flex-1 resize-none bg-transparent px-2 py-2.5 text-[15px] leading-6 outline-none placeholder:text-slate-500 sm:px-3" /><button type="button" onClick={() => submit()} disabled={isLoading || !input.trim()} aria-label="Send message" className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 shadow-[0_0_22px_rgba(34,211,238,0.3)] disabled:opacity-40 sm:w-auto sm:px-5">{isLoading ? <RefreshCcw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}<span className="hidden sm:ml-2 sm:inline">Send</span></button></div></div>
        </div></div>
      </section>
      <aside className={`hidden min-h-0 overflow-hidden transition-opacity lg:block ${toolsOpen ? "opacity-100" : "pointer-events-none opacity-0"}`} aria-hidden={!toolsOpen}><div className="h-full overflow-y-auto rounded-[26px] border border-white/10 bg-slate-950/70 p-5 shadow-[0_18px_50px_rgba(2,8,23,0.32)]">{tools}</div></aside>
    </div>

    {mobileToolsOpen && <div className="fixed inset-0 z-[110] lg:hidden"><button type="button" aria-label="Close tools" onClick={() => setMobileToolsOpen(false)} className="absolute inset-0 bg-[#020817]/80 backdrop-blur-sm" /><section role="dialog" aria-modal="true" aria-label="Conversation tools" className="absolute inset-x-0 bottom-0 max-h-[82dvh] overflow-y-auto rounded-t-[30px] border-t border-cyan-300/20 bg-[#061022] px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 shadow-[0_-24px_70px_rgba(2,8,23,0.7)] sm:px-6"><div className="mx-auto mb-4 h-1 w-12 rounded-full bg-white/20" /><div className="mb-5 flex items-center justify-between"><div><h2 className="text-lg font-bold">Conversation tools</h2><p className="mt-1 text-xs text-slate-400">Voice, research and quick actions</p></div><button type="button" onClick={() => setMobileToolsOpen(false)} aria-label="Close" className="chat-icon-button"><X className="h-5 w-5" /></button></div><div className="mb-5 rounded-2xl border border-white/10 bg-white/[0.03] p-3"><VoiceConversation personaSlug={persona.slug} conversationId={conversationId} onTranscript={onVoiceTranscript} /></div>{tools}<button type="button" onClick={() => setMobileToolsOpen(false)} className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 text-sm font-semibold"><Check className="h-4 w-4" />Done</button></section></div>}
  </main>;
}
