import { NextResponse } from "next/server";
import { createSupabaseSession } from "@/lib/server/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json() as { email?: string; password?: string };
    const email = body.email?.trim().toLowerCase() ?? "", password = body.password ?? "";
    if (!email || !password) return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
    const user = await createSupabaseSession(email, password);
    return NextResponse.json({ user: { id: user.id, name: String(user.user_metadata?.full_name ?? email.split("@")[0]), email: user.email ?? email, language: "en", createdAt: user.created_at } });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Could not log in." }, { status: 401 }); }
}
