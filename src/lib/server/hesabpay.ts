import "server-only";

import { randomUUID } from "node:crypto";
import { supabaseAdmin } from "@/lib/server/db";

export const HESABPAY_PROVIDER = "hesabpay";
export const PAYMENT_STATUSES = ["pending", "paid", "failed", "cancelled", "expired"] as const;

export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];
export type CheckoutPlan = "pro";

type HesabPaySessionResponse = {
  success?: boolean;
  status_code?: number;
  message?: string;
  detail?: string;
  url?: string;
};

export type HesabPayWebhook = {
  status_code?: number;
  success?: boolean;
  message?: string;
  transaction_id?: string;
  user_id?: string;
  amount?: number | string;
  signature?: string;
  timestamp?: number | string;
};

export class PaymentConfigurationError extends Error {}
export class PaymentProviderError extends Error {
  constructor(message: string, public readonly status?: number) {
    super(message);
  }
}

function requireAdminClient() {
  if (!supabaseAdmin) throw new PaymentConfigurationError("Payment storage is not configured.");
  return supabaseAdmin;
}

function apiBaseUrl() {
  const raw = process.env.HESABPAY_API_URL?.trim() || "https://api.hesab.com";
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new PaymentConfigurationError("HESABPAY_API_URL is invalid.");
  }
  if (url.protocol !== "https:") throw new PaymentConfigurationError("HESABPAY_API_URL must use HTTPS.");
  return url.toString().replace(/\/$/, "");
}

function apiKey() {
  const value = process.env.HESABPAY_API_KEY?.trim();
  if (!value) throw new PaymentConfigurationError("HesabPay is not configured.");
  return value;
}

function paymentCurrency() {
  const value = (process.env.HESABPAY_CURRENCY?.trim() || "USD").toUpperCase();
  if (!/^[A-Z]{3,8}$/.test(value)) throw new PaymentConfigurationError("HESABPAY_CURRENCY is invalid.");
  return value;
}

function numberSetting(value: unknown, fallback: number) {
  const parsed = typeof value === "number" ? value : Number(String(value ?? "").replaceAll('"', ""));
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed * 100) / 100 : fallback;
}

export async function getCheckoutPlan(plan: unknown) {
  if (plan !== "pro") throw new PaymentProviderError("That plan is not available for checkout.", 400);
  const admin = requireAdminClient();
  const setting = await admin.from("admin_settings").select("value").eq("key", "pro_price").maybeSingle();
  if (setting.error) throw setting.error;
  return {
    plan: "pro" as const,
    name: "SoulX Pro — 1 month",
    amount: numberSetting(setting.data?.value, 5),
    currency: paymentCurrency(),
    billingPeriodMonths: 1,
  };
}

export async function createPendingPayment(userId: string, plan: Awaited<ReturnType<typeof getCheckoutPlan>>) {
  const admin = requireAdminClient();
  const id = randomUUID();
  const created = await admin.from("payments").insert({
    id,
    user_id: userId,
    provider: HESABPAY_PROVIDER,
    transaction_id: null,
    plan: plan.plan,
    amount: plan.amount,
    currency: plan.currency,
    status: "pending",
    billing_period_months: plan.billingPeriodMonths,
  });
  if (created.error) throw created.error;
  return id;
}

export async function markPaymentSessionFailed(paymentId: string, reason: string) {
  const admin = requireAdminClient();
  const result = await admin
    .from("payments")
    .update({ status: "failed", failure_reason: reason.slice(0, 240), updated_at: new Date().toISOString() })
    .eq("id", paymentId)
    .eq("status", "pending");
  if (result.error) console.warn("[payments]", JSON.stringify({ paymentId, status: "session_failure_write_failed" }));
}

async function hesabPayRequest(path: string, body: Record<string, unknown>) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
  try {
    const response = await fetch(`${apiBaseUrl()}${path}`, {
      method: "POST",
      headers: {
        Authorization: `API-KEY ${apiKey()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: controller.signal,
    });
    const data = (await response.json().catch(() => ({}))) as HesabPaySessionResponse;
    if (!response.ok) {
      const message = response.status === 401 || response.status === 403
        ? "The payment provider rejected the merchant credentials."
        : response.status === 429
          ? "The payment provider is busy. Please try again shortly."
          : response.status >= 500
            ? "The payment provider is temporarily unavailable."
            : data.message || data.detail || "The payment request was rejected.";
      throw new PaymentProviderError(message, response.status);
    }
    return data;
  } catch (error) {
    if (error instanceof PaymentProviderError || error instanceof PaymentConfigurationError) throw error;
    if (controller.signal.aborted) throw new PaymentProviderError("The payment provider timed out. Please try again.", 504);
    throw new PaymentProviderError("The payment provider could not be reached.", 502);
  } finally {
    clearTimeout(timeout);
  }
}

export async function createHesabPaySession(input: {
  paymentId: string;
  email: string;
  plan: Awaited<ReturnType<typeof getCheckoutPlan>>;
  siteOrigin: string;
}) {
  const successUrl = new URL(`/payment/status/${input.paymentId}`, input.siteOrigin);
  successUrl.searchParams.set("return", "success");
  const failureUrl = new URL(`/payment/status/${input.paymentId}`, input.siteOrigin);
  failureUrl.searchParams.set("return", "failure");

  const response = await hesabPayRequest("/api/v1/payment/create-session", {
    email: input.email,
    user_id: input.paymentId,
    items: [{ id: `soulx-${input.plan.plan}-monthly`, name: input.plan.name, price: input.plan.amount }],
    redirect_success_url: successUrl.toString(),
    redirect_failure_url: failureUrl.toString(),
  });

  if (response.success !== true || response.status_code !== 10 || typeof response.url !== "string") {
    throw new PaymentProviderError(response.message || "HesabPay did not create a checkout session.", 502);
  }
  const checkoutUrl = new URL(response.url);
  if (checkoutUrl.protocol !== "https:") throw new PaymentProviderError("HesabPay returned an invalid checkout URL.", 502);
  return checkoutUrl.toString();
}

export async function verifyHesabPaySignature(signature: string, timestamp: string) {
  const response = await hesabPayRequest("/api/v1/hesab/webhooks/verify-signature", { signature, timestamp });
  return response.success === true;
}

export function parseHesabPayWebhook(value: unknown): HesabPayWebhook | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const body = value as HesabPayWebhook;
  const signature = String(body.signature ?? "").trim();
  const timestamp = String(body.timestamp ?? "").trim();
  const paymentId = String(body.user_id ?? "").trim();
  if (!signature || signature.length > 2048 || !timestamp || timestamp.length > 80) return null;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(paymentId)) return null;
  if (typeof body.success !== "boolean") return null;
  return { ...body, signature, timestamp, user_id: paymentId };
}

export function webhookAmount(value: number | string | undefined) {
  const amount = typeof value === "number" ? value : Number(value);
  return Number.isFinite(amount) && amount >= 0 ? Math.round(amount * 100) / 100 : null;
}

export function paymentSiteOrigin(requestUrl: string) {
  const requestOrigin = new URL(requestUrl).origin;
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!configured) return requestOrigin;
  const url = new URL(configured);
  if (process.env.NODE_ENV === "production" && url.protocol !== "https:") {
    throw new PaymentConfigurationError("NEXT_PUBLIC_SITE_URL must use HTTPS in production.");
  }
  return url.origin;
}
