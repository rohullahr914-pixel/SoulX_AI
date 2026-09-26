import { NextResponse } from "next/server";
import { query } from "@/lib/server/db";
import { requireAdmin } from "@/lib/server/admin";

const attempts = new Map<string, { count: number; at: number }>();
async function admin() { return requireAdmin(); }
function rateLimit(key: string) { const now = Date.now(), old = attempts.get(key); if (!old || now - old.at > 60_000) { attempts.set(key, { count: 1, at: now }); return true; } old.count += 1; return old.count <= 30; }
async function settingNumber(key: string, fallback: number) {
  const result = await query<{ value: unknown }>("SELECT value FROM admin_settings WHERE key=$1", [key]);
  const value = typeof result.rows[0]?.value === "number" ? result.rows[0].value : Number(String(result.rows[0]?.value ?? "").replaceAll('"', ""));
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}

export async function GET(request: Request) {
  try {
    const user = await admin(); await query("SELECT expire_plans()", []);
    const url = new URL(request.url), search = url.searchParams.get("search")?.trim() ?? "", detailId = url.searchParams.get("userId")?.trim() ?? "", section = url.searchParams.get("section") ?? "dashboard";
    if (section === "personas") {
      const result = await query(`SELECT p.slug,p.name,p.creator_id,p.visibility,p.is_featured,p.is_trending,p.is_suspended,p.voice_id,p.voice_agent_id,p.voice_enabled,p.created_at,pr.full_name creator,COALESCE(s.unique_users,0) users,COALESCE(s.conversations,0) chats,COALESCE(s.likes,0) likes,COALESCE(s.followers,0) followers,COALESCE(s.rating,0) rating,COALESCE(s.trending_score,0) trending FROM personas p LEFT JOIN profiles pr ON pr.id=p.creator_id LEFT JOIN persona_stats s ON s.persona_slug=p.slug ORDER BY p.created_at DESC LIMIT 200`, []);
      return NextResponse.json({ personas: result.rows });
    }
    if (section === "plans") {
      const [plans,settings]=await Promise.all([query(`SELECT plan,plan_status,count(*)::int count FROM profiles GROUP BY plan,plan_status ORDER BY plan`,[]),query("SELECT key,value,updated_at FROM admin_settings ORDER BY key",[])]);
      return NextResponse.json({ plans: plans.rows, settings: settings.rows });
    }
    if (section === "challenges") {
      const result=await query(`SELECT c.id,c.persona_slug,c.question,c.difficulty,c.xp_reward,c.deadline,c.is_active,c.created_at,p.name persona,(SELECT count(*)::int FROM challenge_submissions s WHERE s.challenge_id=c.id) participants FROM challenges c JOIN personas p ON p.slug=c.persona_slug ORDER BY c.created_at DESC LIMIT 200`,[]);
      return NextResponse.json({ challenges: result.rows });
    }
    if (section === "leaderboard") {
      const result=await query(`SELECT kind,entity_id,period,score,likes,users,rank,previous_rank,updated_at FROM leaderboard_stats WHERE period IN ('all',${`to_char(date_trunc('week',now() AT TIME ZONE 'UTC'),'YYYY-MM-DD')`}) ORDER BY kind,period,rank LIMIT 300`,[]);
      return NextResponse.json({ leaderboard: result.rows });
    }
    if (section === "analytics") {
      const result=await query(`SELECT date,COALESCE(sum(messages_used),0)::int messages,COALESCE(sum(tokens_used),0)::bigint tokens,COALESCE(sum(estimated_cost),0)::numeric cost FROM usage WHERE date>=current_date-30 GROUP BY date ORDER BY date`,[]);
      const registrations=await query(`SELECT created_at::date date,count(*)::int count FROM profiles WHERE created_at>=current_date-30 GROUP BY created_at::date ORDER BY date`,[]);
      const personas=await query(`SELECT created_at::date date,count(*)::int count FROM personas WHERE created_at>=current_date-30 GROUP BY created_at::date ORDER BY date`,[]);
      const active=await query(`SELECT date,count(DISTINCT user_id)::int count FROM usage WHERE date>=current_date-30 GROUP BY date ORDER BY date`,[]);
      const subscriptions=await query(`SELECT created_at::date date,count(*) FILTER(WHERE plan='pro')::int pro,COALESCE(sum(amount) FILTER(WHERE status IN ('paid','succeeded','completed')),0)::numeric revenue FROM payments WHERE created_at>=current_date-30 GROUP BY created_at::date ORDER BY date`,[]);
      return NextResponse.json({ usage: result.rows, registrations: registrations.rows, personas: personas.rows, active: active.rows, subscriptions: subscriptions.rows });
    }
    if (section === "settings") {
      const result=await query("SELECT key,value,updated_by,updated_at FROM admin_settings ORDER BY key",[]); return NextResponse.json({ settings: result.rows });
    }
    const [stats, users, logs] = await Promise.all([
      query<{ total: string; active_users: string; free: string; pro: string; ultra: string; active: string; expired: string; new_today: string; new_month: string; messages_today: string; total_personas: string; total_chats: string; total_likes: string; challenge_participants: string; revenue: string; conversion: string }>(`SELECT count(*) total,count(*) FILTER(WHERE account_status='active' AND updated_at>=now()-interval '30 days') active_users,count(*) FILTER(WHERE plan='free') free,count(*) FILTER(WHERE plan='pro') pro,count(*) FILTER(WHERE plan='ultra') ultra,count(*) FILTER(WHERE plan_status='active' AND plan<>'free') active,count(*) FILTER(WHERE plan_status='expired') expired,count(*) FILTER(WHERE created_at::date=current_date) new_today,count(*) FILTER(WHERE created_at>=date_trunc('month',current_date)) new_month,COALESCE((SELECT sum(messages_used) FROM usage WHERE date=current_date),0) messages_today,(SELECT count(*) FROM personas WHERE is_suspended=false) total_personas,(SELECT count(*) FROM conversations) total_chats,(SELECT count(*) FROM persona_likes) total_likes,(SELECT count(DISTINCT user_id) FROM challenge_submissions) challenge_participants,(SELECT COALESCE(sum(amount),0) FROM payments WHERE status IN ('paid','succeeded','completed') AND created_at>=date_trunc('month',current_date)) revenue,round(count(*) FILTER(WHERE plan='pro')::numeric/greatest(count(*),1)*100,1) conversion FROM profiles`),
      query(`SELECT p.id,p.email,p.full_name,p.role,p.plan,p.plan_status,p.account_status,p.plan_expires_at,p.daily_message_limit,p.monthly_message_limit,p.created_at,p.updated_at,(SELECT COALESCE(sum(amount),0)::int FROM xp_transactions WHERE user_id=p.id) xp,1+floor(sqrt(greatest((SELECT COALESCE(sum(amount),0) FROM xp_transactions WHERE user_id=p.id),0)/100))::int level,(SELECT count(*)::int FROM personas WHERE creator_id=p.id) personas_created,(SELECT count(*)::int FROM messages WHERE user_id=p.id) total_messages,(SELECT max(created_at) FROM messages WHERE user_id=p.id) last_active FROM profiles p WHERE ($1='' OR lower(p.email) LIKE lower('%'||$1||'%') OR p.id::text=$1) ORDER BY p.created_at DESC LIMIT 50`, [search]),
      query(`SELECT l.created_at,l.action,l.old_value,l.new_value,l.target_user_id,p.email admin_email FROM admin_logs l JOIN profiles p ON p.id=l.admin_id ORDER BY l.created_at DESC LIMIT 50`, []),
    ]);
    const detail = detailId ? await Promise.all([
      query("SELECT id,title,persona_id,created_at,updated_at FROM conversations WHERE user_id=$1 ORDER BY updated_at DESC LIMIT 100", [detailId]),
      query("SELECT date,messages_used,tokens_used,provider,estimated_cost FROM usage WHERE user_id=$1 ORDER BY date DESC LIMIT 100", [detailId]),
      query("SELECT provider,transaction_id,plan,amount,currency,status,created_at FROM payments WHERE user_id=$1 ORDER BY created_at DESC LIMIT 100", [detailId]),
    ]) : null;
    return NextResponse.json({ stats: stats.rows[0], users: users.rows, logs: logs.rows, admin: user, detail: detail ? { conversations: detail[0].rows, usage: detail[1].rows, payments: detail[2].rows } : undefined });
  } catch (error) { return NextResponse.json({ error: (error as Error).message === "FORBIDDEN" ? "Forbidden" : "Admin data unavailable." }, { status: 403 }); }
}

