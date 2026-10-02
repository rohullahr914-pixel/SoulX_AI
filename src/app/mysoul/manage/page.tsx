"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowDownToLine, ArrowRight, BookOpen, Check, ChevronRight, Compass, LoaderCircle, LockKeyhole, MessageCircle, Plus, ShieldCheck, Sparkles, Trash2, Users, WandSparkles } from "lucide-react";
import { OwnerMySoulAnalytics } from "@/components/mysoul/owner-analytics";
import { MYSOUL_CATEGORIES, GOAL_CATEGORIES, INTEREST_CATEGORIES, TRAIT_CHOICES, VALUE_CHOICES, type MySoulRecord, type MySoulVisibility } from "@/lib/mysoul";

type Dashboard = {
  soul: Record<string, unknown>;
  username: string | null;
  records: Record<string, MySoulRecord[]>;
  hasMore: { memories: boolean };
  trainingSampleCount: number;
  communication: CommunicationProfile | null;
  analytics: Record<string, number>;
  conversationCount: number;
  topicAnalytics: Array<{ topic_category: string; question_count: number | string }>;
  savedConversationCount: number;
};
type CommunicationProfile = {
  formality: number | null;
  humor: number | null;
  emoji_usage: number | null;
  directness: number | null;
  response_length: "short" | "medium" | "long";
  tone: string[];
  favorite_expressions: string[];
  language_patterns: Record<string, unknown>;
  style_summary: string;
  visibility: MySoulVisibility;
  updated_at: string;
};
type Section = "overview" | "teach" | "identity" | "personality" | "interests" | "dislikes" | "communication" | "memories" | "values" | "goals" | "people" | "knowledge" | "emotional" | "privacy" | "analytics";

const NAV: Array<{ id: Section; label: string }> = [
  { id: "overview", label: "Overview" }, { id: "teach", label: "Teach MySoul" }, { id: "identity", label: "Identity" },
  { id: "personality", label: "Personality" }, { id: "interests", label: "Interests" }, { id: "dislikes", label: "Dislikes" },
  { id: "communication", label: "Communication" }, { id: "memories", label: "Memories" }, { id: "values", label: "Values" },
  { id: "goals", label: "Goals" }, { id: "people", label: "People" }, { id: "knowledge", label: "Knowledge" },
  { id: "emotional", label: "Emotional style" }, { id: "privacy", label: "Privacy" }, { id: "analytics", label: "Analytics" },
];
const PRIVACY_LABELS: Record<MySoulVisibility, string> = { private: "Private", friends: "Friends", public: "Public" };
const PERSONALITY_QUESTIONS = [
  ["friends_description", "How would your friends describe you?"],
  ["excitement", "What makes you excited?"],
  ["disagreement", "How do you react when someone disagrees with you?"],
  ["stress", "When you are stressed, how do you usually behave?"],
  ["company", "What kind of people do you enjoy spending time with?"],
] as const;
const EMOTION_QUESTIONS = [
  "What makes you happy?", "What usually makes you angry?", "What do you do when you feel disappointed?",
  "How do you support your friends?", "How do you show appreciation?", "What kind of jokes do you enjoy?",
] as const;

async function jsonRequest<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { credentials: "same-origin", ...init, headers: { ...(init?.body ? { "Content-Type": "application/json" } : {}), ...init?.headers } });
  const data = await response.json() as T & { error?: string };
  if (!response.ok) throw new Error(data.error ?? "Could not complete that request.");
  return data;
}
function text(value: unknown) { return typeof value === "string" ? value : ""; }
function recordTitle(item: MySoulRecord) {
  return text(item.trait || item.interest || item.value || item.goal || item.title || item.name || item.key || item.question_key || item.category || item.sample_type || item.content) || "MySoul detail";
}
function recordDescription(item: MySoulRecord) {
  return text(item.memory || item.description || item.why_important || item.answer || item.value || item.content || item.status);
}

function Notice({ children, tone = "cyan" }: { children: React.ReactNode; tone?: "cyan" | "rose" }) {
  return <p role={tone === "rose" ? "alert" : "status"} className={`rounded-xl border px-4 py-3 text-xs ${tone === "rose" ? "border-rose-300/15 bg-rose-300/5 text-rose-200" : "border-cyan-300/15 bg-cyan-300/5 text-cyan-100"}`}>{children}</p>;
}

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return <label className="block min-w-0 text-xs font-semibold text-slate-400">{label}{children}{hint && <span className="mt-1.5 block text-[10px] font-normal leading-5 text-slate-500">{hint}</span>}</label>;
}
const inputClass = "mt-2 min-h-11 w-full rounded-xl border border-white/10 bg-slate-950/65 px-3.5 py-2.5 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-300/40";
const selectClass = `${inputClass} cursor-pointer`;
const textAreaClass = `${inputClass} min-h-24 resize-y leading-6`;

function PrivacySelect({ value, onChange, label = "Privacy" }: { value: MySoulVisibility; onChange: (value: MySoulVisibility) => void; label?: string }) {
  return <label className="inline-flex items-center gap-2 text-[10px] text-slate-500">{label}<select aria-label={label} value={value} onChange={(event) => onChange(event.target.value as MySoulVisibility)} className="rounded-lg border border-white/10 bg-slate-950 px-2 py-1.5 text-[10px] text-slate-300">{Object.entries(PRIVACY_LABELS).map(([key, labelText]) => <option key={key} value={key}>{labelText}</option>)}</select></label>;
}

function RecordList({ rows, onRemove, onVisibility, empty = "Nothing here yet.", onLoadMore, hasMore = false, loadingMore = false }: { rows: MySoulRecord[]; onRemove: (id: string) => void; onVisibility?: (id: string, value: MySoulVisibility) => void; empty?: string; onLoadMore?: () => void; hasMore?: boolean; loadingMore?: boolean }) {
  if (!rows.length) return <div className="rounded-2xl border border-dashed border-white/10 px-5 py-8 text-center text-xs text-slate-500">{empty}</div>;
  const inferredCollection = (item: MySoulRecord) => item.trait ? "traits" : item.question_key ? "personality_answers" : item.interest ? "interests" : item.goal ? "goals" : item.memory ? "memories" : item.name && item.relationship !== undefined ? "people" : item.key && item.value ? "preferences" : item.value ? "values" : item.content ? "knowledge" : "";
  const handleVisibility = async (item: MySoulRecord, value: MySoulVisibility) => {
    if (onVisibility) { onVisibility(item.id, value); return; }
    const collection = inferredCollection(item);
    if (!collection) return;
    try {
      const response = await fetch("/api/mysoul/records", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ collection, record: { id: item.id, visibility: value } }) });
      if (!response.ok) throw new Error();
      item.visibility = value;
    } catch { window.alert("Could not update this privacy setting. Please try again."); }
  };
  return <div className="grid gap-2">{rows.map((item) => <article key={item.id} className="flex min-w-0 items-start gap-3 rounded-2xl border border-white/8 bg-white/[0.025] p-3.5"><span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-cyan-300/15 bg-cyan-300/5 text-cyan-200"><BookOpen className="h-3.5 w-3.5" /></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="break-words text-xs font-semibold text-slate-100">{recordTitle(item)}</h3>{item.visibility && <PrivacySelect label={`${recordTitle(item)} visibility`} value={item.visibility as MySoulVisibility} onChange={(value) => void handleVisibility(item, value)} />}</div>{recordDescription(item) && <p className="mt-1.5 whitespace-pre-wrap break-words text-xs leading-5 text-slate-400">{recordDescription(item)}</p>}</div><button type="button" onClick={() => onRemove(item.id)} aria-label={`Remove ${recordTitle(item)}`} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-500 hover:bg-rose-400/10 hover:text-rose-200"><Trash2 className="h-3.5 w-3.5" /></button></article>)}{hasMore && onLoadMore && <button type="button" disabled={loadingMore} onClick={onLoadMore} className="mx-auto mt-2 inline-flex min-h-10 items-center gap-2 rounded-full border border-white/10 px-4 text-xs text-slate-300 disabled:opacity-50">{loadingMore ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <ChevronRight className="h-3.5 w-3.5 rotate-90" />}Load more</button>}</div>;
}

