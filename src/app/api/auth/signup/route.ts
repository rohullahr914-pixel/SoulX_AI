import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/server/db";
import { createSupabaseSession } from "@/lib/server/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json() as { name?: string; email?: string; password?: string };
    const name = body.name?.trim() ?? "", email = body.email?.trim().toLowerCase() ?? "", password = body.password ?? "";
    if (name.length < 2 || name.length > 120) return NextResponse.json({ error: "Enter a valid name." }, { status: 400 });
    if (!/^\S+@\S+\.\S+$/.test(email) || email.length > 320) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    if (password.length < 8 || password.length > 128) return NextResponse.json({ error: "Password must be between 8 and 128 characters." }, { status: 400 });
    if (!supabaseAdmin) throw new Error("Supabase is not configured.");
    const registrationSetting = await supabaseAdmin.from("admin_settings").select("value").eq("key", "registration_enabled").maybeSingle();
    if (registrationSetting.data && registrationSetting.data.value === false) return NextResponse.json({ error: "Registration is temporarily disabled." }, { status: 403 });
    const created = await supabaseAdmin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: name } });
    if (created.error || !created.data.user) return NextResponse.json({ error: created.error?.message ?? "Could not create the account." }, { status: created.error?.status ?? 400 });
    const profile = await supabaseAdmin.from("profiles").upsert({ id: created.data.user.id, email, full_name: name }, { onConflict: "id" });
    if (profile.error) throw profile.error;
    const limits = await supabaseAdmin.from("admin_settings").select("key,value").in("key", ["free_daily_message_limit", "free_monthly_message_limit"]);
    const configured = Object.fromEntries((limits.data ?? []).map((row) => [row.key, Number(String(row.value ?? "").replaceAll('"', ""))]));
    await supabaseAdmin.from("profiles").update({ daily_message_limit: Number.isFinite(configured.free_daily_message_limit) ? configured.free_daily_message_limit : 5, monthly_message_limit: Number.isFinite(configured.free_monthly_message_limit) ? configured.free_monthly_message_limit : 150 }).eq("id", created.data.user.id);
    const user = await createSupabaseSession(email, password);
    return NextResponse.json({ user: { id: user.id, name, email, language: "en", createdAt: created.data.user.created_at } }, { status: 201 });
  } catch (error) { console.error("Supabase signup failed", error); return NextResponse.json({ error: error instanceof Error ? error.message : "Could not create the account." }, { status: 500 }); }
}
