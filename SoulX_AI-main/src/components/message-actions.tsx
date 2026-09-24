"use client";

import { Heart, Share2 } from "lucide-react";
import { useState, useSyncExternalStore } from "react";
import { getCurrentUser, subscribeToAuth } from "@/lib/auth";
import { getProfilePreferencesSnapshot, subscribeToProfile, toggleLikedMessage } from "@/lib/profile";
import { ShareToProfile } from "@/components/social/controls";

type MessageActionsProps = {
  id: string;
  personaName: string;
  personaSlug?: string;
  content: string;
};

export function MessageActions({ id, personaName, personaSlug, content }: MessageActionsProps) {
  const user = useSyncExternalStore(subscribeToAuth, getCurrentUser, () => null);
  const snapshot = useSyncExternalStore(subscribeToProfile, getProfilePreferencesSnapshot, () => "");
  const [status, setStatus] = useState("");
  let liked = false;

  if (user && snapshot) {
    try {
      const store = JSON.parse(snapshot) as Record<string, { likedMessages?: Array<{ id: string }> }>;
      liked = store[user.id]?.likedMessages?.some((message) => message.id === id) ?? false;
    } catch {
      liked = false;
    }
  }

  const handleLike = () => {
    if (!user) {
      setStatus("Log in to save this message.");
      return;
    }
    toggleLikedMessage(user.id, { id, personaName, personaSlug, content });
    setStatus(liked ? "Removed from your profile." : "Saved to your profile.");
  };

  const handleShare = async () => {
    const text = `“${content}” — ${personaName} on SoulX`;
    try {
      const usedNativeShare = "share" in navigator;
      if (usedNativeShare) await navigator.share({ title: `${personaName} | SoulX`, text, url: window.location.href });
      else await navigator.clipboard.writeText(`${text}\n${window.location.href}`);
      setStatus(usedNativeShare ? "Shared." : "Message copied.");
    } catch {
      setStatus("Sharing was cancelled.");
    }
  };

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-white/8 pt-3">
      <button type="button" onClick={handleLike} aria-pressed={liked} className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-medium transition ${liked ? "border-pink-300/35 bg-pink-400/10 text-pink-200" : "border-white/10 text-slate-400 hover:border-pink-300/30 hover:text-pink-200"}`}><Heart className={`h-3.5 w-3.5 ${liked ? "fill-current" : ""}`} />{liked ? "Liked" : "Like"}</button>
      <button type="button" onClick={handleShare} className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5 text-[11px] font-medium text-slate-400 transition hover:border-cyan-300/30 hover:text-cyan-200"><Share2 className="h-3.5 w-3.5" />Share</button>
      <ShareToProfile personaSlug={personaSlug} question="Conversation answer" answer={content} sourceKey={id} />
      {status && <span role="status" className="text-[11px] text-cyan-200">{status}</span>}
    </div>
  );
}
