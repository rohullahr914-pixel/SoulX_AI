"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import {
  ArrowRight,
  Bot,
  Check,
  CircleCheckBig,
  Copy,
  Edit3,
  Lightbulb,
  MessageCircle,
  Plus,
  Save,
  Sparkles,
  Trash2,
  WandSparkles,
} from "lucide-react";
import { BackButton } from "@/components/back-button";
import {
  deleteCustomPersona,
  getCustomPersonasSnapshot,
  parseCustomPersonasSnapshot,
  personaAccentColors,
  saveCustomPersona,
  subscribeToCustomPersonas,
  type CustomPersona,
  type PersonaAccentColor,
} from "@/lib/custom-personas";
import { PublishPersona, MyCreatorLink } from "@/components/social/controls";

const DRAFT_KEY = "personax-persona-builder-draft";

type PersonaDraft = {
  name: string;
  profession: string;
  category: string;
  description: string;
  personality: string;
  expertise: string;
  tone: string;
  greeting: string;
  instructions: string;
  suggestedPrompts: string;
  color: PersonaAccentColor;
};

const emptyDraft: PersonaDraft = {
  name: "",
  profession: "",
  category: "Education",
  description: "",
  personality: "",
  expertise: "",
  tone: "Warm, clear, and practical",
  greeting: "",
  instructions: "",
  suggestedPrompts: "",
  color: "cyan",
};

const categories = ["Education", "Business", "Creative", "Technology", "Research", "Wellness", "Lifestyle", "Custom"];

const toneOptions = [
  "Warm, clear, and practical",
  "Direct, concise, and analytical",
  "Curious, encouraging, and reflective",
  "Bold, energetic, and challenging",
  "Calm, patient, and educational",
  "Playful, imaginative, and expressive",
];

const templates: Array<{ label: string; detail: string; icon: typeof Bot; draft: PersonaDraft }> = [
  {
    label: "Study coach",
    detail: "Patient lessons and active recall",
    icon: Lightbulb,
    draft: {
      name: "Nova",
      profession: "Adaptive Study Coach",
      category: "Education",
      description: "A patient learning partner who turns difficult subjects into clear steps and checks understanding along the way.",
      personality: "Patient, encouraging, curious, structured",
      expertise: "Learning science, active recall, study planning, clear explanations",
      tone: "Calm, patient, and educational",
      greeting: "Hi, I'm Nova. What are you learning, and where does it start to feel unclear?",
      instructions: "Ask one diagnostic question before teaching.\nUse examples before definitions.\nEnd with a small knowledge check.",
      suggestedPrompts: "Build me a study plan for this topic.\nExplain this idea with a simple analogy.\nQuiz me on what I just learned.",
      color: "cyan",
    },
  },
  {
    label: "Strategy partner",
    detail: "Sharper decisions and trade-offs",
    icon: Sparkles,
    draft: {
      name: "Vector",
      profession: "Product Strategy Partner",
      category: "Business",
      description: "A rigorous thought partner who clarifies goals, challenges assumptions, and turns ambiguous ideas into practical decisions.",
      personality: "Analytical, candid, pragmatic, composed",
      expertise: "Product strategy, prioritization, customer discovery, decision frameworks",
      tone: "Direct, concise, and analytical",
      greeting: "I'm Vector. Bring me the decision, the constraints, and what success should look like.",
      instructions: "Separate facts from assumptions.\nShow the most important trade-off.\nRecommend a concrete next step.",
      suggestedPrompts: "Pressure-test this product idea.\nHelp me prioritize these options.\nWhat assumption creates the most risk?",
      color: "violet",
    },
  },
  {
    label: "Creative partner",
    detail: "Original ideas without the fluff",
    icon: WandSparkles,
    draft: {
      name: "Muse",
      profession: "Creative Direction Partner",
      category: "Creative",
      description: "An imaginative collaborator who develops distinctive concepts, finds fresh angles, and helps creative work become more memorable.",
      personality: "Imaginative, perceptive, playful, constructive",
      expertise: "Concept development, storytelling, brand voice, creative critique",
      tone: "Playful, imaginative, and expressive",
      greeting: "I'm Muse. Show me the idea—even if it's rough—and we'll find the spark inside it.",
      instructions: "Offer three meaningfully different directions.\nUse vivid, concrete language.\nExplain why each idea could work.",
      suggestedPrompts: "Give me three unexpected directions for this idea.\nMake this concept more memorable.\nCritique this draft like a creative director.",
      color: "amber",
    },
  },
];

