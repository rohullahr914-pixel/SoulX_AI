import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/admin";
import { isValidPaymentRequestId, verifyPaymentRequest } from "@/lib/server/binance-payment-verification";
import { supabaseAdmin } from "@/lib/server/db";

export async function POST(request: Request, context: { params: Promise<{ requestId: string }> }) {
  try {
    const admin = await requireAdmin();
    const origin = request.headers.get("origin");
    if (origin && origin !== new URL(request.url).origin) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
    const { requestId } = await context.params;
    if (!isValidPaymentRequestId(requestId)) return NextResponse.json({ error: "Payment request not found." }, { status: 404 });
    const body = await request.json().catch(() => ({})) as { action?: unknown; note?: unknown };
    if (!supabaseAdmin) throw new Error("storage");

    if (body.action === "verify") {
      const payment = await supabaseAdmin.from("payment_requests").select("tx_id").eq("id", requestId).maybeSingle();
      if (payment.error) throw payment.error;
      if (!payment.data) return NextResponse.json({ error: "Payment request not found." }, { status: 404 });
      if (!payment.data.tx_id) return NextResponse.json({ result: "not_found", message: "This request has no transaction ID yet." }, { status: 409 });
      const result = await verifyPaymentRequest({ requestId, txId: payment.data.tx_id });
      return NextResponse.json({ result }, { status: result === "rate_limited" ? 429 : result === "not_found_request" ? 404 : 200, headers: { "Cache-Control": "no-store" } });
    }

    if (body.action === "approve") {
      const result = await supabaseAdmin.rpc("approve_payment_request", { p_request_id: requestId, p_admin_id: admin.id });
      if (result.error) throw result.error;
      const outcome = result.data as string;
      const status = outcome === "forbidden" ? 403 : outcome === "not_found" ? 404 : outcome === "invalid_state" ? 409 : 200;
      return NextResponse.json({ result: outcome }, { status, headers: { "Cache-Control": "no-store" } });
    }

    if (body.action === "reject") {
      const note = typeof body.note === "string" ? body.note.trim().slice(0, 500) : "";
      const result = await supabaseAdmin.rpc("reject_payment_request", { p_request_id: requestId, p_admin_id: admin.id, p_note: note || null });
      if (result.error) throw result.error;
      const outcome = result.data as string;
      const status = outcome === "forbidden" ? 403 : outcome === "not_found" ? 404 : outcome === "invalid_state" || outcome === "already_approved" ? 409 : 200;
      return NextResponse.json({ result: outcome }, { status, headers: { "Cache-Control": "no-store" } });
    }

    return NextResponse.json({ error: "Choose a valid payment action." }, { status: 400 });
  } catch (error) {
    if ((error as Error).message === "FORBIDDEN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    return NextResponse.json({ error: "Could not update this payment request." }, { status: 503 });
  }
}
