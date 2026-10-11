import { NextResponse } from "next/server";
import { updateSupabasePassword } from "@/lib/server/supabase-auth";

export async function POST(request: Request) {
  try {
    const { password } = await request.json() as { password?: string };
    if (!password || password.length < 8 || password.length > 128) return NextResponse.json({ error: "Use a password between 8 and 128 characters." }, { status: 400 });
    await updateSupabasePassword(password);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const status = (error as Error).message === "UNAUTHORIZED" ? 401 : 400;
    return NextResponse.json({ error: status === 401 ? "Open a fresh password reset link and try again." : "Could not update your password." }, { status });
  }
}
