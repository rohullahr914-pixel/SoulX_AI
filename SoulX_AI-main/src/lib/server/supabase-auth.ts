import "server-only";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import type { AppUser } from "@/lib/auth";

const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const anonKey = process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";
const accessCookie = "personax_sb_access";
const refreshCookie = "personax_sb_refresh";
const authClient = url && anonKey ? createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } }) : null;
export type SupabaseUser = { id: string; email?: string; user_metadata?: Record<string, unknown> };

export async function createSupabaseSession(email: string, password: string) {
  if (!authClient) throw new Error("Supabase authentication is not configured.");
  const { data, error } = await authClient.auth.signInWithPassword({ email, password });
  if (error || !data.session || !data.user) throw new Error(error?.message ?? "Email or password is incorrect.");
  const store = await cookies(), options = { httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 30 };
  store.set(accessCookie, data.session.access_token, options); store.set(refreshCookie, data.session.refresh_token, options);
  return data.user;
}
export async function sendPasswordReset(email: string) {
  if (!authClient) throw new Error("Supabase authentication is not configured.");
  const { error } = await authClient.auth.resetPasswordForEmail(email, { redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/reset-password` });
  if (error) throw error;
}
export async function clearSupabaseSession() { const store = await cookies(); store.delete(accessCookie); store.delete(refreshCookie); }
export async function getSupabaseUser(): Promise<SupabaseUser | null> {
  if (!authClient) return null;
  const store = await cookies(); const token = store.get(accessCookie)?.value;
  if (token) { const { data } = await authClient.auth.getUser(token); if (data.user) return data.user as SupabaseUser; }
  const refresh = store.get(refreshCookie)?.value; if (!refresh) return null;
  const refreshed = await authClient.auth.refreshSession({ refresh_token: refresh });
  if (refreshed.data.session && refreshed.data.user) {
    const options = { httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 30 };
    store.set(accessCookie, refreshed.data.session.access_token, options); store.set(refreshCookie, refreshed.data.session.refresh_token, options);
    return refreshed.data.user as SupabaseUser;
  }
  return null;
}
export async function requireSupabaseUser() { const user = await getSupabaseUser(); if (!user) throw new Error("UNAUTHORIZED"); return user; }
export function toAppUser(user: SupabaseUser): AppUser { return { id: user.id, name: String(user.user_metadata?.full_name ?? user.email?.split("@")[0] ?? "SoulX user"), email: user.email ?? "", language: "en", createdAt: new Date().toISOString(), plan: "free", planStatus: "active" }; }
