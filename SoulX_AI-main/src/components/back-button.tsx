"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

type BackButtonProps = {
  label?: string;
  href?: string;
  className?: string;
};

export function BackButton({ label = "Back", href, className = "" }: BackButtonProps) {
  const router = useRouter();

  const baseClass =
    "inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-cyan-400/50 hover:text-cyan-200 " +
    className;

  if (href) {
    return (
      <Link href={href} className={baseClass}>
        <ArrowLeft className="h-4 w-4" />
        {label}
      </Link>
    );
  }

  return (
    <button type="button" onClick={() => router.back()} className={baseClass}>
      <ArrowLeft className="h-4 w-4" />
      {label}
    </button>
  );
}
