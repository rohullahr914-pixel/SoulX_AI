"use client";

let lastTrackedPath = "";
import { API_BASE_URL } from "@/lib/api-client";

export function trackPageView() {
  const path = `${window.location.pathname}${window.location.search}`;
  if (path === lastTrackedPath) return;
  lastTrackedPath = path;
  void fetch(`${API_BASE_URL}/admin/events`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({ eventType: "page_view", path, referrer: document.referrer || null }),
    keepalive: true,
  }).catch(() => undefined);
}