import "server-only";
import { createHash } from "node:crypto";
import { supabaseAdmin } from "@/lib/server/db";
import { MYSOUL_SECTIONS, calculateMySoulScore, categorizeMySoulTopic, retrieveMysoulFacts, shouldReturnUnknown, type MySoulRecord, type MySoulTopicCategory, type MySoulVisibility } from "@/lib/mysoul";
import type { AppUser } from "@/lib/auth";

export { categorizeMySoulTopic, retrieveMysoulFacts, shouldReturnUnknown };

export const RECORD_FIELDS: Record<string, string[]> = {
  traits: ["trait", "strength", "visibility"],
  personality_answers: ["question_key", "answer", "visibility"],
  interests: ["category", "interest", "sentiment", "intensity", "visibility"],
  values: ["value", "importance", "description", "visibility"],
  goals: ["category", "goal", "description", "priority", "status", "target_date", "visibility"],
  memories: ["title", "memory", "memory_date", "emotion", "location", "people_involved", "visibility"],
  people: ["name", "relationship", "description", "why_important", "importance", "visibility"],
  preferences: ["category", "key", "value", "sentiment", "visibility"],
  knowledge: ["category", "content", "structured_data", "visibility", "importance"],
  training_samples: ["content", "sample_type"],
};
export const RECORD_TABLES: Record<string, string> = {
  traits: "mysoul_traits", personality_answers: "mysoul_personality_answers", interests: "mysoul_interests", values: "mysoul_values",
  goals: "mysoul_goals", memories: "mysoul_memories", people: "mysoul_people", preferences: "mysoul_preferences",
  knowledge: "mysoul_knowledge", training_samples: "mysoul_training_samples",
};
export const SOUL_FIELDS = [
  "display_name", "nickname", "pronouns", "languages", "occupation", "education", "country", "city", "headline", "about",
  "avatar_url", "preferred_language", "secondary_language", "display_name_visibility", "avatar_url_visibility", "nickname_visibility", "pronouns_visibility",
  "languages_visibility", "occupation_visibility", "education_visibility", "country_visibility", "city_visibility", "headline_visibility",
  "about_visibility", "enabled", "public_enabled", "allow_public_conversations", "allow_followers", "allow_friends", "show_on_profile",
  "allow_conversation_history", "save_visitor_chats", "allow_ai_interactions", "default_visibility", "onboarding_completed",
];
const VISIBILITIES = new Set<MySoulVisibility>(["private", "friends", "public"]);

export type MySoulRow = Record<string, unknown> & {
  id: string; user_id: string; display_name: string; nickname: string; about: string; occupation: string; languages: string[];
  enabled: boolean; public_enabled: boolean; default_visibility: MySoulVisibility; avatar_url: string | null;
  display_name_visibility: MySoulVisibility; avatar_url_visibility: MySoulVisibility; headline_visibility: MySoulVisibility;
};

export function requireMysoulDb() {
  if (!supabaseAdmin) throw new Error("MYSOUL_NOT_CONFIGURED");
  return supabaseAdmin;
}

export async function getOwnerSoul(userId: string): Promise<MySoulRow | null> {
  const db = requireMysoulDb();
  const { data, error } = await db.from("mysouls").select("*").eq("user_id", userId).maybeSingle();
  if (error) throw error;
  return data as MySoulRow | null;
}

