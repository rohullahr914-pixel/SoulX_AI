import { NextResponse } from "next/server";
import { createSupabaseSession, getAuthenticatedUser } from "@/lib/server/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json() as { email?: string; password?: string };
    const email = body.email?.trim().toLowerCase() ?? "", password = body.password ?? "";
    if (!email || !password) return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
    await createSupabaseSession(email, password);
    const user = await getAuthenticatedUser();
    if (!user) throw new Error("Could not load the signed-in account.");
    return NextResponse.json({ user });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Could not log in." }, { status: 401 }); }
}