export default function MySoulManagePage() {
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [section, setSection] = useState<Section>("overview");
  const [onboardingStep, setOnboardingStep] = useState<number | null>(null);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [loadingMoreMemories, setLoadingMoreMemories] = useState(false);
  const [teachInput, setTeachInput] = useState("");
  const [proposal, setProposal] = useState<{ category: string; content: string } | null>(null);
  const [proposalVisibility, setProposalVisibility] = useState<MySoulVisibility>("private");
  const soulSaveQueue = useRef<Promise<unknown>>(Promise.resolve());
  const pendingSoulSaves = useRef(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await jsonRequest<{ dashboard: Dashboard | null }>("/api/mysoul");
      setDashboard(result.dashboard);
      if (result.dashboard && !result.dashboard.soul.onboarding_completed) setOnboardingStep((current) => current ?? 0);
      else setOnboardingStep(null);
    } catch (cause) { setError((cause as Error).message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const requested = new URLSearchParams(window.location.search).get("section");
      if (NAV.some((item) => item.id === requested)) setSection(requested as Section);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const updateSoul = async (values: Record<string, unknown>) => {
    if (!dashboard) return;
    pendingSoulSaves.current += 1;
    setSaving(true);
    setError("");
    setStatus("Saving…");
    const save = soulSaveQueue.current.then(async () => {
      const result = await jsonRequest<{ soul: Dashboard["soul"] }>("/api/mysoul", { method: "PATCH", body: JSON.stringify(values) });
      setDashboard((current) => current ? { ...current, soul: { ...result.soul, ...values } } : current);
      if (pendingSoulSaves.current === 1) setStatus("Saved to MySoul");
      return result.soul;
    }).catch((cause) => {
      setError((cause as Error).message);
      setStatus("Could not save to MySoul");
      return undefined;
    }).finally(() => {
      pendingSoulSaves.current -= 1;
      if (pendingSoulSaves.current === 0) setSaving(false);
    });
    soulSaveQueue.current = save.then(() => undefined, () => undefined);
    return save;
  };

  const createSoul = async () => {
    setCreating(true); setError("");
    try {
      await jsonRequest("/api/mysoul", { method: "POST", body: "{}" });
      await load();
    } catch (cause) { setError((cause as Error).message); }
    finally { setCreating(false); }
  };

  const saveRecord = async (collection: string, record: Record<string, unknown>): Promise<boolean> => {
    if (!dashboard) return false;
    setSaving(true); setError(""); setStatus("");
    try {
      await jsonRequest("/api/mysoul/records", { method: "POST", body: JSON.stringify({ collection, record }) });
      setStatus("Added to MySoul");
      await load();
      return true;
    } catch (cause) { setError((cause as Error).message); }
    finally { setSaving(false); }
    return false;
  };

  const loadMoreMemories = async () => {
    if (!dashboard || loadingMoreMemories || !dashboard.hasMore.memories) return;
    setLoadingMoreMemories(true);
    try {
      const offset = dashboard.records.memories?.length ?? 0;
      const result = await jsonRequest<{ records: MySoulRecord[]; hasMore: boolean }>(`/api/mysoul/records?collection=memories&offset=${offset}`);
      setDashboard((current) => current ? {
        ...current,
        records: { ...current.records, memories: [...(current.records.memories ?? []), ...result.records] },
        hasMore: { ...current.hasMore, memories: result.hasMore },
      } : current);
    } catch (cause) { setError((cause as Error).message); }
    finally { setLoadingMoreMemories(false); }
  };


  const removeRecord = async (collection: string, id: string) => {
    if (!dashboard || !window.confirm("Remove this item from MySoul?")) return;
    setError("");
    try {
      await jsonRequest("/api/mysoul/records", { method: "DELETE", body: JSON.stringify({ collection, id }) });
      setStatus("Removed from MySoul");
      await load();
    } catch (cause) { setError((cause as Error).message); }
  };
  const setRecordVisibility = (collection: string) => (id: string, visibility: MySoulVisibility) => { void saveRecord(collection, { id, visibility }); };

  const finishOnboarding = async () => {
    if (onboardingStep === null) return;
    if (onboardingStep < 2) { setOnboardingStep(onboardingStep + 1); return; }
    try {
      const saved = await updateSoul({ onboarding_completed: true });
      if (!saved) return;
      setOnboardingStep(null); setSection("overview");
    }
    catch { /* The inline error keeps the last onboarding step open. */ }
  };

  const previewTeaching = async (event: React.FormEvent) => {
    event.preventDefault(); setSaving(true); setError(""); setProposal(null);
    try {
      const result = await jsonRequest<{ proposal: { category: string; content: string } }>("/api/mysoul/teach", { method: "POST", body: JSON.stringify({ action: "preview", input: teachInput }) });
      setProposal(result.proposal);
    } catch (cause) { setError((cause as Error).message); }
    finally { setSaving(false); }
  };

  const saveTeaching = async () => {
    if (!proposal) return;
    setSaving(true); setError("");
    try {
      await jsonRequest("/api/mysoul/teach", { method: "POST", body: JSON.stringify({ action: "save", input: teachInput, ...proposal, visibility: proposalVisibility }) });
      setProposal(null); setTeachInput(""); setSection("overview"); setStatus("That fact is now in MySoul."); await load();
    } catch (cause) { setError((cause as Error).message); }
    finally { setSaving(false); }
  };

  const autoField = (field: string, label: string, options: { multiline?: boolean; type?: string; hint?: string } = {}) => {
    if (!dashboard) return null;
    const visibilityField = `${field}_visibility`;
    const currentVisibility = (dashboard.soul[visibilityField] ?? "private") as MySoulVisibility;
    const languageList = Array.isArray(dashboard.soul.languages) ? dashboard.soul.languages.filter((item): item is string => typeof item === "string") : [];
    const currentValue = field === "languages" ? languageList.join(", ") : text(dashboard.soul[field]);
    const onSaveValue = (value: string) => {
      const normalized = field === "languages" ? value.split(",").map((item) => item.trim()).filter(Boolean) : field === "avatar_url" && !value.trim() ? null : value;
      if (JSON.stringify(normalized) !== JSON.stringify(field === "languages" ? dashboard.soul.languages ?? [] : dashboard.soul[field] ?? "")) void updateSoul({ [field]: normalized });
    };
    return <div key={field} className="min-w-0"><Field label={label} hint={options.hint}>{options.multiline ? <textarea defaultValue={currentValue} onBlur={(event) => onSaveValue(event.currentTarget.value)} maxLength={field === "about" ? 2000 : 300} className={textAreaClass} placeholder={`Add ${label.toLowerCase()}`} /> : <input defaultValue={currentValue} onBlur={(event) => onSaveValue(event.currentTarget.value)} maxLength={field === "headline" ? 180 : 160} type={options.type ?? "text"} className={inputClass} placeholder={`Add ${label.toLowerCase()}`} />}</Field><div className="mt-2"><PrivacySelect label={`${label} visibility`} value={currentVisibility} onChange={(value) => void updateSoul({ [visibilityField]: value })} /></div></div>;
  };

  const nav = <nav aria-label="MySoul sections" className="flex gap-2 overflow-x-auto border-b border-white/8 px-3 py-3 [scrollbar-width:thin] sm:px-6">{NAV.map((item) => <button key={item.id} type="button" onClick={() => { setSection(item.id); setStatus(""); setError(""); }} aria-current={section === item.id ? "page" : undefined} className={`shrink-0 rounded-full px-3.5 py-2 text-xs font-semibold transition ${section === item.id ? "bg-cyan-300/12 text-cyan-100 ring-1 ring-cyan-200/20" : "text-slate-400 hover:bg-white/5 hover:text-white"}`}>{item.label}</button>)}</nav>;

  if (loading && !dashboard) return <main className="mx-auto max-w-7xl px-4 py-10 text-white"><div className="animate-pulse rounded-[30px] border border-white/8 bg-slate-950/60 p-7"><div className="h-6 w-56 rounded bg-white/10" /><div className="mt-6 h-32 rounded-2xl bg-white/5" /><div className="mt-5 h-80 rounded-2xl bg-white/5" /></div></main>;
  if (!dashboard) return <main className="mx-auto flex min-h-[74vh] max-w-4xl items-center justify-center px-4 py-10 text-white"><section className="relative w-full overflow-hidden rounded-[32px] border border-cyan-300/15 bg-[#050d1e] p-7 text-center shadow-[0_25px_80px_rgba(2,8,23,.48)] sm:p-12"><div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(34,211,238,.15),transparent_38%)]" /><div className="relative"><span className="mx-auto flex h-14 w-14 items-center justify-center rounded-[20px] border border-cyan-300/20 bg-cyan-300/8 text-cyan-200"><Sparkles className="h-6 w-6" /></span><p className="mt-6 text-[10px] font-bold uppercase tracking-[.22em] text-cyan-200">Your digital identity inside SoulX</p><h1 className="mt-3 text-4xl font-black tracking-[-.06em] sm:text-6xl">Create Your MySoul</h1><p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-slate-300">Build an AI that knows your personality, interests, communication style and the parts of yourself you choose to share.</p><p className="mx-auto mt-3 max-w-xl text-xs leading-6 text-slate-500">You control what MySoul can use and who can see it. Everything starts private.</p>{error && <div className="mx-auto mt-5 max-w-lg"><Notice tone="rose">{error}</Notice></div>}{error.includes("Sign in") ? <Link href="/login" className="mt-8 inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-cyan-400 to-blue-600 px-7 text-sm font-bold text-slate-950">Sign in to create MySoul</Link> : <button type="button" disabled={creating} onClick={() => void createSoul()} className="mt-8 inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-cyan-400 to-blue-600 px-7 text-sm font-bold text-slate-950 disabled:opacity-50">{creating ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}Create MySoul</button>}<p className="mt-4 text-[10px] text-slate-600">Autosave · Private by default · Change visibility anytime</p></div></section></main>;

  const s = dashboard.soul;
  const rows = dashboard.records;
  const score = Number(s.completion_score ?? 0);
  const completeCategories = [
    ["Identity", [s.display_name, s.about, s.occupation].filter(Boolean).length, 3],
    ["Personality", (rows.traits?.length ?? 0) + (rows.personality_answers?.length ?? 0), 8],
    ["Interests", rows.interests?.length ?? 0, 6], ["Communication", dashboard.communication ? 1 : 0, 1],
    ["Memories", rows.memories?.length ?? 0, 5], ["Values", rows.values?.length ?? 0, 5], ["Goals", rows.goals?.length ?? 0, 5],
  ] as Array<[string, number, number]>;
  const resourceCounts = {
    knowledge: rows.knowledge?.length ?? 0,
    facts: Object.values(rows).reduce((total, items) => total + items.length, 0),
  };

  const header = <header className="relative overflow-hidden border-b border-white/8 bg-[radial-gradient(circle_at_17%_0%,rgba(34,211,238,.17),transparent_34%),radial-gradient(circle_at_95%_20%,rgba(99,102,241,.11),transparent_32%),linear-gradient(125deg,#061326,#090f21)] px-5 py-6 sm:px-8 sm:py-8"><div className="absolute inset-0 bg-grid-fade opacity-20" /><div className="relative flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div className="min-w-0"><Link href="/profile" className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[.16em] text-slate-500 hover:text-cyan-200"><ChevronRight className="h-3 w-3 rotate-180" />Your profile</Link><div className="mt-4 flex flex-wrap items-center gap-2"><h1 className="text-3xl font-black tracking-[-.055em] sm:text-4xl">MySoul Dashboard</h1><span className="rounded-full border border-cyan-300/20 bg-cyan-300/8 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[.14em] text-cyan-200">{s.enabled ? "Enabled" : "Paused"}</span></div><p className="mt-2 max-w-xl text-xs leading-6 text-slate-400">Your identity, remembered on your terms. Completeness is a profile checklist, not a personality score.</p></div><div className="flex flex-wrap gap-2"><Link href={dashboard.username ? `/mysoul/${dashboard.username}` : "/profile"} className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/10 bg-white/[.035] px-4 text-xs font-semibold text-slate-200"><MessageCircle className="h-3.5 w-3.5" />Talk to MySoul</Link><button type="button" onClick={() => setSection("teach")} className="inline-flex min-h-10 items-center gap-2 rounded-full bg-gradient-to-r from-cyan-400 to-blue-600 px-4 text-xs font-bold text-slate-950"><WandSparkles className="h-3.5 w-3.5" />Teach MySoul</button></div></div></header>;

  const formSubmit = (collection: string, transform?: (form: FormData) => Record<string, unknown>) => async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const values = transform ? transform(form) : Object.fromEntries(form.entries());
    if (await saveRecord(collection, values)) formElement.reset();
  };

  const renderOnboarding = () => <section className="space-y-6 p-4 sm:p-7"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[.2em] text-cyan-200">MySoul Training · Step {onboardingStep! + 1} of 3</p><h2 className="mt-2 text-2xl font-bold">{["Basic identity", "Personality", "Interests"][onboardingStep!]}</h2><p className="mt-1 text-xs text-slate-400">Your progress saves as you go.</p></div><div className="min-w-40 flex-1 sm:max-w-xs"><div className="mb-2 flex justify-between text-[10px] text-slate-500"><span>Setup progress</span><span>{Math.round(((onboardingStep! + 1) / 3) * 100)}%</span></div><div className="h-1.5 overflow-hidden rounded-full bg-white/8"><div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 transition-all" style={{ width: `${((onboardingStep! + 1) / 3) * 100}%` }} /></div></div></div>
    {onboardingStep === 0 && <div className="grid gap-4 sm:grid-cols-2">{autoField("display_name", "Display name")}{autoField("nickname", "Nickname")}{autoField("pronouns", "Pronouns")}{autoField("occupation", "Occupation")}{autoField("education", "Education")}{autoField("languages", "Languages", { hint: "Separate languages with commas." })}{autoField("country", "Country")}{autoField("city", "City")}<div className="sm:col-span-2">{autoField("about", "Short bio", { multiline: true })}</div></div>}
    {onboardingStep === 1 && <><p className="text-xs leading-6 text-slate-400">Choose a few traits that feel like you, then add any custom traits. These are private unless you choose another setting.</p><div className="flex flex-wrap gap-2">{TRAIT_CHOICES.map((trait) => { const exists = rows.traits?.some((item) => text(item.trait).toLowerCase() === trait.toLowerCase()); return <button key={trait} type="button" aria-pressed={exists} onClick={() => exists ? removeRecord("traits", rows.traits.find((item) => text(item.trait).toLowerCase() === trait.toLowerCase())!.id) : void saveRecord("traits", { trait, strength: 3, visibility: "private" })} className={`rounded-full border px-3 py-2 text-xs ${exists ? "border-cyan-200/30 bg-cyan-200/10 text-cyan-100" : "border-white/10 bg-white/[.025] text-slate-300"}`}>{exists && <Check className="mr-1 inline h-3 w-3" />}{trait}</button>; })}</div><PersonalityForms rows={rows.personality_answers ?? []} saveRecord={saveRecord} removeRecord={removeRecord} /></>}
    {onboardingStep === 2 && <InterestForms rows={rows.interests ?? []} saveRecord={saveRecord} removeRecord={removeRecord} defaultVisibility="private" />}
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/8 pt-5"><button type="button" onClick={() => onboardingStep! > 0 ? setOnboardingStep(onboardingStep! - 1) : setSection("overview")} className="rounded-full border border-white/10 px-4 py-2.5 text-xs font-semibold text-slate-300">Back</button><button type="button" onClick={() => void finishOnboarding()} disabled={saving} className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-cyan-400 to-blue-600 px-5 py-2.5 text-xs font-bold text-slate-950 disabled:opacity-50">{onboardingStep === 2 ? "Finish setup" : "Save and continue"}<ArrowRight className="h-3.5 w-3.5" /></button></div></section>;

  const renderSection = () => {
    if (onboardingStep !== null) return renderOnboarding();
    if (section === "overview") return <section className="space-y-6 p-4 sm:p-7"><div className="grid gap-4 lg:grid-cols-[.9fr_1.1fr]"><article className="rounded-[24px] border border-cyan-300/15 bg-[radial-gradient(circle_at_90%_0%,rgba(34,211,238,.11),transparent_40%),rgba(255,255,255,.02)] p-5 sm:p-6"><div className="flex items-center justify-between gap-4"><div><p className="text-[10px] font-bold uppercase tracking-[.18em] text-cyan-200">Training progress</p><p className="mt-2 text-4xl font-black tracking-[-.06em]">{score}%</p></div><span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-300/15 bg-cyan-300/8 text-cyan-100"><Sparkles className="h-5 w-5" /></span></div><div className="mt-5 h-2 overflow-hidden rounded-full bg-white/8"><div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-500" style={{ width: `${score}%` }} /></div><p className="mt-3 text-[10px] leading-5 text-slate-500">This is a profile completeness indicator. It does not measure personality accuracy.</p></article><article className="rounded-[24px] border border-white/8 bg-white/[.02] p-5 sm:p-6"><div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-emerald-300" /><p className="text-sm font-bold">Your data, your choice</p></div><p className="mt-2 text-xs leading-6 text-slate-400">Every detail has a privacy setting. Visitors can only receive approved facts that match their access.</p><button type="button" onClick={() => setSection("privacy")} className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-cyan-200">Review privacy <ArrowRight className="h-3.5 w-3.5" /></button></article></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[["Conversations", dashboard.conversationCount, MessageCircle], ["Facts and details", resourceCounts.facts, BookOpen], ["Knowledge entries", resourceCounts.knowledge, Compass], ["Training samples", dashboard.trainingSampleCount, LockKeyhole]].map(([label, value, Icon]) => { const SummaryIcon = Icon as typeof BookOpen; return <div key={String(label)} className="rounded-2xl border border-white/8 bg-white/[.02] p-4"><SummaryIcon className="h-4 w-4 text-cyan-200" /><p className="mt-4 text-2xl font-black">{value as number}</p><p className="mt-1 text-[10px] uppercase tracking-[.14em] text-slate-500">{label as string}</p></div>; })}</div><div><div className="mb-3 flex items-end justify-between gap-3"><div><h2 className="text-lg font-bold">Training areas</h2><p className="mt-1 text-xs text-slate-500">Add details in the areas that matter to you.</p></div><button type="button" onClick={() => setSection("teach")} className="inline-flex items-center gap-1 text-xs text-cyan-200">Teach MySoul <ArrowRight className="h-3 w-3" /></button></div><div className="grid gap-2 sm:grid-cols-2">{completeCategories.map(([label, count, target]) => <button key={label} type="button" onClick={() => setSection(({ Identity: "identity", Personality: "personality", Interests: "interests", Communication: "communication", Memories: "memories", Values: "values", Goals: "goals" } as Record<string, Section>)[label])} className="rounded-2xl border border-white/8 bg-white/[.02] p-3.5 text-left hover:border-cyan-300/20"><div className="flex items-center justify-between"><span className="text-xs font-semibold text-slate-200">{label}</span><span className="text-[10px] text-slate-500">{Math.min(100, Math.round((count / target) * 100))}%</span></div><div className="mt-2.5 h-1 overflow-hidden rounded-full bg-white/8"><div className="h-full rounded-full bg-cyan-300/75" style={{ width: `${Math.min(100, (count / target) * 100)}%` }} /></div></button>)}</div></div></section>;

    if (section === "teach") return <section className="mx-auto max-w-3xl space-y-5 p-4 sm:p-7"><div><p className="text-[10px] font-bold uppercase tracking-[.18em] text-cyan-200">Teach MySoul</p><h2 className="mt-2 text-2xl font-bold">Add something I should know</h2><p className="mt-2 text-xs leading-6 text-slate-400">MySoul will suggest a category and a concise version. Nothing is saved until you review and approve it.</p></div><form onSubmit={(event) => void previewTeaching(event)} className="rounded-[22px] border border-white/8 bg-white/[.02] p-4 sm:p-5"><Field label="What do you want MySoul to know?"><textarea value={teachInput} onChange={(event) => setTeachInput(event.target.value.slice(0, 4000))} maxLength={4000} required placeholder="I recently started learning Japanese…" className={textAreaClass} /></Field><div className="mt-3 flex items-center justify-between gap-3"><span className="text-[10px] text-slate-500">Private until you choose otherwise.</span><button disabled={saving || !teachInput.trim()} className="inline-flex min-h-10 items-center gap-2 rounded-full bg-cyan-400 px-4 text-xs font-bold text-slate-950 disabled:opacity-50">{saving ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <WandSparkles className="h-3.5 w-3.5" />}Review suggestion</button></div></form>{proposal && <section className="rounded-[22px] border border-cyan-300/18 bg-cyan-300/[.035] p-4 sm:p-5"><p className="text-sm font-bold">Save this to MySoul?</p><p className="mt-1 text-xs text-slate-400">Review the suggested fact, choose who can see it, then save or discard it.</p><div className="mt-4 grid gap-4"><Field label="Category"><select value={proposal.category} onChange={(event) => setProposal({ ...proposal, category: event.target.value })} className={selectClass}>{MYSOUL_CATEGORIES.map((category) => <option key={category}>{category}</option>)}</select></Field><Field label="Fact"><textarea value={proposal.content} onChange={(event) => setProposal({ ...proposal, content: event.target.value.slice(0, 2000) })} maxLength={2000} className={textAreaClass} /></Field><PrivacySelect value={proposalVisibility} onChange={setProposalVisibility} label="Fact privacy" /></div><div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={() => void saveTeaching()} disabled={saving} className="inline-flex min-h-10 items-center gap-2 rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 px-4 text-xs font-bold text-slate-950 disabled:opacity-50"><Check className="h-3.5 w-3.5" />Yes, save this</button><button type="button" onClick={() => { setProposal(null); setTeachInput(""); }} className="min-h-10 rounded-full border border-white/10 px-4 text-xs text-slate-300">No, discard</button></div></section>}</section>;

    if (section === "identity") return <section className="space-y-5 p-4 sm:p-7"><div><h2 className="text-xl font-bold">Basic identity</h2><p className="mt-1 text-xs text-slate-500">Fields save when you leave them. Choose privacy separately for each item.</p></div><div className="grid gap-4 sm:grid-cols-2">{autoField("display_name", "Display name")}{autoField("avatar_url", "Avatar URL", { type: "url", hint: "Use an HTTPS image URL." })}{autoField("nickname", "Nickname")}{autoField("pronouns", "Pronouns")}{autoField("languages", "Languages", { hint: "Separate entries with commas." })}{autoField("occupation", "Occupation")}{autoField("education", "Education")}{autoField("country", "Country")}{autoField("city", "City")}{autoField("headline", "Headline")}{autoField("about", "About me", { multiline: true })}</div><div className="flex items-center gap-2 text-[10px] text-slate-500"><Check className="h-3.5 w-3.5 text-emerald-300" />Changes autosave when a field loses focus.{saving && <span className="text-cyan-200">Saving…</span>}</div></section>;

    if (section === "personality") return <section className="space-y-6 p-4 sm:p-7"><div><h2 className="text-xl font-bold">Personality</h2><p className="mt-1 text-xs leading-5 text-slate-500">Select a few traits and add your own. These describe how you see yourself.</p></div><RecordList rows={rows.traits ?? []} onRemove={(id) => void removeRecord("traits", id)} onVisibility={setRecordVisibility("traits")} empty="Choose a few traits that feel like you." /><div className="flex flex-wrap gap-2">{TRAIT_CHOICES.map((trait) => { const match = rows.traits?.find((item) => text(item.trait).toLowerCase() === trait.toLowerCase()); return <button key={trait} type="button" aria-pressed={Boolean(match)} onClick={() => match ? removeRecord("traits", match.id) : void saveRecord("traits", { trait, strength: 3, visibility: "private" })} className={`rounded-full border px-3 py-2 text-xs ${match ? "border-cyan-200/30 bg-cyan-200/10 text-cyan-100" : "border-white/10 bg-white/[.025] text-slate-300 hover:border-white/20"}`}>{match && <Check className="mr-1 inline h-3 w-3" />}{trait}</button>; })}</div><TraitForm saveRecord={saveRecord} /><PersonalityForms rows={rows.personality_answers ?? []} saveRecord={saveRecord} removeRecord={removeRecord} /></section>;

    if (section === "interests") return <section className="space-y-5 p-4 sm:p-7"><div><h2 className="text-xl font-bold">Interests</h2><p className="mt-1 text-xs text-slate-500">Tell MySoul what you like, love, feel neutral about, or dislike.</p></div><InterestForms rows={rows.interests ?? []} saveRecord={saveRecord} removeRecord={removeRecord} defaultVisibility={(s.default_visibility ?? "private") as MySoulVisibility} /></section>;

    if (section === "dislikes") return <section className="space-y-5 p-4 sm:p-7"><div><h2 className="text-xl font-bold">Things I dislike</h2><p className="mt-1 text-xs text-slate-500">Topics, behaviors, foods, activities, conversation styles, or situations.</p></div><form onSubmit={formSubmit("preferences", (form) => ({ category: "Dislikes", key: form.get("key"), value: form.get("value"), sentiment: "dislike", visibility: form.get("visibility") }))} className="grid gap-3 rounded-[22px] border border-white/8 bg-white/[.02] p-4 sm:grid-cols-2"><Field label="Thing I dislike"><input name="key" required maxLength={120} className={inputClass} placeholder="Crowded places" /></Field><Field label="Why or when"><input name="value" required maxLength={1000} className={inputClass} placeholder="I feel more comfortable in quieter places." /></Field><label className="text-[10px] text-slate-500">Privacy<select name="visibility" defaultValue="private" className={selectClass}>{Object.keys(PRIVACY_LABELS).map((value) => <option key={value} value={value}>{PRIVACY_LABELS[value as MySoulVisibility]}</option>)}</select></label><div className="flex items-end"><button disabled={saving} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-cyan-400 px-4 text-xs font-bold text-slate-950"><Plus className="h-3.5 w-3.5" />Add dislike</button></div></form><RecordList rows={(rows.preferences ?? []).filter((item) => item.category === "Dislikes")} onRemove={(id) => void removeRecord("preferences", id)} onVisibility={setRecordVisibility("preferences")} empty="Nothing in your dislikes yet." /></section>;

    if (section === "communication") return <section className="space-y-5 p-4 sm:p-7"><div><p className="text-[10px] font-bold uppercase tracking-[.16em] text-cyan-200">Train My Communication Style</p><h2 className="mt-2 text-xl font-bold">Writing samples</h2><p className="mt-2 max-w-2xl text-xs leading-6 text-slate-400">Paste your texts, captions, notes, or writing. Samples stay private and are used only to infer style. Ten is a helpful start; 30–50 gives a stronger signal.</p></div><form onSubmit={formSubmit("training_samples")} className="rounded-[22px] border border-white/8 bg-white/[.02] p-4"><Field label="One writing sample"><textarea name="content" required maxLength={12000} className={textAreaClass} placeholder="Paste one example of your writing…" /></Field><div className="mt-3 flex flex-wrap items-center justify-between gap-3"><Field label="Sample type"><select name="sample_type" className={selectClass}><option>message</option><option>text</option><option>caption</option><option>note</option><option>email</option><option>other</option></select></Field><button disabled={saving || dashboard.trainingSampleCount >= 50} className="inline-flex min-h-10 items-center gap-2 rounded-full border border-cyan-200/20 bg-cyan-200/8 px-4 text-xs font-bold text-cyan-100 disabled:opacity-40"><Plus className="h-3.5 w-3.5" />Add private sample</button></div></form><div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/8 bg-white/[.02] p-4"><div><p className="text-xs font-semibold">{dashboard.trainingSampleCount} samples added</p><p className="mt-1 text-[10px] text-slate-500">Only sample type and date are shown here. Text is never listed in visitor responses.</p></div><button type="button" disabled={!dashboard.trainingSampleCount || saving} onClick={async () => { setSaving(true); setError(""); try { const result = await jsonRequest<{ communication: CommunicationProfile; sampleCount: number; suggestedSampleCount: number }>("/api/mysoul/communication", { method: "POST", body: JSON.stringify({ action: "analyze" }) }); setDashboard((current) => current ? { ...current, communication: result.communication } : current); setStatus(`Communication style updated from ${result.sampleCount} private samples.`); } catch (cause) { setError((cause as Error).message); } finally { setSaving(false); } }} className="inline-flex min-h-10 items-center gap-2 rounded-full bg-gradient-to-r from-violet-400 to-cyan-400 px-4 text-xs font-bold text-slate-950 disabled:opacity-45">{saving ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <WandSparkles className="h-3.5 w-3.5" />}Analyze style</button></div>{dashboard.communication && <div className="rounded-[22px] border border-cyan-300/12 bg-cyan-300/[.025] p-4 sm:p-5"><div className="flex flex-wrap items-start justify-between gap-4"><div><h3 className="text-sm font-bold">Communication profile</h3><p className="mt-2 max-w-2xl text-xs leading-6 text-slate-300">{dashboard.communication.style_summary || "Style profile saved."}</p></div><PrivacySelect value={dashboard.communication.visibility ?? "private"} onChange={async (value) => { try { await jsonRequest("/api/mysoul/communication", { method: "POST", body: JSON.stringify({ action: "visibility", visibility: value }) }); setDashboard((current) => current?.communication ? { ...current, communication: { ...current.communication, visibility: value } } : current); } catch (cause) { setError((cause as Error).message); } }} label="Style visibility" /></div><div className="mt-4 flex flex-wrap gap-2">{dashboard.communication.tone.map((tone) => <span key={tone} className="rounded-full border border-white/8 bg-white/[.035] px-3 py-1.5 text-[10px] text-slate-300">{tone}</span>)}</div><div className="mt-4 grid gap-2 text-[10px] text-slate-500 sm:grid-cols-4">{[["Formality", dashboard.communication.formality], ["Humor", dashboard.communication.humor], ["Emoji use", dashboard.communication.emoji_usage], ["Directness", dashboard.communication.directness]].map(([label, value]) => <span key={String(label)}>{label}: <b className="text-slate-200">{String(value ?? "—")}/10</b></span>)}</div></div>}{dashboard.trainingSampleCount > 0 && <div className="flex justify-end"><button type="button" onClick={async () => { if (!window.confirm("Remove every private communication sample? Your style profile stays until you analyze it again.")) return; try { await jsonRequest("/api/mysoul/records", { method: "DELETE", body: JSON.stringify({ collection: "training_samples", id: "all", confirmClear: true }) }); await load(); } catch (cause) { setError((cause as Error).message); } }} className="text-[10px] text-rose-200/80 hover:text-rose-100">Clear all private samples</button></div>}</section>;

    if (section === "memories") return <section className="space-y-5 p-4 sm:p-7"><div><h2 className="text-xl font-bold">My Memories</h2><p className="mt-1 text-xs text-slate-500">Only stored memories can be referenced. MySoul will not invent experiences.</p></div><form onSubmit={formSubmit("memories", (form) => ({ title: form.get("title"), memory: form.get("memory"), memory_date: form.get("memory_date") || null, emotion: form.get("emotion"), location: form.get("location"), people_involved: String(form.get("people_involved") ?? "").split(",").map((name) => name.trim()).filter(Boolean), visibility: form.get("visibility") }))} className="grid gap-3 rounded-[22px] border border-white/8 bg-white/[.02] p-4 sm:grid-cols-2"><Field label="Title"><input name="title" required maxLength={200} className={inputClass} placeholder="My first programming project" /></Field><Field label="Date"><input name="memory_date" type="date" className={inputClass} /></Field><Field label="Emotion"><input name="emotion" maxLength={100} className={inputClass} placeholder="Proud" /></Field><Field label="Location"><input name="location" maxLength={200} className={inputClass} placeholder="Optional" /></Field><Field label="People involved"><input name="people_involved" maxLength={500} className={inputClass} placeholder="Separate names with commas" /></Field><label className="text-[10px] text-slate-500">Privacy<select name="visibility" defaultValue="private" className={selectClass}>{Object.entries(PRIVACY_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="sm:col-span-2"><Field label="Memory"><textarea name="memory" required maxLength={10000} className={textAreaClass} placeholder="Write what happened in your own words…" /></Field></label><div className="sm:col-span-2"><button className="inline-flex min-h-10 items-center gap-2 rounded-full bg-cyan-400 px-4 text-xs font-bold text-slate-950"><Plus className="h-3.5 w-3.5" />Add memory</button></div></form><RecordList rows={rows.memories ?? []} onRemove={(id) => void removeRecord("memories", id)} onVisibility={setRecordVisibility("memories")} hasMore={dashboard.hasMore.memories} loadingMore={loadingMoreMemories} onLoadMore={() => void loadMoreMemories()} empty="No memories added. This section is optional." /></section>;

    if (section === "values") return <section className="space-y-5 p-4 sm:p-7"><div><h2 className="text-xl font-bold">My Values</h2><p className="mt-1 text-xs text-slate-500">This section is optional. Rank the values that matter most to you.</p></div><form onSubmit={formSubmit("values")} className="grid gap-3 rounded-[22px] border border-white/8 bg-white/[.02] p-4 sm:grid-cols-2"><Field label="Value"><select name="value" className={selectClass} required><option value="">Choose a value</option>{VALUE_CHOICES.map((value) => <option key={value}>{value}</option>)}</select></Field><Field label="Importance · 1–5"><input name="importance" type="number" min="1" max="5" defaultValue="3" className={inputClass} /></Field><Field label="Why is it important?" ><input name="description" maxLength={2000} className={inputClass} placeholder="Optional" /></Field><label className="text-[10px] text-slate-500">Privacy<select name="visibility" defaultValue="private" className={selectClass}>{Object.entries(PRIVACY_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label><button className="inline-flex min-h-10 w-fit items-center gap-2 rounded-full bg-cyan-400 px-4 text-xs font-bold text-slate-950"><Plus className="h-3.5 w-3.5" />Add value</button></form><RecordList rows={rows.values ?? []} onRemove={(id) => void removeRecord("values", id)} empty="No values added. You can come back to this any time." /></section>;

    if (section === "goals") return <section className="space-y-5 p-4 sm:p-7"><div><h2 className="text-xl font-bold">My Goals</h2><p className="mt-1 text-xs text-slate-500">Goals stay private unless you choose Friends or Public.</p></div><form onSubmit={formSubmit("goals")} className="grid gap-3 rounded-[22px] border border-white/8 bg-white/[.02] p-4 sm:grid-cols-2"><Field label="Category"><select name="category" className={selectClass}>{GOAL_CATEGORIES.map((value) => <option key={value}>{value}</option>)}</select></Field><Field label="Goal"><input name="goal" required maxLength={240} className={inputClass} placeholder="Build a product people love" /></Field><Field label="Priority · 1–5"><input name="priority" type="number" min="1" max="5" defaultValue="3" className={inputClass} /></Field><Field label="Target date"><input name="target_date" type="date" className={inputClass} /></Field><Field label="Status"><select name="status" className={selectClass}><option>Dream</option><option>Planning</option><option>Working On It</option><option>Achieved</option></select></Field><label className="text-[10px] text-slate-500">Privacy<select name="visibility" defaultValue="private" className={selectClass}>{Object.entries(PRIVACY_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label><div className="sm:col-span-2"><Field label="Description"><textarea name="description" maxLength={3000} className={textAreaClass} /></Field></div><button className="inline-flex min-h-10 w-fit items-center gap-2 rounded-full bg-cyan-400 px-4 text-xs font-bold text-slate-950"><Plus className="h-3.5 w-3.5" />Add goal</button></form><RecordList rows={rows.goals ?? []} onRemove={(id) => void removeRecord("goals", id)} empty="No goals added yet." /></section>;

    if (section === "people") return <section className="space-y-5 p-4 sm:p-7"><div><h2 className="text-xl font-bold">People important to me</h2><p className="mt-1 text-xs leading-6 text-slate-500">Relationships are sensitive and always default to Private. Change visibility only when you want to share this detail.</p></div><form onSubmit={formSubmit("people")} className="grid gap-3 rounded-[22px] border border-white/8 bg-white/[.02] p-4 sm:grid-cols-2"><Field label="Name"><input name="name" required maxLength={160} className={inputClass} /></Field><Field label="Relationship"><input name="relationship" maxLength={120} className={inputClass} placeholder="Friend, sibling, teacher…" /></Field><Field label="Why important"><input name="why_important" maxLength={2000} className={inputClass} /></Field><Field label="Importance · 1–5"><input name="importance" type="number" min="1" max="5" defaultValue="3" className={inputClass} /></Field><div className="sm:col-span-2"><Field label="Description"><textarea name="description" maxLength={3000} className={textAreaClass} /></Field></div><label className="text-[10px] text-slate-500">Privacy<select name="visibility" defaultValue="private" className={selectClass}>{Object.entries(PRIVACY_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label><button className="inline-flex min-h-10 w-fit items-center gap-2 rounded-full bg-cyan-400 px-4 text-xs font-bold text-slate-950"><Users className="h-3.5 w-3.5" />Add person</button></form><RecordList rows={rows.people ?? []} onRemove={(id) => void removeRecord("people", id)} empty="No important people have been added." /></section>;

    if (section === "knowledge") return <section className="space-y-5 p-4 sm:p-7"><div><h2 className="text-xl font-bold">MySoul knowledge</h2><p className="mt-1 text-xs text-slate-500">Add a fact directly or use Teach MySoul to review an AI classification.</p></div><form onSubmit={formSubmit("knowledge")} className="grid gap-3 rounded-[22px] border border-white/8 bg-white/[.02] p-4 sm:grid-cols-2"><Field label="Category"><select name="category" className={selectClass}>{MYSOUL_CATEGORIES.map((value) => <option key={value}>{value}</option>)}</select></Field><Field label="Importance · 1–5"><input name="importance" type="number" min="1" max="5" defaultValue="3" className={inputClass} /></Field><label className="sm:col-span-2"><Field label="Fact"><textarea name="content" required maxLength={6000} className={textAreaClass} placeholder="A fact you've explicitly shared with MySoul" /></Field></label><label className="text-[10px] text-slate-500">Privacy<select name="visibility" defaultValue="private" className={selectClass}>{Object.entries(PRIVACY_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label><button className="inline-flex min-h-10 w-fit items-center gap-2 rounded-full bg-cyan-400 px-4 text-xs font-bold text-slate-950"><Plus className="h-3.5 w-3.5" />Add fact</button></form><RecordList rows={rows.knowledge ?? []} onRemove={(id) => void removeRecord("knowledge", id)} empty="No custom knowledge yet." /></section>;

    if (section === "emotional") return <section className="space-y-5 p-4 sm:p-7"><div><h2 className="text-xl font-bold">How I feel and react</h2><p className="mt-1 text-xs text-slate-500">Optional emotional style notes. MySoul does not diagnose mental health.</p></div><div className="grid gap-3 sm:grid-cols-2">{EMOTION_QUESTIONS.map((question) => { const saved = rows.preferences?.find((item) => item.category === "Emotional Style" && item.key === question); return <div key={question} className="rounded-[22px] border border-white/8 bg-white/[.02] p-4"><p className="text-xs font-semibold text-slate-200">{question}</p><textarea key={saved?.id ?? "new"} defaultValue={text(saved?.value)} maxLength={1200} className={`${textAreaClass} min-h-20`} onBlur={(event) => { const answer = event.currentTarget.value.trim(); if (answer && answer !== saved?.value) void saveRecord("preferences", { ...(saved ? { id: saved.id } : {}), category: "Emotional Style", key: question, value: answer, sentiment: "neutral", visibility: saved?.visibility ?? "private" }); }} placeholder="Share only what you're comfortable saving…" /><div className="mt-2"><PrivacySelect value={(saved?.visibility ?? "private") as MySoulVisibility} onChange={(value) => { if (saved) void saveRecord("preferences", { id: saved.id, category: "Emotional Style", key: question, value: saved.value, sentiment: "neutral", visibility: value }); }} label="Answer privacy" /></div></div>; })}</div><RecordList rows={(rows.preferences ?? []).filter((item) => item.category === "Emotional Style")} onRemove={(id) => void removeRecord("preferences", id)} empty="Your answers save when you leave each field." /></section>;

    if (section === "privacy") return <section className="space-y-6 p-4 sm:p-7"><div><h2 className="text-xl font-bold">Privacy and settings</h2><p className="mt-1 text-xs leading-6 text-slate-500">Public access and chat history are separate. Personal facts always use their own visibility setting.</p></div><div className="grid gap-2">{[
      ["enabled", "Enable MySoul", "You can pause replies without deleting your information."],
      ["public_enabled", "Allow public access", "Let anyone with your MySoul link view facts marked Public."],
      ["show_on_profile", "Show MySoul on my profile", "Add MySoul to your public SoulX creator profile."],
      ["allow_public_conversations", "Allow public conversations", "Let visitors with public access send messages."],
      ["allow_followers", "Allow followers", "Let people you follow back access Friends facts and chat."],
      ["allow_friends", "Allow friends", "Let mutual followers access Friends facts and chat."],
      ["allow_conversation_history", "Allow saved history", "Allow visitors to opt in before a conversation is stored."],
      ["save_visitor_chats", "Offer visitor chat saving", "Show a clear consent notice and allow visitors to save the current conversation."],
      ["allow_ai_interactions", "Allow AI-to-AI interactions", "Let approved SoulX agents request a MySoul response."],
    ].map(([field, label, help]) => <label key={field} className="flex cursor-pointer items-start justify-between gap-4 rounded-2xl border border-white/8 bg-white/[.02] p-4"><span><span className="block text-xs font-semibold text-slate-200">{label}</span><span className="mt-1 block max-w-2xl text-[10px] leading-5 text-slate-500">{help}</span></span><input type="checkbox" checked={Boolean(s[field])} onChange={(event) => void updateSoul({ [field]: event.target.checked })} className="mt-0.5 h-4 w-4 shrink-0 accent-cyan-400" /></label>)}</div><div className="grid gap-4 sm:grid-cols-2"><Field label="Default privacy for new facts"><select value={text(s.default_visibility) || "private"} onChange={(event) => void updateSoul({ default_visibility: event.target.value })} className={selectClass}>{Object.entries(PRIVACY_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></Field><Field label="Preferred language"><input value={text(s.preferred_language)} onChange={(event) => setDashboard((current) => current ? { ...current, soul: { ...current.soul, preferred_language: event.target.value } } : current)} onBlur={(event) => void updateSoul({ preferred_language: event.target.value })} className={inputClass} placeholder="English" /></Field></div><div className="rounded-2xl border border-cyan-300/10 bg-cyan-300/[.025] p-4"><p className="text-xs font-semibold text-slate-200">Download or delete</p><p className="mt-1 text-[10px] leading-5 text-slate-500">Export your MySoul data or remove the profile and every related record.</p><div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={async () => { try { const response = await fetch("/api/mysoul/export", { credentials: "same-origin" }); if (!response.ok) throw new Error("Could not export MySoul."); const blob = await response.blob(); const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = "mysoul-export.json"; anchor.click(); URL.revokeObjectURL(url); } catch (cause) { setError((cause as Error).message); } }} className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/10 px-4 text-xs text-slate-200"><ArrowDownToLine className="h-3.5 w-3.5" />Export MySoul</button><button type="button" onClick={async () => { const confirmation = window.prompt(`Type “${s.display_name}” to permanently delete MySoul and all related data.`); if (confirmation === null) return; try { await jsonRequest("/api/mysoul", { method: "DELETE", body: JSON.stringify({ confirmation }) }); setDashboard(null); setSection("overview"); } catch (cause) { setError((cause as Error).message); } }} className="inline-flex min-h-10 items-center gap-2 rounded-full border border-rose-300/20 px-4 text-xs text-rose-200"><Trash2 className="h-3.5 w-3.5" />Delete MySoul</button></div></div></section>;

    if (section === "analytics") return <OwnerMySoulAnalytics conversationCount={dashboard.conversationCount} savedConversationCount={dashboard.savedConversationCount} messageCount={dashboard.analytics.mysoul_message_sent ?? 0} teachingCount={dashboard.analytics.mysoul_teaching_added ?? 0} completeness={score} lastTrained={dashboard.communication?.updated_at ? new Date(dashboard.communication.updated_at).toLocaleDateString() : "Not yet"} topics={dashboard.topicAnalytics} />;
  };

  return <main className="mx-auto max-w-7xl px-2 py-4 text-white sm:px-5 sm:py-8"><section className="overflow-hidden rounded-[28px] border border-cyan-300/12 bg-[#050d1e] shadow-[0_24px_85px_rgba(2,8,23,.46)] sm:rounded-[34px]">{header}{onboardingStep === null && nav}{status && <div className="px-4 pt-4 sm:px-7"><Notice>{status}</Notice></div>}{error && <div className="px-4 pt-4 sm:px-7"><Notice tone="rose">{error}</Notice></div>}{renderSection()}</section></main>;
}

function TraitForm({ saveRecord }: { saveRecord: (collection: string, record: Record<string, unknown>) => Promise<boolean> }) {
  return <form onSubmit={async (event) => { event.preventDefault(); const formElement = event.currentTarget; const data = new FormData(formElement); if (await saveRecord("traits", { trait: data.get("trait"), strength: Number(data.get("strength")), visibility: data.get("visibility") })) formElement.reset(); }} className="grid gap-3 rounded-[22px] border border-white/8 bg-white/[.02] p-4 sm:grid-cols-[1fr_140px_160px_auto]"><Field label="Custom trait"><input name="trait" required maxLength={100} className={inputClass} placeholder="Patient, playful…" /></Field><Field label="Strength · 1–5"><input type="number" name="strength" min="1" max="5" defaultValue="3" className={inputClass} /></Field><Field label="Privacy"><select name="visibility" defaultValue="private" className={selectClass}>{Object.entries(PRIVACY_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></Field><button className="mt-auto inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-cyan-400 px-4 text-xs font-bold text-slate-950"><Plus className="h-3.5 w-3.5" />Add trait</button></form>;
}

function PersonalityForms({ rows, saveRecord, removeRecord }: { rows: MySoulRecord[]; saveRecord: (collection: string, record: Record<string, unknown>) => Promise<boolean>; removeRecord: (collection: string, id: string) => void }) {
  return <div className="space-y-4"><div className="grid gap-3 sm:grid-cols-2">{PERSONALITY_QUESTIONS.map(([key, question]) => { const saved = rows.find((row) => row.question_key === key); return <div key={key} className="rounded-[20px] border border-white/8 bg-white/[.02] p-4"><p className="text-xs font-semibold text-slate-200">{question}</p><textarea key={saved?.id ?? "new"} defaultValue={text(saved?.answer)} maxLength={4000} onBlur={(event) => { const answer = event.currentTarget.value.trim(); if (answer && answer !== saved?.answer) void saveRecord("personality_answers", { ...(saved ? { id: saved.id } : {}), question_key: key, answer, visibility: saved?.visibility ?? "private" }); }} className={`${textAreaClass} min-h-20`} placeholder="Share in your own words…" /><div className="mt-2"><PrivacySelect value={(saved?.visibility ?? "private") as MySoulVisibility} onChange={(visibility) => { if (saved) void saveRecord("personality_answers", { id: saved.id, question_key: key, answer: saved.answer, visibility }); }} label="Answer privacy" /></div></div>; })}</div><RecordList rows={rows.filter((row) => !PERSONALITY_QUESTIONS.some(([key]) => row.question_key === key))} onRemove={(id) => void removeRecord("personality_answers", id)} empty="Add a custom answer below to give MySoul more context." /><form onSubmit={async (event) => { event.preventDefault(); const formElement = event.currentTarget; const form = new FormData(formElement); if (await saveRecord("personality_answers", { question_key: String(form.get("question_key")), answer: form.get("answer"), visibility: form.get("visibility") })) formElement.reset(); }} className="grid gap-3 rounded-[20px] border border-white/8 bg-white/[.02] p-4 sm:grid-cols-2"><Field label="Your question"><input name="question_key" required maxLength={80} className={inputClass} placeholder="A question that helps explain how I think" /></Field><Field label="Your answer"><input name="answer" required maxLength={4000} className={inputClass} /></Field><label className="text-[10px] text-slate-500">Privacy<select name="visibility" defaultValue="private" className={selectClass}>{Object.entries(PRIVACY_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label><button className="inline-flex min-h-10 w-fit items-center gap-2 rounded-full bg-cyan-400 px-4 text-xs font-bold text-slate-950"><Plus className="h-3.5 w-3.5" />Add answer</button></form></div>;
}

function InterestForms({ rows, saveRecord, removeRecord, defaultVisibility }: { rows: MySoulRecord[]; saveRecord: (collection: string, record: Record<string, unknown>) => Promise<boolean>; removeRecord: (collection: string, id: string) => void; defaultVisibility: MySoulVisibility }) {
  return <><form onSubmit={async (event) => { event.preventDefault(); const formElement = event.currentTarget; const form = new FormData(formElement); if (await saveRecord("interests", { category: form.get("category"), interest: form.get("interest"), sentiment: form.get("sentiment"), intensity: Number(form.get("intensity")), visibility: form.get("visibility") })) formElement.reset(); }} className="grid gap-3 rounded-[22px] border border-white/8 bg-white/[.02] p-4 sm:grid-cols-2 lg:grid-cols-3"><Field label="Category"><select name="category" className={selectClass}>{INTEREST_CATEGORIES.map((category) => <option key={category}>{category}</option>)}</select></Field><Field label="Interest"><input name="interest" required maxLength={160} className={inputClass} placeholder="A specific interest" /></Field><Field label="How do you feel about it?"><select name="sentiment" className={selectClass}><option value="like">Like</option><option value="love">Love</option><option value="neutral">Neutral</option><option value="dislike">Dislike</option></select></Field><Field label="Intensity · 1–5"><input name="intensity" type="number" min="1" max="5" defaultValue="3" className={inputClass} /></Field><Field label="Privacy"><select name="visibility" defaultValue={defaultVisibility} className={selectClass}>{Object.entries(PRIVACY_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></Field><button className="mt-auto inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-cyan-400 px-4 text-xs font-bold text-slate-950"><Plus className="h-3.5 w-3.5" />Add interest</button></form><RecordList rows={rows} onRemove={(id) => void removeRecord("interests", id)} empty="Choose something you're interested in." /></>;
}
