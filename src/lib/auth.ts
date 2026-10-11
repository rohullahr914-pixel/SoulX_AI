export type AppLanguage = "en" | "fa" | "ar" | "tr" | "es" | "fr" | "de";

export type AppUser = { id: string; name: string; email: string; language: AppLanguage; createdAt: string; plan?: "free" | "pro" | "ultra"; planStatus?: string; planExpiresAt?: string | null; role?: "user" | "admin"; avatarUrl?: string; username?: string };
type AuthResult = { ok: true; user: AppUser } | { ok: false; error: string };
export type SignupResult = AuthResult | { ok: true; confirmationRequired: true; email: string };

const authListeners = new Set<() => void>();
const visualTestUser: AppUser = { id: "00000000-0000-4000-8000-000000000001", name: "SoulX Test User", email: "visual-test@example.invalid", language: "en", createdAt: new Date().toISOString(), plan: "pro", planStatus: "active" };
const visualTestMode = process.env.NEXT_PUBLIC_VISUAL_TEST_MODE === "true";
let currentUser: AppUser | null = visualTestMode ? visualTestUser : null;
let authInitialized = visualTestMode;

export function subscribeToAuth(listener: () => void) {
  authListeners.add(listener);
  return () => authListeners.delete(listener);
}

export function getCurrentUser() {
  return currentUser;
}

export function getAuthStatus(): "loading" | "authenticated" | "anonymous" {
  if (!authInitialized) return "loading";
  return currentUser ? "authenticated" : "anonymous";
}

function publishUser(user: AppUser | null) {
  currentUser = user;
  authInitialized = true;
  authListeners.forEach((listener) => listener());
}

async function parseResponse(response: Response): Promise<AuthResult> {
  const data = await response.json().catch(() => ({})) as { user?: AppUser; error?: string };
  if (!response.ok || !data.user) return { ok: false, error: data.error ?? "Something went wrong. Please try again." };
  publishUser(data.user);
  return { ok: true, user: data.user };
}

export async function refreshCurrentUser() {
  if (visualTestMode) { publishUser(visualTestUser); return visualTestUser; }
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
  const data = await response.json().catch(() => ({})) as { user?: AppUser; error?: string; confirmationRequired?: boolean; email?: string };
  if (!response.ok) return { ok: false as const, error: data.error ?? "Could not create the account." };
  if (data.confirmationRequired) return { ok: true as const, confirmationRequired: true as const, email: data.email ?? input.email };
  if (!data.user) return { ok: false as const, error: "Could not create the account." };
  publishUser(data.user);
  return { ok: true as const, user: data.user };
}

export async function loginUser(input: { email: string; password: string }) {
  const response = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin", body: JSON.stringify(input) });
  return parseResponse(response);
}

export async function logoutUser() {
  await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" });
  publishUser(null);
}
