import { NextResponse } from "next/server";
import { requireUser } from "@/lib/server/auth";
import { supabaseAdmin } from "@/lib/server/db";

type PaidPlan = "pro" | "ultra";
const selectFields = "id,plan,amount_usdt,coin,network,deposit_address,tx_id,status,created_at,submitted_at,verified_at,approved_at,expires_at,binance_deposit_time,binance_amount";

export async function GET() {
  try {
    const user = await requireUser();
    if (!supabaseAdmin) throw new Error("storage");
    const result = await supabaseAdmin.from("payment_requests").select(selectFields).eq("user_id", user.id).order("created_at", { ascending: false }).limit(25);
    if (result.error) throw result.error;
    return NextResponse.json({ paymentRequests: result.data ?? [] }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if ((error as Error).message === "UNAUTHORIZED") return NextResponse.json({ error: "Sign in to view payment requests." }, { status: 401 });
    return NextResponse.json({ error: "Could not load payment requests." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const origin = request.headers.get("origin");
    if (origin && origin !== new URL(request.url).origin) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
    const body = await request.json().catch(() => ({})) as { plan?: unknown };
    if (body.plan !== "pro" && body.plan !== "ultra") return NextResponse.json({ error: "Choose a valid plan." }, { status: 400 });
    const plan: PaidPlan = body.plan;
    const coin = (process.env.BINANCE_PAYMENT_COIN?.trim() || "USDT").toUpperCase();
    const network = (process.env.BINANCE_PAYMENT_NETWORK?.trim() || "TRX").toUpperCase();
    const address = process.env.BINANCE_USDT_DEPOSIT_ADDRESS?.trim();
    if (!supabaseAdmin || coin !== "USDT" || !/^[A-Z0-9_-]{2,32}$/.test(network) || !address
      || !process.env.BINANCE_API_KEY?.trim() || !process.env.BINANCE_API_SECRET?.trim()) {
      return NextResponse.json({ error: "USDT payments are temporarily unavailable." }, { status: 503 });
    }

    const active = await supabaseAdmin.from("payment_requests").select("id", { count: "exact", head: true })
      .eq("user_id", user.id).in("status", ["pending", "submitted", "verifying", "verified_pending_approval"]);
    if (active.error) throw active.error;
    if ((active.count ?? 0) >= 5) return NextResponse.json({ error: "You already have several open payment requests. Check your payment history or contact support." }, { status: 429 });

    const priceKey = plan === "pro" ? "pro_price" : "ultra_price";
    const setting = await supabaseAdmin.from("admin_settings").select("value").eq("key", priceKey).maybeSingle();
    if (setting.error) throw setting.error;
    const amount = String(setting.data?.value ?? (plan === "pro" ? 5 : 10)).replaceAll('"', "");
    const numericAmount = Number(amount);
    if (!/^\d+(?:\.\d{1,8})?$/.test(amount) || !Number.isFinite(numericAmount) || numericAmount <= 0 || numericAmount > 1_000_000) {
      return NextResponse.json({ error: `${plan === "pro" ? "Pro" : "Ultra"} checkout is not available yet.` }, { status: 409 });
    }

    const created = await supabaseAdmin.from("payment_requests").insert({
      user_id: user.id,
      user_email: user.email || null,
      plan,
      amount_usdt: amount,
      coin,
      network,
      deposit_address: address,
      status: "pending",
    }).select(selectFields).single();
    if (created.error) throw created.error;
    return NextResponse.json({ paymentRequest: created.data }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if ((error as Error).message === "UNAUTHORIZED") return NextResponse.json({ error: "Sign in to continue to payment." }, { status: 401 });
    return NextResponse.json({ error: "Could not start the payment. Please try again shortly." }, { status: 503 });
  }
}
