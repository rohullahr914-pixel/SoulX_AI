import "server-only";

import type { Plan } from "@/lib/permissions";
import { query } from "./db";

type SettingRow = { key: string; value: unknown };
export type PlanContext = { plan: Plan; personaLimit: number; dailyMessageLimit: number; monthlyMessageLimit: number };

function settingNumber(rows: SettingRow[], key: string, fallback: number) {
  const row = rows.find((item) => item.key === key);
  const value = typeof row?.value === "number" ? row.value : Number(String(row?.value ?? "").replaceAll('"', ""));
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}

/** The single server-side source for plan limits used by user-owned mutations. */
export async function getPlanContext(userId: string): Promise<PlanContext> {
  const [profile, settings] = await Promise.all([
    query<{ plan: Plan }>("SELECT plan FROM profiles WHERE id=$1", [userId]),
    query<SettingRow>("SELECT key,value FROM admin_settings WHERE key IN ('free_daily_message_limit','pro_daily_message_limit','free_monthly_message_limit','pro_monthly_message_limit','free_persona_creation_limit','pro_persona_creation_limit')", []),
  ]);
  const plan = profile.rows[0]?.plan ?? "free";
  const pro = plan === "pro" || plan === "ultra";
  return {
    plan,
    personaLimit: settingNumber(settings.rows, pro ? "pro_persona_creation_limit" : "free_persona_creation_limit", pro ? 25 : 3),
    dailyMessageLimit: settingNumber(settings.rows, pro ? "pro_daily_message_limit" : "free_daily_message_limit", pro ? 50 : 5),
    monthlyMessageLimit: settingNumber(settings.rows, pro ? "pro_monthly_message_limit" : "free_monthly_message_limit", pro ? 1500 : 150),
  };
}

export async function getBooleanSetting(key: string, fallback = false) {
  try {
    const result = await query<{ value: unknown }>("SELECT value FROM admin_settings WHERE key=$1", [key]);
    const raw = result.rows[0]?.value;
    if (typeof raw === "boolean") return raw;
    return String(raw ?? "").replaceAll('"', "").toLowerCase() === "true";
  } catch {
    return fallback;
  }
}
