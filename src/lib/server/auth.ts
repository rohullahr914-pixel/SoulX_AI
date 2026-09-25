import "server-only";
import { getSupabaseUser, requireSupabaseUser, toAppUser, createSupabaseSession, clearSupabaseSession } from "./supabase-auth";
import { supabaseAdmin } from "./db";
import type { AppUser } from "@/lib/auth";

export async function createSession(userId: string) { return userId; }
export async function destroySession() { await clearSupabaseSession(); }
export async function getAuthenticatedUser(): Promise<AppUser | null> {
  const user = await getSupabaseUser(); if (!user) return null;
  const profile = supabaseAdmin ? await supabaseAdmin.from("profiles").select("full_name,email,plan,plan_status,plan_expires_at,role,account_status").eq("id", user.id).maybeSingle() : null;
  if (profile?.data?.account_status === "deleted") return null;
  const app = toAppUser(user); return { ...app, name: String(profile?.data?.full_name ?? app.name), email: String(profile?.data?.email ?? app.email), plan: (profile?.data?.plan ?? "free") as AppUser["plan"], planStatus: String(profile?.data?.plan_status ?? "active"), planExpiresAt: profile?.data?.plan_expires_at ?? null, role: profile?.data?.role === "admin" ? "admin" : "user" };
}
export async function requireUser() { const user = await requireSupabaseUser(); const app = toAppUser(user); if (supabaseAdmin) { const profile = await supabaseAdmin.from("profiles").select("full_name,email,plan,plan_status,plan_expires_at,account_status").eq("id",user.id).maybeSingle(); if (profile.data?.account_status === "suspended" || profile.data?.account_status === "deleted") throw new Error("SUSPENDED"); return { ...app, name: String(profile.data?.full_name ?? app.name), email: String(profile.data?.email ?? app.email), plan: (profile.data?.plan ?? "free") as AppUser["plan"], planStatus: String(profile.data?.plan_status ?? "active"), planExpiresAt: profile.data?.plan_expires_at ?? null }; } return app; }
export { createSupabaseSession };
