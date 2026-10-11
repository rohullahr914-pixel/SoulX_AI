"use client";

import Link from "next/link";
import {
  ArrowRight,
  BrainCircuit,
  Compass,
  DoorOpen,
  Home,
  Menu,
  Plus,
  Sparkles,
  UsersRound,
  X,
} from "lucide-react";
import { usePathname } from "next/navigation";
import { createPortal } from "react-dom";
import { useEffect, useRef, useState } from "react";
import { ThemeSelector } from "@/components/theme-switcher";

type MobileNavProps = {
  items: { label: string; href: string }[];
};

const destinations = [
  { label: "Home", href: "/", icon: Home },
  { label: "Discover", href: "/explore", icon: Compass },
  { label: "Create", href: "/create", icon: Plus, action: true },
  { label: "Rooms", href: "/room", icon: DoorOpen },
  { label: "Community", href: "/community", icon: UsersRound },
] as const;

function destinationIsActive(pathname: string, label: (typeof destinations)[number]["label"]) {
  if (label === "Home") return pathname === "/";
  if (label === "Discover") return pathname === "/explore" || pathname.startsWith("/persona/") || pathname.startsWith("/chat/");
  if (label === "Create") return pathname === "/create";
  if (label === "Rooms") return pathname === "/room" || pathname.startsWith("/room/");
  return pathname === "/community" || pathname.startsWith("/community/") || pathname === "/challenges" || pathname === "/leaderboard";
}

function useMobileKeyboard() {
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;

    const update = () => {
      const active = document.activeElement;
      const editable = active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement || (active instanceof HTMLElement && active.isContentEditable);
      setKeyboardOpen(editable && window.innerHeight - viewport.height > 120);
    };

    viewport.addEventListener("resize", update);
    viewport.addEventListener("scroll", update);
    document.addEventListener("focusin", update);
    document.addEventListener("focusout", update);
    return () => {
      viewport.removeEventListener("resize", update);
      viewport.removeEventListener("scroll", update);
      document.removeEventListener("focusin", update);
      document.removeEventListener("focusout", update);
    };
  }, []);

  return keyboardOpen;
}

