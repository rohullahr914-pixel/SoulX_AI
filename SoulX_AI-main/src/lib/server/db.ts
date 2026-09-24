import "server-only";
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
export const supabaseAdmin = url && serviceKey ? createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } }) : null;
type Row = Record<string, unknown>;

function quote(value: unknown) {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
  return `'${String(value).replaceAll("'", "''")}'`;
}
function interpolate(text: string, values: unknown[]) { return text.replace(/\$(\d+)/g, (_, index: string) => quote(values[Number(index) - 1])); }

/** Compatibility adapter for existing Next API handlers. SQL executes only through a private Supabase RPC. */
export async function query<T extends Row>(text: string, values: unknown[] = []) {
  if (!supabaseAdmin) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured.");
  const { data, error } = await supabaseAdmin.rpc("personax_query", { statement: interpolate(text, values) });
  if (error) throw error;
  const rows = Array.isArray(data) ? data as T[] : [];
  return { rows, rowCount: rows.length };
}
export async function transaction<T>(work: (client: { query: typeof query }) => Promise<T>) { return work({ query }); }