export async function POST(request: Request) {
  try {
    const user = await admin(); if (!rateLimit(user.id)) return NextResponse.json({ error: "Too many sensitive actions. Try again shortly." }, { status: 429 });
    const body = await request.json() as { action?: string; userId?: string; plan?: string; expiresAt?: string | null; months?: number | "lifetime"; daily?: number; monthly?: number; personaSlug?: string; voiceId?: string; voiceAgentId?: string; voiceEnabled?: boolean; challengeId?: string; key?: string; value?: unknown; amount?: number; badgeId?: string; question?: string; difficulty?: string; xpReward?: number; deadline?: string; expectedAnswer?: string };
    const target = body.userId?.trim(); const needsUser = ["set-plan","upgrade-pro","downgrade-free","cancel-pro","suspend","unsuspend","limits","reset-usage","give-xp","remove-xp","give-badge","remove-badge","delete-user","reset-points"].includes(body.action ?? "");
    if (!body.action || (needsUser && !target)) return NextResponse.json({ error: "User and action are required." }, { status: 400 });
    const old = target ? await query("SELECT plan,plan_status,plan_expires_at,daily_message_limit,monthly_message_limit FROM profiles WHERE id=$1", [target]) : { rows: [{}], rowCount: 1 }; if (needsUser && !old.rows[0]) return NextResponse.json({ error: "User not found." }, { status: 404 });
    let sql = "", values: unknown[] = [];
    if ((body.action === "set-plan" || body.action === "upgrade-pro") && ["free", "pro", "ultra"].includes(body.plan ?? "")) { const plan = body.plan; const expires = plan === "free" ? null : body.expiresAt ?? (body.months === "lifetime" ? null : new Date(Date.now() + Number(body.months ?? 1) * 30 * 86400000).toISOString()); const daily = await settingNumber(plan === "pro" ? "pro_daily_message_limit" : "free_daily_message_limit", plan === "pro" ? 50 : 5); const monthly = await settingNumber(plan === "pro" ? "pro_monthly_message_limit" : "free_monthly_message_limit", plan === "pro" ? 1500 : 150); sql = "UPDATE profiles SET plan=$2,plan_status='active',plan_started_at=CASE WHEN $2='pro' AND plan<>'pro' THEN now() ELSE plan_started_at END,plan_expires_at=$3,plan_updated_at=now(),daily_message_limit=$4,monthly_message_limit=$5,updated_at=now() WHERE id=$1"; values = [target, plan, expires, daily, monthly]; }
    else if (body.action === "downgrade-free" || body.action === "cancel-pro") { const daily = await settingNumber("free_daily_message_limit", 5); const monthly = await settingNumber("free_monthly_message_limit", 150); sql = "UPDATE profiles SET plan='free',plan_status=CASE WHEN $2='cancel-pro' THEN 'canceled' ELSE 'active' END,plan_expires_at=NULL,plan_updated_at=now(),daily_message_limit=$3,monthly_message_limit=$4,updated_at=now() WHERE id=$1"; values = [target, body.action, daily, monthly]; }
    else if (body.action === "suspend") { sql = "UPDATE profiles SET account_status='suspended',plan_status='canceled',updated_at=now() WHERE id=$1"; values = [target]; }
    else if (body.action === "unsuspend") { sql = "UPDATE profiles SET account_status='active',plan_status='active',updated_at=now() WHERE id=$1"; values = [target]; }
    else if (body.action === "limits" && Number.isInteger(body.daily) && Number.isInteger(body.monthly) && Number(body.daily) >= 0 && Number(body.monthly) >= 0) { sql = "UPDATE profiles SET daily_message_limit=$2,monthly_message_limit=$3,updated_at=now() WHERE id=$1"; values = [target, body.daily, body.monthly]; }
    else if (body.action === "reset-usage") { await query("DELETE FROM usage WHERE user_id=$1 AND date=current_date", [target]); sql = ""; }
    else if ((body.action === "give-xp" || body.action === "remove-xp") && Number.isInteger(body.amount) && Number(body.amount)>0) { sql = "INSERT INTO xp_transactions(user_id,amount,reason,source_key) VALUES($1,$2,$3,$4)"; values = [target, body.action === "give-xp" ? Number(body.amount) : -Number(body.amount), `Admin ${body.action}`, `admin:${user.id}:${target}:${Date.now()}`]; }
    else if (body.action === "give-badge" && body.badgeId) { sql = "INSERT INTO user_badges(user_id,badge_id) VALUES($1,$2) ON CONFLICT DO NOTHING"; values = [target, body.badgeId]; }
    else if (body.action === "remove-badge" && body.badgeId) { sql = "DELETE FROM user_badges WHERE user_id=$1 AND badge_id=$2"; values = [target, body.badgeId]; }
    else if (body.action === "delete-user") { sql = "UPDATE profiles SET account_status='deleted',plan='free',plan_status='canceled',updated_at=now() WHERE id=$1"; values = [target]; }
    else if (["feature-persona","unfeature-persona","mark-trending","unmark-trending","suspend-persona","remove-persona"].includes(body.action ?? "") && body.personaSlug) { const field = body.action === "feature-persona" || body.action === "unfeature-persona" ? "is_featured" : body.action === "mark-trending" || body.action === "unmark-trending" ? "is_trending" : "is_suspended"; if (body.action === "remove-persona") sql = "UPDATE personas SET visibility='Private',is_suspended=true,updated_at=now() WHERE slug=$1"; else sql = `UPDATE personas SET ${field}=$2,updated_at=now() WHERE slug=$1`; values = body.action === "remove-persona" ? [body.personaSlug] : [body.personaSlug, ["feature-persona","mark-trending"].includes(body.action ?? "")]; }
    else if (body.action === "persona-voice" && body.personaSlug && typeof body.voiceEnabled === "boolean" && typeof body.voiceId === "string" && typeof body.voiceAgentId === "string" && body.voiceId.length <= 160 && body.voiceAgentId.length <= 160 && /^[a-z0-9-]{1,160}$/i.test(body.personaSlug) && (!body.voiceAgentId || /^agent_[A-Za-z0-9]+$/.test(body.voiceAgentId))) { sql = "UPDATE personas SET voice_id=NULLIF($2,''),voice_agent_id=NULLIF($3,''),voice_enabled=$4,updated_at=now() WHERE slug=$1"; values = [body.personaSlug, body.voiceId.trim(), body.voiceAgentId.trim(), body.voiceEnabled]; }
    else if (body.action === "toggle-challenge" && body.challengeId) { sql = "UPDATE challenges SET is_active=NOT is_active WHERE id=$1"; values = [body.challengeId]; }
    else if (body.action === "create-challenge" && body.personaSlug && body.question && ["Easy", "Medium", "Hard"].includes(body.difficulty ?? "") && Number.isInteger(body.xpReward) && Number(body.xpReward) >= 10 && Number(body.xpReward) <= 500 && body.deadline && new Date(body.deadline).getTime() > Date.now() && body.expectedAnswer) { sql = "WITH inserted AS (INSERT INTO challenges(persona_slug,question,difficulty,xp_reward,deadline,is_public,is_active) VALUES($1,$2,$3,$4,$5,true,true) RETURNING id) INSERT INTO challenge_keys(challenge_id,expected_answer) SELECT id,$6 FROM inserted RETURNING challenge_id"; values = [body.personaSlug, body.question.trim(), body.difficulty, body.xpReward, body.deadline, body.expectedAnswer.trim()]; }
    else if (body.action === "reset-points" && body.userId) { sql = "DELETE FROM xp_transactions WHERE user_id=$1 AND reason ILIKE 'Admin%'"; values = [target]; }
    else if (body.action === "setting" && body.key && ["free_daily_message_limit","pro_daily_message_limit","free_monthly_message_limit","pro_monthly_message_limit","free_persona_creation_limit","pro_persona_creation_limit","pro_voice_monthly_minutes","pro_voice_session_max_minutes","pro_voice_session_max_per_hour","challenge_default_reward","xp_like_reward","xp_follow_reward","pro_price","maintenance_mode","registration_enabled"].includes(body.key)) { sql = "INSERT INTO admin_settings(key,value,updated_by,updated_at) VALUES($1,$2,$3,now()) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_by=excluded.updated_by,updated_at=now()"; values = [body.key, JSON.stringify(body.value), user.id]; }
    else return NextResponse.json({ error: "Invalid admin action." }, { status: 400 });
    if (sql) await query(sql, values);
    await query("INSERT INTO admin_logs(admin_id,target_user_id,action,old_value,new_value) VALUES($1,$2,$3,$4,$5)", [user.id, target, body.action, JSON.stringify(old.rows[0]), JSON.stringify(body)]);
    return NextResponse.json({ ok: true });
  } catch (error) { const message = (error as Error).message; return NextResponse.json({ error: message === "FORBIDDEN" ? "Forbidden" : message }, { status: message === "FORBIDDEN" ? 403 : 400 }); }
}
