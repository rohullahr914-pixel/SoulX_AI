import 'server-only';
import { query, transaction } from './db';
import { getPersonaBySlug } from '@/lib/personas';

export async function ensureSystemPersona(slug: string) {
  const p = getPersonaBySlug(slug);
  if (p) await query(`INSERT INTO personas(slug,name,description,avatar,visibility,challenge_enabled) VALUES($1,$2,$3,$4,'Public',true) ON CONFLICT DO NOTHING`, [p.slug,p.name,p.description,p.avatar]);
}

export async function trackConversation(userId: string, slug: string, conversationId: string) {
  await ensureSystemPersona(slug);
  await transaction(async client => {
    // Lock per account to enforce a daily engagement cap even under concurrent requests.
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))',[userId]);
    await client.query(`INSERT INTO persona_activity(user_id,persona_slug,conversation_id)
      SELECT $1,$2,$3 WHERE EXISTS(SELECT 1 FROM personas WHERE slug=$2 AND visibility='Public' AND creator_id IS DISTINCT FROM $1::uuid)
      AND (SELECT count(*) FROM persona_activity WHERE user_id=$1 AND created_at>now()-interval '1 day')<100 ON CONFLICT DO NOTHING`,[userId,slug,conversationId]);
  });
}

export async function recordChat(userId: string, personaId: string, conversationId: string, userMessage: string, assistantMessage: string, provider = "groq", model = "") {
  const { query: run } = await import("./db");
  await run(`INSERT INTO conversations(id,user_id,persona_id,title,updated_at) VALUES($1,$2,$3,$4,now()) ON CONFLICT(id) DO UPDATE SET updated_at=now()`, [conversationId, userId, personaId, userMessage.slice(0, 240)]);
  await run(`INSERT INTO messages(conversation_id,user_id,role,content,model_provider,model_name) VALUES($1,$2,'user',$3,$4,$5),($1,$2,'assistant',$6,$4,$5)`, [conversationId, userId, userMessage, provider, model, assistantMessage]);
}

export const weekSQL = `to_char(date_trunc('week',now() AT TIME ZONE 'UTC'),'YYYY-MM-DD')`;
export const personaColumns = `p.slug,p.name,p.description,p.avatar,p.creator_id,pr.username,
 COALESCE(s.unique_users,0)::int unique_users,COALESCE(s.conversations,0)::int conversations,
 (SELECT count(*)::int FROM persona_likes WHERE persona_slug=p.slug) likes,
 (SELECT count(*)::int FROM persona_follows WHERE persona_slug=p.slug) followers,
 COALESCE(s.rating,0)::float rating,COALESCE(s.trending_score,0)::float trending_score,
 (SELECT rank::int FROM leaderboard_stats WHERE kind='persona' AND entity_id=p.slug AND period='all') all_rank,
 (SELECT rank::int FROM leaderboard_stats WHERE kind='persona' AND entity_id=p.slug AND period=${weekSQL}) weekly_rank`;
export const personaJoins = `FROM personas p LEFT JOIN profiles pr ON pr.user_id=p.creator_id AND pr.profile_visibility='Public' LEFT JOIN persona_stats s ON s.persona_slug=p.slug`;

export function assertOrigin(request: Request) {
  const origin = request.headers.get('origin');
  if (!origin) return;
  const requestOrigin = new URL(request.url).origin;
  const configuredOrigins = [
    requestOrigin,
    'https://soulxai.tech',
    process.env.FRONTEND_ORIGIN,
    process.env.NEXT_PUBLIC_SITE_URL,
  ].flatMap((value) => value?.split(',').map((item) => item.trim()).filter(Boolean) ?? []);
  const isLocalhost = /^https?:\/\/localhost(?::\d+)?$/.test(origin) || /^https?:\/\/127\.0\.0\.1(?::\d+)?$/.test(origin);
  if (!configuredOrigins.includes(origin) && !isLocalhost) throw new Error('Invalid request origin.');
}
export function clean(value: unknown, max: number) { return typeof value === 'string' ? value.trim().slice(0,max) : ''; }
export function uuid(value: unknown) { return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value); }
