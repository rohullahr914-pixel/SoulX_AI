"use client";

import Link from "next/link";
import { ArrowUpRight, UserRound } from "lucide-react";
import { useSyncExternalStore } from "react";
import { getCurrentUser, subscribeToAuth } from "@/lib/auth";

export function AuthActions() {
  const user = useSyncExternalStore(subscribeToAuth, getCurrentUser, () => null);

  if (user) {
    return (
      <Link href="/profile" className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_0_30px_rgba(34,211,238,0.4)] transition hover:brightness-110">
        <UserRound className="h-4 w-4" />
        Profile
      </Link>
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
