import "server-only";
import { BinanceApiError, verifyBinanceDeposit, type BinanceDeposit } from "@/lib/binance/server";
import { supabaseAdmin } from "@/lib/server/db";

const txIdPattern = /^[a-zA-Z0-9:_-]{8,160}$/;
const requestIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type PaymentRequest = {
  id: string;
  user_id: string;
  plan: "pro" | "ultra";
  amount_usdt: string | number;
  coin: string;
  network: string;
  deposit_address: string;
  tx_id: string | null;
  status: string;
  created_at: string;
  expires_at: string;
};

export type VerificationResult =
  | "payment_found"
  | "not_found"
  | "invalid_transaction"
  | "wrong_network"
  | "incorrect_amount"
  | "transaction_already_used"
  | "transaction_id_locked"
  | "rate_limited"
  | "already_verifying"
  | "already_verified"
  | "rejected"
  | "approved"
  | "expired"
  | "not_found_request"
  | "verification_unavailable"
  | "configuration_unavailable";

export function isValidTransactionId(txId: string) { return txIdPattern.test(txId); }
export function isValidPaymentRequestId(id: string) { return requestIdPattern.test(id); }

export async function verifyPaymentRequest(input: { requestId: string; txId: string; ownerId?: string }): Promise<VerificationResult> {
  if (!supabaseAdmin) return "configuration_unavailable";
  const expectedCoin = (process.env.BINANCE_PAYMENT_COIN?.trim() || "USDT").toUpperCase();
  const expectedNetwork = (process.env.BINANCE_PAYMENT_NETWORK?.trim() || "TRX").toUpperCase();
  const expectedAddress = process.env.BINANCE_USDT_DEPOSIT_ADDRESS?.trim();
  if (expectedCoin !== "USDT" || !/^[A-Z0-9_-]{2,32}$/.test(expectedNetwork) || !expectedAddress) return "configuration_unavailable";

  let requestQuery = supabaseAdmin.from("payment_requests").select("id,user_id,plan,amount_usdt,coin,network,deposit_address,tx_id,status,created_at,expires_at").eq("id", input.requestId);
  if (input.ownerId) requestQuery = requestQuery.eq("user_id", input.ownerId);
  const loaded = await requestQuery.maybeSingle();
  if (loaded.error) throw loaded.error;
  const payment = loaded.data as PaymentRequest | null;
  if (!payment) return "not_found_request";
  if (payment.status === "approved") return "approved";
  if (payment.status === "rejected") return "rejected";
  if (payment.status === "expired" || new Date(payment.expires_at).getTime() <= Date.now()) {
    if (payment.status !== "expired") await supabaseAdmin.from("payment_requests").update({ status: "expired", updated_at: new Date().toISOString() }).eq("id", payment.id).in("status", ["pending", "submitted", "verifying"]);
    return "expired";
  }
  if (payment.status === "verified_pending_approval") return "already_verified";
  if (payment.tx_id && payment.tx_id.toLowerCase() !== input.txId.toLowerCase()) return "transaction_id_locked";
  if (payment.coin.toUpperCase() !== expectedCoin || payment.network.toUpperCase() !== expectedNetwork || payment.deposit_address !== expectedAddress) {
    return "configuration_unavailable";
  }

  const claim = await supabaseAdmin.rpc("claim_payment_verification", {
    p_request_id: payment.id,
    p_user_id: payment.user_id,
    p_tx_id: input.txId,
  });
  if (claim.error) throw claim.error;
  const claimRow = Array.isArray(claim.data) ? claim.data[0] as { claimed?: boolean; reason?: string } | undefined : claim.data as { claimed?: boolean; reason?: string } | null;
  if (!claimRow?.claimed) return claimResult(claimRow?.reason);

  const createdAt = new Date(payment.created_at).getTime();
  const now = Date.now();
  let checked: Awaited<ReturnType<typeof verifyBinanceDeposit>>;
  try {
    checked = await verifyBinanceDeposit({
      txId: input.txId,
      expectedCoin,
      expectedNetwork,
      expectedAmount: String(payment.amount_usdt),
      expectedAddress,
      notBefore: createdAt,
      notAfter: now,
    });
  } catch (error) {
    if (!(error instanceof BinanceApiError)) throw error;
    await saveVerification(payment.id, { status: "submitted", verification_error: "verification_unavailable" });
    return "verification_unavailable";
  }

  if (!checked.ok) return fail(payment.id, checked.reason, checked.deposit);
  const matchingAddress = checked.deposit;
  if (!matchingAddress) return fail(payment.id, "invalid_transaction");
  const depositTime = Number(matchingAddress.insertTime);

  const saved = await supabaseAdmin.from("payment_requests").update({
    status: "verified_pending_approval",
    verified_at: new Date().toISOString(),
    binance_deposit_time: new Date(depositTime).toISOString(),
    binance_amount: matchingAddress.amount,
    verification_error: null,
    updated_at: new Date().toISOString(),
  }).eq("id", payment.id).eq("status", "verifying").select("id").maybeSingle();
  if (saved.error) throw saved.error;
  return saved.data ? "payment_found" : await latestResult(payment.id);
}

async function fail(paymentId: string, result: "not_found" | "invalid_transaction" | "wrong_network" | "incorrect_amount", deposit?: BinanceDeposit): Promise<VerificationResult> {
  const amount = deposit ? Number(deposit.amount) : null;
  const insertTime = deposit ? Number(deposit.insertTime) : null;
  const extra = {
    ...(Number.isFinite(amount) && amount !== null ? { binance_amount: amount } : {}),
    ...(Number.isFinite(insertTime) && insertTime !== null ? { binance_deposit_time: new Date(insertTime).toISOString() } : {}),
  };
  await saveVerification(paymentId, { status: "submitted", verification_error: result, ...extra });
  return result;
}

async function saveVerification(paymentId: string, values: Record<string, unknown>) {
  if (!supabaseAdmin) throw new Error("Payment storage is unavailable.");
  const result = await supabaseAdmin.from("payment_requests").update({ ...values, updated_at: new Date().toISOString() }).eq("id", paymentId).eq("status", "verifying");
  if (result.error) throw result.error;
}

async function latestResult(paymentId: string): Promise<VerificationResult> {
  if (!supabaseAdmin) return "verification_unavailable";
  const result = await supabaseAdmin.from("payment_requests").select("status").eq("id", paymentId).maybeSingle();
  if (result.data?.status === "approved") return "approved";
  if (result.data?.status === "rejected") return "rejected";
  if (result.data?.status === "verified_pending_approval") return "already_verified";
  return "verification_unavailable";
}

function claimResult(reason?: string): VerificationResult {
  if (reason === "transaction_already_used") return "transaction_already_used";
  if (reason === "transaction_id_locked") return "transaction_id_locked";
  if (reason === "rate_limited") return "rate_limited";
  if (reason === "already_verifying") return "already_verifying";
  if (reason === "already_verified") return "already_verified";
  if (reason === "approved") return "approved";
  if (reason === "rejected") return "rejected";
  if (reason === "expired") return "expired";
  return "not_found_request";
}

