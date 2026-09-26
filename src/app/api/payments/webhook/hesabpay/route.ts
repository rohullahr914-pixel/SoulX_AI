import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/server/db";
import {
  parseHesabPayWebhook,
  PaymentConfigurationError,
  PaymentProviderError,
  verifyHesabPaySignature,
  webhookAmount,
} from "@/lib/server/hesabpay";

type WebhookResult = { result: string; payment_status: string; subscription_expires_at: string | null };

export async function POST(request: Request) {
  try {
    const length = Number(request.headers.get("content-length") || 0);
    if (length > 64_000) return NextResponse.json({ error: "Payload too large." }, { status: 413 });
    const payload = parseHesabPayWebhook(await request.json().catch(() => null));
    if (!payload) return NextResponse.json({ error: "Invalid webhook payload." }, { status: 400 });

    const verified = await verifyHesabPaySignature(String(payload.signature), String(payload.timestamp));
    if (!verified) {
      console.warn("[payments]", JSON.stringify({ paymentId: payload.user_id, status: "invalid_signature" }));
      return NextResponse.json({ error: "Invalid webhook signature." }, { status: 401 });
    }
    if (!supabaseAdmin) throw new PaymentConfigurationError("Payment storage is not configured.");

    const successful = payload.success === true && payload.status_code === 10;
    if (payload.success === true && !successful) return NextResponse.json({ error: "Invalid success event." }, { status: 400 });
    const transactionId = String(payload.transaction_id ?? "").trim();
    const amount = webhookAmount(payload.amount);
    if (successful && (!transactionId || amount === null)) return NextResponse.json({ error: "Incomplete payment event." }, { status: 400 });

    const processed = await supabaseAdmin.rpc("process_hesabpay_webhook", {
      payment_id: payload.user_id,
      provider_transaction_id: transactionId || null,
      event_success: successful,
      event_amount: amount,
      event_message: String(payload.message ?? "").slice(0, 240),
    });
    if (processed.error) throw processed.error;
    const result = (Array.isArray(processed.data) ? processed.data[0] : processed.data) as WebhookResult | null;
    if (!result || ["not_found", "provider_mismatch", "amount_mismatch", "transaction_conflict", "invalid_transaction"].includes(result.result)) {
      console.warn("[payments]", JSON.stringify({ paymentId: payload.user_id, status: result?.result ?? "invalid_result" }));
      return NextResponse.json({ error: "Payment event did not match a valid transaction." }, { status: 409 });
    }

    console.info("[payments]", JSON.stringify({ paymentId: payload.user_id, status: result.payment_status, result: result.result }));
    return NextResponse.json({ received: true, result: result.result });
  } catch (error) {
    if (error instanceof PaymentProviderError) {
      console.warn("[payments]", JSON.stringify({ status: "signature_verification_unavailable", providerStatus: error.status ?? null }));
      return NextResponse.json({ error: "Signature verification unavailable." }, { status: 502 });
    }
    if (error instanceof PaymentConfigurationError) {
      console.error("[payments]", JSON.stringify({ status: "configuration_error" }));
      return NextResponse.json({ error: "Payment webhook is not configured." }, { status: 503 });
    }
    console.error("[payments]", JSON.stringify({ status: "webhook_processing_failed" }));
    return NextResponse.json({ error: "Webhook processing failed." }, { status: 500 });
  }
}
