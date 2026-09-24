"use client";

import { useSyncExternalStore, useState } from "react";
import { Heart, Share2 } from "lucide-react";
import { getCurrentUser, subscribeToAuth } from "@/lib/auth";
import { getFavoritePersonaSlugs, getProfilePreferencesSnapshot, subscribeToProfile, toggleFavoritePersona } from "@/lib/profile";

type PersonaActionsProps = {
  slug: string;
  name: string;
};

type ProfileStore = Record<string, { favoritePersonaSlug?: string; favoritePersonaSlugs?: string[] }>;

function readProfileStore(snapshot: string): ProfileStore {
  if (!snapshot) return {};

  try {
    return JSON.parse(snapshot) as ProfileStore;
  } catch {
    return {};
  }
}

export function PersonaActions({ slug, name }: PersonaActionsProps) {
  const user = useSyncExternalStore(subscribeToAuth, getCurrentUser, () => null);
  const profileSnapshot = useSyncExternalStore(subscribeToProfile, getProfilePreferencesSnapshot, () => "");
  const profileStore = readProfileStore(profileSnapshot);
  const isFavorite = user ? getFavoritePersonaSlugs(profileStore[user.id] ?? {}).includes(slug) : false;
  const [shareMessage, setShareMessage] = useState("");

  const toggleFavorite = () => {
    if (!user) {
      setShareMessage("Log in to save favorites.");
      return;
    }

    toggleFavoritePersona(user.id, slug);
    setShareMessage(isFavorite ? "Removed from favorites." : "Saved to favorites.");
  };

  const sharePersona = async () => {
    const shareData = { title: `${name} | SoulX`, text: `Explore ${name} on SoulX.`, url: window.location.href };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        setShareMessage("Shared successfully.");
      } else {
        await navigator.clipboard.writeText(shareData.url);
        setShareMessage("Link copied.");
      }
    } catch {
      setShareMessage("Sharing was cancelled.");
    }
  };

  return (
    <div className="flex flex-wrap gap-3">
      <button type="button" onClick={toggleFavorite} aria-pressed={isFavorite} className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition ${isFavorite ? "border-cyan-400/60 bg-cyan-500/10 text-cyan-200" : "border-white/10 bg-white/3 text-slate-200 hover:border-cyan-400/50"}`}>
        <Heart className={`h-4 w-4 ${isFavorite ? "fill-cyan-300 text-cyan-300" : ""}`} /> {isFavorite ? "Favorited" : "Favorite"}
      </button>
      <button type="button" onClick={sharePersona} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/3 px-4 py-2 text-sm text-slate-200 transition hover:border-cyan-400/50">
        <Share2 className="h-4 w-4" /> Share
      </button>
      {shareMessage && <span role="status" className="basis-full text-xs text-cyan-200">{shareMessage}</span>}
    </div>
  );
}
