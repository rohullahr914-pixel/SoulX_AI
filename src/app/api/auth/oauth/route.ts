import { NextResponse } from "next/server";
import { createOAuthUrl } from "@/lib/server/supabase-auth";
import { safeRedirectPath } from "@/lib/safe-redirect";

const providers = new Set(["google", "apple", "github"]);

export async function GET(request: Request) {
  const url = new URL(request.url);
  const provider = url.searchParams.get("provider") ?? "";
  if (!providers.has(provider)) return NextResponse.redirect(new URL("/login?error=provider", url.origin));
  const next = safeRedirectPath(url.searchParams.get("next"));
  const callback = new URL("/auth/callback", url.origin);
  callback.searchParams.set("next", next);
  try {
    const destination = await createOAuthUrl(provider as "google" | "apple" | "github", callback.toString());
    return NextResponse.redirect(destination);
  } catch {
    const login = new URL("/login", url.origin);
    login.searchParams.set("error", "provider_unavailable");
    return NextResponse.redirect(login);
  }
}
