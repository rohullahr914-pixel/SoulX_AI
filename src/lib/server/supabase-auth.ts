import "server-only";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import type { AppUser } from "@/lib/auth";

const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const anonKey = process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";
const accessCookie = "personax_sb_access";
const refreshCookie = "personax_sb_refresh";
const authClient = url && anonKey ? createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } }) : null;
export type SupabaseUser = { id: string; email?: string; user_metadata?: Record<string, unknown>; app_metadata?: { provider?: string; providers?: string[] }; identities?: Array<{ provider?: string }> };

const cookieOptions = { httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 30 };

async function createPkceClient() {
  if (!url || !anonKey) throw new Error("Supabase authentication is not configured.");
  const store = await cookies();
  return createClient(url, anonKey, { auth: {
    flowType: "pkce",
    persistSession: true,
    autoRefreshToken: false,
    detectSessionInUrl: false,
    storage: {
      getItem: (key) => store.get(key)?.value ?? null,
      setItem: (key, value) => { store.set(key, value, { ...cookieOptions, maxAge: 60 * 10 }); },
      removeItem: (key) => { store.delete(key); },
    },
  } });
}

async function saveSession(session: { access_token: string; refresh_token: string }) {
  const store = await cookies();
  store.set(accessCookie, session.access_token, cookieOptions);
  store.set(refreshCookie, session.refresh_token, cookieOptions);
}

export async function createSupabaseSession(email: string, password: string) {
  if (!authClient) throw new Error("Supabase authentication is not configured.");
  const { data, error } = await authClient.auth.signInWithPassword({ email, password });
  if (error || !data.session || !data.user) throw new Error(error?.message ?? "Email or password is incorrect.");
  await saveSession(data.session);
  return data.user;
}
export async function createSupabaseAccount(name: string, email: string, password: string) {
  if (!authClient) throw new Error("Supabase authentication is not configured.");
  const { data, error } = await authClient.auth.signUp({ email, password, options: { data: { full_name: name } } });
  if (error || !data.user) throw new Error(error?.message ?? "Could not create the account.");
  if (data.session) await saveSession(data.session);
  return { user: data.user, sessionCreated: Boolean(data.session) };
}
export async function createOAuthUrl(provider: "google" | "apple" | "github", redirectTo: string) {
  const client = await createPkceClient();
  const { data, error } = await client.auth.signInWithOAuth({ provider, options: { redirectTo, skipBrowserRedirect: true } });
  if (error || !data.url) throw new Error(error?.message ?? "This login provider is unavailable.");
  return data.url;
}
export async function exchangeOAuthCode(code: string) {
  const client = await createPkceClient();
  const { data, error } = await client.auth.exchangeCodeForSession(code);
  if (error || !data.session || !data.user) throw new Error(error?.message ?? "The sign-in link is invalid or expired.");
  await saveSession(data.session);
  return data.user;
}
export async function sendPasswordReset(email: string) {
  const client = await createPkceClient();
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo: `${base}/auth/callback?next=/reset-password` });
  if (error) throw error;
}
export async function updateSupabasePassword(password: string) {
  if (!url || !anonKey) throw new Error("Supabase authentication is not configured.");
  const store = await cookies();
  const accessToken = store.get(accessCookie)?.value;
  const refreshToken = store.get(refreshCookie)?.value;
  if (!accessToken || !refreshToken) throw new Error("UNAUTHORIZED");
  const client = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const session = await client.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
  if (session.error) throw session.error;
  const { error } = await client.auth.updateUser({ password });
  if (error) throw error;
  if (session.data.session) await saveSession(session.data.session);
}
export async function clearSupabaseSession() { const store = await cookies(); store.delete(accessCookie); store.delete(refreshCookie); }
export async function getSupabaseUser(): Promise<SupabaseUser | null> {
  if (!authClient) return null;
  const store = await cookies(); const token = store.get(accessCookie)?.value;
  if (token) { const { data } = await authClient.auth.getUser(token); if (data.user) return data.user as SupabaseUser; }
  const refresh = store.get(refreshCookie)?.value; if (!refresh) return null;
  const refreshed = await authClient.auth.refreshSession({ refresh_token: refresh });
  if (refreshed.data.session && refreshed.data.user) {
    await saveSession(refreshed.data.session);
    return refreshed.data.user as SupabaseUser;
  }
  return null;
}
export async function requireSupabaseUser() { const user = await getSupabaseUser(); if (!user) throw new Error("UNAUTHORIZED"); return user; }
export function toAppUser(user: SupabaseUser): AppUser { return { id: user.id, name: String(user.user_metadata?.full_name ?? user.email?.split("@")[0] ?? "SoulX user"), email: user.email ?? "", language: "en", createdAt: new Date().toISOString(), plan: "free", planStatus: "active" }; }