const accentStyles: Record<PersonaAccentColor, { glow: string; surface: string; solid: string; text: string }> = {
  cyan: {
    glow: "shadow-[0_0_45px_rgba(34,211,238,0.16)]",
    surface: "border-cyan-300/25 bg-cyan-400/10",
    solid: "from-cyan-400 to-blue-600",
    text: "text-cyan-200",
  },
  violet: {
    glow: "shadow-[0_0_45px_rgba(168,85,247,0.16)]",
    surface: "border-violet-300/25 bg-violet-400/10",
    solid: "from-violet-400 to-fuchsia-600",
    text: "text-violet-200",
  },
  emerald: {
    glow: "shadow-[0_0_45px_rgba(52,211,153,0.16)]",
    surface: "border-emerald-300/25 bg-emerald-400/10",
    solid: "from-emerald-400 to-teal-600",
    text: "text-emerald-200",
  },
  amber: {
    glow: "shadow-[0_0_45px_rgba(251,191,36,0.16)]",
    surface: "border-amber-300/25 bg-amber-400/10",
    solid: "from-amber-400 to-orange-600",
    text: "text-amber-200",
  },
};

function FieldShell({
  label,
  hint,
  error,
  htmlFor,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <label htmlFor={htmlFor} className="block">
      <span className="flex items-center justify-between gap-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-300">
        {label}
        {hint && <span className="normal-case tracking-normal text-slate-500">{hint}</span>}
      </span>
      <span className="mt-2 block">{children}</span>
      {error && <span className="mt-2 block text-xs text-rose-300">{error}</span>}
    </label>
  );
}

function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "AI"
  );
}

