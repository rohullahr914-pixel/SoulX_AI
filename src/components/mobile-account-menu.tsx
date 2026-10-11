"use client";

import Link from "next/link";
import { BrainCircuit, LogIn } from "lucide-react";
import { useSyncExternalStore } from "react";
import { getCurrentUser, subscribeToAuth } from "@/lib/auth";
import { getProfilePreferencesSnapshot, subscribeToProfile } from "@/lib/profile";

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "SX";
}

export function MobileAccountMenu() {
  const user = useSyncExternalStore(subscribeToAuth, getCurrentUser, () => null);
  const profileSnapshot = useSyncExternalStore(subscribeToProfile, getProfilePreferencesSnapshot, () => "");
  let avatarDataUrl: string | undefined;
  if (user && profileSnapshot) {
    try { avatarDataUrl = (JSON.parse(profileSnapshot) as Record<string, { avatarDataUrl?: string }>)[user.id]?.avatarDataUrl; } catch { avatarDataUrl = undefined; }
  }
  const avatar = avatarDataUrl || user?.avatarUrl;
  const plan = (user?.plan ?? "free").toUpperCase();

  return (
    <div className="flex items-center gap-2 lg:hidden">
      {user && <Link href="/mysoul/manage" aria-label="Open MySoul" title="Open MySoul" className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-full border border-cyan-300/25 bg-cyan-300/8 text-cyan-200 transition hover:border-cyan-200/50 hover:bg-cyan-300/15 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200 min-[390px]:inline-flex"><BrainCircuit className="h-4 w-4" aria-hidden="true" /></Link>}
      <Link
        href={user ? "/profile" : "/login"}
        aria-label={user ? `Open ${user.name}'s profile` : "Log in"}
        title={user ? "Open profile" : "Log in"}
        className="relative inline-flex h-11 min-w-11 items-center justify-center rounded-full border border-cyan-300/25 bg-cyan-400/10 p-1 text-cyan-50 shadow-[0_0_22px_rgba(34,211,238,0.14)] transition active:scale-[0.97]"
      >
        {user && avatar ? (
          // User-uploaded data URLs and account-specific remote avatars should not pass through the image optimizer.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatar} alt="" className="h-8 w-8 rounded-full object-cover" />
        ) : user ? <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 text-[11px] font-black text-slate-950">{initials(user.name)}</span> : <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5"><LogIn className="h-4 w-4" aria-hidden="true" /></span>}
        {user && <span className="absolute -bottom-1 -right-1 rounded-full border-2 border-slate-950 bg-cyan-300 px-1.5 py-0.5 text-[7px] font-black leading-none text-slate-950">{plan}</span>}
      </Link>
    </div>
  );
}
