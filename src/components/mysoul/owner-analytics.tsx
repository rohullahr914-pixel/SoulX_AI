"use client";

import { useState } from "react";
import { CircleHelp, LoaderCircle } from "lucide-react";

type TopicCount = { topic_category: string; question_count: number | string };
type Conversation = { id: string; created_at: string; updated_at: string };
type Message = { id: string; role: "user" | "assistant"; content: string; created_at: string };

async function requestJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { credentials: "same-origin", cache: "no-store" });
  const result = await response.json() as T & { error?: string };
  if (!response.ok) throw new Error(result.error ?? "Could not load saved MySoul chats.");
  return result;
}

const topicLabels: Record<string, string> = {
  interests: "Interests", preferences: "Preferences", goals: "Goals", memories: "Experiences",
  work_education: "Work and education", personality: "Personality and values", general: "General",
};

export function OwnerMySoulAnalytics({ conversationCount, savedConversationCount, messageCount, teachingCount, completeness, lastTrained, topics }: {
  conversationCount: number;
  savedConversationCount: number;
  messageCount: number;
  teachingCount: number;
  completeness: number;
  lastTrained: string;
  topics: TopicCount[];
}) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [listLoaded, setListLoaded] = useState(false);
  const [hasMoreConversations, setHasMoreConversations] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const loadConversations = async (append = false) => {
    if (busy) return;
    setBusy(true); setError("");
    try {
      const offset = append ? conversations.length : 0;
      const result = await requestJson<{ conversations: Conversation[]; hasMore: boolean }>(`/api/mysoul/conversations?offset=${offset}`);
      setConversations((current) => append ? [...current, ...result.conversations] : result.conversations);
      setHasMoreConversations(result.hasMore);
      setListLoaded(true);
      if (!append) { setSelectedId(null); setMessages([]); }
    } catch (cause) { setError((cause as Error).message); }
    finally { setBusy(false); }
  };

  const openConversation = async (id: string) => {
    setSelectedId(id); setMessages([]); setHasMoreMessages(false); setBusy(true); setError("");
    try {
      const result = await requestJson<{ messages: Message[]; hasMore: boolean }>(`/api/mysoul/conversations/${id}`);
      setMessages(result.messages); setHasMoreMessages(result.hasMore);
    } catch (cause) { setError((cause as Error).message); }
    finally { setBusy(false); }
  };

  const loadMoreMessages = async () => {
    if (!selectedId || busy || !hasMoreMessages) return;
    setBusy(true); setError("");
    try {
      const result = await requestJson<{ messages: Message[]; hasMore: boolean }>(`/api/mysoul/conversations/${selectedId}?offset=${messages.length}`);
      setMessages((current) => [...current, ...result.messages]); setHasMoreMessages(result.hasMore);
    } catch (cause) { setError((cause as Error).message); }
    finally { setBusy(false); }
  };

  return <section className="space-y-5 p-4 sm:p-7">
    <div><h2 className="text-xl font-bold">MySoul analytics</h2><p className="mt-1 max-w-2xl text-xs leading-6 text-slate-500">Topic counts store only broad categories, never visitor message text. Saved messages appear here only after visitors agree that you may read them.</p></div>
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{[["Conversations started", conversationCount], ["Saved chats", savedConversationCount], ["Messages sent", messageCount], ["Teaching additions", teachingCount], ["Current completeness", `${completeness}%`], ["Last trained", lastTrained]].map(([label, value]) => <article key={String(label)} className="rounded-2xl border border-white/8 bg-white/[.02] p-4"><p className="text-[10px] font-semibold uppercase tracking-[.14em] text-slate-500">{label}</p><p className="mt-3 text-2xl font-black text-white">{value}</p></article>)}</div>
    <div className="grid gap-4 lg:grid-cols-[.8fr_1.2fr]">
      <article className="rounded-2xl border border-white/8 bg-white/[.02] p-4"><h3 className="text-sm font-bold">Most asked topics</h3>{topics.length ? <ol className="mt-3 space-y-2">{topics.slice(0, 5).map((item) => <li key={item.topic_category} className="flex items-center justify-between gap-3 rounded-xl bg-white/[.025] px-3 py-2 text-xs"><span className="text-slate-300">{topicLabels[item.topic_category] ?? "General"}</span><span className="font-semibold text-cyan-200">{Number(item.question_count)}</span></li>)}</ol> : <p className="mt-3 text-xs text-slate-500">Topics will appear after visitors ask questions.</p>}<p className="mt-3 flex items-start gap-2 text-[10px] leading-5 text-slate-500"><CircleHelp className="mt-0.5 h-3 w-3 shrink-0 text-cyan-200" />Analytics never include the words visitors type.</p></article>
      <article className="rounded-2xl border border-white/8 bg-white/[.02] p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-sm font-bold">Saved visitor chats</h3><p className="mt-1 text-[10px] leading-5 text-slate-500">Visitors see that you can read saved messages before they opt in.</p></div><button type="button" disabled={busy} onClick={() => void loadConversations()} className="inline-flex min-h-9 items-center gap-2 rounded-full border border-white/10 px-3 text-[10px] text-slate-300 disabled:opacity-50">{busy && !selectedId ? <LoaderCircle className="h-3 w-3 animate-spin" /> : null}{listLoaded ? "Refresh list" : "Load saved chats"}</button></div>
        {listLoaded && (conversations.length ? <div className="mt-3 space-y-2">{conversations.map((conversation, index) => <button key={conversation.id} type="button" onClick={() => void openConversation(conversation.id)} className={`flex min-h-10 w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-xs ${selectedId === conversation.id ? "bg-cyan-300/10 text-cyan-100" : "bg-white/[.025] text-slate-300 hover:bg-white/[.05]"}`}><span>Saved conversation {index + 1}</span><time className="text-[10px] text-slate-500">{new Date(conversation.created_at).toLocaleDateString()}</time></button>)}{hasMoreConversations && <button type="button" disabled={busy} onClick={() => void loadConversations(true)} className="mx-auto block min-h-9 rounded-full px-3 text-[10px] text-cyan-200 disabled:opacity-50">Load older conversations</button>}</div> : <p className="mt-3 text-xs text-slate-500">No visitors have chosen to save a conversation yet.</p>)}
      </article>
    </div>
    {error && <p role="alert" className="rounded-xl border border-rose-300/15 bg-rose-300/5 px-4 py-3 text-xs text-rose-200">{error}</p>}
    {selectedId && <article className="rounded-2xl border border-white/8 bg-white/[.02] p-4"><div className="mb-3 flex flex-wrap items-center justify-between gap-3"><h3 className="text-sm font-bold">Visitor conversation</h3><button type="button" onClick={() => setSelectedId(null)} className="text-[10px] text-slate-400 hover:text-white">Close</button></div>{busy && !messages.length ? <div className="flex items-center gap-2 py-5 text-xs text-slate-400"><LoaderCircle className="h-4 w-4 animate-spin text-cyan-200" />Loading saved messages</div> : <div className="max-h-[32rem] space-y-2 overflow-y-auto">{messages.map((message) => <div key={message.id} className={`max-w-[90%] whitespace-pre-wrap break-words rounded-xl px-3 py-2 text-xs leading-5 ${message.role === "user" ? "ml-auto bg-cyan-400/10 text-cyan-50" : "bg-white/[.035] text-slate-300"}`}><p>{message.content}</p><time className="mt-1 block text-[9px] text-slate-500">{new Date(message.created_at).toLocaleString()}</time></div>)}</div>}{hasMoreMessages && <button type="button" disabled={busy} onClick={() => void loadMoreMessages()} className="mx-auto mt-3 block min-h-9 rounded-full px-3 text-[10px] text-cyan-200 disabled:opacity-50">Load next messages</button>}</article>}
  </section>;
}
