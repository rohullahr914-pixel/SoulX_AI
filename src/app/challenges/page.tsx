import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowRight, BrainCircuit, Clock3, Compass, Eye, PenLine, Sparkles, Trophy } from "lucide-react";
import { PersonaAvatar } from "@/components/persona-avatar";

type ChallengeHost = {
  name: string;
  slug: string;
};

type FeaturedChallenge = {
  id: string;
  title: string;
  category: string;
  difficulty: "Medium" | "Hard";
  reward: number;
  duration: string;
  hosts: ChallengeHost[];
  prompt: string;
  deliverable: string;
  icon: LucideIcon;
};

const challenges: FeaturedChallenge[] = [
  {
    id: "elevator-test",
    title: "The Elevator Test",
    category: "Physics · Thought Experiment",
    difficulty: "Medium",
    reward: 120,
    duration: "15–20 min",
    hosts: [{ name: "Albert Einstein", slug: "albert-einstein" }],
    prompt: "You are inside a sealed elevator. Explain why one observation cannot tell you whether you are standing in a gravitational field or accelerating through space. Then propose a careful test that could reveal a difference, and state the assumption behind it.",
    deliverable: "Write 180–250 words. Use one clear analogy or a simple diagram.",
    icon: BrainCircuit,
  },
  {
    id: "signal-before-story",
    title: "Signal Before Story",
    category: "Logic · Observation",
    difficulty: "Medium",
    reward: 140,
    duration: "20 min",
    hosts: [{ name: "Sherlock Holmes", slug: "sherlock-holmes" }],
    prompt: "A community studio loses its event sign-up list. Three clues arrive at once: a badge entry at 18:02, a printer light at 18:04, and a message sent from a phone at 18:05. Build an evidence-first investigation plan: what do you verify first, what would count as reliable evidence, and how will you avoid jumping to a conclusion?",
    deliverable: "Give a ranked list of three checks, with one sentence explaining each choice.",
    icon: Eye,
  },
  {
    id: "argument-in-a-room",
    title: "An Argument in a Room",
    category: "Writing · Character",
    difficulty: "Medium",
    reward: 130,
    duration: "20–25 min",
    hosts: [{ name: "William Shakespeare", slug: "william-shakespeare" }],
    prompt: "Write a short scene between Ambition and Conscience as they decide whether to release a powerful new invention. Let each voice want something different, then give the scene a turn that makes the final question harder than the first.",
    deliverable: "Write 12–16 lines. Include one vivid metaphor and end on a question.",
    icon: PenLine,
  },
  {
    id: "seventy-two-hour-turnaround",
    title: "The 72-Hour Turnaround",
    category: "Strategy · Leadership",
    difficulty: "Hard",
    reward: 180,
    duration: "25–30 min",
    hosts: [{ name: "Napoleon Bonaparte", slug: "napoleon-bonaparte" }],
    prompt: "A volunteer team has 72 hours to relaunch a neglected neighborhood event with no extra budget. Create a decisive, ethical plan that sets one objective, assigns roles, protects the team from burnout, and includes a pivot condition if the first plan fails.",
    deliverable: "Present a three-phase plan: first 6 hours, next day, and final launch day.",
    icon: Compass,
  },
  {
    id: "four-mind-brief",
    title: "One Problem, Four Lenses",
    category: "Cross-disciplinary · Grand Challenge",
    difficulty: "Hard",
    reward: 220,
    duration: "30–40 min",
    hosts: [
      { name: "Albert Einstein", slug: "albert-einstein" },
      { name: "Sherlock Holmes", slug: "sherlock-holmes" },
      { name: "William Shakespeare", slug: "william-shakespeare" },
      { name: "Napoleon Bonaparte", slug: "napoleon-bonaparte" },
    ],
    prompt: "A neighborhood library wants more teenagers to participate, but it cannot increase its budget. Design a one-page plan through four labelled lenses: an Einstein-style question to test, a Holmes-style observation to gather, a Shakespeare-style story to invite people in, and a Napoleon-style sequence to execute. Decide which lens leads and defend your choice.",
    deliverable: "Use four short sections and finish with a 50-word leadership brief.",
    icon: Sparkles,
  },
];

const difficultyClasses = {
  Medium: "border-amber-300/25 bg-amber-300/10 text-amber-100",
  Hard: "border-violet-300/25 bg-violet-300/10 text-violet-100",
};

