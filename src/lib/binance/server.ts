import "server-only";
import { createHmac } from "node:crypto";

const depositHistoryUrl = "https://api.binance.com/sapi/v1/capital/deposit/hisrec";
let cachedTimeOffset = 0;
let timeOffsetUpdatedAt = 0;

export type BinanceDeposit = {
  coin: string;
  network: string;
  amount: string;
  address: string;
  txId: string;
  status: number | string;
  insertTime: number | string;
};

export type BinanceVerification =
  | { ok: true; reason: "verified"; deposit: BinanceDeposit }
  | { ok: false; reason: "not_found" | "invalid_transaction" | "wrong_network" | "incorrect_amount"; deposit?: BinanceDeposit };

export class BinanceApiError extends Error {
  constructor() { super("Binance deposit history is temporarily unavailable."); }
}

export async function getBinanceDepositHistory(input: { txId: string; startTime: number; endTime?: number }): Promise<BinanceDeposit[]> {
  const apiKey = process.env.BINANCE_API_KEY?.trim();
  const apiSecret = process.env.BINANCE_API_SECRET?.trim();
  if (!apiKey || !apiSecret) throw new BinanceApiError();

  const timeOffset = await getBinanceTimeOffset();
  const serverNow = Date.now() + timeOffset;
  const params = new URLSearchParams({
    txId: input.txId,
    startTime: String(input.startTime),
    endTime: String(input.endTime ?? serverNow),
    limit: "1000",
    recvWindow: "5000",
    timestamp: String(serverNow),
  });
  const signature = createHmac("sha256", apiSecret).update(params.toString()).digest("hex");

  let response: Response;
  try {
    response = await fetch(`${depositHistoryUrl}?${params.toString()}&signature=${signature}`, {
      method: "GET",
      headers: { "X-MBX-APIKEY": apiKey, Accept: "application/json" },
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    throw new BinanceApiError();
  }
  if (!response.ok) throw new BinanceApiError();

  const body: unknown = await response.json().catch(() => null);
  if (!Array.isArray(body)) throw new BinanceApiError();
  return body.filter(isDeposit);
}

async function getBinanceTimeOffset() {
  if (Date.now() - timeOffsetUpdatedAt < 60_000) return cachedTimeOffset;
  const startedAt = Date.now();
  try {
    const response = await fetch("https://api.binance.com/api/v3/time", {
      cache: "no-store",
      signal: AbortSignal.timeout(3_000),
    });
    const body: unknown = await response.json().catch(() => null);
    if (response.ok && body && typeof body === "object" && "serverTime" in body) {
      const serverTime = Number(body.serverTime);
      if (Number.isFinite(serverTime)) {
        cachedTimeOffset = serverTime - (startedAt + Date.now()) / 2;
        timeOffsetUpdatedAt = Date.now();
      }
    }
  } catch {
    // Continue with the host clock; Binance will reject the signed request if it is too far off.
  }
  return cachedTimeOffset;
}

export async function findDepositByTxId(txId: string, startTime = Date.now() - 90 * 24 * 60 * 60_000) {
  const deposits = await getBinanceDepositHistory({ txId, startTime });
  return deposits.filter((deposit) => deposit.txId.toLowerCase() === txId.toLowerCase());
}

export async function verifyBinanceDeposit(input: {
  txId: string;
  expectedCoin: string;
  expectedNetwork: string;
  expectedAmount: string;
  expectedAddress: string;
  notBefore: number;
  notAfter?: number;
}): Promise<BinanceVerification> {
  const deposits = await findDepositByTxId(input.txId, input.notBefore - 5 * 60_000);
  if (deposits.length === 0) return { ok: false, reason: "not_found" };
  const matchingCoin = deposits.filter((deposit) => deposit.coin.toUpperCase() === input.expectedCoin.toUpperCase());
  if (matchingCoin.length === 0) return { ok: false, reason: "invalid_transaction" };
  const matchingNetwork = matchingCoin.filter((deposit) => deposit.network.toUpperCase() === input.expectedNetwork.toUpperCase());
  if (matchingNetwork.length === 0) return { ok: false, reason: "wrong_network" };
  const deposit = matchingNetwork.find((item) => item.address === input.expectedAddress);
  if (!deposit) return { ok: false, reason: "invalid_transaction" };

  const depositTime = Number(deposit.insertTime);
  if (!Number.isFinite(depositTime) || depositTime < input.notBefore - 5 * 60_000 || depositTime > (input.notAfter ?? Date.now()) + 60_000) {
    return { ok: false, reason: "invalid_transaction", deposit };
  }
  if (Number(deposit.status) !== 1) {
    const reason = Number(deposit.status) === 0 || Number(deposit.status) === 8 ? "not_found" : "invalid_transaction";
    return { ok: false, reason, deposit };
  }
  const comparison = compareDecimal(deposit.amount, input.expectedAmount);
  if (comparison === null) return { ok: false, reason: "invalid_transaction", deposit };
  if (comparison < 0) return { ok: false, reason: "incorrect_amount", deposit };
  return { ok: true, reason: "verified", deposit };
}

function isDeposit(value: unknown): value is BinanceDeposit {
  if (!value || typeof value !== "object") return false;
  const deposit = value as Record<string, unknown>;
  return typeof deposit.coin === "string"
    && typeof deposit.network === "string"
    && (typeof deposit.amount === "string" || typeof deposit.amount === "number")
    && typeof deposit.address === "string"
    && typeof deposit.txId === "string"
    && (typeof deposit.status === "number" || typeof deposit.status === "string")
    && (typeof deposit.insertTime === "number" || typeof deposit.insertTime === "string");
}

function compareDecimal(left: string, right: string): number | null {
  const toUnits = (value: string) => {
    if (!/^\d+(?:\.\d{1,8})?$/.test(value)) return null;
    const [whole, fraction = ""] = value.split(".");
    return { whole: whole.replace(/^0+(?=\d)/, ""), fraction: fraction.padEnd(8, "0") };
  };
  const leftParts = toUnits(left);
  const rightParts = toUnits(right);
  if (!leftParts || !rightParts) return null;
  if (leftParts.whole.length !== rightParts.whole.length) return leftParts.whole.length < rightParts.whole.length ? -1 : 1;
  if (leftParts.whole !== rightParts.whole) return leftParts.whole < rightParts.whole ? -1 : 1;
  return leftParts.fraction < rightParts.fraction ? -1 : leftParts.fraction > rightParts.fraction ? 1 : 0;
}
