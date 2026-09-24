import { NextResponse } from "next/server";
import { sendPasswordReset } from "@/lib/server/supabase-auth";
export async function POST(request: Request) {
  try { const { email } = await request.json() as { email?: string }; if (!email || !/^\S+@\S+\.\S+$/.test(email)) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 }); await sendPasswordReset(email.trim().toLowerCase()); return NextResponse.json({ ok: true }); }
  catch { return NextResponse.json({ ok: true }); }
}