export default function ChallengesPage() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-8 text-white sm:px-6 sm:py-10 lg:px-8">
      <section className="relative overflow-hidden rounded-[34px] border border-cyan-300/20 bg-[radial-gradient(circle_at_78%_12%,rgba(59,130,246,0.2),transparent_28%),radial-gradient(circle_at_15%_95%,rgba(34,211,238,0.16),transparent_32%),rgba(2,8,23,0.9)] px-5 py-10 shadow-[0_30px_90px_rgba(2,8,23,0.5)] sm:px-8 sm:py-14 lg:px-12">
        <div aria-hidden="true" className="bg-grid-fade pointer-events-none absolute inset-0 opacity-50" />
        <div aria-hidden="true" className="absolute -right-16 top-1/2 h-72 w-72 -translate-y-1/2 rounded-full border border-cyan-300/15" />
        <div className="relative max-w-3xl">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-cyan-300"><Trophy className="h-4 w-4" /> Featured challenges</p>
          <h1 className="mt-5 text-4xl font-black leading-[0.95] tracking-[-0.07em] sm:text-6xl">Think with remarkable minds.</h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">Five original English challenges in science, deduction, writing, strategy, and cross-disciplinary thinking. Pick a lens, make your case, and take the conversation further.</p>
          <div className="mt-7 flex flex-wrap gap-3 text-sm text-cyan-100">
            <span className="rounded-full border border-cyan-300/20 bg-cyan-400/10 px-3 py-1.5">5 active challenges</span>
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5">120–220 XP</span>
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5">English prompts</span>
          </div>
        </div>
      </section>

      <div className="mt-10 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Choose your perspective</p>
          <h2 className="mt-2 text-2xl font-bold tracking-[-0.05em] text-white">Ready when you are.</h2>
        </div>
        <p className="max-w-md text-sm leading-6 text-slate-400">There is no single perfect answer—make your reasoning clear, specific, and original.</p>
      </div>

      <section className="mt-6 grid items-start gap-5 md:grid-cols-2 xl:grid-cols-3" aria-label="Featured challenges">
        {challenges.map((challenge) => {
          const Icon = challenge.icon;
          const leadHost = challenge.hosts[0];

          return (
            <article key={challenge.id} className="group flex h-full flex-col overflow-hidden rounded-[28px] border border-white/10 bg-slate-950/65 p-5 shadow-[0_20px_55px_rgba(2,8,23,0.28)] transition duration-200 hover:-translate-y-1 hover:border-cyan-300/35 hover:shadow-[0_24px_60px_rgba(8,47,73,0.3)] sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <div className="flex -space-x-2">
                  {challenge.hosts.map((host) => <PersonaAvatar key={host.slug} slug={host.slug} name={host.name} className="h-11 w-11 border-2 border-slate-950" />)}
                </div>
                <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${difficultyClasses[challenge.difficulty]}`}>{challenge.difficulty}</span>
              </div>

              <div className="mt-5 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-300"><Icon className="h-4 w-4" /> {challenge.category}</div>
              <h3 className="mt-3 text-2xl font-black tracking-[-0.06em] text-white">{challenge.title}</h3>
              <p className="mt-2 text-sm font-medium text-slate-300">Hosted by {challenge.hosts.map((host) => host.name).join(" · ")}</p>
              <p className="mt-5 text-sm leading-7 text-slate-300">{challenge.prompt}</p>

              <div className="mt-5 rounded-2xl border border-cyan-300/12 bg-cyan-400/[0.045] p-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-200">Your brief</p>
                <p className="mt-2 text-sm leading-6 text-slate-300">{challenge.deliverable}</p>
              </div>

              <div className="mt-6 flex items-center justify-between gap-4 border-t border-white/8 pt-4 text-xs text-slate-400">
                <span className="inline-flex items-center gap-1.5"><Clock3 className="h-3.5 w-3.5 text-cyan-300" />{challenge.duration}</span>
                <span className="font-semibold text-cyan-200">+{challenge.reward} XP</span>
              </div>
              <Link href={`/chat/${leadHost.slug}`} className="mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 px-4 py-2.5 text-sm font-bold text-slate-950 transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950">
                Begin with {leadHost.name.split(" ")[0]} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </article>
          );
        })}
      </section>
    </main>
  );
}
