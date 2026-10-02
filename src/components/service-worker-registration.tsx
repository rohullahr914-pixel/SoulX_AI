"use client";

import { useEffect } from "react";

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;

    let idleCallback: number | undefined;
    let fallbackTimer: number | undefined;
    const register = () => {
      void navigator.serviceWorker
        .register("/sw.js", { scope: "/", updateViaCache: "none" })
        .catch((error: unknown) => {
          console.error("SoulX service worker registration failed", error);
        });
    };
    const scheduleRegistration = () => {
      if (typeof window.requestIdleCallback === "function") {
        idleCallback = window.requestIdleCallback(register, { timeout: 3000 });
      } else {
        fallbackTimer = window.setTimeout(register, 1000);
      }
    };

    // Installing the offline document must not compete with the hero image,
    // fonts, or hydration on the first visit.
    if (document.readyState === "complete") scheduleRegistration();
    else window.addEventListener("load", scheduleRegistration, { once: true });

    return () => {
      window.removeEventListener("load", scheduleRegistration);
      if (idleCallback !== undefined) window.cancelIdleCallback(idleCallback);
      if (fallbackTimer !== undefined) window.clearTimeout(fallbackTimer);
    };
  }, []);

  return null;
}
