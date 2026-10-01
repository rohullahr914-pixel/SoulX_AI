import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/admin";
import { query } from "@/lib/server/db";

export async function GET() {
  try {
    await requireAdmin();
    const result = await query(`SELECT r.id,r.user_id,COALESCE(r.user_email,p.email) user_email,r.plan,r.amount_usdt,r.coin,r.network,r.deposit_address,r.tx_id,r.status,r.created_at,r.submitted_at,r.verified_at,r.approved_at,r.approved_by,r.expires_at,r.binance_deposit_time,r.binance_amount,r.verification_error,r.admin_note FROM payment_requests r LEFT JOIN profiles p ON p.id=r.user_id ORDER BY r.created_at DESC LIMIT 200`, []);
    return NextResponse.json({ paymentRequests: result.rows }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message === "FORBIDDEN" ? "Forbidden" : "Payment requests are unavailable." }, { status: (error as Error).message === "FORBIDDEN" ? 403 : 503 });
  }
}
