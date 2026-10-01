import { NextResponse } from "next/server";
import { requireUser } from "@/lib/server/auth";
import { isValidPaymentRequestId, isValidTransactionId, verifyPaymentRequest } from "@/lib/server/binance-payment-verification";

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const origin = request.headers.get("origin");
    if (origin && origin !== new URL(request.url).origin) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
    const body = await request.json().catch(() => ({})) as { paymentRequestId?: unknown; txId?: unknown };
    if (typeof body.paymentRequestId !== "string" || !isValidPaymentRequestId(body.paymentRequestId)
      || typeof body.txId !== "string" || !isValidTransactionId(body.txId.trim())) {
      return NextResponse.json({ result: "invalid_transaction", message: "Enter a valid transaction ID." }, { status: 400 });
    }
    const result = await verifyPaymentRequest({ requestId: body.paymentRequestId, txId: body.txId.trim(), ownerId: user.id });
    const status = result === "not_found_request" ? 404
      : result === "rate_limited" ? 429
        : result === "configuration_unavailable" || result === "verification_unavailable" ? 503
          : result === "transaction_id_locked" || result === "already_verifying" ? 409 : 200;
    return NextResponse.json({ result, message: messageFor(result) }, { status, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if ((error as Error).message === "UNAUTHORIZED") return NextResponse.json({ error: "Sign in to verify your payment." }, { status: 401 });
    return NextResponse.json({ result: "verification_unavailable", message: "We couldn’t check this payment right now. Please try again shortly." }, { status: 503 });
  }
}

function messageFor(result: string) {
  switch (result) {
    case "payment_found":
    case "already_verified": return "Payment found. It is waiting for admin approval.";
    case "not_found": return "Payment not found yet. Check again after the deposit is credited.";
    case "wrong_network": return "Wrong network. Send USDT using the network shown in your payment instructions.";
    case "incorrect_amount": return "The credited amount is below the amount required for this plan.";
    case "transaction_already_used": return "This transaction ID has already been used for a payment request.";
    case "invalid_transaction": return "This transaction could not be verified. Check the transaction ID and deposit details.";
    case "transaction_id_locked": return "This request already has a transaction ID. Continue with that transaction or contact support.";
    case "rate_limited": return "Please wait a little before checking this payment again.";
    case "already_verifying": return "This payment is already being checked.";
    case "approved": return "This payment has already been approved.";
    case "rejected": return "This payment request was rejected. Contact support if you need help.";
    case "expired": return "This payment request has expired. Start a new request from the pricing page.";
    default: return "We couldn’t check this payment right now. Please try again shortly.";
  }
}
