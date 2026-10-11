import { NextResponse } from "next/server";
import { getSupabaseUser } from "@/lib/server/supabase-auth";

export async function GET() {
  const user = await getSupabaseUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const providers = [...new Set([...(user.app_metadata?.providers ?? []), ...(user.identities ?? []).map((identity) => identity.provider).filter((value): value is string => Boolean(value))])];
  return NextResponse.json({ email: user.email ?? "", providers: providers.length ? providers : [user.app_metadata?.provider ?? "email"] }, { headers: { "Cache-Control": "private, no-store" } });
}
