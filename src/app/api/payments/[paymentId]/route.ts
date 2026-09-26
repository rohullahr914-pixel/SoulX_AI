import { NextResponse } from "next/server";
import { requireUser } from "@/lib/server/auth";
import { supabaseAdmin } from "@/lib/server/db";

const paymentIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(_request: Request, context: { params: Promise<{ paymentId: string }> }) {
  try {
    const user = await requireUser();
    const { paymentId } = await context.params;
    if (!paymentIdPattern.test(paymentId)) return NextResponse.json({ error: "Payment not found." }, { status: 404 });
    if (!supabaseAdmin) throw new Error("PAYMENT_STORAGE_UNAVAILABLE");
    const payment = await supabaseAdmin
      .from("payments")
      .select("id,plan,amount,currency,status,created_at,paid_at,subscription_expires_at")
      .eq("id", paymentId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (payment.error) throw payment.error;
    if (!payment.data) return NextResponse.json({ error: "Payment not found." }, { status: 404 });
    return NextResponse.json({ payment: payment.data }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if ((error as Error).message === "UNAUTHORIZED") return NextResponse.json({ error: "Log in to view this payment." }, { status: 401 });
    console.error("[payments]", JSON.stringify({ status: "status_read_failed" }));
    return NextResponse.json({ error: "Could not load payment status." }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ paymentId: string }> }) {
  try {
    const user = await requireUser();
    const { paymentId } = await context.params;
    const body = (await request.json().catch(() => ({}))) as { action?: string };
    if (!paymentIdPattern.test(paymentId) || body.action !== "cancel") return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    if (!supabaseAdmin) throw new Error("PAYMENT_STORAGE_UNAVAILABLE");
    const result = await supabaseAdmin
      .from("payments")
      .update({ status: "cancelled", failure_reason: "cancelled_by_customer", updated_at: new Date().toISOString() })
      .eq("id", paymentId)
      .eq("user_id", user.id)
      .eq("status", "pending")
      .select("id,status")
      .maybeSingle();
    if (result.error) throw result.error;
    if (!result.data) return NextResponse.json({ error: "Only a pending payment can be cancelled." }, { status: 409 });
    return NextResponse.json({ payment: result.data });
  } catch (error) {
    if ((error as Error).message === "UNAUTHORIZED") return NextResponse.json({ error: "Log in to manage this payment." }, { status: 401 });
    console.error("[payments]", JSON.stringify({ status: "cancel_failed" }));
    return NextResponse.json({ error: "Could not cancel the payment." }, { status: 500 });
  }
}
