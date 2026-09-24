"use client";

import Link from "next/link";
import { ArrowRight, Menu, Sparkles, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { createPortal } from "react-dom";
import { useEffect, useState } from "react";

type MobileNavProps = {
  items: { label: string; href: string }[];
};

export function MobileNav({ items }: MobileNavProps) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isOpen]);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        aria-expanded={isOpen}
        aria-controls="mobile-navigation"
        aria-label={isOpen ? "Close navigation" : "Open navigation"}
        onClick={() => setIsOpen(true)}
        className="relative z-[90] inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-cyan-300/35 bg-cyan-400/10 px-4 text-sm font-semibold text-cyan-50 shadow-[0_0_24px_rgba(34,211,238,0.18)] transition active:scale-[0.97]"
      >
        <Menu aria-hidden="true" className="h-5 w-5" strokeWidth={2.5} />
        <span className="hidden min-[390px]:inline">Menu</span>
      </button>

      {isOpen && createPortal(
        <div className="fixed inset-0 z-[100] lg:hidden">
          <button
            type="button"
            aria-label="Close navigation overlay"
            onClick={() => setIsOpen(false)}
            className="absolute inset-0 bg-[#020817]/80 backdrop-blur-sm"
          />

          <nav
            id="mobile-navigation"
            aria-label="Mobile navigation menu"
            className="absolute inset-y-0 right-0 flex w-[min(88vw,24rem)] flex-col border-l border-cyan-300/20 bg-[#061022] px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-[max(1.25rem,env(safe-area-inset-top))] shadow-[-24px_0_70px_rgba(2,8,23,0.72)]"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-5">
              <Link href="/" className="flex items-center gap-3" onClick={() => setIsOpen(false)}>
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-cyan-300/20 bg-cyan-400/10 text-cyan-200">
                  <Sparkles className="h-5 w-5" aria-hidden="true" />
                </span>
                <span>
                  <span className="block text-base font-black tracking-[-0.05em] text-white">SOULX</span>
                  <span className="block text-[10px] uppercase tracking-[0.2em] text-slate-400">One AI · A thousand minds</span>
                </span>
              </Link>

              <button
                type="button"
                aria-label="Close navigation"
                onClick={() => setIsOpen(false)}
                className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white transition active:scale-95"
              >
                <X aria-hidden="true" className="h-6 w-6" />
              </button>
            </div>

            <div className="flex-1 py-5">
              {items.map((item, index) => {
                const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(`${item.href}/`));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    onClick={() => setIsOpen(false)}
                    className={`mb-2 flex min-h-14 items-center justify-between rounded-2xl border px-4 text-base font-medium transition active:scale-[0.98] ${
                      active
                        ? "border-cyan-300/35 bg-cyan-400/12 text-cyan-100"
                        : "border-transparent text-slate-200 hover:border-white/10 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    <span className="flex items-center gap-3"><span className="text-xs tabular-nums text-slate-500">0{index + 1}</span>{item.label}</span>
                    <ArrowRight className="h-4 w-4 text-slate-500" aria-hidden="true" />
                  </Link>
                );
              })}
            </div>

            <div className="grid grid-cols-2 gap-3 border-t border-white/10 pt-5">
              <Link href="/login" onClick={() => setIsOpen(false)} className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/15 bg-white/5 px-4 text-sm font-semibold text-white">
                Log in
              </Link>
              <Link href="/signup" onClick={() => setIsOpen(false)} className="inline-flex min-h-12 items-center justify-center rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 px-4 text-sm font-semibold text-white shadow-[0_0_24px_rgba(34,211,238,0.25)]">
                Join now
              </Link>
            </div>
          </nav>
        </div>,
        document.body,
      )}
    </div>
  );
}
