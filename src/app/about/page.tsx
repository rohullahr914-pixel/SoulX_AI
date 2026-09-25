"use client";

import Link from "next/link";
import styles from "./about.module.css";
import { motion } from "framer-motion";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  BrainCircuit,
  BriefcaseBusiness,
  Check,
  ChevronRight,
  CircleDot,
  Compass,
  Cpu,
  FlaskConical,
  Globe2,
  Headphones,
  Lightbulb,
  Mail,
  MessageCircle,
  Network,
  Palette,
  PenLine,
  Rocket,
  Sparkles,
  Stars,
  Users,
} from "lucide-react";
import { BackButton } from "@/components/back-button";

const reveal = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] as const } },
};

const features = ["AI Personas", "Rooms", "Creator Personas", "Community", "AI Social Network", "Weekly Challenges", "Leaderboards", "Persona Profiles", "Human + AI Collaboration"];
const universe = [[FlaskConical, "Science"], [Cpu, "Technology"], [Globe2, "History"], [BriefcaseBusiness, "Leadership"], [Network, "Business"], [Palette, "Creativity"], [Headphones, "Music"], [Lightbulb, "Philosophy"], [Rocket, "Future"], [Compass, "Specialists"]] as const;
const roadmap = [["01", "AI Personas", "A universe of distinct voices, expertise, and ways of seeing."], ["02", "Rooms", "Let several perspectives meet around one meaningful question."], ["03", "Community", "Find the people and ideas that make curiosity contagious."], ["04", "Creator Economy", "Give builders the tools to shape and share remarkable minds."], ["05", "Living AI Ecosystem", "A dynamic place where human imagination keeps expanding the map."]] as const;
const contacts = [[Mail, "Email Us", "Send us a message", "General questions and ideas", "mailto:rohullahr914@gmail.com"], [MessageCircle, "Join us on WhatsApp", "Chat with us directly", "Message us directly on WhatsApp", "https://wa.me/93707763729"], [Headphones, "Support", "Get help with SoulX", "Help with your SoulX experience", "mailto:rohullahr914@gmail.com"], [BriefcaseBusiness, "Community", "Join the conversation", "Meet people building with AI", "/community"]] as const;

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.28em] text-cyan-300"><span className="h-1.5 w-1.5 rounded-full bg-cyan-300 shadow-[0_0_12px_rgba(103,232,249,0.9)]" />{children}</p>;
}
function Reveal({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <motion.div variants={reveal} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.15 }} className={className}>{children}</motion.div>;
}

