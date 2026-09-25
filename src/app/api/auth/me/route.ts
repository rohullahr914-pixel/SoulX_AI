import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/server/auth";

export async function GET() {
  return NextResponse.json({ user: await getAuthenticatedUser() }, { headers: { "Cache-Control": "no-store" } });
}
