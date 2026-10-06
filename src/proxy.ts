import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function configuredConnectionSources() {
  const sources = new Set<string>([
    "'self'",
    "https://www.google-analytics.com",
    "https://*.google-analytics.com",
    "https://*.elevenlabs.io",
    "wss://*.elevenlabs.io",
  ]);

  for (const value of [process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_URL]) {
    if (!value) continue;
    try {
      const url = new URL(value);
      if (url.protocol !== "https:") continue;
      sources.add(url.origin);
      sources.add(`wss://${url.host}`);
    } catch {
      // Invalid optional origins are ignored instead of weakening the policy.
    }
  }

  return [...sources].join(" ");
}

function contentSecurityPolicy(nonce: string) {
  const isDevelopment = process.env.NODE_ENV === "development";
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://www.googletagmanager.com${isDevelopment ? " 'unsafe-eval'" : ""}`,
    `style-src 'self' 'nonce-${nonce}'`,
    "style-src-attr 'unsafe-inline'",
    "img-src 'self' data: blob: https://www.google-analytics.com https://*.google-analytics.com",
    "font-src 'self' data:",
    `connect-src ${configuredConnectionSources()}`,
    "media-src 'self' blob:",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ].join("; ");
}

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
  const forwardedProtocol = request.headers.get("x-forwarded-proto")?.split(",", 1)[0]?.trim();
  const protocol = forwardedProtocol || request.nextUrl.protocol.replace(":", "");
  if (process.env.NODE_ENV === "production" && protocol === "http") {
    const secureUrl = request.nextUrl.clone();
    secureUrl.protocol = "https:";
    return NextResponse.redirect(secureUrl, 308);
  }

  if (pathname.startsWith("/api/") && ["POST", "PUT", "PATCH", "DELETE"].includes(request.method) && !isAllowedOrigin(request)) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }

  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    const hasSession = Boolean(request.cookies.get("personax_sb_access")?.value || request.cookies.get("personax_sb_refresh")?.value);
    if (!hasSession) return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  const nonce = btoa(crypto.randomUUID());
  const policy = contentSecurityPolicy(nonce);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", policy);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", policy);
  return response;
}

export const config = {
  matcher: [
    {
      source: "/((?!_next/static|_next/image|favicon.ico|sw.js|.*\\.(?:svg|png|jpg|jpeg|webp|avif|gif|ico|woff|woff2)$).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
