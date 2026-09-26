import { NextResponse } from "next/server";
import { requireUser } from "@/lib/server/auth";
import {
  createHesabPaySession,
  createPendingPayment,
  getCheckoutPlan,
  markPaymentSessionFailed,
  paymentSiteOrigin,
  PaymentConfigurationError,
  PaymentProviderError,
} from "@/lib/server/hesabpay";

export async function POST(request: Request) {
  let paymentId: string | null = null;
  try {
    const user = await requireUser();
    const body = (await request.json().catch(() => ({}))) as { plan?: unknown };
    const plan = await getCheckoutPlan(body.plan);
    paymentId = await createPendingPayment(user.id, plan);
    const checkoutUrl = await createHesabPaySession({
      paymentId,
      email: user.email,
      plan,
      siteOrigin: paymentSiteOrigin(request.url),
    });
    return NextResponse.json({ paymentId, checkoutUrl }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (paymentId) await markPaymentSessionFailed(paymentId, error instanceof Error ? error.message : "session_creation_failed");
    if ((error as Error).message === "UNAUTHORIZED") return NextResponse.json({ error: "Log in to continue to payment." }, { status: 401 });
    if (error instanceof PaymentProviderError) {
      console.warn("[payments]", JSON.stringify({ paymentId, status: "provider_error", providerStatus: error.status ?? null }));
      return NextResponse.json({ error: error.message }, { status: error.status === 400 ? 400 : 502 });
    }
    if (error instanceof PaymentConfigurationError) {
      console.error("[payments]", JSON.stringify({ paymentId, status: "configuration_error" }));
      return NextResponse.json({ error: "Payments are temporarily unavailable." }, { status: 503 });
    }
    console.error("[payments]", JSON.stringify({ paymentId, status: "checkout_failed" }));
    return NextResponse.json({ error: "Could not start the payment. Please try again." }, { status: 500 });
  }
}
