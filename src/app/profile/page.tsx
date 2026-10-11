"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { ArrowRight, Award, CalendarDays, Check, Edit3, ExternalLink, Heart, MessageCircle, Plus, Search, Settings, Share2, ShieldCheck, Sparkles, Trophy, UsersRound } from "lucide-react";
import { BackButton } from "@/components/back-button";
import { PersonaAvatar } from "@/components/persona-avatar";
import { getCurrentUser, subscribeToAuth } from "@/lib/auth";
import { customPersonaToPersona, getCustomPersonasSnapshot, parseCustomPersonasSnapshot, subscribeToCustomPersonas } from "@/lib/custom-personas";
import { getFavoritePersonaSlugs, getProfilePreferencesSnapshot, saveProfilePreferences, subscribeToProfile, toggleFavoritePersona, type ProfilePreferences } from "@/lib/profile";
import { personas } from "@/lib/personas";

type ProfileStore = Record<string, ProfilePreferences>;
type MySoulDashboard = {
  soul: { display_name?: string; avatar_url?: string | null; headline?: string; about?: string; public_enabled?: boolean; show_on_profile?: boolean };
  username?: string | null;
};
type SocialPersona = { slug: string; name: string; description?: string; avatar?: string };
type SocialProfile = { level?: number; all_rank?: number | null; weekly_rank?: number | null; personas?: SocialPersona[] };

function parseProfileStore(snapshot: string): ProfileStore {
  if (!snapshot) return {};
  try { return JSON.parse(snapshot) as ProfileStore; } catch { return {}; }
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "SX";
}

