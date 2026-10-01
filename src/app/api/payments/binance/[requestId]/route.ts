import { NextResponse } from "next/server";
import { requireUser } from "@/lib/server/auth";
import { isValidPaymentRequestId } from "@/lib/server/binance-payment-verification";
import { supabaseAdmin } from "@/lib/server/db";

export async function GET(_request: Request, context: { params: Promise<{ requestId: string }> }) {
  try {
    const user = await requireUser();
    const { requestId } = await context.params;
    if (!isValidPaymentRequestId(requestId)) return NextResponse.json({ error: "Payment request not found." }, { status: 404 });
    if (!supabaseAdmin) throw new Error("storage");
    const result = await supabaseAdmin.from("payment_requests")
      .select("id,plan,amount_usdt,coin,network,deposit_address,tx_id,status,created_at,submitted_at,verified_at,approved_at,expires_at,binance_deposit_time,binance_amount")
      .eq("id", requestId).eq("user_id", user.id).maybeSingle();
    if (result.error) throw result.error;
    if (!result.data) return NextResponse.json({ error: "Payment request not found." }, { status: 404 });
    return NextResponse.json({ paymentRequest: result.data }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if ((error as Error).message === "UNAUTHORIZED") return NextResponse.json({ error: "Sign in to view this payment." }, { status: 401 });
    return NextResponse.json({ error: "Could not load payment details." }, { status: 503 });
  }
}
