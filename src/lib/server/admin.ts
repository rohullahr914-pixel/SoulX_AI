import "server-only";
import { getAuthenticatedUser } from "./auth";
import { query } from "./db";
export async function requireAdmin() {
  const user = await getAuthenticatedUser();
  if (!user) throw new Error("FORBIDDEN");
  const result = await query<{ role: string }>("SELECT role FROM profiles WHERE id=$1 AND account_status='active'", [user.id]);
  if (result.rows[0]?.role !== "admin") throw new Error("FORBIDDEN");
  return user;
}
