export type AppLanguage = "en" | "fa" | "ar" | "tr" | "es" | "fr" | "de";

export type AppUser = { id: string; name: string; email: string; language: AppLanguage; createdAt: string; plan?: "free" | "pro" | "ultra"; planStatus?: string; planExpiresAt?: string | null; role?: "user" | "admin"; avatarUrl?: string; username?: string };
type AuthResult = { ok: true; user: AppUser } | { ok: false; error: string };

const authListeners = new Set<() => void>();
const visualTestUser: AppUser = { id: "00000000-0000-4000-8000-000000000001", name: "SoulX Test User", email: "visual-test@example.invalid", language: "en", createdAt: new Date().toISOString(), plan: "pro", planStatus: "active" };
let currentUser: AppUser | null = process.env.NODE_ENV === "development" ? visualTestUser : null;

export function subscribeToAuth(listener: () => void) {
  authListeners.add(listener);
  return () => authListeners.delete(listener);
}

export function getCurrentUser() {
  return currentUser;
}

function publishUser(user: AppUser | null) {
  currentUser = user;
  authListeners.forEach((listener) => listener());
}

async function parseResponse(response: Response): Promise<AuthResult> {
  const data = await response.json().catch(() => ({})) as { user?: AppUser; error?: string };
  if (!response.ok || !data.user) return { ok: false, error: data.error ?? "Something went wrong. Please try again." };
  publishUser(data.user);
  return { ok: true, user: data.user };
}

export async function refreshCurrentUser() {
  if (process.env.NODE_ENV === "development") { publishUser(visualTestUser); return visualTestUser; }
  try {
    const response = await fetch("/api/auth/me", { credentials: "same-origin", cache: "no-store" });
    const data = await response.json() as { user: AppUser | null };
    publishUser(data.user);
    return data.user;
  } catch {
    publishUser(null);
    return null;
  }
}

export async function signupUser(input: { name: string; email: string; password: string }) {
  const response = await fetch("/api/auth/signup", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin", body: JSON.stringify(input) });
  return parseResponse(response);
}

export async function loginUser(input: { email: string; password: string }) {
  const response = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin", body: JSON.stringify(input) });
  return parseResponse(response);
}

export async function logoutUser() {
  await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" });
  publishUser(null);
}
