import { NextResponse } from "next/server";
import { query } from "@/lib/server/db";

export async function GET() {
  try {
    const result = await query<{ value: unknown }>("SELECT value FROM admin_settings WHERE key='pro_price'", []);
    const value = Number(String(result.rows[0]?.value ?? "5").replaceAll('"', ""));
    return NextResponse.json({ free: 0, pro: Number.isFinite(value) ? value : 5 }, { headers: { "Cache-Control": "public, max-age=60" } });
  } catch {
    return NextResponse.json({ free: 0, pro: 5 }, { headers: { "Cache-Control": "public, max-age=60" } });
  }
}