export default function AboutPage() {
  return (
    <main className="relative mx-auto max-w-[1440px] overflow-hidden px-4 pb-16 text-white sm:px-6 lg:px-10">
      <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-[-18rem] h-[42rem] w-[42rem] -translate-x-1/2 rounded-full bg-cyan-500/10 blur-[130px]" />
      <div aria-hidden="true" className="bg-grid-fade pointer-events-none absolute inset-0 opacity-40 [mask-image:linear-gradient(to_bottom,black,transparent_34%)]" />

      <section className="relative flex min-h-[calc(100vh-7rem)] flex-col justify-center py-16 lg:py-24">
        <div aria-hidden="true" className="absolute left-[12%] top-[23%] h-2 w-2 animate-pulse rounded-full bg-cyan-200 shadow-[0_0_22px_8px_rgba(34,211,238,0.28)]" />
        <div aria-hidden="true" className="absolute right-[16%] top-[34%] h-1.5 w-1.5 animate-pulse rounded-full bg-blue-300 shadow-[0_0_18px_6px_rgba(59,130,246,0.3)] [animation-delay:900ms]" />
        <div className="relative z-10 mb-16 flex items-center justify-between"><BackButton href="/" label="Back home" /><span className="hidden text-[10px] uppercase tracking-[0.25em] text-slate-500 sm:block">SoulX / The perspective platform</span></div>
        <motion.div initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.12 } } }} className="relative z-10 max-w-5xl">
          <motion.div variants={reveal}><SectionLabel>The perspective platform</SectionLabel></motion.div>
          <motion.h1 variants={reveal} className="mt-6 max-w-4xl text-6xl font-black leading-[0.88] tracking-[-0.09em] text-white sm:text-8xl lg:text-[9.5rem]">Meet <span className="bg-gradient-to-r from-white via-cyan-100 to-cyan-400 bg-clip-text text-transparent">SoulX.</span></motion.h1>
          <motion.p variants={reveal} className="mt-8 max-w-2xl text-2xl font-medium tracking-[-0.04em] text-cyan-100 sm:text-3xl">One AI. A Thousand Minds.</motion.p>
          <motion.p variants={reveal} className="mt-6 max-w-xl text-base leading-8 text-slate-400 sm:text-lg">SoulX is a platform where people think, learn, create, and explore ideas through different AI personalities, perspectives, and minds.</motion.p>
          <motion.div variants={reveal} className="mt-10 flex flex-wrap gap-3"><Link href="/explore" className={`${styles.primaryCta} group inline-flex items-center gap-3 rounded-full px-5 py-3 text-sm font-bold`}>Explore the universe <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" /></Link><Link href="#story" className="inline-flex items-center gap-3 rounded-full border border-white/15 bg-white/[0.04] px-5 py-3 text-sm font-semibold text-slate-200 transition hover:border-cyan-300/50 hover:bg-cyan-400/10">Why SoulX <ArrowDown className="h-4 w-4 text-cyan-300" /></Link></motion.div>
        </motion.div>
        <div aria-hidden="true" className="absolute bottom-8 right-4 hidden h-72 w-72 rounded-full border border-cyan-300/10 sm:block"><div className="absolute inset-8 rounded-full border border-cyan-300/10"><div className="absolute inset-8 rounded-full border border-cyan-300/10" /></div><Stars className="absolute -right-8 top-8 h-8 w-8 text-cyan-300/60" /></div>
      </section>

      <Reveal className="relative grid gap-5 border-y border-white/10 py-8 sm:grid-cols-3"><div><p className="text-3xl font-bold tracking-[-0.06em] text-white">∞</p><p className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-500">Perspectives to discover</p></div><div><p className="text-3xl font-bold tracking-[-0.06em] text-white">1</p><p className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-500">Living ecosystem</p></div><div><p className="text-3xl font-bold tracking-[-0.06em] text-cyan-300">100%</p><p className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-500">Human curiosity</p></div></Reveal>

      <section id="story" className="relative grid gap-14 py-28 lg:grid-cols-[0.8fr_1.2fr] lg:py-40"><Reveal><SectionLabel>Why SoulX exists</SectionLabel><h2 className="mt-5 max-w-md text-5xl font-black leading-[0.95] tracking-[-0.08em] sm:text-6xl">Different questions deserve different minds.</h2></Reveal><Reveal className="max-w-2xl lg:pt-12"><p className="text-xl leading-9 text-slate-300 sm:text-2xl">Most AI systems speak with one generic voice.</p><p className="mt-7 text-lg leading-8 text-slate-400">SoulX is different. We believe the best answers often arrive when you change the lens. SoulX gives people access to an expanding universe of AI Personas, each with a distinct perspective, expertise, and point of view.</p><div className="mt-10 flex items-center gap-3 text-sm font-semibold text-cyan-200"><CircleDot className="h-4 w-4 text-cyan-300" /> One question. More ways to see it.</div></Reveal></section>

      <section className="relative overflow-hidden rounded-[2rem] border border-cyan-300/15 bg-gradient-to-br from-cyan-400/[0.12] via-slate-950/80 to-blue-950/30 p-7 sm:p-12 lg:p-20"><div aria-hidden="true" className="absolute -right-24 -top-24 h-80 w-80 rounded-full border border-cyan-300/10" /><div className="relative grid gap-12 lg:grid-cols-[1fr_0.9fr] lg:items-end"><Reveal><SectionLabel>Our vision</SectionLabel><h2 className="mt-5 max-w-2xl text-5xl font-black leading-[0.93] tracking-[-0.08em] sm:text-7xl">More than<br /><span className="text-cyan-300">one voice.</span></h2></Reveal><Reveal className="lg:pb-2"><p className="text-lg leading-8 text-slate-300">AI should help people discover perspectives, not replace their thinking.</p><p className="mt-5 text-base leading-7 text-slate-400">Scientists, artists, leaders, inventors, specialists, historians, creators, and community-built AI Personas. Different minds for the moments that matter.</p></Reveal></div></section>

      <section className="py-28 lg:py-40"><Reveal className="mb-12 flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><SectionLabel>Humans + AI Personas</SectionLabel><h2 className="mt-5 max-w-2xl text-5xl font-black tracking-[-0.08em] sm:text-6xl">One living ecosystem.</h2></div><p className="max-w-sm text-sm leading-7 text-slate-400">People bring the questions. Personas bring the perspective. Creators and community make the whole system grow.</p></Reveal><div className="grid gap-3 md:grid-cols-4">{[[Users, "Humans", "Curious people with questions worth asking."], [BrainCircuit, "AI Personas", "Distinct minds built for richer conversations."], [PenLine, "Creators", "Builders who give ideas a voice."], [Globe2, "Community", "A network that keeps learning in motion."]] .map(([Icon, title, text], index) => { const ItemIcon = Icon as typeof Users; return <Reveal key={title as string} className="h-full"><motion.div whileHover={{ y: -8 }} className={`group h-full rounded-2xl border p-6 transition-colors ${index === 1 ? "border-cyan-300/30 bg-cyan-400/[0.08]" : "border-white/10 bg-white/[0.035] hover:border-cyan-300/25"}`}><ItemIcon className="h-6 w-6 text-cyan-300" /><h3 className="mt-12 text-xl font-bold tracking-[-0.04em]">{title as string}</h3><p className="mt-3 text-sm leading-6 text-slate-400">{text as string}</p></motion.div></Reveal>; })}</div></section>

      <section className="border-t border-white/10 py-28 lg:py-36"><Reveal><SectionLabel>How SoulX works</SectionLabel><h2 className="mt-5 max-w-3xl text-5xl font-black tracking-[-0.08em] sm:text-6xl">Start with curiosity.<br /><span className="text-slate-500">Follow it anywhere.</span></h2></Reveal><div className="mt-14 grid gap-3 md:grid-cols-4">{[["01", "Explore", "Find a perspective that fits the moment."], ["02", "Start Conversations", "Ask better questions and go deeper."], ["03", "Create", "Shape a mind around what matters to you."], ["04", "Join Community", "Share ideas and keep the conversation alive."]].map(([number, title, text], index) => <Reveal key={number} className="relative"><motion.div whileHover={{ y: -6 }} className="group h-full rounded-2xl border border-white/10 bg-slate-950/60 p-6 transition hover:border-cyan-300/30"><span className="text-xs font-bold tracking-[0.2em] text-cyan-300">{number}</span><h3 className="mt-16 text-xl font-bold tracking-[-0.04em]">{title}</h3><p className="mt-3 text-sm leading-6 text-slate-400">{text}</p><ChevronRight className="mt-8 h-5 w-5 text-slate-600 transition group-hover:translate-x-1 group-hover:text-cyan-300" /></motion.div>{index < 3 && <ArrowRight className="absolute -right-4 top-1/2 z-10 hidden h-5 w-5 text-cyan-300/60 md:block" />}</Reveal>)}</div></section>

      <section className="relative grid gap-16 py-28 lg:grid-cols-[0.7fr_1.3fr] lg:py-36"><Reveal><SectionLabel>What makes SoulX different</SectionLabel><h2 className="mt-5 text-5xl font-black leading-[0.94] tracking-[-0.08em] sm:text-6xl">A broader way to think.</h2></Reveal><Reveal><div className="grid gap-x-8 border-y border-white/10 sm:grid-cols-2">{features.map((feature) => <div key={feature} className="flex items-center gap-3 border-b border-white/10 py-5 text-sm text-slate-300"><span className="flex h-5 w-5 items-center justify-center rounded-full bg-cyan-400/15 text-cyan-300"><Check className="h-3 w-3" /></span>{feature}</div>)}</div></Reveal></section>

      <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950/50 p-7 sm:p-12 lg:p-16"><Reveal><div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><SectionLabel>The SoulX universe</SectionLabel><h2 className="mt-5 text-5xl font-black tracking-[-0.08em] sm:text-6xl">A thousand ways<br />to be curious.</h2></div><Sparkles className="h-12 w-12 text-cyan-300/50" /></div></Reveal><div className="mt-14 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">{universe.map(([Icon, name], index) => <Reveal key={name} className="h-full"><motion.div whileHover={{ scale: 1.03 }} className="flex min-h-32 flex-col justify-between rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition hover:border-cyan-300/35 hover:bg-cyan-400/[0.06]"><Icon className="h-5 w-5 text-cyan-300" /><span className="text-sm font-semibold text-slate-200">{name}</span><span className="text-[10px] uppercase tracking-[0.18em] text-slate-600">0{index + 1}</span></motion.div></Reveal>)}</div></section>

      <section className="py-28 lg:py-36"><Reveal><SectionLabel>Core values</SectionLabel><div className="mt-12 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">{[["01", "Perspective"], ["02", "Curiosity"], ["03", "Learning"], ["04", "Creativity"], ["05", "Community"], ["06", "Innovation"]].map(([number, value]) => <div key={value} className="border-t border-white/15 pt-5"><span className="text-xs text-cyan-300">{number}</span><h3 className="mt-8 text-3xl font-bold tracking-[-0.06em] text-white">{value}</h3></div>)}</div></Reveal></section>

      <section className="grid gap-16 border-t border-white/10 py-28 lg:grid-cols-[0.7fr_1.3fr] lg:py-36"><Reveal><SectionLabel>Roadmap</SectionLabel><h2 className="mt-5 text-5xl font-black tracking-[-0.08em] sm:text-6xl">Still becoming.</h2><p className="mt-6 max-w-sm text-base leading-7 text-slate-400">The SoulX universe is just getting started. Every phase adds another dimension to how people and AI can think together.</p></Reveal><div className="relative border-l border-cyan-300/20 pl-7 sm:pl-10">{roadmap.map(([number, title, text]) => <Reveal key={number}><div className="relative pb-10 last:pb-0"><span className="absolute -left-[2.15rem] top-0 h-3 w-3 rounded-full border-2 border-cyan-300 bg-slate-950 shadow-[0_0_18px_rgba(34,211,238,0.7)] sm:-left-[2.65rem]" /><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-10"><span className="text-xs font-bold tracking-[0.2em] text-cyan-300">PHASE {number}</span><div><h3 className="text-2xl font-bold tracking-[-0.05em]">{title}</h3><p className="mt-2 max-w-lg text-sm leading-7 text-slate-400">{text}</p></div></div></div></Reveal>)}</div></section>

      <section className="py-20 lg:py-28"><Reveal className="mb-12"><SectionLabel>Contact us</SectionLabel><h2 className="mt-5 text-5xl font-black tracking-[-0.08em] sm:text-6xl">Let&apos;s make the future<br /><span className="text-cyan-300">more interesting.</span></h2></Reveal><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{contacts.map(([Icon, title, detail, caption, href]) => <Reveal key={title}><motion.a whileHover={{ y: -6 }} href={href} className="group block rounded-2xl border border-white/10 bg-white/[0.035] p-5 transition hover:border-cyan-300/35 hover:bg-cyan-400/[0.06]"><Icon className="h-5 w-5 text-cyan-300" /><p className="mt-10 text-xs uppercase tracking-[0.18em] text-slate-500">{title}</p><p className="mt-2 truncate text-sm font-semibold text-white">{detail}</p><p className="mt-2 text-xs leading-5 text-slate-500">{caption}</p><ArrowUpRight className="mt-6 h-4 w-4 text-slate-600 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-cyan-300" /></motion.a></Reveal>)}</div><p className="mt-8 text-xs text-slate-600">Social media: follow the conversation wherever curious people gather.</p></section>

      <Reveal><section className="relative overflow-hidden rounded-[2rem] border border-cyan-300/20 bg-gradient-to-br from-cyan-400/15 via-blue-500/10 to-transparent px-7 py-16 text-center sm:px-12 lg:py-24"><div aria-hidden="true" className="absolute left-1/2 top-1/2 h-80 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-300/10 blur-[90px]" /><div className="relative"><SectionLabel>Begin your perspective shift</SectionLabel><h2 className="mx-auto mt-6 max-w-4xl text-5xl font-black leading-[0.95] tracking-[-0.08em] sm:text-7xl">A Thousand Minds<br /><span className="text-cyan-300">Are Waiting.</span></h2><div className="mt-10 flex flex-wrap justify-center gap-3"><Link href="/explore" className={`${styles.primaryCta} inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-bold`}>Explore <ArrowRight className="h-4 w-4" /></Link><Link href="/community" className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:border-cyan-300/50 hover:bg-cyan-400/10">Join Community <Users className="h-4 w-4 text-cyan-300" /></Link><Link href="/create" className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:border-cyan-300/50 hover:bg-cyan-400/10">Create <PenLine className="h-4 w-4 text-cyan-300" /></Link></div></div></section></Reveal>
    </main>
  );
}
