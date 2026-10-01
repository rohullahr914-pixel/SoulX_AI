"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowUp, Bot, Check, LoaderCircle, LockKeyhole, Sparkles, UserRound } from "lucide-react";

type PublicProfile = {
  username: string;
  displayName: string;
  avatarUrl: string | null;
  headline: string;
  about: string;
  canChat: boolean;
  isOwner: boolean;
  historyDisclosure: boolean;
  showOnProfile: boolean;
  questions: string[];
};
type ChatMessage = { id: string; role: "user" | "assistant"; content: string };

function newId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function MySoulPublicChat({ username }: { username: string }) {
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [historyConsent, setHistoryConsent] = useState(false);
  const [conversationId, setConversationId] = useState("");
  const [conversationKey, setConversationKey] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    void fetch(`/api/mysoul/public/${encodeURIComponent(username)}`, { credentials: "same-origin", cache: "no-store" })
      .then(async (response) => {
        const data = await response.json() as { profile?: PublicProfile; error?: string };
        if (!response.ok || !data.profile) throw new Error(data.error ?? "This MySoul profile is unavailable.");
        if (active) setProfile(data.profile);
      })
      .catch((cause) => { if (active) setError((cause as Error).message); })
      .finally(() => { if (active) setLoadingProfile(false); });
    return () => { active = false; };
  }, [username]);
  useEffect(() => { bottom.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [messages, sending]);

  const sendMessage = async (raw?: string) => {
    const content = (raw ?? draft).trim();
    if (!content || !profile?.canChat || sending) return;
    const first = messages.length === 0;
    const localId = conversationId || newId();
    const before = messages;
    const userMessage: ChatMessage = { id: newId(), role: "user", content };
    setMessages((items) => [...items, userMessage]);
    setDraft("");
    setSending(true);
    setError("");
    try {
      const response = await fetch("/api/mysoul/chat", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          message: content,
          history: before.slice(-8).map(({ role, content: text }) => ({ role, content: text })),
          conversationId: conversationId || localId,
          conversationKey: conversationKey || undefined,
          consent: historyConsent,
          started: first,
        }),
      });
      const result = await response.json() as { answer?: string; error?: string; conversationId?: string; conversationKey?: string };
      if (!response.ok || !result.answer) throw new Error(result.error ?? "MySoul couldn't answer just now. Try again.");
      if (result.conversationId) setConversationId(result.conversationId);
      if (result.conversationKey) setConversationKey(result.conversationKey);
      setMessages((items) => [...items, { id: newId(), role: "assistant", content: result.answer! }]);
    } catch (cause) {
      setMessages((items) => items.filter((item) => item.id !== userMessage.id));
      setDraft(content);
      setError((cause as Error).message);
    } finally { setSending(false); }
  };

  if (loadingProfile || (profile && profile.username !== username)) return <main className="mx-auto min-h-[70vh] max-w-4xl px-4 py-10 text-white"><div className="animate-pulse rounded-[30px] border border-white/10 bg-slate-950/65 p-6 sm:p-9"><div className="h-12 w-12 rounded-full bg-white/10" /><div className="mt-6 h-6 w-48 rounded bg-white/10" /><div className="mt-3 h-4 w-72 max-w-full rounded bg-white/5" /><div className="mt-10 h-[48vh] rounded-2xl bg-white/[0.025]" /></div></main>;
  if (!profile) return <main className="mx-auto flex min-h-[65vh] max-w-xl flex-col items-center justify-center px-5 text-center text-white"><Sparkles className="h-9 w-9 text-cyan-300" /><h1 className="mt-5 text-3xl font-bold">MySoul unavailable</h1><p className="mt-3 text-sm leading-6 text-slate-400">{error || "This MySoul profile is not available."}</p><Link href="/explore" className="mt-6 rounded-full border border-white/10 px-5 py-2.5 text-sm text-slate-200">Back to SoulX</Link></main>;

  const initials = profile.displayName.trim().split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "M";
  return (
    <main className="mx-auto max-w-5xl px-3 py-5 text-white sm:px-5 sm:py-8">
      <section className="overflow-hidden rounded-[28px] border border-cyan-300/15 bg-[#050d1e] shadow-[0_24px_80px_rgba(2,8,23,0.52)] sm:rounded-[34px]">
        <header className="relative border-b border-white/8 bg-[radial-gradient(circle_at_20%_0%,rgba(34,211,238,0.15),transparent_42%),linear-gradient(130deg,#07162a,#0b1025)] px-4 py-4 sm:px-7 sm:py-5">
          <div className="absolute inset-0 bg-grid-fade opacity-20" />
          <div className="relative flex min-w-0 items-center gap-3">
            <Link href={`/creators/${encodeURIComponent(username)}`} aria-label="Back to profile" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-slate-950/50 text-slate-300 hover:text-white"><ArrowLeft className="h-4 w-4" /></Link>
            <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border border-cyan-200/25 bg-cyan-400/10 font-bold text-cyan-100">
              {profile.avatarUrl ? <Image src={profile.avatarUrl} alt="" width={48} height={48} unoptimized className="h-full w-full object-cover" /> : initials}
              <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-[#07162a] bg-emerald-400" />
            </div>
            <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h1 className="truncate text-base font-bold sm:text-lg">{profile.displayName}</h1><span className="rounded-full border border-cyan-300/20 bg-cyan-300/8 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.14em] text-cyan-200">MySoul AI</span></div><p className="mt-1 flex items-center gap-1.5 text-[11px] text-emerald-300"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />MySoul available</p></div>
          </div>
          {(profile.headline || profile.about) && <p className="relative ml-[6.1rem] mt-3 max-w-2xl text-xs leading-6 text-slate-400">{profile.headline || profile.about}</p>}
        </header>

        {profile.historyDisclosure && !profile.isOwner && <div className="border-b border-amber-300/15 bg-amber-300/[0.045] px-4 py-3 sm:px-7"><label className={`flex items-start gap-3 text-xs leading-5 text-slate-300 ${messages.length ? "cursor-default" : "cursor-pointer"}`}><input type="checkbox" checked={historyConsent} disabled={messages.length > 0} onChange={(event) => setHistoryConsent(event.target.checked)} className="mt-1 h-4 w-4 accent-cyan-400 disabled:opacity-60" /><span><span className="inline-flex items-center gap-1.5 font-semibold text-amber-100"><LockKeyhole className="h-3.5 w-3.5" />Optional saved chat history</span><span className="mt-1 block">{profile.displayName} enabled saved conversations. Check before your first message to let the owner read this conversation. Leave it unchecked to continue without saving. Once saved, the choice applies to this whole conversation.</span></span></label></div>}

        <div className="flex min-h-[56vh] flex-col sm:min-h-[62vh]">
          <div className="flex-1 space-y-4 overflow-y-auto px-4 py-5 sm:px-7 sm:py-7">
            {!messages.length && <div className="mx-auto flex max-w-xl flex-col items-center py-8 text-center sm:py-12"><span className="flex h-14 w-14 items-center justify-center rounded-[20px] border border-cyan-300/20 bg-cyan-400/8 text-cyan-200"><Bot className="h-6 w-6" /></span><p className="mt-5 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200">A conversation with {profile.displayName}</p><h2 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">Ask what I have shared.</h2><p className="mt-3 max-w-md text-sm leading-6 text-slate-400">I answer from personal details the owner chose to share at this privacy level.</p>
              {profile.questions.length > 0 && <div className="mt-6 flex max-w-2xl flex-wrap justify-center gap-2">{profile.questions.map((question) => <button key={question} type="button" onClick={() => void sendMessage(question)} disabled={!profile.canChat || sending} className="rounded-full border border-white/10 bg-white/[0.035] px-3.5 py-2 text-xs text-slate-200 transition hover:border-cyan-300/35 hover:text-cyan-100 disabled:opacity-50">{question}</button>)}</div>}
            </div>}
            {messages.map((message) => <div key={message.id} className={`flex items-end gap-2.5 ${message.role === "user" ? "justify-end" : "justify-start"}`}>
              {message.role === "assistant" && <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-cyan-300/20 bg-cyan-400/8 text-cyan-200"><Sparkles className="h-3.5 w-3.5" /></span>}
              <div className={`max-w-[86%] whitespace-pre-wrap break-words rounded-[20px] px-4 py-3 text-sm leading-6 sm:max-w-[78%] ${message.role === "user" ? "rounded-br-md bg-gradient-to-br from-cyan-500 to-blue-600 text-white" : "rounded-bl-md border border-white/8 bg-white/[0.045] text-slate-100"}`}>{message.content}</div>
              {message.role === "user" && <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 bg-slate-800 text-slate-300"><UserRound className="h-3.5 w-3.5" /></span>}
            </div>)}
            {sending && <div className="flex items-end gap-2.5"><span className="flex h-8 w-8 items-center justify-center rounded-full border border-cyan-300/20 bg-cyan-400/8 text-cyan-200"><Sparkles className="h-3.5 w-3.5" /></span><div aria-label="MySoul is replying" className="flex h-11 items-center gap-2 rounded-[18px] border border-white/8 bg-white/[0.045] px-4 text-xs text-slate-400"><LoaderCircle className="h-4 w-4 animate-spin text-cyan-300" />Thinking</div></div>}
            {error && <p role="alert" className="mx-auto max-w-xl rounded-xl border border-rose-300/15 bg-rose-400/5 px-4 py-3 text-center text-xs text-rose-200">{error}</p>}
            <div ref={bottom} />
          </div>
          {!profile.canChat && <div className="border-t border-white/8 px-4 py-3 text-center text-xs text-slate-400 sm:px-7">This MySoul is not accepting conversations from your account.</div>}
          <form onSubmit={(event) => { event.preventDefault(); void sendMessage(); }} className="border-t border-white/8 bg-slate-950/40 p-3 sm:p-5">
            <div className="flex min-w-0 items-end gap-2 rounded-[21px] border border-white/10 bg-white/[0.035] p-2 pl-4 focus-within:border-cyan-300/30">
              <label htmlFor="mysoul-message" className="sr-only">Message MySoul</label><textarea id="mysoul-message" value={draft} onChange={(event) => setDraft(event.target.value.slice(0, 1600))} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void sendMessage(); } }} placeholder="Ask about something I've shared…" rows={1} disabled={!profile.canChat || sending} className="max-h-36 min-h-10 min-w-0 flex-1 resize-y bg-transparent py-2.5 text-sm leading-5 text-white outline-none placeholder:text-slate-500 disabled:opacity-50" />
              <button type="submit" aria-label="Send message" disabled={!draft.trim() || !profile.canChat || sending} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 text-slate-950 disabled:cursor-not-allowed disabled:opacity-40"><ArrowUp className="h-4 w-4" /></button>
            </div>
            <p className="mt-2 flex items-center justify-center gap-1 text-center text-[10px] text-slate-500"><Check className="h-3 w-3 text-cyan-300/70" />Only owner-approved facts are used for personal answers.</p>
          </form>
        </div>
      </section>
    </main>
  );
}
