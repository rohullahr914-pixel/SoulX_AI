import "server-only";
import { query } from "@/lib/server/db";
import type { AIProvider, AIUsage } from "@/lib/ai/provider";

// Reservations continue to enforce existing daily/monthly limits before generation.
// Successful responses move that single reservation to the provider that answered.
export const AI_RESERVATION_PROVIDER = "ai-pending";

export async function recordAIUsage(userId: string, reservationDate: string, result: { provider: AIProvider; usage?: AIUsage }, estimatedTokens: number) {
  const tokens = result.usage?.totalTokens ?? estimatedTokens;
  await query(`
    DO $ai_usage$
    BEGIN
      UPDATE usage SET messages_used=messages_used-1,updated_at=now()
      WHERE user_id=$1 AND date=$2::date AND provider=$3 AND messages_used>0;
    IF FOUND THEN
    INSERT INTO usage(user_id,date,provider,messages_used,tokens_used,estimated_cost,updated_at)
    VALUES($1,$2::date,$4,1,$5,$6,now())
    ON CONFLICT(user_id,date,provider) DO UPDATE SET
      messages_used=usage.messages_used+1,
      tokens_used=usage.tokens_used+EXCLUDED.tokens_used,
      estimated_cost=usage.estimated_cost+EXCLUDED.estimated_cost,
      updated_at=now();
    END IF;
    END;
    $ai_usage$;
  `, [userId, reservationDate, AI_RESERVATION_PROVIDER, result.provider, tokens, tokens * 0.000001]);
}
