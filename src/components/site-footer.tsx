"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight, Sparkles } from "lucide-react";
import { usePathname } from "next/navigation";
import { SocialLinks } from "@/components/social-links";

const publicSections = ["/about", "/explore", "/persona", "/pricing", "/community", "/challenges", "/leaderboard", "/creators", "/room", "/mysoul"];

const exploreLinks = [
  { label: "Discover", href: "/explore" },
  { label: "Rooms", href: "/room" },
  { label: "Community", href: "/community" },
  { label: "Pricing", href: "/pricing" },
];

const soulxLinks = [
  { label: "About SoulX", href: "/about" },
  { label: "Contact", href: "/about#contact" },
];

function isPublicPage(pathname: string) {
  if (pathname === "/") return true;
  if (pathname === "/mysoul/manage" || pathname.startsWith("/room/create") || pathname.startsWith("/room/join")) return false;
  return publicSections.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

export function SiteFooter() {
  const pathname = usePathname();

  if (!isPublicPage(pathname)) return null;

  return (
    <footer className="relative z-10 mb-2 mt-10 overflow-hidden rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_12%_15%,rgba(34,211,238,.09),transparent_28%),linear-gradient(145deg,rgba(6,16,34,.94),rgba(2,8,23,.9))] px-5 py-8 text-slate-300 shadow-[0_24px_80px_rgba(2,8,23,.34)] sm:mt-14 sm:px-8 sm:py-10 md:mb-0 lg:px-10">
      <div aria-hidden="true" className="absolute -right-24 -top-28 h-64 w-64 rounded-full border border-cyan-300/10 bg-cyan-400/[0.035] blur-sm" />
      <div className="relative grid gap-9 md:grid-cols-[minmax(0,1.4fr)_minmax(8rem,.55fr)_minmax(9rem,.65fr)] md:gap-8">
        <div className="max-w-md">
          <Link href="/" className="inline-flex items-center gap-3 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70">
            <Image src="/brand/soulx-logo.webp" width={48} height={48} alt="" className="h-11 w-11 rounded-xl shadow-[0_0_24px_rgba(34,211,238,.16)]" />
            <span><span className="block text-lg font-black tracking-[-0.06em] text-white">SOULX</span><span className="block text-[9px] uppercase tracking-[0.28em] text-cyan-200/65">One AI. A thousand minds</span></span>
          </Link>
          <p className="mt-5 text-sm leading-7 text-slate-400">A living ecosystem of people and AI personas, built for better questions, deeper conversations, and new perspectives.</p>
        </div>

        <nav aria-label="Explore SoulX">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500">Explore</p>
          <div className="mt-4 grid gap-3 text-sm">
            {exploreLinks.map((item) => <Link key={item.href} href={item.href} className="w-fit transition hover:text-cyan-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70">{item.label}</Link>)}
          </div>
        </nav>

        <nav aria-label="SoulX information">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500">SOULX</p>
          <div className="mt-4 grid gap-3 text-sm">
            {soulxLinks.map((item) => <Link key={item.href} href={item.href} className="group flex w-fit items-center gap-1.5 transition hover:text-cyan-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70">{item.label}<ArrowUpRight className="h-3.5 w-3.5 text-slate-600 transition group-hover:text-cyan-300" aria-hidden="true" /></Link>)}
          </div>
        </nav>
      </div>

      <div className="relative mt-9 flex flex-col gap-5 border-t border-white/8 pt-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-slate-500">© {new Date().getFullYear()} SoulX. Built for a thousand minds.</p>
        <div className="flex flex-wrap items-center gap-5"><SocialLinks /><span className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-500/[0.07] px-3 py-1.5 text-[9px] uppercase tracking-[0.18em] text-cyan-200"><Sparkles className="h-3 w-3" aria-hidden="true" />Stay curious</span></div>
      </div>
    </footer>
  );
}