export default function CreatePersonaPage() {
  const [form, setForm] = useState<PersonaDraft>(emptyDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [lastSavedId, setLastSavedId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Partial<Record<keyof PersonaDraft, string>>>({});
  const [status, setStatus] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const customPersonasSnapshot = useSyncExternalStore(subscribeToCustomPersonas, getCustomPersonasSnapshot, () => "__loading__");
  const publishedPersonas = useMemo(() => parseCustomPersonasSnapshot(customPersonasSnapshot), [customPersonasSnapshot]);

  useEffect(() => {
    const hydrationTimer = window.setTimeout(() => {
      try {
        const rawDraft = window.localStorage.getItem(DRAFT_KEY);
        if (rawDraft) {
          const stored = JSON.parse(rawDraft) as Partial<PersonaDraft>;
          setForm({
            ...emptyDraft,
            ...stored,
            color: personaAccentColors.includes(stored.color as PersonaAccentColor)
              ? (stored.color as PersonaAccentColor)
              : "cyan",
          });
        }
      } catch {
        window.localStorage.removeItem(DRAFT_KEY);
      }
      setIsHydrated(true);
    }, 0);

    return () => window.clearTimeout(hydrationTimer);
  }, []);

  useEffect(() => {
    if (isHydrated) window.localStorage.setItem(DRAFT_KEY, JSON.stringify(form));
  }, [form, isHydrated]);

  const completion = useMemo(() => {
    const signals = [form.name, form.profession, form.description, form.personality, form.expertise, form.greeting, form.suggestedPrompts];
    return Math.round((signals.filter((value) => value.trim()).length / signals.length) * 100);
  }, [form]);

  const promptPreview = useMemo(
    () =>
      form.suggestedPrompts
        .split("\n")
        .map((prompt) => prompt.trim())
        .filter(Boolean)
        .slice(0, 4),
    [form.suggestedPrompts],
  );

  const personalityPreview = useMemo(
    () =>
      form.personality
        .split(",")
        .map((trait) => trait.trim())
        .filter(Boolean)
        .slice(0, 4),
    [form.personality],
  );

  const accent = accentStyles[form.color];

  const updateField = <Field extends keyof PersonaDraft>(field: Field, value: PersonaDraft[Field]) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setStatus(null);
    setLastSavedId(null);
  };

  const applyTemplate = (template: PersonaDraft) => {
    setForm(template);
    setEditingId(null);
    setLastSavedId(null);
    setErrors({});
    setStatus({ type: "success", text: "Template loaded. Make it yours, then publish." });
    document.getElementById("builder-editor")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const validate = () => {
    const nextErrors: Partial<Record<keyof PersonaDraft, string>> = {};
    if (form.name.trim().length < 2) nextErrors.name = "Give your persona a name with at least 2 characters.";
    if (form.profession.trim().length < 3) nextErrors.profession = "Describe the role this persona will play.";
    if (form.description.trim().length < 20) nextErrors.description = "Write at least 20 characters so the persona has a clear purpose.";
    if (!form.expertise.trim()) nextErrors.expertise = "Add at least one area of expertise.";
    if (!form.personality.trim()) nextErrors.personality = "Add a few personality traits.";
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const publishPersona = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validate()) {
      setStatus({ type: "error", text: "A few important details still need your attention." });
      return;
    }

    const now = new Date().toISOString();
    const existing = editingId ? publishedPersonas.find((persona) => persona.id === editingId) : undefined;
    const id = existing?.id ?? `custom-${crypto.randomUUID()}`;
    const suggestedPrompts = promptPreview.length
      ? promptPreview
      : [
          `Help me with a ${form.expertise.split(",")[0]?.trim().toLowerCase() || "new"} challenge.`,
          "What should we explore first?",
        ];
    const persona: CustomPersona = {
      id,
      name: form.name.trim(),
      profession: form.profession.trim(),
      category: form.category,
      description: form.description.trim(),
      personality: form.personality.trim(),
      expertise: form.expertise.trim(),
      tone: form.tone.trim(),
      greeting: form.greeting.trim() || `Hi, I'm ${form.name.trim()}. What would you like to explore together?`,
      instructions: form.instructions.trim(),
      suggestedPrompts,
      color: form.color,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };

    saveCustomPersona(persona);
    setEditingId(id);
    setLastSavedId(id);
    setStatus({ type: "success", text: existing ? "Persona updated and ready to chat." : "Persona published and ready to chat." });
  };

  const startFresh = () => {
    setForm({ ...emptyDraft });
    setEditingId(null);
    setLastSavedId(null);
    setErrors({});
    setStatus(null);
    window.localStorage.removeItem(DRAFT_KEY);
    document.getElementById("builder-editor")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const editPersona = (persona: CustomPersona) => {
    setForm({
      name: persona.name,
      profession: persona.profession,
      category: persona.category,
      description: persona.description,
      personality: persona.personality,
      expertise: persona.expertise,
      tone: persona.tone,
      greeting: persona.greeting,
      instructions: persona.instructions,
      suggestedPrompts: persona.suggestedPrompts.join("\n"),
      color: persona.color,
    });
    setEditingId(persona.id);
    setLastSavedId(null);
    setErrors({});
    setStatus({ type: "success", text: `Editing ${persona.name}. Your changes are not published yet.` });
    document.getElementById("builder-editor")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const duplicatePersona = (persona: CustomPersona) => {
    editPersona(persona);
    setForm((current) => ({ ...current, name: `${persona.name} Copy` }));
    setEditingId(null);
    setStatus({ type: "success", text: "Copy created. Rename or refine it before publishing." });
  };

  const removePersona = (persona: CustomPersona) => {
    if (!window.confirm(`Delete ${persona.name}? This cannot be undone.`)) return;
    deleteCustomPersona(persona.id);
    if (editingId === persona.id) startFresh();
  };

  const inputClass = (hasError?: boolean) =>
    `w-full rounded-2xl border bg-slate-950/65 px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-slate-600 ${
      hasError ? "border-rose-400/60 focus:border-rose-300" : "border-white/10 focus:border-cyan-300/60 focus:bg-slate-950"
    }`;

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 text-white sm:px-6 sm:py-10 lg:px-8">
      <MyCreatorLink />
      <section className="relative overflow-hidden rounded-[34px] border border-cyan-300/15 bg-[radial-gradient(circle_at_15%_0%,rgba(34,211,238,0.16),transparent_30%),radial-gradient(circle_at_90%_20%,rgba(139,92,246,0.14),transparent_34%),rgba(2,8,23,0.88)] p-5 shadow-[0_30px_90px_rgba(2,8,23,0.5)] sm:p-8 lg:p-10">
        <div className="pointer-events-none absolute inset-0 bg-grid-fade opacity-70" />
        <div className="relative">
          <div className="flex items-center justify-between gap-4">
            <BackButton href="/explore" label="Back" />
            <span className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-400/8 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-200">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-300 shadow-[0_0_10px_rgba(103,232,249,0.8)]" />
              Persona Studio
            </span>
          </div>

          <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-300">Design a mind that feels distinct</p>
              <h1 className="mt-4 text-4xl font-black leading-[0.98] tracking-[-0.07em] text-white sm:text-6xl">
                Build an AI worth
                <span className="block bg-gradient-to-r from-cyan-300 via-blue-300 to-violet-300 bg-clip-text text-transparent">coming back to.</span>
              </h1>
              <p className="mt-5 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
                Give it a purpose, a point of view, and a voice. Your draft saves automatically, and every published persona can join a real conversation.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              {[
                [String(publishedPersonas.length), "Created"],
                [`${completion}%`, "Complete"],
                ["Local", "Private"],
              ].map(([value, label]) => (
                <div key={label} className="min-w-20 rounded-2xl border border-white/10 bg-white/[0.035] px-3 py-3 text-center backdrop-blur sm:min-w-24">
                  <p className="text-xl font-black tracking-[-0.05em] text-white">{value}</p>
                  <p className="mt-1 text-[9px] uppercase tracking-[0.18em] text-slate-500">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mt-6 rounded-[28px] border border-white/8 bg-slate-950/55 p-5 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-violet-300">Quick start</p>
            <h2 className="mt-2 text-xl font-bold tracking-[-0.04em] text-white">Start with a proven shape</h2>
          </div>
          <button type="button" onClick={startFresh} className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-xs text-slate-300 transition hover:border-cyan-300/40 hover:text-white">
            <Plus className="h-3.5 w-3.5" /> Blank persona
          </button>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {templates.map((template) => {
            const Icon = template.icon;
            return (
              <button key={template.label} type="button" onClick={() => applyTemplate(template.draft)} className="group flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.025] p-4 text-left transition hover:-translate-y-0.5 hover:border-cyan-300/30 hover:bg-cyan-400/[0.045]">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-cyan-300/15 bg-cyan-400/8 text-cyan-200 transition group-hover:scale-105">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="min-w-0">
                  <span className="block font-semibold text-white">{template.label}</span>
                  <span className="mt-1 block text-xs text-slate-500">{template.detail}</span>
                </span>
                <ArrowRight className="ml-auto h-4 w-4 shrink-0 text-slate-600 transition group-hover:translate-x-1 group-hover:text-cyan-300" />
              </button>
            );
          })}
        </div>
      </section>

      <form id="builder-editor" onSubmit={publishPersona} className="mt-6 grid scroll-mt-24 gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(340px,0.85fr)] lg:items-start">
        <div className="space-y-6">
          <section className="rounded-[30px] border border-white/10 bg-slate-950/65 p-5 shadow-[0_20px_55px_rgba(2,8,23,0.3)] sm:p-7">
            <div className="flex items-start gap-4 border-b border-white/8 pb-5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-cyan-300/20 bg-cyan-400/10 text-sm font-black text-cyan-200">01</span>
              <div>
                <h2 className="text-xl font-bold tracking-[-0.04em] text-white">Identity & purpose</h2>
                <p className="mt-1 text-sm text-slate-500">Define who this persona is and the job it should do well.</p>
              </div>
            </div>

            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <FieldShell htmlFor="persona-name" label="Name" hint={`${form.name.length}/48`} error={errors.name}>
                <input id="persona-name" value={form.name} maxLength={48} onChange={(event) => updateField("name", event.target.value)} placeholder="e.g. Nova" className={inputClass(Boolean(errors.name))} aria-invalid={Boolean(errors.name)} />
              </FieldShell>
              <FieldShell htmlFor="persona-profession" label="Role" hint={`${form.profession.length}/72`} error={errors.profession}>
                <input id="persona-profession" value={form.profession} maxLength={72} onChange={(event) => updateField("profession", event.target.value)} placeholder="e.g. Adaptive Study Coach" className={inputClass(Boolean(errors.profession))} aria-invalid={Boolean(errors.profession)} />
              </FieldShell>
              <FieldShell htmlFor="persona-category" label="Category">
                <select id="persona-category" value={form.category} onChange={(event) => updateField("category", event.target.value)} className={inputClass()}>
                  {categories.map((category) => <option key={category}>{category}</option>)}
                </select>
              </FieldShell>
              <fieldset>
                <legend className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-300">Accent color</legend>
                <div className="mt-3 flex gap-3">
                  {personaAccentColors.map((color) => (
                    <button key={color} type="button" onClick={() => updateField("color", color)} aria-label={`Use ${color} accent`} aria-pressed={form.color === color} className={`flex h-10 w-10 items-center justify-center rounded-full border transition ${accentStyles[color].surface} ${form.color === color ? "scale-110 ring-2 ring-white/70 ring-offset-2 ring-offset-slate-950" : "opacity-65 hover:opacity-100"}`}>
                      {form.color === color && <Check className="h-4 w-4 text-white" />}
                    </button>
                  ))}
                </div>
              </fieldset>
              <div className="sm:col-span-2">
                <FieldShell htmlFor="persona-description" label="Purpose" hint={`${form.description.length}/320`} error={errors.description}>
                  <textarea id="persona-description" value={form.description} maxLength={320} onChange={(event) => updateField("description", event.target.value)} placeholder="What is this persona uniquely good at, and who should use it?" className={`${inputClass(Boolean(errors.description))} min-h-28 resize-y leading-6`} aria-invalid={Boolean(errors.description)} />
                </FieldShell>
              </div>
            </div>
          </section>

          <section className="rounded-[30px] border border-white/10 bg-slate-950/65 p-5 shadow-[0_20px_55px_rgba(2,8,23,0.3)] sm:p-7">
            <div className="flex items-start gap-4 border-b border-white/8 pb-5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-violet-300/20 bg-violet-400/10 text-sm font-black text-violet-200">02</span>
              <div>
                <h2 className="text-xl font-bold tracking-[-0.04em] text-white">Mind & voice</h2>
                <p className="mt-1 text-sm text-slate-500">Shape how it thinks, responds, and stays consistent with the persona’s identity.</p>
              </div>
            </div>

            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <FieldShell htmlFor="persona-expertise" label="Expertise" hint="Comma-separated" error={errors.expertise}>
                <textarea id="persona-expertise" value={form.expertise} maxLength={180} onChange={(event) => updateField("expertise", event.target.value)} placeholder="Learning science, planning, active recall" className={`${inputClass(Boolean(errors.expertise))} min-h-24 resize-y leading-6`} aria-invalid={Boolean(errors.expertise)} />
              </FieldShell>
              <FieldShell htmlFor="persona-personality" label="Personality" hint="Comma-separated" error={errors.personality}>
                <textarea id="persona-personality" value={form.personality} maxLength={180} onChange={(event) => updateField("personality", event.target.value)} placeholder="Patient, curious, structured" className={`${inputClass(Boolean(errors.personality))} min-h-24 resize-y leading-6`} aria-invalid={Boolean(errors.personality)} />
              </FieldShell>
              <div className="sm:col-span-2">
                <FieldShell htmlFor="persona-tone" label="Conversation style">
                  <select id="persona-tone" value={form.tone} onChange={(event) => updateField("tone", event.target.value)} className={inputClass()}>
                    {toneOptions.map((tone) => <option key={tone}>{tone}</option>)}
                  </select>
                </FieldShell>
              </div>
              <div className="sm:col-span-2">
                <FieldShell htmlFor="persona-greeting" label="Opening message" hint={`${form.greeting.length}/220`}>
                  <textarea id="persona-greeting" value={form.greeting} maxLength={220} onChange={(event) => updateField("greeting", event.target.value)} placeholder={`Hi, I'm ${form.name || "your new persona"}. What should we explore together?`} className={`${inputClass()} min-h-24 resize-y leading-6`} />
                </FieldShell>
              </div>
              <div className="sm:col-span-2">
                <FieldShell htmlFor="persona-instructions" label="Behavior rules" hint="One rule per line">
                  <textarea id="persona-instructions" value={form.instructions} maxLength={700} onChange={(event) => updateField("instructions", event.target.value)} placeholder={"Ask one clarifying question before recommending.\nUse concrete examples.\nEnd with a practical next step."} className={`${inputClass()} min-h-32 resize-y leading-6`} />
                </FieldShell>
              </div>
            </div>
          </section>

          <section className="rounded-[30px] border border-white/10 bg-slate-950/65 p-5 shadow-[0_20px_55px_rgba(2,8,23,0.3)] sm:p-7">
            <div className="flex items-start gap-4">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-emerald-300/20 bg-emerald-400/10 text-sm font-black text-emerald-200">03</span>
              <div className="min-w-0 flex-1">
                <h2 className="text-xl font-bold tracking-[-0.04em] text-white">Conversation starters</h2>
                <p className="mt-1 text-sm text-slate-500">Give people useful ways to begin. Add up to four, one per line.</p>
                <textarea id="persona-prompts" value={form.suggestedPrompts} maxLength={560} onChange={(event) => updateField("suggestedPrompts", event.target.value)} placeholder={"Help me think through...\nTeach me the basics of...\nChallenge my assumptions about..."} className={`${inputClass()} mt-5 min-h-36 resize-y leading-7`} />
                <div className="mt-4 flex items-start gap-3 rounded-2xl border border-emerald-300/15 bg-emerald-400/[0.045] p-4 text-sm leading-6 text-emerald-100/80">
                  <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                  Strong starters are specific enough to reveal the persona’s value, but open enough to invite a real conversation.
                </div>
              </div>
            </div>
          </section>
        </div>

        <aside className="lg:sticky lg:top-28">
          <div className={`overflow-hidden rounded-[32px] border border-white/10 bg-slate-950/80 ${accent.glow}`}>
            <div className="border-b border-white/8 px-5 py-4 sm:px-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">Live preview</p>
                  <p className="mt-1 text-sm text-slate-300">Updates as you type</p>
                </div>
                <span className={`rounded-full border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] ${accent.surface} ${accent.text}`}>{form.category}</span>
              </div>
            </div>

            <div className="p-5 sm:p-6">
              <div className={`relative overflow-hidden rounded-[26px] border p-5 ${accent.surface}`}>
                <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
                <div className="relative flex items-center gap-4">
                  <div className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-[22px] bg-gradient-to-br ${accent.solid} text-xl font-black text-white shadow-lg`}>
                    {initials(form.name)}
                  </div>
                  <div className="min-w-0">
                    <h2 className="truncate text-2xl font-black tracking-[-0.055em] text-white">{form.name || "Untitled Persona"}</h2>
                    <p className={`mt-1 truncate text-[10px] font-semibold uppercase tracking-[0.18em] ${accent.text}`}>{form.profession || "Define a role"}</p>
                  </div>
                </div>
                <p className="relative mt-5 text-sm leading-6 text-slate-200/90">
                  {form.description || "Describe the distinctive value this persona brings to every conversation."}
                </p>
                <div className="relative mt-4 flex flex-wrap gap-2">
                  {(personalityPreview.length ? personalityPreview : ["Thoughtful", "Distinct", "Helpful"]).map((trait) => (
                    <span key={trait} className="rounded-full border border-white/10 bg-slate-950/30 px-2.5 py-1 text-[10px] text-slate-200">{trait}</span>
                  ))}
                </div>
              </div>

              <div className="mt-5 rounded-2xl border border-white/8 bg-white/[0.025] p-4">
                <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  <MessageCircle className="h-3.5 w-3.5" /> First message
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-300">
                  {form.greeting || `Hi, I'm ${form.name || "your new persona"}. What would you like to explore together?`}
                </p>
              </div>

              {promptPreview.length > 0 && (
                <div className="mt-5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Try asking</p>
                  <div className="mt-3 space-y-2">
                    {promptPreview.slice(0, 2).map((prompt) => (
                      <div key={prompt} className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/[0.025] px-3 py-2.5 text-xs text-slate-300">
                        <ArrowRight className={`h-3.5 w-3.5 shrink-0 ${accent.text}`} />
                        <span className="line-clamp-1">{prompt}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-6">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Persona readiness</span>
                  <span className={`font-semibold ${accent.text}`}>{completion}%</span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/8">
                  <div className={`h-full rounded-full bg-gradient-to-r ${accent.solid} transition-all duration-500`} style={{ width: `${completion}%` }} />
                </div>
              </div>

              <button type="submit" className={`mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r ${accent.solid} px-5 py-3.5 text-sm font-bold text-white shadow-lg transition hover:-translate-y-0.5 hover:brightness-110`}>
                <Save className="h-4 w-4" /> {editingId ? "Update persona" : "Publish persona"}
              </button>

              {status && (
                <div role="status" className={`mt-3 flex items-start gap-2 rounded-xl border px-3 py-3 text-xs leading-5 ${status.type === "success" ? "border-emerald-400/20 bg-emerald-400/8 text-emerald-200" : "border-rose-400/20 bg-rose-400/8 text-rose-200"}`}>
                  {status.type === "success" ? <CircleCheckBig className="mt-0.5 h-4 w-4 shrink-0" /> : <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-rose-300" />}
                  {status.text}
                </div>
              )}

              {lastSavedId && (
                <Link href={`/chat/${lastSavedId}`} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.035] px-5 py-3.5 text-sm font-semibold text-white transition hover:border-cyan-300/35 hover:bg-white/[0.06]">
                  Start a conversation <ArrowRight className="h-4 w-4" />
                </Link>
              )}

              <p className="mt-4 text-center text-[10px] leading-5 text-slate-600">Drafts save automatically in this browser.</p>
            </div>
          </div>
        </aside>
      </form>

      <section className="mt-8 rounded-[32px] border border-white/10 bg-slate-950/65 p-5 sm:p-7">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-cyan-300">Your collection</p>
            <h2 className="mt-2 text-3xl font-black tracking-[-0.06em] text-white">Published personas</h2>
            <p className="mt-2 text-sm text-slate-500">Edit, duplicate, or jump straight into a conversation.</p>
          </div>
          <button type="button" onClick={startFresh} className="inline-flex items-center gap-2 rounded-full border border-cyan-300/25 bg-cyan-400/8 px-4 py-2.5 text-sm font-semibold text-cyan-100 transition hover:border-cyan-300/50">
            <Plus className="h-4 w-4" /> Create another
          </button>
        </div>

        {publishedPersonas.length > 0 ? (
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {publishedPersonas.map((persona) => {
              const personaAccent = accentStyles[persona.color];
              return (
                <article key={persona.id} className="group rounded-[26px] border border-white/10 bg-white/[0.025] p-5 transition hover:-translate-y-1 hover:border-white/20">
                  <div className="flex items-start gap-3">
                    <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${personaAccent.solid} text-sm font-black text-white`}>{initials(persona.name)}</div>
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-lg font-bold tracking-[-0.04em] text-white">{persona.name}</h3>
                      <p className={`mt-1 truncate text-[10px] font-semibold uppercase tracking-[0.16em] ${personaAccent.text}`}>{persona.profession}</p>
                    </div>
                    <span className="rounded-full border border-white/8 bg-white/[0.035] px-2 py-1 text-[9px] uppercase tracking-[0.14em] text-slate-500">{persona.category}</span>
                  </div>
                  <p className="mt-4 line-clamp-2 min-h-12 text-sm leading-6 text-slate-400">{persona.description}</p>
                  <PublishPersona persona={persona} />
                  <div className="mt-5 flex items-center gap-2 border-t border-white/8 pt-4">
                    <Link href={`/chat/${persona.id}`} className={`inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r ${personaAccent.solid} px-3 py-2.5 text-xs font-bold text-white`}>
                      <MessageCircle className="h-3.5 w-3.5" /> Chat
                    </Link>
                    <button type="button" onClick={() => editPersona(persona)} aria-label={`Edit ${persona.name}`} title="Edit" className="rounded-xl border border-white/10 p-2.5 text-slate-400 transition hover:border-cyan-300/30 hover:text-cyan-200"><Edit3 className="h-3.5 w-3.5" /></button>
                    <button type="button" onClick={() => duplicatePersona(persona)} aria-label={`Duplicate ${persona.name}`} title="Duplicate" className="rounded-xl border border-white/10 p-2.5 text-slate-400 transition hover:border-violet-300/30 hover:text-violet-200"><Copy className="h-3.5 w-3.5" /></button>
                    <button type="button" onClick={() => removePersona(persona)} aria-label={`Delete ${persona.name}`} title="Delete" className="rounded-xl border border-white/10 p-2.5 text-slate-400 transition hover:border-rose-300/30 hover:text-rose-200"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="mt-6 flex flex-col items-center rounded-[26px] border border-dashed border-white/12 bg-white/[0.018] px-6 py-12 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-300/15 bg-cyan-400/8 text-cyan-200"><Bot className="h-6 w-6" /></span>
            <h3 className="mt-4 text-lg font-bold text-white">Your first persona starts above</h3>
            <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">Use a template or begin from scratch. Once published, it will appear here and in Explore.</p>
          </div>
        )}
      </section>
    </main>
  );
}
