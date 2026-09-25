import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/server/auth";
import { query } from "@/lib/server/db";

function classifyDevice(userAgent: string) {
  if (/bot|crawler|spider/i.test(userAgent)) return "Bot";
  if (/mobile|android|iphone|ipad/i.test(userAgent)) return "Mobile";
  return "Desktop";
}

function classifyBrowser(userAgent: string) {
  if (/edg\//i.test(userAgent)) return "Edge";
  if (/chrome\//i.test(userAgent)) return "Chrome";
  if (/firefox\//i.test(userAgent)) return "Firefox";
  if (/safari\//i.test(userAgent) && !/chrome\//i.test(userAgent)) return "Safari";
  return "Other";
}

function requestCountry(request: Request) {
  return request.headers.get("x-vercel-ip-country") ?? request.headers.get("cf-ipcountry") ?? "Unknown";
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as { eventType?: string; path?: string; referrer?: string | null };
    if (!body.path || !["page_view", "login", "signup"].includes(body.eventType ?? "")) {
      return NextResponse.json({ error: "Invalid analytics event." }, { status: 400 });
    }
    const user = await getAuthenticatedUser();
    const userAgent = request.headers.get("user-agent") ?? "";
    await query(
      `INSERT INTO analytics_events (id, user_id, event_type, path, country, device, browser, referrer)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [randomUUID(), user?.id ?? null, body.eventType, body.path.slice(0, 500), requestCountry(request), classifyDevice(userAgent), classifyBrowser(userAgent), body.referrer?.slice(0, 500) ?? null],
    );
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Analytics unavailable." }, { status: 500 });
  }
}

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const role = await query<{ role: string }>("SELECT role FROM profiles WHERE id=$1", [user.id]);
  if (role.rows[0]?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const [overview, countries, devices, pages, browsers] = await Promise.all([
    query<{ total: string; visitors: string; sessions: string }>(`SELECT COUNT(*) FILTER (WHERE event_type = 'page_view') AS total, COUNT(DISTINCT COALESCE(user_id::text, id::text)) AS visitors, COUNT(*) FILTER (WHERE event_type = 'login') AS sessions FROM analytics_events WHERE created_at >= now() - interval '30 days'`),
    query<{ label: string; count: string }>(`SELECT country AS label, COUNT(*) AS count FROM analytics_events WHERE event_type = 'page_view' AND created_at >= now() - interval '30 days' GROUP BY country ORDER BY count DESC LIMIT 8`),
    query<{ label: string; count: string }>(`SELECT device AS label, COUNT(*) AS count FROM analytics_events WHERE event_type = 'page_view' AND created_at >= now() - interval '30 days' GROUP BY device ORDER BY count DESC`),
    query<{ label: string; count: string }>(`SELECT path AS label, COUNT(*) AS count FROM analytics_events WHERE event_type = 'page_view' AND created_at >= now() - interval '30 days' GROUP BY path ORDER BY count DESC LIMIT 8`),
    query<{ label: string; count: string }>(`SELECT browser AS label, COUNT(*) AS count FROM analytics_events WHERE event_type = 'page_view' AND created_at >= now() - interval '30 days' GROUP BY browser ORDER BY count DESC`),
  ]);
  return NextResponse.json({ overview: overview.rows[0], countries: countries.rows, devices: devices.rows, pages: pages.rows, browsers: browsers.rows }, { headers: { "Cache-Control": "no-store" } });
}
