import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { createSupabaseSession } from "@/lib/server/auth";
import { supabaseAdmin } from "@/lib/server/db";

const PRIMARY_ADMIN_EMAIL = "rohullahr914@gmail.com";
const attempts = new Map<string, { count: number; at: number }>();
function allowed(key: string) { const now = Date.now(), entry = attempts.get(key); if (!entry || now - entry.at > 15 * 60_000) { attempts.set(key, { count: 1, at: now }); return true; } entry.count += 1; return entry.count <= 8; }
function matchesSecret(input: string, expected: string) {
  const left = Buffer.from(input);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}

async function ensurePrimaryAdmin(password: string) {
  if (!supabaseAdmin) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured.");
  const users = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (users.error) throw users.error;
  let user = users.data.users.find((candidate) => candidate.email?.toLowerCase() === PRIMARY_ADMIN_EMAIL);
  if (!user) {
    const created = await supabaseAdmin.auth.admin.createUser({
      email: PRIMARY_ADMIN_EMAIL,
      password,
      email_confirm: true,
      user_metadata: { full_name: "SoulX Administrator" },
    });
    if (created.error || !created.data.user) throw created.error ?? new Error("Could not create the primary admin account.");
    user = created.data.user;
  }
  const passwordUpdate = await supabaseAdmin.auth.admin.updateUserById(user.id, { password });
  if (passwordUpdate.error) throw passwordUpdate.error;

  const profile = await supabaseAdmin.from("profiles").upsert({
    id: user.id,
    email: PRIMARY_ADMIN_EMAIL,
    full_name: user.user_metadata?.full_name ?? "SoulX Administrator",
    role: "admin",
    account_status: "active",
  }, { onConflict: "id" });
  if (profile.error) throw profile.error;
  return user;
}

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!allowed(ip)) return NextResponse.json({ error: "Too many login attempts. Try again later." }, { status: 429 });
  try {
    const body = await request.json() as { email?: string; password?: string };
    const email = body.email?.trim().toLowerCase() ?? "";
    const configuredPassword = process.env.ADMIN_PASSWORD ?? "";
    if (!configuredPassword || email !== PRIMARY_ADMIN_EMAIL || !body.password || !matchesSecret(body.password, configuredPassword)) {
      return NextResponse.json({ error: "Invalid admin credentials." }, { status: 401 });
    }
    const user = await ensurePrimaryAdmin(configuredPassword);
    await createSupabaseSession(PRIMARY_ADMIN_EMAIL, configuredPassword);
    const { query } = await import("@/lib/server/db");
    const role = await query<{ role: string; account_status: string }>("SELECT role,account_status FROM profiles WHERE id=$1", [user.id]);
    if (role.rows[0]?.role !== "admin" || role.rows[0]?.account_status !== "active") return NextResponse.json({ error: "This account is not an administrator." }, { status: 403 });
    return NextResponse.json({ ok: true });
  } catch { return NextResponse.json({ error: "Invalid admin credentials." }, { status: 401 }); }
}
