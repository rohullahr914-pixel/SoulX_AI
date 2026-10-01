import { NextResponse } from "next/server";
import { query } from "@/lib/server/db";

export async function GET() {
  try {
    const result = await query<{ key: string; value: unknown }>("SELECT key,value FROM admin_settings WHERE key IN ('pro_price','ultra_price')", []);
    const valueFor = (key: string, fallback: number) => {
      const setting = result.rows.find((row) => row.key === key)?.value;
      const value = Number(String(setting ?? fallback).replaceAll('"', ""));
      return Number.isFinite(value) && value >= 0 ? value : fallback;
    };
    return NextResponse.json({ free: 0, pro: valueFor("pro_price", 5), ultra: valueFor("ultra_price", 10), currency: "USDT" }, { headers: { "Cache-Control": "public, max-age=60" } });
  } catch {
    return NextResponse.json({ free: 0, pro: 5, ultra: 10, currency: "USDT" }, { headers: { "Cache-Control": "public, max-age=60" } });
  }
}