function dateLabel(value: string) {
  return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default function ProfilePage() {
  const user = useSyncExternalStore(subscribeToAuth, getCurrentUser, () => null);
  const profileSnapshot = useSyncExternalStore(subscribeToProfile, getProfilePreferencesSnapshot, () => "");
  const customSnapshot = useSyncExternalStore(subscribeToCustomPersonas, getCustomPersonasSnapshot, () => "__loading__");
  const [isEditing, setIsEditing] = useState(false);
  const [showFavoritePicker, setShowFavoritePicker] = useState(false);
  const [query, setQuery] = useState("");
  const [shareStatus, setShareStatus] = useState("");
  const [mySoul, setMySoul] = useState<MySoulDashboard | null>(null);
  const [socialProfile, setSocialProfile] = useState<SocialProfile | null>(null);

  const currentUserId = user?.id;
  useEffect(() => {
    if (!currentUserId) return;
    let active = true;
    void Promise.all([
      fetch("/api/mysoul", { credentials: "same-origin", cache: "no-store" }).then(async (response) => response.ok ? (await response.json() as { dashboard?: MySoulDashboard }).dashboard ?? null : null),
      fetch("/api/social?kind=profile&username=me", { credentials: "same-origin", cache: "no-store" }).then(async (response) => response.ok ? await response.json() as SocialProfile : null),
    ]).then(([soul, social]) => {
      if (!active) return;
      setMySoul(soul);
      setSocialProfile(social);
    }).catch(() => undefined);
    return () => { active = false; };
  }, [currentUserId]);

  if (!user) {
    return (
      <main className="mx-auto flex min-h-[70vh] max-w-4xl items-center justify-center px-2 py-10 text-white sm:px-4">
        <section className="theme-profile-card relative w-full overflow-hidden rounded-[32px] border border-cyan-300/15 bg-[#061022] p-8 text-center shadow-[0_24px_70px_rgba(2,8,23,0.5)] sm:p-12">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(34,211,238,0.14),transparent_35%)]" />
          <div className="relative"><span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-300/20 bg-cyan-400/10 text-cyan-300"><Sparkles className="h-6 w-6" /></span><p className="mt-6 text-xs font-semibold uppercase tracking-[0.24em] text-cyan-300">Your SoulX identity</p><h1 className="mx-auto mt-3 max-w-2xl text-4xl font-black tracking-[-0.06em] text-white sm:text-6xl">Your people, personas, and progress—together.</h1><p className="mx-auto mt-5 max-w-xl text-sm leading-7 text-slate-300">Sign in to see your AI identity and community profile.</p><div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row"><Link href="/login" className="rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 px-7 py-3 text-sm font-bold text-white">Log in</Link><Link href="/signup" className="rounded-full border border-white/12 bg-white/5 px-7 py-3 text-sm font-semibold text-white">Create account</Link></div></div>
        </section>
      </main>
    );
  }

  const store = parseProfileStore(profileSnapshot);
  const preferences = store[user.id] ?? {};
  const favoriteSlugs = getFavoritePersonaSlugs(preferences);
  const favoritePersonas = favoriteSlugs.map((slug) => personas.find((persona) => persona.slug === slug)).filter((persona) => persona !== undefined);
  const customPersonas = parseCustomPersonasSnapshot(customSnapshot).map(customPersonaToPersona);
  const publicPersonas = socialProfile?.personas ?? [];
  const publicSlugs = new Set(publicPersonas.map((persona) => persona.slug));
  const createdPersonas = [
    ...publicPersonas.map((persona) => ({ ...persona, visibility: "Public" as const, href: `/persona/${persona.slug}` })),
    ...customPersonas.filter((persona) => !publicSlugs.has(persona.slug)).map((persona) => ({ slug: persona.slug, name: persona.name, description: persona.shortDescription, avatar: persona.avatar, visibility: "Private" as const, href: `/chat/${persona.slug}` })),
  ];
  const displayName = preferences.displayName ?? user.name;
  const username = preferences.username?.trim() || user.email.split("@")[0];
  const bio = preferences.bio ?? "Curious about ideas, people, and better ways to think.";
  const visibility = preferences.profileVisibility ?? "Public";
  const activity = preferences.communityActivity ?? [];
  const stats = preferences.stats;
  const level = socialProfile?.level ?? (stats ? 1 + Math.floor(Math.sqrt(stats.xp / 100)) : 1);
  const levelStart = Math.pow(Math.max(0, level - 1), 2) * 100;
  const levelEnd = Math.pow(level, 2) * 100;
  const levelProgress = stats ? Math.max(0, Math.min(100, ((stats.xp - levelStart) / Math.max(1, levelEnd - levelStart)) * 100)) : 0;
  const filteredPersonas = personas.filter((persona) => [persona.name, persona.category, persona.profession].join(" ").toLowerCase().includes(query.trim().toLowerCase()));

  const saveIdentity = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    saveProfilePreferences(user.id, {
      displayName: String(form.get("displayName") ?? "").trim() || user.name,
      username: String(form.get("username") ?? "").trim(),
      bio: String(form.get("bio") ?? "").trim(),
      coverUrl: String(form.get("coverUrl") ?? "").trim(),
      websiteUrl: String(form.get("websiteUrl") ?? "").trim(),
      socialLinks: { x: String(form.get("x") ?? "").trim(), instagram: String(form.get("instagram") ?? "").trim(), linkedin: String(form.get("linkedin") ?? "").trim(), github: String(form.get("github") ?? "").trim() },
      profileVisibility: String(form.get("visibility") ?? "Public") as "Public" | "Private",
    });
    setIsEditing(false);
  };

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => { if (typeof reader.result === "string") saveProfilePreferences(user.id, { avatarDataUrl: reader.result }); };
    reader.readAsDataURL(file);
  };

  const shareProfile = async () => {
    try {
      const data = { title: `${displayName} | SoulX`, text: `Explore ${displayName}'s SoulX profile.`, url: window.location.href };
      const clipboard = navigator.clipboard;
      if ("share" in navigator) { await navigator.share(data); setShareStatus("Profile shared."); }
      else { await clipboard.writeText(data.url); setShareStatus("Profile link copied."); }
    } catch { setShareStatus("Sharing was cancelled."); }
  };

  return (
    <main className="profile-premium mx-auto max-w-7xl px-0 pb-8 pt-1 text-white sm:px-1 sm:pb-12 sm:pt-4">
      <section className="theme-profile-card overflow-hidden rounded-[28px] border border-cyan-300/15 bg-[#050d1e] shadow-[0_24px_80px_rgba(2,8,23,0.42)] sm:rounded-[36px]">
        <div className="relative h-36 bg-cover bg-center bg-[radial-gradient(circle_at_20%_0%,rgba(34,211,238,0.24),transparent_34%),radial-gradient(circle_at_85%_40%,rgba(99,102,241,0.14),transparent_31%),linear-gradient(135deg,#06162b,#0c1028)] sm:h-52" style={preferences.coverUrl ? { backgroundImage: `linear-gradient(rgba(2,8,23,.12),rgba(2,8,23,.66)),url(${preferences.coverUrl})` } : undefined}>
          <div className="absolute inset-0 bg-grid-fade opacity-35" />
          <div className="absolute left-3 top-3 sm:left-6 sm:top-6"><BackButton href="/explore" /></div>
        </div>

        <div className="relative px-4 pb-7 sm:px-8 sm:pb-9 lg:px-10">
          <div className="-mt-12 flex flex-col gap-5 sm:-mt-14 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-end">
              <div className="relative flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-[26px] border-4 border-[#050d1e] bg-gradient-to-br from-cyan-400/35 to-violet-500/30 text-2xl font-black shadow-[0_16px_38px_rgba(2,8,23,0.5)] sm:h-28 sm:w-28">
                {preferences.avatarDataUrl ? <Image src={preferences.avatarDataUrl} alt={displayName} width={112} height={112} unoptimized className="h-full w-full object-cover" /> : initials(displayName)}
                <label htmlFor="profile-avatar" className="absolute bottom-1 right-1 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border-2 border-[#050d1e] bg-cyan-300 text-slate-950 transition hover:scale-105"><Edit3 className="h-3.5 w-3.5" /><span className="sr-only">Upload profile photo</span></label>
                <input id="profile-avatar" type="file" accept="image/*" onChange={handleAvatarChange} className="sr-only" />
              </div>
              <div className="min-w-0 pb-1"><div className="flex flex-wrap items-center gap-2"><span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-semibold text-slate-300"><ShieldCheck className="h-3 w-3 text-cyan-300" />{visibility} profile</span><span className="text-xs text-cyan-300">@{username}</span></div><h1 className="mt-2 text-3xl font-black tracking-[-0.055em] text-white sm:text-5xl">{displayName}</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">{bio || "Add a short bio to introduce your AI identity."}</p><div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-slate-500"><span className="inline-flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" />Joined {new Date(preferences.joinedAt ?? user.createdAt).toLocaleDateString(undefined, { month: "short", year: "numeric" })}</span>{preferences.websiteUrl && <a href={preferences.websiteUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-cyan-300"><ExternalLink className="h-3.5 w-3.5" />Website</a>}</div></div>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:flex"><button type="button" onClick={() => setIsEditing((current) => !current)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-white/12 bg-white/5 px-4 text-sm font-semibold text-white transition hover:border-cyan-300/30 hover:bg-white/8"><Edit3 className="h-4 w-4" />Edit Profile</button><button type="button" onClick={shareProfile} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 px-4 text-sm font-bold text-white transition hover:brightness-110"><Share2 className="h-4 w-4" />Share Profile</button></div>
          </div>
          {shareStatus && <p role="status" className="mt-3 text-right text-xs text-cyan-200">{shareStatus}</p>}

          <div className="mt-6 grid grid-cols-4 divide-x divide-white/8 rounded-2xl border border-white/8 bg-white/[0.025] px-2 py-4">
            {[["Personas", stats?.createdPersonas ?? 0], ["Followers", stats?.followers ?? 0], ["Posts", stats?.communityPosts ?? 0], ["XP", stats?.xp ?? 0]].map(([label, value]) => <div key={String(label)} className="px-1 text-center sm:px-4"><p className="text-lg font-black tracking-[-0.04em] text-white sm:text-2xl">{value}</p><p className="mt-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-500 sm:text-[10px]">{label}</p></div>)}
          </div>

          {isEditing && <form onSubmit={saveIdentity} className="mt-6 grid gap-4 rounded-[24px] border border-cyan-300/15 bg-cyan-400/5 p-4 sm:grid-cols-2 sm:p-5"><label className="text-xs font-semibold text-slate-400">Display name<input name="displayName" defaultValue={displayName} maxLength={120} required className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none focus:border-cyan-300/40" /></label><label className="text-xs font-semibold text-slate-400">Username<input name="username" defaultValue={preferences.username} pattern="[a-z][a-z0-9_-]{2,39}" placeholder="your_name" className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none focus:border-cyan-300/40" /></label><label className="text-xs font-semibold text-slate-400">Visibility<select name="visibility" defaultValue={visibility} className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none"><option>Public</option><option>Private</option></select></label><label className="text-xs font-semibold text-slate-400">Website<input name="websiteUrl" type="url" defaultValue={preferences.websiteUrl} placeholder="https://" className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none focus:border-cyan-300/40" /></label><label className="text-xs font-semibold text-slate-400 sm:col-span-2">Cover image URL<input name="coverUrl" type="url" defaultValue={preferences.coverUrl} placeholder="https://" className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none focus:border-cyan-300/40" /></label><label className="text-xs font-semibold text-slate-400 sm:col-span-2">Bio<textarea name="bio" defaultValue={bio} maxLength={500} className="mt-2 min-h-24 w-full resize-y rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm leading-6 text-white outline-none focus:border-cyan-300/40" /></label>{["x", "instagram", "linkedin", "github"].map((network) => <label key={network} className="text-xs font-semibold capitalize text-slate-400">{network}<input name={network} type="url" defaultValue={preferences.socialLinks?.[network as keyof typeof preferences.socialLinks]} placeholder="https://" className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none focus:border-cyan-300/40" /></label>)}<div className="flex gap-2 sm:col-span-2"><button type="submit" className="inline-flex items-center gap-2 rounded-full bg-cyan-500 px-5 py-2.5 text-sm font-bold text-white"><Check className="h-4 w-4" />Save changes</button><button type="button" onClick={() => setIsEditing(false)} className="rounded-full border border-white/10 px-5 py-2.5 text-sm text-slate-300">Cancel</button></div></form>}
        </div>
      </section>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <section id="mysoul" className="profile-feature-card theme-profile-card relative overflow-hidden rounded-[28px] border border-cyan-300/16 bg-[#071225] p-5 sm:p-6">
          <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-cyan-400/8 blur-3xl" />
          <div className="relative"><div className="flex items-start justify-between gap-4"><div><p className="profile-kicker">01 · Personal AI</p><h2 className="mt-2 text-2xl font-black tracking-[-0.05em]">MySoul</h2></div><span className="grid h-11 w-11 place-items-center rounded-2xl border border-cyan-300/20 bg-cyan-400/10 text-cyan-200"><Sparkles className="h-5 w-5" /></span></div>
            {mySoul ? <div className="mt-7 flex items-center gap-4"><div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-[24px] border border-cyan-300/20 bg-gradient-to-br from-cyan-400/20 to-blue-600/20 text-xl font-black">{mySoul.soul.avatar_url ? <Image src={mySoul.soul.avatar_url} alt={mySoul.soul.display_name ?? "MySoul"} width={80} height={80} unoptimized className="h-full w-full object-cover" /> : initials(mySoul.soul.display_name ?? displayName)}</div><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="truncate text-xl font-bold">{mySoul.soul.display_name || `${displayName}'s MySoul`}</h3><span className="rounded-full border border-white/10 px-2 py-0.5 text-[9px] uppercase tracking-[.12em] text-slate-400">{mySoul.soul.public_enabled ? "Public" : "Private"}</span></div><p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-400">{mySoul.soul.headline || mySoul.soul.about || "Your evolving AI identity, shaped by what you choose to teach it."}</p></div></div> : <div className="mt-7 rounded-[22px] border border-dashed border-cyan-300/20 bg-cyan-400/[0.035] p-6"><h3 className="font-bold">Create Your MySoul</h3><p className="mt-2 text-sm leading-6 text-slate-400">Build a personal AI identity that learns from the knowledge you choose to share.</p></div>}
            <Link href="/mysoul/manage" className="mt-6 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-cyan-300 px-5 text-sm font-black text-slate-950 transition hover:bg-cyan-200">{mySoul ? "Open MySoul" : "Create Your MySoul"}<ArrowRight className="h-4 w-4" /></Link>
          </div>
        </section>

        <section id="my-personas" className="profile-feature-card theme-profile-card rounded-[28px] border border-violet-300/14 bg-[#071225] p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4"><div><p className="profile-kicker">02 · Your creations</p><h2 className="mt-2 text-2xl font-black tracking-[-0.05em]">My Personas</h2></div><Link href="/create" className="inline-flex h-10 items-center gap-1.5 rounded-full border border-white/10 px-3 text-xs font-semibold text-cyan-200 transition hover:border-cyan-300/30"><Plus className="h-3.5 w-3.5" />Create</Link></div>
          {createdPersonas.length ? <div className="mt-6 grid grid-cols-2 gap-3">{createdPersonas.map((persona) => <Link key={persona.slug} href={persona.href} className="group relative min-h-44 overflow-hidden rounded-[22px] border border-white/10 bg-slate-950/55 p-4 transition hover:-translate-y-0.5 hover:border-cyan-300/30"><div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_0%,rgba(99,102,241,.14),transparent_44%)]" /><div className="relative flex h-full flex-col"><div className="flex items-start justify-between gap-2">{persona.avatar ? <Image src={persona.avatar} alt={persona.name} width={56} height={56} unoptimized className="h-14 w-14 rounded-2xl object-cover" /> : <PersonaAvatar slug={persona.slug} name={persona.name} className="h-14 w-14 rounded-2xl border border-white/10" />}<span className="rounded-full border border-white/10 bg-slate-950/50 px-2 py-1 text-[8px] font-bold uppercase tracking-[.12em] text-slate-400">{persona.visibility}</span></div><div className="mt-auto pt-5"><h3 className="truncate font-bold text-white">{persona.name}</h3><p className="mt-1 line-clamp-2 text-[11px] leading-5 text-slate-400">{persona.description || "Your AI persona"}</p></div></div></Link>)}</div> : <div className="mt-6 rounded-[22px] border border-dashed border-white/12 p-7 text-center"><UsersRound className="mx-auto h-6 w-6 text-slate-600" /><p className="mt-3 text-sm text-slate-400">You haven’t created a persona yet.</p><Link href="/create" className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-cyan-300">Create your first persona <ArrowRight className="h-4 w-4" /></Link></div>}
        </section>
      </div>

      <section id="community-activity" className="profile-feature-card theme-profile-card mt-5 rounded-[28px] border border-white/10 bg-[#071225] p-5 sm:p-7">
        <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="profile-kicker">03 · Community</p><h2 className="mt-2 text-2xl font-black tracking-[-0.05em] sm:text-3xl">Community Activity</h2><p className="mt-2 text-sm text-slate-400">Your real posts and replies across SoulX.</p></div><Link href="/community" className="inline-flex items-center gap-1.5 text-sm font-semibold text-cyan-300">Open Community <ArrowRight className="h-4 w-4" /></Link></div>
        {activity.length ? <div className="mt-6 grid gap-3 lg:grid-cols-2">{activity.slice(0, 6).map((item) => <article key={`${item.kind}-${item.id}`} className="rounded-[20px] border border-white/8 bg-white/[0.025] p-4 transition hover:border-cyan-300/20"><div className="flex items-center justify-between gap-3"><span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[.14em] text-cyan-300"><MessageCircle className="h-3.5 w-3.5" />{item.kind === "post" ? "Post" : "Reply"}</span><time className="text-[10px] text-slate-600">{dateLabel(item.createdAt)}</time></div>{item.title && <h3 className="mt-3 truncate text-sm font-bold">{item.title}</h3>}<p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-400">{item.content}</p></article>)}</div> : <div className="mt-6 rounded-[22px] border border-dashed border-white/12 p-8 text-center"><MessageCircle className="mx-auto h-6 w-6 text-slate-600" /><p className="mt-3 text-sm text-slate-400">No community posts or replies yet.</p><Link href="/community" className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-cyan-300">Join the conversation <ArrowRight className="h-4 w-4" /></Link></div>}
      </section>

      <section id="favorites" className="profile-feature-card theme-profile-card mt-5 rounded-[28px] border border-pink-300/12 bg-[#071225] p-5 sm:p-7">
        <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="profile-kicker">04 · Saved minds</p><h2 className="mt-2 text-2xl font-black tracking-[-0.05em] sm:text-3xl">Favorites</h2><p className="mt-2 text-sm text-slate-400">The AI personas you return to most.</p></div><button type="button" onClick={() => setShowFavoritePicker((current) => !current)} className="inline-flex min-h-10 items-center gap-2 rounded-full border border-pink-300/20 bg-pink-400/[0.055] px-4 text-xs font-semibold text-pink-100"><Heart className="h-3.5 w-3.5" />Manage</button></div>
        {showFavoritePicker && <div className="mt-5 rounded-[22px] border border-white/10 bg-slate-950/55 p-4"><label className="flex min-h-11 items-center gap-3 rounded-xl border border-white/10 bg-white/[0.025] px-4"><Search className="h-4 w-4 text-slate-500" /><span className="sr-only">Search personas</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search personas" className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-slate-500" /></label><div className="mt-3 grid max-h-72 gap-2 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3">{filteredPersonas.map((persona) => { const active = favoriteSlugs.includes(persona.slug); return <button key={persona.slug} type="button" onClick={() => toggleFavoritePersona(user.id, persona.slug)} aria-pressed={active} className={`flex items-center gap-3 rounded-2xl border p-3 text-left transition ${active ? "border-cyan-300/35 bg-cyan-400/10" : "border-white/8 bg-white/[0.02] hover:border-white/15"}`}><PersonaAvatar slug={persona.slug} name={persona.name} className="h-10 w-10 border border-white/10" /><span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold text-white">{persona.name}</span><span className="block truncate text-[10px] uppercase tracking-[0.14em] text-slate-500">{persona.category}</span></span><Heart className={`h-4 w-4 ${active ? "fill-cyan-300 text-cyan-300" : "text-slate-600"}`} /></button>; })}</div></div>}
        {favoritePersonas.length ? <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">{favoritePersonas.map((persona) => <article key={persona.slug} className="group relative overflow-hidden rounded-[22px] border border-white/8 bg-white/[0.025] p-3 text-center transition hover:-translate-y-0.5 hover:border-pink-300/25"><Link href={`/persona/${persona.slug}`} aria-label={`Open ${persona.name}`} className="absolute inset-0 z-10" /><PersonaAvatar slug={persona.slug} name={persona.name} className="mx-auto h-16 w-16 border border-white/10 sm:h-20 sm:w-20" /><h3 className="mt-3 truncate text-sm font-bold">{persona.name}</h3><p className="mt-1 truncate text-[10px] text-slate-500">{persona.profession}</p><button type="button" onClick={(event) => { event.preventDefault(); event.stopPropagation(); toggleFavoritePersona(user.id, persona.slug); }} aria-label={`Remove ${persona.name} from favorites`} className="relative z-20 mt-3 inline-flex items-center gap-1 text-[10px] text-pink-200"><Heart className="h-3 w-3 fill-current" />Favorite</button></article>)}</div> : <div className="mt-6 rounded-[22px] border border-dashed border-white/12 p-8 text-center text-sm text-slate-400">No favorites yet. Choose the minds you want close at hand.</div>}
      </section>

      <section id="achievements" className="profile-feature-card theme-profile-card mt-5 rounded-[28px] border border-amber-300/14 bg-[#071225] p-5 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="profile-kicker">05 · Progress</p><h2 className="mt-2 text-2xl font-black tracking-[-0.05em] sm:text-3xl">Achievements</h2><p className="mt-2 text-sm text-slate-400">Progress earned through real SoulX activity.</p></div><span className="grid h-11 w-11 place-items-center rounded-2xl border border-amber-300/20 bg-amber-300/8 text-amber-200"><Award className="h-5 w-5" /></span></div>
        <div className="mt-6 grid gap-3 sm:grid-cols-3"><div className="rounded-[20px] border border-white/8 bg-white/[0.025] p-4"><p className="text-[10px] font-bold uppercase tracking-[.14em] text-slate-500">Current level</p><p className="mt-2 text-3xl font-black">{level}</p></div><div className="rounded-[20px] border border-white/8 bg-white/[0.025] p-4"><p className="text-[10px] font-bold uppercase tracking-[.14em] text-slate-500">Experience</p><p className="mt-2 text-3xl font-black">{stats?.xp ?? 0} <span className="text-sm text-amber-200">XP</span></p></div><div className="rounded-[20px] border border-white/8 bg-white/[0.025] p-4"><p className="text-[10px] font-bold uppercase tracking-[.14em] text-slate-500">Leaderboard</p><p className="mt-2 text-3xl font-black">{socialProfile?.all_rank ? `#${socialProfile.all_rank}` : "—"}</p></div></div>
        {stats && <div className="mt-5"><div className="flex justify-between text-[10px] font-semibold uppercase tracking-[.12em] text-slate-500"><span>Level {level}</span><span>{levelEnd} XP</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-white/7"><div className="h-full rounded-full bg-amber-300 transition-[width] duration-500" style={{ width: `${levelProgress}%` }} /></div></div>}
        {preferences.badges?.length ? <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{preferences.badges.map((badge) => <article key={badge.id} className="flex gap-3 rounded-[20px] border border-amber-300/14 bg-amber-300/[0.035] p-4"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-300/10 text-amber-200"><Trophy className="h-4 w-4" /></span><div><h3 className="font-bold">{badge.name}</h3><p className="mt-1 text-xs leading-5 text-slate-400">{badge.description}</p><p className="mt-2 text-[9px] uppercase tracking-[.13em] text-amber-300">Earned {dateLabel(badge.earnedAt)}</p></div></article>)}</div> : <div className="mt-6 rounded-[20px] border border-dashed border-white/12 p-7 text-center text-sm text-slate-400">No earned badges yet. Your real achievements will appear here.</div>}
        <Link href="/leaderboard" className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-amber-200">View leaderboard <ArrowRight className="h-4 w-4" /></Link>
      </section>

      <Link href="/settings" className="theme-profile-card mt-5 flex min-h-16 items-center gap-4 rounded-[22px] border border-white/10 bg-white/[0.025] px-5 transition hover:border-cyan-300/25 hover:bg-white/[0.045]"><span className="grid h-10 w-10 place-items-center rounded-xl border border-white/8 bg-white/5 text-cyan-200"><Settings className="h-4 w-4" /></span><span className="min-w-0 flex-1"><span className="block font-bold">Settings</span><span className="block truncate text-xs text-slate-500">Account, privacy, appearance, billing, and support</span></span><ArrowRight className="h-4 w-4 text-slate-500" /></Link>
    </main>
  );
}
