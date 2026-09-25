"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { ArrowRight, Check, Edit3, Heart, LogOut, Plus, Search, Settings2, Share2, ShieldCheck, Sparkles, Trash2 } from "lucide-react";
import { BackButton } from "@/components/back-button";
import { PersonaAvatar } from "@/components/persona-avatar";
import { getCurrentUser, logoutUser, subscribeToAuth } from "@/lib/auth";
import { customPersonaToPersona, getCustomPersonas } from "@/lib/custom-personas";
import {
  getFavoritePersonaSlugs,
  getProfilePreferencesSnapshot,
  saveProfilePreferences,
  subscribeToProfile,
  toggleFavoritePersona,
  toggleLikedMessage,
  type ProfilePreferences,
} from "@/lib/profile";
import { personas } from "@/lib/personas";

type ProfileStore = Record<string, ProfilePreferences>;

function parseProfileStore(snapshot: string): ProfileStore {
  if (!snapshot) return {};
  try { return JSON.parse(snapshot) as ProfileStore; } catch { return {}; }
}

export default function ProfilePage() {
  const user = useSyncExternalStore(subscribeToAuth, getCurrentUser, () => null);
  const profileSnapshot = useSyncExternalStore(subscribeToProfile, getProfilePreferencesSnapshot, () => "");
  const [isEditing, setIsEditing] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [query, setQuery] = useState("");
  const [shareStatus, setShareStatus] = useState("");

  if (!user) {
    return (
      <main className="mx-auto flex min-h-[70vh] max-w-4xl items-center justify-center px-4 py-12 text-white">
        <section className="relative w-full overflow-hidden rounded-[34px] border border-cyan-300/15 bg-[#061022] p-8 text-center shadow-[0_24px_70px_rgba(2,8,23,0.5)] sm:p-12">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(34,211,238,0.14),transparent_35%)]" />
          <div className="relative"><span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-300/20 bg-cyan-400/10 text-cyan-300"><Sparkles className="h-6 w-6" /></span><p className="mt-6 text-xs font-semibold uppercase tracking-[0.24em] text-cyan-300">Your SOULX profile</p><h1 className="mx-auto mt-3 max-w-2xl text-4xl font-black tracking-[-0.06em] text-white sm:text-6xl">Keep the minds and ideas that matter.</h1><p className="mx-auto mt-5 max-w-xl text-sm leading-7 text-slate-300">Sign in to build your collection, like memorable responses, and share your favorite insights.</p><div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row"><Link href="/login" className="rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 px-7 py-3 text-sm font-bold text-white">Log in</Link><Link href="/signup" className="rounded-full border border-white/12 bg-white/5 px-7 py-3 text-sm font-semibold text-white">Create account</Link></div></div>
        </section>
      </main>
    );
  }

  const store = parseProfileStore(profileSnapshot);
  const preferences = store[user.id] ?? {};
  const favoriteSlugs = getFavoritePersonaSlugs(preferences);
  const favoritePersonas = favoriteSlugs.map((slug) => personas.find((persona) => persona.slug === slug)).filter((persona) => persona !== undefined);
  const likedMessages = preferences.likedMessages ?? [];
  const customPersonas = getCustomPersonas().map(customPersonaToPersona);
  const displayName = preferences.displayName ?? user.name;
  const bio = preferences.bio ?? "Curious about ideas, people, and better ways to think.";
  const visibility = preferences.profileVisibility ?? "Public";
  const initials = displayName.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  const filteredPersonas = personas.filter((persona) => [persona.name, persona.category, persona.profession].join(" ").toLowerCase().includes(query.trim().toLowerCase()));

  const saveIdentity = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    saveProfilePreferences(user.id, { displayName: String(form.get("displayName") ?? "").trim() || user.name, bio: String(form.get("bio") ?? "").trim(), profileVisibility: String(form.get("visibility") ?? "Public") as "Public" | "Private" });
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
      const data = { title: `${displayName} | SOULX`, text: `Explore ${displayName}'s favorite minds on SOULX.`, url: window.location.href };
      const usedNativeShare = "share" in navigator;
      if (usedNativeShare) await navigator.share(data); else await navigator.clipboard.writeText(data.url);
      setShareStatus(usedNativeShare ? "Profile shared." : "Profile link copied.");
    } catch { setShareStatus("Sharing was cancelled."); }
  };

  const shareMessage = async (content: string, personaName: string) => {
    try {
      const text = `“${content}” — ${personaName} on SOULX`;
      const usedNativeShare = "share" in navigator;
      if (usedNativeShare) await navigator.share({ title: `${personaName} | SOULX`, text, url: window.location.href }); else await navigator.clipboard.writeText(`${text}\n${window.location.href}`);
      setShareStatus(usedNativeShare ? "Insight shared." : "Insight copied.");
    } catch { setShareStatus("Sharing was cancelled."); }
  };

  return (
    <main className="mx-auto max-w-7xl px-1 py-4 text-white sm:px-2 sm:py-8">
      <section className="overflow-hidden rounded-[30px] border border-cyan-300/15 bg-[#050d1e] shadow-[0_24px_80px_rgba(2,8,23,0.5)] sm:rounded-[38px]">
        <div className="relative h-44 bg-[radial-gradient(circle_at_20%_0%,rgba(34,211,238,0.22),transparent_32%),radial-gradient(circle_at_85%_40%,rgba(99,102,241,0.16),transparent_30%),linear-gradient(135deg,#06162b,#0c1028)] sm:h-56">
          <div className="absolute inset-0 bg-grid-fade opacity-40" />
          <div className="absolute left-4 top-4 sm:left-7 sm:top-7"><BackButton href="/explore" /></div>
          <div className="absolute right-4 top-4 flex gap-2 sm:right-7 sm:top-7"><Link href="/settings" className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/10 bg-slate-950/55 px-3 text-xs text-slate-200 backdrop-blur-xl"><Settings2 className="h-3.5 w-3.5" />Settings</Link><button type="button" onClick={logoutUser} className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/10 bg-slate-950/55 px-3 text-xs text-slate-300 backdrop-blur-xl"><LogOut className="h-3.5 w-3.5" /><span className="hidden sm:inline">Sign out</span></button></div>
        </div>

        <div className="relative px-5 pb-10 sm:px-8 lg:px-10">
          <div className="-mt-16 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-end">
              <div className="relative flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-[30px] border-4 border-[#050d1e] bg-gradient-to-br from-cyan-400/35 to-violet-500/30 text-3xl font-black shadow-[0_18px_45px_rgba(2,8,23,0.55)]">{preferences.avatarDataUrl ? <img src={preferences.avatarDataUrl} alt={displayName} className="h-full w-full object-cover" /> : initials}<label htmlFor="profile-avatar" className="absolute bottom-1 right-1 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border-2 border-[#050d1e] bg-cyan-400 text-slate-950"><Edit3 className="h-4 w-4" /><span className="sr-only">Upload profile photo</span></label><input id="profile-avatar" type="file" accept="image/*" onChange={handleAvatarChange} className="sr-only" /></div>
              <div className="pb-1"><div className="flex flex-wrap items-center gap-2"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">Personal AI identity</p><span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] text-slate-400"><ShieldCheck className="h-3 w-3 text-cyan-300" />{visibility}</span></div><h1 className="mt-2 text-4xl font-black tracking-[-0.06em] text-white sm:text-5xl">{displayName}</h1><p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">{bio}</p></div>
            </div>
            <div className="flex flex-wrap gap-2"><button type="button" onClick={() => setIsEditing((current) => !current)} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/12 bg-white/5 px-4 text-sm font-semibold text-white"><Edit3 className="h-4 w-4" />Edit profile</button><button type="button" onClick={shareProfile} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 px-4 text-sm font-bold text-white"><Share2 className="h-4 w-4" />Share profile</button></div>
          </div>
          {shareStatus && <p role="status" className="mt-3 text-right text-xs text-cyan-200">{shareStatus}</p>}

          {isEditing && <form onSubmit={saveIdentity} className="mt-7 grid gap-4 rounded-[24px] border border-cyan-300/15 bg-cyan-400/5 p-5 sm:grid-cols-2"><label className="text-xs font-semibold text-slate-400">Display name<input name="displayName" defaultValue={displayName} required className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none focus:border-cyan-300/40" /></label><label className="text-xs font-semibold text-slate-400">Visibility<select name="visibility" defaultValue={visibility} className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none"><option>Public</option><option>Private</option></select></label><label className="text-xs font-semibold text-slate-400 sm:col-span-2">Bio<textarea name="bio" defaultValue={bio} maxLength={180} className="mt-2 min-h-24 w-full resize-y rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm leading-6 text-white outline-none focus:border-cyan-300/40" /></label><div className="flex gap-2 sm:col-span-2"><button type="submit" className="inline-flex items-center gap-2 rounded-full bg-cyan-500 px-5 py-2.5 text-sm font-bold text-white"><Check className="h-4 w-4" />Save changes</button><button type="button" onClick={() => setIsEditing(false)} className="rounded-full border border-white/10 px-5 py-2.5 text-sm text-slate-300">Cancel</button></div></form>}

          <div className="mt-8 grid gap-3 sm:grid-cols-3">{[["Favorite minds", favoritePersonas.length], ["Liked messages", likedMessages.length], ["Created personas", customPersonas.length]].map(([label, value]) => <div key={String(label)} className="rounded-2xl border border-white/8 bg-white/[0.025] p-4"><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p><p className="mt-2 text-3xl font-black tracking-[-0.05em] text-white">{value}</p></div>)}</div>

          <section className="mt-10">
            <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">Your collection</p><h2 className="mt-2 text-3xl font-black tracking-[-0.055em] text-white sm:text-4xl">Favorite personas</h2><p className="mt-2 text-sm text-slate-400">Keep several minds on your profile for quick access.</p></div><button type="button" onClick={() => setShowPicker((current) => !current)} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-cyan-300/25 bg-cyan-400/8 px-4 text-sm font-semibold text-cyan-100"><Plus className="h-4 w-4" />Manage favorites</button></div>
            {showPicker && <div className="mt-5 rounded-[24px] border border-white/10 bg-slate-950/55 p-4"><label className="flex min-h-11 items-center gap-3 rounded-xl border border-white/10 bg-white/[0.025] px-4"><Search className="h-4 w-4 text-slate-500" /><span className="sr-only">Search personas</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search personas" className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-slate-500" /></label><div className="mt-4 grid max-h-80 gap-2 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3">{filteredPersonas.map((persona) => { const active = favoriteSlugs.includes(persona.slug); return <button key={persona.slug} type="button" onClick={() => toggleFavoritePersona(user.id, persona.slug)} aria-pressed={active} className={`flex items-center gap-3 rounded-2xl border p-3 text-left transition ${active ? "border-cyan-300/35 bg-cyan-400/10" : "border-white/8 bg-white/[0.02] hover:border-white/15"}`}><PersonaAvatar slug={persona.slug} name={persona.name} className="h-10 w-10 border border-white/10" /><span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold text-white">{persona.name}</span><span className="block truncate text-[10px] uppercase tracking-[0.14em] text-slate-500">{persona.category}</span></span><Heart className={`h-4 w-4 ${active ? "fill-cyan-300 text-cyan-300" : "text-slate-600"}`} /></button>; })}</div></div>}
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{favoritePersonas.length ? favoritePersonas.map((persona) => <article key={persona.slug} className="group rounded-[24px] border border-white/8 bg-white/[0.025] p-4 transition hover:-translate-y-1 hover:border-cyan-300/25"><div className="flex items-center gap-3"><PersonaAvatar slug={persona.slug} name={persona.name} className="h-14 w-14 border border-cyan-300/20" /><div className="min-w-0"><h3 className="truncate text-lg font-bold text-white">{persona.name}</h3><p className="truncate text-xs text-slate-500">{persona.profession}</p></div></div><p className="mt-4 line-clamp-2 text-sm leading-6 text-slate-400">{persona.shortDescription}</p><div className="mt-4 flex items-center justify-between border-t border-white/8 pt-4"><button type="button" onClick={() => toggleFavoritePersona(user.id, persona.slug)} className="inline-flex items-center gap-1.5 text-xs text-pink-200"><Heart className="h-3.5 w-3.5 fill-current" />Remove</button><Link href={`/persona/${persona.slug}`} className="inline-flex items-center gap-1 text-xs font-semibold text-cyan-300">Open <ArrowRight className="h-3.5 w-3.5" /></Link></div></article>) : <div className="rounded-[24px] border border-dashed border-white/12 p-8 text-center text-sm text-slate-400 sm:col-span-2 lg:col-span-3">No favorites yet. Choose the minds you want to feature.</div>}</div>
          </section>

          <section className="mt-12 rounded-[28px] border border-violet-300/12 bg-[radial-gradient(circle_at_85%_0%,rgba(139,92,246,0.10),transparent_30%),rgba(15,23,42,0.42)] p-5 sm:p-7">
            <div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-300">Saved from conversations</p><h2 className="mt-2 text-3xl font-black tracking-[-0.055em] text-white sm:text-4xl">Liked messages</h2><p className="mt-2 text-sm text-slate-400">Like an AI response in any conversation and it will appear here.</p></div>
            <div className="mt-6 grid gap-4 lg:grid-cols-2">{likedMessages.length ? likedMessages.map((message) => <article key={message.id} className="flex flex-col rounded-[22px] border border-white/8 bg-slate-950/55 p-5"><div className="flex items-center gap-3">{message.personaSlug ? <PersonaAvatar slug={message.personaSlug} name={message.personaName} className="h-10 w-10 border border-violet-300/20" /> : <span className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-400/10 text-violet-200"><Sparkles className="h-4 w-4" /></span>}<div><h3 className="text-sm font-bold text-white">{message.personaName}</h3><p className="text-[10px] uppercase tracking-[0.14em] text-slate-500">Saved {new Date(message.savedAt).toLocaleDateString()}</p></div></div><blockquote className="mt-4 line-clamp-5 flex-1 text-sm leading-7 text-slate-300">“{message.content}”</blockquote><div className="mt-5 flex items-center gap-2 border-t border-white/8 pt-4"><button type="button" onClick={() => shareMessage(message.content, message.personaName)} className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-2 text-xs text-cyan-200"><Share2 className="h-3.5 w-3.5" />Share</button><button type="button" onClick={() => toggleLikedMessage(user.id, { id: message.id, personaName: message.personaName, personaSlug: message.personaSlug, content: message.content })} className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-2 text-xs text-slate-400 hover:text-red-200"><Trash2 className="h-3.5 w-3.5" />Remove</button></div></article>) : <div className="rounded-[22px] border border-dashed border-white/12 p-10 text-center lg:col-span-2"><Heart className="mx-auto h-6 w-6 text-slate-600" /><p className="mt-3 text-sm text-slate-400">Your liked messages will appear here.</p><Link href="/explore" className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-cyan-300">Start a conversation <ArrowRight className="h-4 w-4" /></Link></div>}</div>
          </section>
        </div>
      </section>
    </main>
  );
}
