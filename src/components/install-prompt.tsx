"use client";

import { useEffect, useState } from "react";
import { Download, Share2, SquarePlus } from "lucide-react";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type NavigatorWithStandalone = Navigator & {
  standalone?: boolean;
  userAgentData?: { mobile?: boolean };
};

const DISMISS_KEY = "soulx-install-prompt-dismissed-at";
const LEGACY_DISMISS_KEY = "personax-install-dismissed-at";
const DISMISS_FOR_MS = 30 * 24 * 60 * 60 * 1000;
const REVEAL_DELAY_MS = 1200;

function isStandalone() {
  if (typeof window === "undefined") return false;
  const appNavigator = window.navigator as NavigatorWithStandalone;
  return window.matchMedia("(display-mode: standalone)").matches || appNavigator.standalone === true;
}

function isIOSDevice() {
  if (typeof window === "undefined") return false;
  const { userAgent, platform, maxTouchPoints } = window.navigator;
  return /iPad|iPhone|iPod/i.test(userAgent) || (platform === "MacIntel" && maxTouchPoints > 1);
}

function isMobileDevice() {
  if (typeof window === "undefined") return false;
  const appNavigator = window.navigator as NavigatorWithStandalone;
  return Boolean(
    appNavigator.userAgentData?.mobile ||
      /Android|iPhone|iPad|iPod|IEMobile|Opera Mini/i.test(appNavigator.userAgent),
  );
}

function wasRecentlyDismissed() {
  try {
    const dismissedAt = Math.max(
      Number(window.localStorage.getItem(DISMISS_KEY) ?? 0),
      Number(window.localStorage.getItem(LEGACY_DISMISS_KEY) ?? 0),
    );
    return dismissedAt > 0 && Date.now() - dismissedAt < DISMISS_FOR_MS;
  } catch {
    return false;
  }
}

function rememberDismissal() {
  try {
    window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
  } catch {
    // The prompt still closes when storage is unavailable (for example in private browsing).
  }
}

export function InstallPrompt() {
  const [installEvent, setInstallEvent] = useState<InstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [showIOSHelp, setShowIOSHelp] = useState(false);
  const [isIOS] = useState(isIOSDevice);
  const [isMobile] = useState(isMobileDevice);

  useEffect(() => {
    if (!isMobile || isStandalone() || wasRecentlyDismissed()) return;

    let revealTimer: number | undefined;
    const displayMode = window.matchMedia("(display-mode: standalone)");
    const reveal = () => {
      window.clearTimeout(revealTimer);
      revealTimer = window.setTimeout(() => setVisible(true), REVEAL_DELAY_MS);
    };
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as InstallPromptEvent);
      reveal();
    };
    const handleInstalled = () => {
      window.clearTimeout(revealTimer);
      setVisible(false);
      setInstallEvent(null);
      try {
        window.localStorage.removeItem(DISMISS_KEY);
      } catch {
        // Installation succeeded; there is nothing else to persist.
      }
    };
    const handleDisplayModeChange = () => {
      if (isStandalone()) handleInstalled();
    };

    if (isIOS) reveal();
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);
    displayMode.addEventListener("change", handleDisplayModeChange);

    return () => {
      window.clearTimeout(revealTimer);
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
      displayMode.removeEventListener("change", handleDisplayModeChange);
    };
  }, [isIOS, isMobile]);

  if (!visible || !isMobile || (!isIOS && !installEvent)) return null;

  const install = async () => {
    if (isIOS) {
      setShowIOSHelp(true);
      return;
    }
    if (!installEvent) return;

    try {
      await installEvent.prompt();
      const choice = await installEvent.userChoice;
      if (choice.outcome === "dismissed") rememberDismissal();
      setVisible(false);
    } catch {
      // Some browsers reject the deferred prompt when it has expired. Do not
      // leave a button on screen that can no longer open the native install UI.
      rememberDismissal();
      setVisible(false);
    } finally {
      setInstallEvent(null);
    }
  };

  const dismiss = () => {
    rememberDismissal();
    setVisible(false);
    setInstallEvent(null);
  };

  return (
    <aside
      role="dialog"
      aria-labelledby="soulx-install-title"
      aria-describedby="soulx-install-description"
      aria-live="polite"
      className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-[80] mx-auto w-[calc(100%_-_1.5rem)] max-w-[25rem] overflow-hidden rounded-[22px] border border-cyan-300/25 bg-[#061022]/97 p-3.5 text-white shadow-[0_24px_70px_rgba(2,8,23,0.78),0_0_30px_rgba(34,211,238,0.10)] backdrop-blur-2xl sm:p-4"
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-10 top-0 h-px bg-linear-to-r from-transparent via-cyan-300/80 to-transparent" />

      <div className="relative flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-cyan-300/20 bg-cyan-400/10 text-cyan-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
          <Download aria-hidden="true" className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1 pt-0.5">
          <h2 id="soulx-install-title" className="text-[0.95rem] font-extrabold tracking-[-0.02em] text-white">
            Install SoulX AI
          </h2>
          <p id="soulx-install-description" className="mt-1 text-xs leading-5 text-slate-300">
            Add SoulX to your home screen for faster access.
          </p>
        </div>
      </div>

      {showIOSHelp ? (
        <div className="relative mt-3 rounded-2xl border border-white/10 bg-white/5 p-3">
          <p className="text-[11px] leading-4 text-slate-300">On iPhone or iPad:</p>
          <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] font-semibold text-cyan-50">
            <span className="flex min-h-10 items-center gap-2 rounded-xl bg-cyan-400/8 px-2.5">
              <Share2 aria-hidden="true" className="h-4 w-4 shrink-0 text-cyan-300" />
              Tap Share
            </span>
            <span className="flex min-h-10 items-center gap-2 rounded-xl bg-cyan-400/8 px-2.5">
              <SquarePlus aria-hidden="true" className="h-4 w-4 shrink-0 text-cyan-300" />
              Add to Home Screen
            </span>
          </div>
        </div>
      ) : null}

      <div className="relative mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={install}
          className="min-h-11 rounded-xl bg-cyan-300 px-4 text-sm font-extrabold text-slate-950 transition hover:bg-cyan-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-200 active:scale-[0.98]"
        >
          Install
        </button>
        <button
          type="button"
          onClick={dismiss}
          className="min-h-11 rounded-xl border border-white/12 bg-white/5 px-4 text-sm font-semibold text-slate-200 transition hover:border-white/20 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-200 active:scale-[0.98]"
        >
          Not Now
        </button>
      </div>
    </aside>
  );
}
