"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Clock3, ExternalLink, LoaderCircle, RefreshCw, ShieldCheck, XCircle } from "lucide-react";
import { AdminShell } from "@/components/admin/admin-shell";

type PaymentRequest = {
  id: string;
  user_id: string;
  user_email: string | null;
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
  verification_error: string | null;
  admin_note: string | null;
};

export default function AdminPaymentsPage() {
  const [requests, setRequests] = useState<PaymentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/payments", { cache: "no-store" });
      const body = await response.json().catch(() => ({})) as { paymentRequests?: PaymentRequest[]; error?: string };
      if (!response.ok) throw new Error(body.error || "Payment requests are unavailable.");
      setRequests(body.paymentRequests ?? []);
      setError("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Payment requests are unavailable.");
    } finally {
      setLoading(false);
    }
  };

  // The network response updates this page after the initial render.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, []);

  const action = async (item: PaymentRequest, operation: "verify" | "approve" | "reject") => {
    if (operation === "approve" && !window.confirm(`Activate ${item.plan.toUpperCase()} for ${item.user_email || item.user_id}?`)) return;
    const note = operation === "reject" ? window.prompt("Optional note for this rejection", "") : null;
    if (operation === "reject" && note === null) return;
    setBusyId(item.id);
    setNotice("");
    try {
      const response = await fetch(`/api/admin/payments/${encodeURIComponent(item.id)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: operation, ...(operation === "reject" ? { note } : {}) }),
      });
      const body = await response.json().catch(() => ({})) as { result?: string; error?: string };
      if (!response.ok) throw new Error(body.error || actionMessage(body.result) || "Could not update this payment.");
      setNotice(actionMessage(body.result) || "Payment updated.");
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not update this payment.");
    } finally {
      setBusyId("");
    }
  };

  return <AdminShell title="Payments"><div className="flex justify-end"><button type="button" onClick={() => void load()} disabled={loading} className="social-button"><RefreshCw size={14} className={loading ? "animate-spin" : ""}/>Refresh</button></div>
    {error && <p role="alert" className="mt-4 rounded-xl border border-rose-300/20 bg-rose-400/10 p-3 text-sm text-rose-200">{error}</p>}
    {notice && <p role="status" className="mt-4 rounded-xl border border-emerald-300/20 bg-emerald-400/10 p-3 text-sm text-emerald-100">{notice}</p>}
    {loading && requests.length === 0 ? <div className="social-card mt-5 flex items-center justify-center gap-3 p-10 text-slate-400"><LoaderCircle size={18} className="animate-spin"/>Loading payments…</div>
      : requests.length === 0 ? <div className="social-card mt-5 p-10 text-center text-slate-400">No payment requests yet.</div>
        : <div className="mt-5 grid gap-4">{requests.map((item) => {
          const terminal = ["approved", "rejected", "expired"].includes(item.status);
          const busy = busyId === item.id;
          return <article key={item.id} className="rounded-[26px] border border-white/10 bg-slate-950/70 p-4 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0"><p className="break-all text-sm font-semibold text-white">{item.user_email || item.user_id}</p><p className="mt-1 text-xs text-slate-500">{item.plan.toUpperCase()} · {formatAmount(item.amount_usdt)} {item.coin} · {item.network} · Created {formatDate(item.created_at)}</p></div>
              <StatusPill status={item.status}/>
            </div>
            <div className="mt-4 grid gap-3 rounded-2xl border border-white/8 bg-black/15 p-3 text-xs sm:grid-cols-2 lg:grid-cols-4">
              <Info label="Transaction ID" value={item.tx_id || "Not submitted"} mono/>
              <Info label="Verified amount" value={item.binance_amount == null ? "—" : `${formatAmount(item.binance_amount)} ${item.coin}`}/>
              <Info label="Verification status" value={item.verification_error || (item.verified_at ? "Verified by Binance" : "Not verified")}/>
              <Info label="Deposit time" value={item.binance_deposit_time ? formatDate(item.binance_deposit_time) : "—"}/>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {item.tx_id && !terminal && <button type="button" disabled={busy} onClick={() => void action(item, "verify")} className="social-button min-h-10 text-xs disabled:opacity-50"><RefreshCw size={13} className={busy ? "animate-spin" : ""}/>Verify again</button>}
              {item.status === "verified_pending_approval" && <button type="button" disabled={busy} onClick={() => void action(item, "approve")} className="social-button primary min-h-10 text-xs disabled:opacity-50"><CheckCircle2 size={14}/>Approve & activate</button>}
              {!terminal && <button type="button" disabled={busy} onClick={() => void action(item, "reject")} className="social-button min-h-10 text-xs text-rose-200 disabled:opacity-50"><XCircle size={14}/>Reject</button>}
              {busy && <span className="inline-flex items-center gap-2 px-2 text-xs text-slate-400"><LoaderCircle size={13} className="animate-spin"/>Saving</span>}
            </div>
            <details className="mt-4 border-t border-white/8 pt-3 text-xs text-slate-400">
              <summary className="flex cursor-pointer list-none items-center gap-2 hover:text-white"><ExternalLink size={13}/>View details</summary>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <Info label="Request ID" value={item.id} mono/><Info label="User ID" value={item.user_id} mono/>
                <Info label="Deposit address" value={item.deposit_address} mono/><Info label="Expires" value={formatDate(item.expires_at)}/>
                {item.approved_at && <Info label="Approved" value={formatDate(item.approved_at)}/>} {item.admin_note && <Info label="Admin note" value={item.admin_note}/>}
              </div>
            </details>
          </article>;
        })}</div>}
  </AdminShell>;
}

function Info({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return <div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</p><p className={`mt-1 break-all text-slate-200 ${mono ? "font-mono" : ""}`}>{value}</p></div>;
}
function StatusPill({ status }: { status: string }) {
  const approved = status === "approved";
  const waiting = status === "verified_pending_approval";
  return <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider ${approved ? "border-emerald-300/20 bg-emerald-400/10 text-emerald-200" : waiting ? "border-cyan-300/20 bg-cyan-400/10 text-cyan-100" : "border-white/10 bg-white/[.03] text-slate-300"}`}>
    {approved ? <CheckCircle2 size={12}/> : waiting ? <ShieldCheck size={12}/> : <Clock3 size={12}/>} {status.replaceAll("_", " ")}
  </span>;
}
function formatAmount(value: number | string) { const amount = Number(value); return Number.isFinite(amount) ? amount.toLocaleString(undefined, { maximumFractionDigits: 8 }) : String(value); }
function formatDate(value: string) { const date = new Date(value); return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString(); }
function actionMessage(result?: string) {
  const messages: Record<string, string> = {
    approved: "Payment approved and subscription activated.", already_approved: "This payment was already approved.",
    rejected: "Payment rejected.", already_rejected: "This payment was already rejected.",
    payment_found: "Binance found the deposit. It is waiting for approval.", already_verified: "Binance already verified this payment.",
    not_found: "Deposit not found yet.", wrong_network: "The deposit used a different network.", incorrect_amount: "The received amount is below the plan price.",
    transaction_already_used: "This transaction ID is already attached to another request.", invalid_transaction: "Binance could not verify this transaction.",
  };
  return result ? messages[result] : undefined;
}
