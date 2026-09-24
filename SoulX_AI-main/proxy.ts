import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function isAllowedOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  const requestOrigin = request.nextUrl.origin;
  const configuredOrigins = [
    requestOrigin,
    "https://soulxai.tech",
    process.env.FRONTEND_ORIGIN,
    process.env.NEXT_PUBLIC_SITE_URL,
  ].flatMap((value) => value?.split(",").map((item) => item.trim()).filter(Boolean) ?? []);
  return configuredOrigins.includes(origin) || /^https?:\/\/localhost(?::\d+)?$/.test(origin) || /^https?:\/\/127\.0\.0\.1(?::\d+)?$/.test(origin);
}

/**
 * Protect admin page navigation with the server-issued session cookies.
 * The API still performs the authoritative role check with Supabase on every request.
 */
export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  if (pathname.startsWith("/api/") && ["POST", "PUT", "PATCH", "DELETE"].includes(request.method) && !isAllowedOrigin(request)) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }
  if (!pathname.startsWith("/admin") || pathname === "/admin/login") return NextResponse.next();
  const hasSession = Boolean(request.cookies.get("personax_sb_access")?.value || request.cookies.get("personax_sb_refresh")?.value);
  if (!hasSession) return NextResponse.redirect(new URL("/admin/login", request.url));
  return NextResponse.next();
}

export const config = { matcher: "/admin/:path*" };
