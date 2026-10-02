"use client";

import Link from "next/link";
import { ArrowUpRight, BrainCircuit, UserRound } from "lucide-react";
import { useSyncExternalStore } from "react";
import { getCurrentUser, subscribeToAuth } from "@/lib/auth";

export function AuthActions() {
  const user = useSyncExternalStore(subscribeToAuth, getCurrentUser, () => null);

  if (user) {
    return (
      <div className="flex items-center gap-2">
        <Link href="/mysoul/manage" aria-label="Manage MySoul" title="Manage MySoul" className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-cyan-300/25 bg-cyan-300/8 text-cyan-200 transition hover:border-cyan-200/50 hover:bg-cyan-300/15 hover:text-white">
          <BrainCircuit className="h-4 w-4" aria-hidden="true" />
        </Link>
        <Link href="/profile" className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_0_30px_rgba(34,211,238,0.4)] transition hover:brightness-110">
          <UserRound className="h-4 w-4" />
          Profile
        </Link>
      </div>
    );
  }

  return (
    <>
      <Link href="/login" className="rounded-full border border-white/10 px-4 py-2 text-sm text-slate-200 transition hover:border-cyan-400/60 hover:text-white">
        Log in
      </Link>
      <Link href="/signup" className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_0_30px_rgba(34,211,238,0.4)] transition hover:brightness-110">
        Join now
        <ArrowUpRight className="h-4 w-4" />
      </Link>
    </>
  );
}