export function MobileNav({ items }: MobileNavProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [clientReady, setClientReady] = useState(false);
  const pathname = usePathname();
  const keyboardOpen = useMobileKeyboard();
  const menuTriggerRef = useRef<HTMLButtonElement>(null);
  const menuCloseRef = useRef<HTMLButtonElement>(null);
  const createTriggerRef = useRef<HTMLButtonElement>(null);
  const createCloseRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    // Portals require the browser document and intentionally mount after hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setClientReady(true);
  }, []);

  useEffect(() => {
    const open = menuOpen || createOpen;
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    const close = () => {
      setMenuOpen(false);
      setCreateOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        close();
        (menuOpen ? menuTriggerRef : createTriggerRef).current?.focus();
        return;
      }
      if (event.key !== "Tab") return;
      const dialog = document.getElementById(menuOpen ? "tablet-navigation" : "mobile-create-sheet");
      const focusable = dialog?.querySelectorAll<HTMLElement>('a[href],button:not([disabled])');
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);
    requestAnimationFrame(() => (menuOpen ? menuCloseRef : createCloseRef).current?.focus());
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [createOpen, menuOpen]);

  return (
    <>
      <div className="hidden md:block lg:hidden">
        <button
          ref={menuTriggerRef}
          type="button"
          aria-expanded={menuOpen}
          aria-controls="tablet-navigation"
          aria-label={menuOpen ? "Close navigation" : "Open navigation"}
          onClick={() => setMenuOpen((open) => !open)}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-cyan-300/30 bg-cyan-400/10 px-4 text-sm font-semibold text-cyan-50 transition duration-200 active:scale-[0.97]"
        >
          <Menu aria-hidden="true" className="h-5 w-5" />
          <span>Menu</span>
        </button>
      </div>

      {clientReady && createPortal(<nav
        aria-label="Primary mobile navigation"
        data-keyboard-open={keyboardOpen ? "true" : "false"}
        className="mobile-bottom-nav fixed inset-x-0 bottom-0 z-[80] md:hidden"
      >
        <div className="mobile-bottom-nav__surface">
          {destinations.map(({ label, href, icon: Icon, ...destination }) => {
            const active = destinationIsActive(pathname, label);
            if ("action" in destination && destination.action) {
              return (
                <button
                  key={label}
                  ref={createTriggerRef}
                  type="button"
                  aria-label="Create something new"
                  aria-haspopup="dialog"
                  aria-expanded={createOpen}
                  onClick={() => setCreateOpen(true)}
                  className="mobile-bottom-nav__item mobile-bottom-nav__create"
                >
                  <span className="mobile-bottom-nav__create-icon"><Icon aria-hidden="true" className="h-6 w-6" strokeWidth={2.4} /></span>
                  <span>Create</span>
                </button>
              );
            }
            return (
              <Link
                key={label}
                href={href}
                aria-current={active ? "page" : undefined}
                className="mobile-bottom-nav__item"
                data-active={active ? "true" : "false"}
              >
                <span className="mobile-bottom-nav__icon"><Icon aria-hidden="true" className="h-[22px] w-[22px]" strokeWidth={active ? 2.5 : 2} /></span>
                <span>{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>, document.body)}

      {menuOpen && createPortal(
        <div className="fixed inset-0 z-[120] hidden md:block lg:hidden">
          <button type="button" aria-label="Close navigation overlay" onClick={() => setMenuOpen(false)} className="absolute inset-0 bg-[#020817]/80 backdrop-blur-sm" />
          <nav id="tablet-navigation" aria-label="Tablet navigation menu" role="dialog" aria-modal="true" className="absolute inset-y-0 right-0 flex w-[min(90vw,24rem)] flex-col overflow-y-auto border-l border-cyan-300/20 bg-[#061022] px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-[max(1.25rem,env(safe-area-inset-top))] shadow-[-24px_0_70px_rgba(2,8,23,0.72)]">
            <div className="flex items-center justify-between border-b border-white/10 pb-5">
              <Link href="/" className="flex items-center gap-3"><Sparkles className="h-5 w-5 text-cyan-200" /><span className="font-black tracking-[-0.05em]">SOULX</span></Link>
              <button ref={menuCloseRef} type="button" aria-label="Close navigation" onClick={() => setMenuOpen(false)} className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/5"><X className="h-5 w-5" /></button>
            </div>
            <div className="flex-1 py-5">
              {items.map((item) => {
                const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(`${item.href}/`));
                return <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={`mb-2 flex min-h-12 items-center justify-between rounded-2xl border px-4 text-sm font-medium transition ${active ? "border-cyan-300/35 bg-cyan-400/12 text-cyan-100" : "border-transparent text-slate-200 hover:bg-white/5"}`}><span>{item.label}</span><ArrowRight className="h-4 w-4 text-slate-500" /></Link>;
              })}
              <section className="mt-5 border-t border-white/10 pt-5" aria-label="Theme"><div className="flex items-center justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Appearance</p><p className="mt-1 text-sm font-semibold">Choose a theme</p></div><ThemeSelector compact /></div></section>
            </div>
          </nav>
        </div>,
        document.body,
      )}

      {createOpen && createPortal(
        <div className="fixed inset-0 z-[130] md:hidden">
          <button type="button" aria-label="Close create menu" onClick={() => setCreateOpen(false)} className="absolute inset-0 bg-[#020817]/76 backdrop-blur-[3px]" />
          <section id="mobile-create-sheet" role="dialog" aria-modal="true" aria-labelledby="create-sheet-title" className="mobile-create-sheet absolute inset-x-0 bottom-0 rounded-t-[30px] border-t border-cyan-300/20 bg-[#061022] px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-24px_70px_rgba(2,8,23,0.7)]">
            <div className="mx-auto mb-3 h-1 w-11 rounded-full bg-white/20" />
            <div className="flex items-start justify-between gap-4">
              <div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-300">Creation hub</p><h2 id="create-sheet-title" className="mt-1 text-xl font-bold tracking-[-0.04em] text-white">What will you bring to life?</h2><p className="mt-1 text-xs text-slate-400">Choose an available SoulX creation tool.</p></div>
              <button ref={createCloseRef} type="button" aria-label="Close" onClick={() => setCreateOpen(false)} className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-200"><X className="h-5 w-5" /></button>
            </div>
            <div className="mt-5 grid gap-3">
              <Link href="/create" onClick={() => setCreateOpen(false)} className="group flex min-h-[76px] items-center gap-4 rounded-[22px] border border-cyan-300/18 bg-cyan-400/[0.055] p-3.5 transition duration-200 hover:border-cyan-300/40 hover:bg-cyan-400/10">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-cyan-300/20 bg-gradient-to-br from-cyan-400/20 to-blue-500/15 text-cyan-200"><BrainCircuit className="h-5 w-5" /></span>
                <span className="min-w-0 flex-1"><span className="block font-semibold text-white">Create Soul</span><span className="mt-0.5 block text-xs text-slate-400">Bring your own AI persona to life.</span></span><ArrowRight className="h-4 w-4 shrink-0 text-cyan-300" />
              </Link>
              <button type="button" disabled aria-describedby="create-community-unavailable" className="flex min-h-[76px] w-full cursor-not-allowed items-center gap-4 rounded-[22px] border border-white/10 bg-white/[0.025] p-3.5 text-left opacity-65">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-blue-300/15 bg-gradient-to-br from-blue-400/10 to-violet-500/10 text-blue-200"><UsersRound className="h-5 w-5" /></span>
                <span className="min-w-0 flex-1"><span className="flex items-center gap-2 font-semibold text-white">Create Community <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400">Unavailable</span></span><span id="create-community-unavailable" className="mt-0.5 block text-xs text-slate-400">Build a space for minds to connect.</span></span>
              </button>
            </div>
          </section>
        </div>,
        document.body,
      )}
    </>
  );
}
