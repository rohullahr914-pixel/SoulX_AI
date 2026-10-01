"use client";

import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { AlertCircle, ArrowLeft, Check, CheckCircle2, Clock3, Copy, LoaderCircle, ShieldCheck, Wallet } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

type PaymentRequest = {
  id: string;
  plan: "pro" | "ultra";
  amount_usdt: number | string;
  coin: string;
  network: string;
  deposit_address: string;
  tx_id: string | null;
  status: string;
  created_at: string;
  submitted_at: string | null;
  verified_at: string | null;
  approved_at: string | null;
  expires_at: string;
  binance_deposit_time: string | null;
  binance_amount: number | string | null;
};

type VerificationResponse = { result?: string; message?: string; error?: string };

export function BinancePayment() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const requestId = searchParams.get("paymentRequestId") ?? "";
  const [payment, setPayment] = useState<PaymentRequest | null>(null);
  const [history, setHistory] = useState<PaymentRequest[]>([]);
  const [txId, setTxId] = useState("");
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<"info" | "success" | "error">("info");
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [copied, setCopied] = useState<"address" | "amount" | "">("");

  const load = useCallback(async () => {
    if (!requestId) { setLoading(false); return; }
    const [currentResponse, historyResponse] = await Promise.all([
      fetch(`/api/payments/binance/${encodeURIComponent(requestId)}`, { cache: "no-store", credentials: "same-origin" }),
      fetch("/api/payments/binance", { cache: "no-store", credentials: "same-origin" }),
    ]);
    if (currentResponse.status === 401) { router.push(`/login?next=${encodeURIComponent(`/payment/binance?paymentRequestId=${requestId}`)}`); return; }
    const currentBody = await currentResponse.json().catch(() => ({})) as { paymentRequest?: PaymentRequest; error?: string };
    const historyBody = await historyResponse.json().catch(() => ({})) as { paymentRequests?: PaymentRequest[] };
    if (!currentResponse.ok || !currentBody.paymentRequest) throw new Error(currentBody.error || "Could not load this payment request.");
    setPayment(currentBody.paymentRequest);
    setTxId((existing) => existing || currentBody.paymentRequest?.tx_id || "");
    setHistory(historyBody.paymentRequests ?? []);
    setLoading(false);
    return currentBody.paymentRequest;
  }, [requestId, router]);

  // load() updates state from the async request and the interval subscription.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => {
    let active = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load().catch((error: unknown) => {
      if (!active) return;
      setMessage(error instanceof Error ? error.message : "Could not load this payment request.");
      setMessageTone("error");
      setLoading(false);
    });
    const timer = setInterval(() => { if (active) void load().catch(() => undefined); }, 20_000);
    return () => { active = false; clearInterval(timer); };
  }, [load]);

  const copy = async (value: string, kind: "address" | "amount") => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(kind);
      window.setTimeout(() => setCopied(""), 1500);
    } catch {
      setMessage("Copy was unavailable. Select and copy the value manually.");
      setMessageTone("error");
    }
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!payment || checking) return;
    if (!/^[a-zA-Z0-9:_-]{8,160}$/.test(txId.trim())) {
      setMessage("Enter a valid transaction ID.");
      setMessageTone("error");
      return;
    }
    setChecking(true);
    setMessage("Checking payment…");
    setMessageTone("info");
    try {
      const response = await fetch("/api/payments/binance/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ paymentRequestId: payment.id, txId: txId.trim() }),
      });
      const body = await response.json().catch(() => ({})) as VerificationResponse;
      setMessage(body.message || body.error || "We couldn’t check this payment right now. Please try again shortly.");
      setMessageTone(body.result === "payment_found" || body.result === "already_verified" ? "success" : response.ok ? "info" : "error");
      await load();
    } catch {
      setMessage("We couldn’t check this payment right now. Please try again shortly.");
      setMessageTone("error");
    } finally {
      setChecking(false);
    }
  };

  if (loading) return <main className="social-page flex min-h-[65vh] items-center justify-center"><LoaderCircle className="h-8 w-8 animate-spin text-cyan-300" aria-label="Loading payment" /></main>;
  if (!payment) return <main className="social-page"><section className="social-card mx-auto max-w-2xl p-8 text-center"><AlertCircle className="mx-auto h-9 w-9 text-rose-300"/><h1 className="mt-4 text-2xl font-black text-white">Payment request unavailable</h1><p className="mt-3 text-sm text-slate-400">{message || "Open a payment request from the pricing page, or sign in again."}</p><Link href="/pricing" className="social-button primary mt-6">Return to plans</Link></section></main>;

  const amount = formatAmount(payment.amount_usdt);
  const canSubmit = !["verified_pending_approval", "approved", "rejected", "expired"].includes(payment.status);
  const statusCopy = payment.status === "verified_pending_approval" ? "Payment found · Waiting for admin approval"
    : payment.status === "approved" ? "Payment approved · Your plan is active"
      : payment.status === "rejected" ? "Payment request rejected"
        : payment.status === "expired" ? "Payment request expired"
          : payment.status === "verifying" ? "Checking payment…"
            : payment.status === "submitted" ? "Transaction ID submitted · Awaiting verification"
              : "Waiting for your transfer";

  return (
    <main className="social-page">
      <div className="mx-auto max-w-5xl">
        <Link href="/pricing" className="inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-white"><ArrowLeft size={16}/>Back to plans</Link>
        <header className="mt-6 flex items-center gap-3">
          <img src="/brand/soulx-logo.webp" alt="SoulX" className="h-12 w-12 rounded-2xl" />
          <div><p className="text-xs font-bold uppercase tracking-[.2em] text-cyan-300">SoulX secure checkout</p><h1 className="mt-1 text-3xl font-black tracking-tight text-white sm:text-4xl">Pay with USDT</h1></div>
        </header>

        <div className="mt-7 grid gap-5 lg:grid-cols-[1.15fr_.85fr]">
          <section className="rounded-[30px] border border-white/10 bg-slate-950/75 p-5 shadow-[0_24px_80px_rgba(2,8,23,.35)] sm:p-7">
            <div className="flex items-start justify-between gap-4 border-b border-white/8 pb-5">
              <div><p className="text-xs uppercase tracking-[.18em] text-slate-500">Selected plan</p><h2 className="mt-2 text-2xl font-black text-white">SoulX {capitalize(payment.plan)}</h2><p className="mt-1 text-sm text-slate-400">30-day subscription</p></div>
              <span className="rounded-2xl border border-cyan-300/20 bg-cyan-400/10 px-4 py-3 text-right"><strong className="block text-xl font-black text-cyan-100">{amount} USDT</strong><small className="text-[10px] uppercase tracking-wider text-cyan-200/70">Exact amount</small></span>
            </div>

            <div className="mt-6 flex items-center justify-between gap-4 rounded-2xl border border-white/8 bg-white/[.025] p-4">
              <div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-[.18em] text-slate-500">Network</p><p className="mt-1 font-semibold text-white">{networkName(payment.network)}</p></div>
              <span className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-slate-300">{payment.coin}</span>
            </div>

            <div className="mt-5">
              <div className="mb-2 flex items-center justify-between gap-2"><label htmlFor="deposit-address" className="text-xs font-bold uppercase tracking-[.16em] text-slate-500">Deposit address</label><button type="button" onClick={() => void copy(payment.deposit_address, "address")} className="inline-flex items-center gap-1.5 rounded-full border border-cyan-300/20 px-3 py-1.5 text-xs font-semibold text-cyan-100 hover:bg-cyan-400/10">{copied === "address" ? <Check size={13}/> : <Copy size={13}/>} {copied === "address" ? "Copied" : "Copy address"}</button></div>
              <div id="deposit-address" className="break-all rounded-2xl border border-white/10 bg-black/20 p-4 font-mono text-sm leading-6 text-slate-200">{payment.deposit_address}</div>
            </div>
            <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl border border-white/8 bg-white/[.025] p-4">
              <div><p className="text-[10px] font-bold uppercase tracking-[.16em] text-slate-500">Send exactly</p><p className="mt-1 font-mono text-lg font-bold text-white">{amount} USDT</p></div>
              <button type="button" onClick={() => void copy(amount, "amount")} className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5 text-xs text-slate-300 hover:bg-white/5">{copied === "amount" ? <Check size={13}/> : <Copy size={13}/>} {copied === "amount" ? "Copied" : "Copy amount"}</button>
            </div>

            <div className="mt-5 rounded-2xl border border-amber-200/20 bg-amber-300/[.06] p-4 text-sm leading-6 text-amber-100/90"><p className="font-bold">Only send USDT using the displayed network.</p><p className="mt-1 text-amber-100/70">Using another network may result in permanent loss of funds.</p></div>

            <div className="mt-6">
              <p className="mb-3 text-xs font-bold uppercase tracking-[.16em] text-slate-500">Payment instructions</p>
              <ol className="space-y-2 text-sm leading-6 text-slate-300">
                <li><span className="mr-2 text-cyan-300">01</span>Send exactly <strong className="text-white">{amount} USDT</strong> on <strong className="text-white">{networkName(payment.network)}</strong> to the address above.</li>
                <li><span className="mr-2 text-cyan-300">02</span>Wait for the deposit to appear in Binance, then copy its transaction ID.</li>
                <li><span className="mr-2 text-cyan-300">03</span>Submit the transaction ID below. SoulX checks the Binance deposit record.</li>
              </ol>
            </div>
          </section>

          <aside className="space-y-5">
            <section className="rounded-[30px] border border-white/10 bg-slate-950/75 p-5 sm:p-6">
              <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-cyan-300/20 bg-cyan-400/10 text-cyan-200"><Wallet size={19}/></span><div><h2 className="font-bold text-white">Submit transaction</h2><p className="text-xs text-slate-500">No screenshot needed</p></div></div>
              <form onSubmit={(event) => void submit(event)} className="mt-5">
                <label htmlFor="tx-id" className="mb-2 block text-xs font-semibold text-slate-400">Transaction ID / TxID</label>
                <input id="tx-id" value={txId} onChange={(event) => setTxId(event.target.value)} readOnly={Boolean(payment.tx_id)} autoComplete="off" spellCheck={false} placeholder="Paste your blockchain transaction ID" className="min-h-12 w-full rounded-2xl border border-white/10 bg-black/25 px-4 font-mono text-sm text-white placeholder:text-slate-600 focus:border-cyan-300/40 focus:outline-none read-only:opacity-75" />
                {canSubmit && <button type="submit" disabled={checking || !txId.trim() || payment.status === "verifying"} className="social-button primary mt-3 min-h-12 w-full disabled:cursor-not-allowed disabled:opacity-50">{checking || payment.status === "verifying" ? <><LoaderCircle className="h-4 w-4 animate-spin"/>Checking payment…</> : payment.tx_id ? "Check payment again" : "Submit payment"}</button>}
              </form>
              <div aria-live="polite" className={`mt-4 flex items-start gap-2 rounded-2xl border p-3 text-sm leading-5 ${messageTone === "success" ? "border-emerald-300/20 bg-emerald-400/[.06] text-emerald-100" : messageTone === "error" ? "border-rose-300/20 bg-rose-400/[.06] text-rose-100" : "border-white/8 bg-white/[.025] text-slate-300"}`}>
                {payment.status === "verified_pending_approval" || payment.status === "approved" ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300"/> : <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300"/>}
                <span>{message || statusCopy}</span>
              </div>
              {payment.status === "verified_pending_approval" && <p className="mt-3 flex items-center gap-2 text-xs text-slate-500"><ShieldCheck size={14} className="text-emerald-300"/>Verified with Binance · Admin activation is pending</p>}
              <p className="mt-4 text-center text-[11px] leading-5 text-slate-500">Activation happens after verification and admin review. Your current plan stays unchanged until approval.</p>
            </section>

            <section className="rounded-[26px] border border-white/10 bg-slate-950/60 p-5">
              <div className="flex items-center justify-between gap-3"><h2 className="font-bold text-white">Your payment requests</h2><span className="text-xs text-slate-500">Recent</span></div>
              {history.length === 0 ? <p className="mt-4 text-sm text-slate-500">No previous requests.</p> : <ul className="mt-3 divide-y divide-white/8">{history.map((item) => <li key={item.id}><Link href={`/payment/binance?paymentRequestId=${encodeURIComponent(item.id)}`} className={`flex items-center justify-between gap-3 py-3 text-sm transition hover:text-white ${item.id === payment.id ? "text-white" : "text-slate-400"}`}><span className="min-w-0"><strong className="block">{capitalize(item.plan)} · {formatAmount(item.amount_usdt)} USDT</strong><small className="text-xs text-slate-500">{new Date(item.created_at).toLocaleDateString()}</small></span><span className="shrink-0 text-right text-[10px] uppercase tracking-wide">{item.status.replaceAll("_", " ")}</span></Link></li>)}</ul>}
            </section>
          </aside>
        </div>
        <p className="mt-6 flex items-center justify-center gap-2 text-center text-xs text-slate-500"><ShieldCheck size={14}/>Transaction verification uses SoulX’s server-side Binance read-only API access.</p>
      </div>
    </main>
  );
}

function formatAmount(value: string | number) {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount.toLocaleString(undefined, { maximumFractionDigits: 8 }) : String(value);
}
function capitalize(value: string) { return value.slice(0, 1).toUpperCase() + value.slice(1); }
function networkName(network: string) {
  const names: Record<string, string> = { TRX: "TRON (TRC20)", BSC: "BNB Smart Chain (BEP20)", ETH: "Ethereum (ERC20)" };
  return names[network.toUpperCase()] ?? network;
}
