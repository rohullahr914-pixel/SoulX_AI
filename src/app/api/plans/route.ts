import { NextResponse } from "next/server";
import { query } from "@/lib/server/db";

export async function GET() {
  const configuredCurrency = (process.env.HESABPAY_CURRENCY || "USD").trim().toUpperCase();
  const currency = /^[A-Z]{3}$/.test(configuredCurrency) ? configuredCurrency : "USD";
  try {
    const result = await query<{ value: unknown }>("SELECT value FROM admin_settings WHERE key='pro_price'", []);
    const value = Number(String(result.rows[0]?.value ?? "5").replaceAll('"', ""));
    return NextResponse.json({ free: 0, pro: Number.isFinite(value) ? value : 5, currency }, { headers: { "Cache-Control": "public, max-age=60" } });
  } catch {
    return NextResponse.json({ free: 0, pro: 5, currency }, { headers: { "Cache-Control": "public, max-age=60" } });
  }
}
