"use client";

import { Check, Palette } from "lucide-react";
import { useEffect, useSyncExternalStore } from "react";

export const themes = [
  { id: "cosmic", name: "Cosmic Dark", description: "Deep space, cyan light" },
  { id: "editorial", name: "Editorial Light", description: "Warm, calm, and refined" },
  { id: "neon", name: "Neon Lab", description: "Bold color and creative energy" },
] as const;

export type ThemeId = (typeof themes)[number]["id"];
const storageKey = "soulx-theme";

function isTheme(value: string | null): value is ThemeId {
  return themes.some((theme) => theme.id === value);
}

export function applyTheme(theme: ThemeId) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme === "editorial" ? "light" : "dark";
  localStorage.setItem(storageKey, theme);
  window.dispatchEvent(new Event("soulx-theme-change"));
}

function getStoredTheme(): ThemeId {
  if (typeof window === "undefined") return "cosmic";
  const stored = localStorage.getItem(storageKey);
  return isTheme(stored) ? stored : "cosmic";
}

function subscribeToTheme(onStoreChange: () => void) {
  window.addEventListener("soulx-theme-change", onStoreChange);
  window.addEventListener("storage", onStoreChange);
  return () => {
    window.removeEventListener("soulx-theme-change", onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}

export function ThemeSelector({ compact = false }: { compact?: boolean }) {
  const theme = useSyncExternalStore<ThemeId>(subscribeToTheme, getStoredTheme, () => "cosmic");

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const chooseTheme = (nextTheme: ThemeId) => {
    applyTheme(nextTheme);
  };

  if (compact) {
    return (
      <div className="theme-compact-picker" aria-label="Choose site theme">
        {themes.map((item) => (
          <button key={item.id} type="button" aria-label={item.name} aria-pressed={theme === item.id} data-theme-option={item.id} onClick={() => chooseTheme(item.id)}>
            <span className="sr-only">{item.name}</span>
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-3" aria-label="Choose site theme">
      {themes.map((item) => (
        <button key={item.id} type="button" className="theme-choice-card" data-theme-option={item.id} aria-pressed={theme === item.id} onClick={() => chooseTheme(item.id)}>
          <span className="theme-choice-preview"><span /><span /><span /></span>
          <span className="mt-4 flex items-start justify-between gap-3 text-left">
            <span><span className="block text-base font-bold">{item.name}</span><span className="mt-1 block text-sm opacity-70">{item.description}</span></span>
            {theme === item.id ? <Check className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" /> : <Palette className="mt-0.5 h-5 w-5 shrink-0 opacity-40" aria-hidden="true" />}
          </span>
        </button>
      ))}
    </div>
  );
}