export async function createOwnerSoul(user: AppUser) {
  const db = requireMysoulDb();
  const existing = await getOwnerSoul(user.id);
  if (existing) return existing;
  const { data: profile } = await db.from("profiles").select("display_name,full_name,avatar_url").eq("id", user.id).maybeSingle();
  const displayName = String(profile?.display_name ?? profile?.full_name ?? user.name).trim().slice(0, 120);
  const { data, error } = await db.from("mysouls").upsert({
    user_id: user.id,
    display_name: displayName,
    avatar_url: profile?.avatar_url ?? null,
    enabled: true,
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id" }).select("*").single();
  if (error) throw error;
  await trackMysoulEventSafely(data.id, "mysoul_created");
  return data as MySoulRow;
}

export async function trackMysoulEvent(mysoulId: string, eventType: string) {
  const db = requireMysoulDb();
  const { error } = await db.from("mysoul_analytics_events").insert({ mysoul_id: mysoulId, event_type: eventType });
  if (error) throw error;
}

export async function trackMysoulEventSafely(mysoulId: string, eventType: string) {
  try { await trackMysoulEvent(mysoulId, eventType); }
  catch { console.error("Could not record MySoul analytics event"); }
}

export async function trackMysoulTopic(mysoulId: string, category: MySoulTopicCategory) {
  const db = requireMysoulDb();
  const { error } = await db.rpc("mysoul_record_topic", { p_mysoul: mysoulId, p_topic: category });
  if (error) throw error;
}

export async function refreshMysoulScore(soul: MySoulRow) {
  const db = requireMysoulDb();
  const count = async (table: string) => {
    const { count: total, error } = await db.from(table).select("id", { count: "exact", head: true }).eq("mysoul_id", soul.id);
    if (error) throw error;
    return total ?? 0;
  };
  const [traits, answers, interests, communication, memories, values, goals] = await Promise.all([
    count("mysoul_traits"), count("mysoul_personality_answers"), count("mysoul_interests"),
    db.from("mysoul_communication_profile").select("id").eq("mysoul_id", soul.id).maybeSingle(),
    count("mysoul_memories"), count("mysoul_values"), count("mysoul_goals"),
  ]);
  if (communication.error) throw communication.error;
  const score = calculateMySoulScore({ soul, traits, answers, interests, communication: Boolean(communication.data), memories, values, goals });
  const { error } = await db.from("mysouls").update({ completion_score: score, updated_at: new Date().toISOString() }).eq("id", soul.id).eq("user_id", soul.user_id);
  if (error) throw error;
  return score;
}

export async function refreshMysoulScoreSafely(soul: MySoulRow) {
  try { return await refreshMysoulScore(soul); }
  catch { console.error("Could not refresh MySoul completion score"); return null; }
}

export async function loadOwnerDashboard(userId: string) {
  const db = requireMysoulDb();
  const soul = await getOwnerSoul(userId);
  if (!soul) return null;
  const jobs = Object.entries(RECORD_TABLES).map(async ([key, table]) => {
    const limit = key === "memories" ? 26 : key === "training_samples" ? 50 : 100;
    const { data, error } = await db.from(table).select("*").eq("mysoul_id", soul!.id).order("created_at", { ascending: false }).order("id", { ascending: false }).limit(limit);
    if (error) throw error;
    const rawRows = (data ?? []) as unknown as Array<Record<string, unknown>>;
    const safeRows = key === "training_samples" ? rawRows.map(({ id, sample_type, created_at }) => ({ id, sample_type, created_at })) : rawRows;
    return [key, safeRows] as const;
  });
  const [records, communication, events, conversationCount, topicAnalytics, savedConversationCount] = await Promise.all([
    Promise.all(jobs),
    db.from("mysoul_communication_profile").select("*").eq("mysoul_id", soul.id).maybeSingle(),
    db.from("mysoul_analytics_events").select("event_type,created_at").eq("mysoul_id", soul.id).order("created_at", { ascending: false }).limit(500),
    db.from("mysoul_analytics_events").select("id", { count: "exact", head: true }).eq("mysoul_id", soul.id).eq("event_type", "mysoul_chat_started"),
    db.from("mysoul_topic_analytics").select("topic_category,question_count").eq("mysoul_id", soul.id).order("question_count", { ascending: false }).limit(7),
    db.from("mysoul_conversations").select("id", { count: "exact", head: true }).eq("mysoul_id", soul.id).eq("visitor_consented_to_history", true),
  ]);
  if (communication.error || events.error || conversationCount.error || topicAnalytics.error || savedConversationCount.error) throw communication.error ?? events.error ?? conversationCount.error ?? topicAnalytics.error ?? savedConversationCount.error;
  const data = Object.fromEntries(records) as Record<string, MySoulRecord[]>;
  const hasMore = { memories: (data.memories?.length ?? 0) > 25 };
  if (hasMore.memories) data.memories = data.memories.slice(0, 25);
  const trainingSampleCount = data.training_samples.length;
  const analytics: Record<string, number> = {};
  for (const event of events.data ?? []) analytics[event.event_type] = (analytics[event.event_type] ?? 0) + 1;
  const { data: profile, error: profileError } = await db.from("profiles").select("username").eq("id", userId).maybeSingle();
  if (profileError) throw profileError;
  return {
    soul,
    username: profile?.username ?? null,
    records: data,
    hasMore,
    trainingSampleCount,
    communication: communication.data,
    analytics,
    conversationCount: conversationCount.count ?? 0,
    topicAnalytics: topicAnalytics.data ?? [],
    savedConversationCount: savedConversationCount.count ?? 0,
    sections: MYSOUL_SECTIONS,
  };
}

export async function updateSoul(userId: string, raw: Record<string, unknown>) {
  const db = requireMysoulDb();
  const soul = await getOwnerSoul(userId);
  if (!soul) throw new Error("MYSOUL_MISSING");
  const values: Record<string, unknown> = {};
  for (const key of SOUL_FIELDS) if (Object.hasOwn(raw, key)) values[key] = raw[key];
  for (const key of Object.keys(values)) {
    if (key.endsWith("_visibility") || key === "default_visibility") {
      if (!VISIBILITIES.has(values[key] as MySoulVisibility)) throw new Error("INVALID_VISIBILITY");
    }
    if (["enabled", "public_enabled", "allow_public_conversations", "allow_followers", "allow_friends", "show_on_profile", "allow_conversation_history", "save_visitor_chats", "allow_ai_interactions", "onboarding_completed"].includes(key) && typeof values[key] !== "boolean") throw new Error("INVALID_SETTING");
    if (["display_name", "nickname", "pronouns", "occupation", "education", "country", "city", "headline", "about", "preferred_language", "secondary_language"].includes(key)) {
      if (typeof values[key] !== "string") throw new Error("INVALID_FIELD");
      values[key] = values[key].trim().slice(0, key === "about" ? 2000 : key === "headline" ? 180 : 160);
    }
    if (key === "languages") {
      if (!Array.isArray(values[key]) || (values[key] as unknown[]).length > 20 || (values[key] as unknown[]).some((value) => typeof value !== "string" || value.length > 60)) throw new Error("INVALID_FIELD");
      values[key] = (values[key] as string[]).map((value) => value.trim()).filter(Boolean);
    }
  }
  if (!Object.keys(values).length) throw new Error("NO_CHANGES");
  if (values.save_visitor_chats === true) values.allow_conversation_history = true;
  if (values.allow_conversation_history === false) values.save_visitor_chats = false;
  if (Object.hasOwn(values, "avatar_url")) {
    const avatar = values.avatar_url;
    if (avatar !== null && (typeof avatar !== "string" || avatar.length > 2000 || !/^https:\/\//i.test(avatar))) throw new Error("INVALID_FIELD");
  }
  if (values.public_enabled === true && !(values.display_name ?? soul.display_name)?.toString().trim()) throw new Error("DISPLAY_NAME_REQUIRED");
  values.updated_at = new Date().toISOString();
  const { data, error } = await db.from("mysouls").update(values).eq("id", soul.id).eq("user_id", userId).select("*").single();
  if (error) throw error;
  if (["display_name", "about", "occupation", "languages"].some((key) => Object.hasOwn(values, key))) {
    const score = await refreshMysoulScoreSafely(data as MySoulRow);
    if (score !== null) (data as MySoulRow).completion_score = score;
  }
  if (values.public_enabled === true && !soul.public_enabled) await trackMysoulEventSafely(soul.id, "mysoul_public_enabled");
  await trackMysoulEventSafely(soul.id, "mysoul_updated");
  return data as MySoulRow;
}

function cleanString(value: unknown, max: number, required = false) {
  if (typeof value !== "string") throw new Error("INVALID_FIELD");
  const text = value.trim().slice(0, max);
  if (required && !text) throw new Error("INVALID_FIELD");
  return text;
}

export function sanitizeRecord(collection: string, raw: Record<string, unknown>) {
  const allowed = RECORD_FIELDS[collection];
  if (!allowed) throw new Error("INVALID_COLLECTION");
  const row: Record<string, unknown> = {};
  for (const key of allowed) {
    if (!Object.hasOwn(raw, key)) continue;
    if (key === "visibility") {
      if (!VISIBILITIES.has(raw[key] as MySoulVisibility)) throw new Error("INVALID_VISIBILITY");
      row[key] = raw[key];
    } else if (["strength", "intensity", "importance", "priority"].includes(key)) {
      const number = Number(raw[key]);
      if (!Number.isInteger(number) || number < 1 || number > 5) throw new Error("INVALID_FIELD");
      row[key] = number;
    } else if (key === "sentiment") {
      if (!["like", "love", "neutral", "dislike"].includes(String(raw[key]))) throw new Error("INVALID_FIELD");
      row[key] = raw[key];
    } else if (key === "status") {
      if (!["Dream", "Planning", "Working On It", "Achieved"].includes(String(raw[key]))) throw new Error("INVALID_FIELD");
      row[key] = raw[key];
    } else if (["people_involved", "structured_data"].includes(key)) {
      if (key === "people_involved") {
        if (!Array.isArray(raw[key]) || (raw[key] as unknown[]).length > 30 || (raw[key] as unknown[]).some((item) => typeof item !== "string" || item.length > 160)) throw new Error("INVALID_FIELD");
      } else if (!raw[key] || typeof raw[key] !== "object" || Array.isArray(raw[key])) throw new Error("INVALID_FIELD");
      row[key] = raw[key];
    } else if (key === "target_date" || key === "memory_date") {
      const value = raw[key];
      if (value === null || value === "") row[key] = null;
      else if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`))) row[key] = value;
      else throw new Error("INVALID_FIELD");
    } else {
      const maxLength = key === "memory" ? 10000 : key === "content" ? (collection === "training_samples" ? 12000 : 6000) :
        key === "answer" ? 4000 : key === "question_key" ? 80 : key === "category" ? 80 : key === "trait" ? 100 :
          key === "interest" ? 160 : key === "value" ? (collection === "values" ? 120 : 2000) : key === "goal" ? 240 :
            key === "title" ? 200 : key === "name" ? 160 : key === "relationship" ? 120 : key === "why_important" ? 2000 :
              key === "description" ? (collection === "values" ? 2000 : 3000) : key === "key" ? 120 :
                key === "emotion" ? 100 : key === "location" ? 200 : key === "sample_type" ? 80 : 200;
      row[key] = cleanString(raw[key], maxLength, ["trait", "interest", "value", "goal", "title", "memory", "name", "category", "key", "question_key", "answer", "content"].includes(key));
    }
  }
  if (collection !== "training_samples" && !Object.hasOwn(row, "visibility")) row.visibility = "private";
  if (collection === "training_samples" && !Object.hasOwn(row, "sample_type")) row.sample_type = "message";
  return row;
}

export async function resolvePublicSoul(username: string, viewer: AppUser | null) {
  const db = requireMysoulDb();
  const safeUsername = username.trim();
  if (!/^[a-zA-Z0-9_-]{2,40}$/.test(safeUsername)) return null;
  const { data: profile, error: profileError } = await db.from("profiles").select("id,display_name,full_name,avatar_url,avatar_data_url,username,profile_visibility").ilike("username", safeUsername).maybeSingle();
  if (profileError) throw profileError;
  if (!profile) return null;
  const { data: soul, error } = await db.from("mysouls").select("*").eq("user_id", profile.id).maybeSingle();
  if (error) throw error;
  if (!soul?.enabled) return null;
  const owner = viewer?.id === profile.id;
  const { data: followRow } = viewer && !owner ? await db.from("user_follows").select("user_id").eq("user_id", viewer.id).eq("creator_id", profile.id).maybeSingle() : { data: null };
  let friend = false;
  if (viewer && !owner) {
    const { data: reciprocal } = await db.from("user_follows").select("user_id").eq("user_id", profile.id).eq("creator_id", viewer.id).maybeSingle();
    friend = Boolean(followRow && reciprocal);
  }
  const canFollow = Boolean(soul.allow_followers && followRow);
  const canFriend = Boolean(soul.allow_friends && friend);
  const publicAccess = Boolean(soul.public_enabled);
  if (!owner && !publicAccess && !canFollow && !canFriend) return null;
  const visibility: MySoulVisibility[] = owner ? ["private", "friends", "public"] : publicAccess ? ["public", ...(canFriend || canFollow ? ["friends" as const] : [])] : ["friends"];
  const visible = async (table: string) => {
    let request = db.from(table).select("*").eq("mysoul_id", soul.id).order("created_at", { ascending: false }).limit(table === "mysoul_memories" ? 30 : 50);
    if (!owner) request = request.in("visibility", visibility);
    const result = await request;
    if (result.error) throw result.error;
    return (result.data ?? []) as MySoulRecord[];
  };
  const [traits, answers, interests, values, goals, memories, people, preferences, knowledge, communication] = await Promise.all([
    visible("mysoul_traits"), visible("mysoul_personality_answers"), visible("mysoul_interests"), visible("mysoul_values"),
    visible("mysoul_goals"), visible("mysoul_memories"), visible("mysoul_people"), visible("mysoul_preferences"),
    visible("mysoul_knowledge"),
    db.from("mysoul_communication_profile").select("*").eq("mysoul_id", soul.id).maybeSingle(),
  ]);
  if (communication.error) throw communication.error;
  const communicationProfile = communication.data && (owner || visibility.includes(communication.data.visibility)) ? communication.data : null;
  const fields = ["display_name", "avatar_url", "nickname", "pronouns", "languages", "occupation", "education", "country", "city", "headline", "about"];
  const identityFacts = fields.flatMap((field) => {
    const value = (soul as Record<string, unknown>)[field];
    const fieldVisibility = (soul as Record<string, unknown>)[`${field}_visibility`];
    if (!value || (!owner && !visibility.includes(fieldVisibility as MySoulVisibility))) return [];
    return [{ source: "profile", priority: 1, visibility: fieldVisibility, category: field, text: Array.isArray(value) ? value.join(", ") : String(value) }];
  });
  const shownName = owner || visibility.includes(soul.display_name_visibility) ? (soul.display_name || profile.display_name || profile.full_name) : (profile.display_name || profile.full_name);
  const facts = [
    ...knowledge.map((item) => ({ source: "knowledge", priority: 6, visibility: item.visibility, category: String(item.category), text: String(item.content) })),
    ...memories.map((item) => ({ source: "memory", priority: 5, visibility: item.visibility, category: "memory", text: `${item.title}: ${item.memory}` })),
    ...preferences.map((item) => ({ source: "preference", priority: 4, visibility: item.visibility, category: String(item.category), text: `${item.key}: ${item.value}` })),
    ...goals.map((item) => ({ source: "goal", priority: 3, visibility: item.visibility, category: String(item.category), text: `${item.goal}${item.description ? ` — ${item.description}` : ""} (${item.status})` })),
    ...interests.map((item) => ({ source: "interest", priority: 3, visibility: item.visibility, category: String(item.category), text: `${item.sentiment} ${item.interest}` })),
    ...values.map((item) => ({ source: "value", priority: 3, visibility: item.visibility, category: "values", text: `${item.value}${item.description ? `: ${item.description}` : ""}` })),
    ...traits.map((item) => ({ source: "trait", priority: 2, visibility: item.visibility, category: "personality", text: String(item.trait) })),
    ...answers.map((item) => ({ source: "personality answer", priority: 2, visibility: item.visibility, category: "personality", text: `${item.question_key}: ${item.answer}` })),
    ...people.map((item) => ({ source: "person", priority: 2, visibility: item.visibility, category: "relationships", text: `${item.name}, ${item.relationship}${item.description ? `: ${item.description}` : ""}${item.why_important ? `. Important because ${item.why_important}` : ""}` })),
    ...identityFacts,
    { source: "profile", priority: 1, visibility: "public", category: "name", text: String(shownName ?? "") },
  ];
  return {
    id: soul.id as string,
    userId: profile.id as string,
    username: profile.username as string,
    displayName: shownName,
    avatarUrl: owner ? (soul.avatar_url || profile.avatar_data_url || profile.avatar_url || null) :
      visibility.includes(soul.avatar_url_visibility) ? (soul.avatar_url || (profile.profile_visibility === "Public" ? profile.avatar_data_url || profile.avatar_url : null) || null) :
        (profile.profile_visibility === "Public" ? profile.avatar_data_url || profile.avatar_url || null : null),
    headline: owner || visibility.includes(soul.headline_visibility) ? soul.headline : "",
    about: owner || visibility.includes(soul.about_visibility) ? soul.about : "",
    isOwner: owner,
    canChat: Boolean(owner || (soul.allow_public_conversations && publicAccess) || canFollow || canFriend),
    historyDisclosure: Boolean(soul.allow_conversation_history && soul.save_visitor_chats),
    showOnProfile: Boolean(soul.show_on_profile),
    allowAiInteractions: Boolean(soul.allow_ai_interactions),
    communication: communicationProfile,
    facts,
    privacy: { owner, publicAccess, canFriend, canFollow },
  };
}

export async function getMySoulMetadata(username: string, viewer: AppUser | null) {
  const db = requireMysoulDb();
  if (!/^[a-zA-Z0-9_-]{2,40}$/.test(username)) return null;
  const { data: profile, error: profileError } = await db.from("profiles").select("id,display_name,full_name,username").ilike("username", username).maybeSingle();
  if (profileError) throw profileError;
  if (!profile) return null;
  const { data: soul, error } = await db.from("mysouls").select("id,display_name,enabled,public_enabled,show_on_profile,allow_friends,allow_followers,display_name_visibility").eq("user_id", profile.id).maybeSingle();
  if (error) throw error;
  if (!soul) return null;
  const owner = viewer?.id === profile.id;
  if (!owner && !soul.enabled) return null;
  let friend = false, follower = false;
  if (viewer && !owner) {
    const [following, reciprocal] = await Promise.all([
      db.from("user_follows").select("user_id").eq("user_id", viewer.id).eq("creator_id", profile.id).maybeSingle(),
      db.from("user_follows").select("user_id").eq("user_id", profile.id).eq("creator_id", viewer.id).maybeSingle(),
    ]);
    follower = Boolean(following.data);
    friend = Boolean(following.data && reciprocal.data);
  }
  const visible = owner || (soul.enabled && (soul.public_enabled || (soul.allow_friends && friend) || (soul.allow_followers && follower)));
  if (!visible) return null;
  const ownerVisible = owner || (soul.display_name_visibility === "public" && soul.public_enabled) ||
    (soul.display_name_visibility === "friends" && ((soul.allow_friends && friend) || (soul.allow_followers && follower)));
  return {
    username: profile.username as string,
    displayName: (ownerVisible ? soul.display_name : profile.display_name) || profile.display_name || profile.full_name || "MySoul",
    owner,
    exists: true,
    showOnProfile: Boolean(soul.enabled && soul.public_enabled && soul.show_on_profile),
  };
}

export async function consumeMysoulRateLimit(bucket: string, max: number, windowSeconds: number) {
  const db = requireMysoulDb();
  const key = createHash("sha256").update(bucket).digest("hex");
  const { data, error } = await db.rpc("mysoul_consume_rate_limit", { p_bucket: key, p_max: max, p_window_seconds: windowSeconds });
  if (error) throw error;
  return data === true;
}

export async function consumeMysoulDailyMessage(userId: string, limit: number) {
  const db = requireMysoulDb();
  const { data, error } = await db.rpc("mysoul_consume_daily_message", { p_user: userId, p_limit: limit });
  if (error) throw error;
  return data === true;
}

export function getRequestIp(request: Request) {
  const cloudflare = request.headers.get("cf-connecting-ip");
  const realIp = request.headers.get("x-real-ip");
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return cloudflare || realIp || forwarded || "unknown";
}

export function getRelevantStyle(profile: Record<string, unknown> | null) {
  if (!profile) return "";
  const allowedTone = new Set([
    "ambitious", "friendly", "direct", "warm", "thoughtful", "playful", "calm", "curious", "confident", "formal", "informal",
    "empathetic", "optimistic", "concise", "expressive", "reserved", "upbeat", "serious", "witty", "gentle", "professional", "casual",
    "energetic", "reflective",
  ]);
  return JSON.stringify({
    formality: profile.formality, humor: profile.humor, emoji_usage: profile.emoji_usage,
    directness: profile.directness, response_length: profile.response_length,
    tone: Array.isArray(profile.tone) ? profile.tone.filter((value): value is string => typeof value === "string" && allowedTone.has(value.toLowerCase())).slice(0, 8) : [],
  });
}

export function validVisibility(value: unknown): value is MySoulVisibility {
  return VISIBILITIES.has(value as MySoulVisibility);
}
