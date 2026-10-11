import { NextResponse } from "next/server";
import { exchangeOAuthCode } from "@/lib/server/supabase-auth";
import { safeRedirectPath } from "@/lib/safe-redirect";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = safeRedirectPath(url.searchParams.get("next"));
  if (!code) return NextResponse.redirect(new URL("/login?error=invalid_callback", url.origin));
  try {
    await exchangeOAuthCode(code);
    return NextResponse.redirect(new URL(next, url.origin));
  } catch {
    return NextResponse.redirect(new URL("/login?error=invalid_callback", url.origin));
  }
}
