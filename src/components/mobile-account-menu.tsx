"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { CreditCard, Heart, LogIn, LogOut, Settings2, UserRound } from "lucide-react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { getCurrentUser, logoutUser, subscribeToAuth } from "@/lib/auth";
import { getProfilePreferencesSnapshot, subscribeToProfile } from "@/lib/profile";

const menuItems = [
  { label: "Profile", href: "/profile", icon: UserRound },
  { label: "Favorites", href: "/favorites", icon: Heart },
  { label: "Manage plan", href: "/pricing", icon: CreditCard },
  { label: "Settings", href: "/settings", icon: Settings2 },
];

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "SX";
}

export function MobileAccountMenu() {
  const user = useSyncExternalStore(subscribeToAuth, getCurrentUser, () => null);
  const profileSnapshot = useSyncExternalStore(subscribeToProfile, getProfilePreferencesSnapshot, () => "");
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const firstItemRef = useRef<HTMLAnchorElement>(null);
  const router = useRouter();

  let avatarDataUrl: string | undefined;
  if (user && profileSnapshot) {
    try { avatarDataUrl = (JSON.parse(profileSnapshot) as Record<string, { avatarDataUrl?: string }>)[user.id]?.avatarDataUrl; } catch { avatarDataUrl = undefined; }
  }
  const avatar = avatarDataUrl || user?.avatarUrl;

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
      if (event.key !== "Tab" || !rootRef.current) return;
      const focusable = [...rootRef.current.querySelectorAll<HTMLElement>('a[href],button:not([disabled])')];
      if (!focusable.length) return;
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    requestAnimationFrame(() => firstItemRef.current?.focus());
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  if (!user) {
    return (
      <Link href="/login" aria-label="Log in to SoulX" className="inline-flex h-12 min-w-12 items-center justify-center gap-2 rounded-full border border-white/12 bg-white/5 px-3 text-sm font-semibold text-white lg:hidden">
        <LogIn className="h-4 w-4" aria-hidden="true" />
        <span className="hidden min-[360px]:inline">Log in</span>
      </Link>
    );
  }

  const plan = (user.plan ?? "free").toUpperCase();
  return (
    <div ref={rootRef} className="relative lg:hidden">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls="mobile-account-menu"
        aria-label={`Open account menu for ${user.name}`}
        onClick={() => setOpen((current) => !current)}
        className="relative inline-flex h-12 min-w-12 items-center justify-center rounded-full border border-cyan-300/25 bg-cyan-400/10 p-1.5 text-cyan-50 shadow-[0_0_22px_rgba(34,211,238,0.14)] active:scale-[0.97]"
      >
        {avatar ? (
          // User-uploaded data URLs and account-specific remote avatars should not pass through the image optimizer.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatar} alt="" className="h-9 w-9 rounded-full object-cover" />
        ) : <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 text-[11px] font-black text-slate-950">{initials(user.name)}</span>}
        <span className="absolute -bottom-1 -right-1 rounded-full border-2 border-slate-950 bg-cyan-300 px-1.5 py-0.5 text-[7px] font-black leading-none text-slate-950">{plan}</span>
      </button>

      {open && (
        <div id="mobile-account-menu" role="menu" aria-label="Account" className="absolute right-0 top-[calc(100%+0.75rem)] z-[95] w-[min(20rem,calc(100vw-1.5rem))] overflow-hidden rounded-3xl border border-cyan-300/20 bg-[#061022]/98 p-2 shadow-[0_24px_70px_rgba(2,8,23,0.75)] backdrop-blur-2xl">
          <div className="rounded-[20px] border border-white/8 bg-white/[0.035] px-4 py-3">
            <p className="truncate text-sm font-bold text-white">{user.name}</p>
            <div className="mt-1.5 flex items-center justify-between gap-3 text-[10px] uppercase tracking-[0.16em] text-slate-400"><span>Current plan</span><span className="rounded-full bg-cyan-400/12 px-2 py-1 font-bold text-cyan-200">{plan}</span></div>
          </div>
          <div className="py-2">
            {menuItems.map(({ label, href, icon: Icon }, index) => (
              <Link key={href} ref={index === 0 ? firstItemRef : undefined} role="menuitem" href={href} onClick={() => setOpen(false)} className="flex min-h-12 items-center gap-3 rounded-2xl px-3 text-sm text-slate-200 transition hover:bg-white/5 hover:text-white focus:bg-white/5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 text-cyan-300"><Icon className="h-4 w-4" aria-hidden="true" /></span>{label}
              </Link>
            ))}
          </div>
          <button
            type="button"
            role="menuitem"
            onClick={() => void logoutUser().then(() => { setOpen(false); router.push("/"); router.refresh(); })}
            className="flex min-h-12 w-full items-center gap-3 rounded-2xl border-t border-white/8 px-3 text-left text-sm text-rose-200 transition hover:bg-rose-400/8"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-400/10"><LogOut className="h-4 w-4" aria-hidden="true" /></span>Log out
          </button>
        </div>
      )}
    </div>
  );
}
