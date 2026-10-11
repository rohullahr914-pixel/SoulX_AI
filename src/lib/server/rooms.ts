import "server-only";

import { getPersonaBySlug, getPersonas } from "@/lib/personas";
import { OFFICIAL_ROOMS, ROOM_COVER_OPTIONS, roomSlug, type Room, type RoomMessage, type RoomPersona, type RoomVisibility } from "@/lib/rooms";
import { generatePersonaResponse } from "@/lib/ai/persona-engine";
import type { AIProvider } from "@/lib/ai/provider";
import { AI_RESERVATION_PROVIDER, recordAIUsage, releaseAIReservation } from "@/lib/server/ai-usage";
import { query } from "@/lib/server/db";
import { ensureSystemPersona, trackConversation } from "@/lib/server/social";

type RoomRow = Record<string, unknown>;
type StoredRoomPersona = { slug?: unknown; name?: unknown; avatar?: unknown };

export type RoomWriteInput = {
  name?: unknown;
  description?: unknown;
  topic?: unknown;
  coverImage?: unknown;
  visibility?: unknown;
  personaSlugs?: unknown;
};

const MAX_ROOM_PERSONAS = 8;
const allowedCovers = new Set(ROOM_COVER_OPTIONS.map((cover) => cover.value));

function text(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ").slice(0, max) : "";
}

function stringList(value: unknown) {
  return Array.isArray(value) ? [...new Set(value.filter((item): item is string => typeof item === "string").map((item) => item.trim()))] : [];
}

function asDate(value: unknown) {
  return typeof value === "string" ? value : undefined;
}

function personaFromStored(value: StoredRoomPersona): RoomPersona | null {
  const slug = text(value.slug, 160);
  const fallback = slug ? getPersonaBySlug(slug) : undefined;
  if (!slug || !fallback) return null;
  return {
    slug,
    name: text(value.name, 120) || fallback.name,
    avatar: text(value.avatar, 1000) || fallback.avatar,
    profession: fallback.profession,
    category: fallback.category,
    expertise: fallback.expertise,
    speakingStyle: fallback.speakingStyle,
  };
}

function parsePersonas(value: unknown) {
  const raw = Array.isArray(value) ? value as StoredRoomPersona[] : [];
  return raw.map(personaFromStored).filter((persona): persona is RoomPersona => Boolean(persona));
}

function roomFromRow(row: RoomRow): Room {
  return {
    id: text(row.id, 100) || undefined,
    name: text(row.name, 120),
    slug: text(row.slug, 100),
    description: text(row.description, 1000),
    topic: text(row.topic, 1000),
    coverImage: text(row.cover_image, 1000),
    visibility: row.visibility === "Public" ? "Public" : "Private",
    isOfficial: row.is_official === true,
    starterPrompt: text(row.starter_prompt, 4000),
    creatorId: text(row.creator_id, 100) || null,
    createdAt: asDate(row.created_at),
    updatedAt: asDate(row.updated_at),
    lastActivity: asDate(row.last_activity) ?? null,
    personas: parsePersonas(row.personas),
  };
}

const roomSelect = `
  SELECT r.id,r.creator_id,r.name,r.slug,r.description,r.topic,r.cover_image,r.visibility,r.is_official,r.starter_prompt,r.created_at,r.updated_at,
    (SELECT max(c.updated_at) FROM conversations c WHERE c.room_id=r.id AND c.user_id=$1::uuid) AS last_activity,
    COALESCE((SELECT jsonb_agg(jsonb_build_object('slug',rp.persona_slug,'name',p.name,'avatar',p.avatar) ORDER BY rp.position)
      FROM room_personas rp JOIN personas p ON p.slug=rp.persona_slug WHERE rp.room_id=r.id),'[]'::jsonb) AS personas
  FROM rooms r`;

export async function listVisibleRooms(viewerId?: string | null) {
  const result = await query<RoomRow>(`${roomSelect}
    WHERE r.is_official OR r.visibility='Public' OR r.creator_id=$1::uuid
    ORDER BY r.is_official DESC, r.updated_at DESC`, [viewerId ?? null]);
  return result.rows.map(roomFromRow);
}

export async function findVisibleRoom(slug: string, viewerId?: string | null) {
  const result = await query<RoomRow>(`${roomSelect}
    WHERE r.slug=$2 AND (r.is_official OR r.visibility='Public' OR r.creator_id=$1::uuid)
    LIMIT 1`, [viewerId ?? null, slug]);
  return result.rows[0] ? roomFromRow(result.rows[0]) : null;
}

function validateWrite(input: RoomWriteInput) {
  const name = text(input.name, 120);
  const description = text(input.description, 1000);
  const topic = text(input.topic, 1000);
  const coverImage = text(input.coverImage, 1000);
  const visibility: RoomVisibility = input.visibility === "Public" ? "Public" : "Private";
  const personaSlugs = stringList(input.personaSlugs).slice(0, MAX_ROOM_PERSONAS);
  const known = new Set(getPersonas().map((persona) => persona.slug));

  if (name.length < 2) throw new Error("Give your Room a name of at least two characters.");
  if (!topic) throw new Error("Add a conversation topic for the Room.");
  if (personaSlugs.length < 1) throw new Error("Choose at least one persona.");
  if (stringList(input.personaSlugs).length > MAX_ROOM_PERSONAS) throw new Error(`Choose up to ${MAX_ROOM_PERSONAS} personas.`);
  if (!personaSlugs.every((slug) => known.has(slug))) throw new Error("One or more selected personas are unavailable.");
  if (!allowedCovers.has(coverImage)) throw new Error("Choose one of the available Room covers.");
  return { name, description, topic, coverImage, visibility, personaSlugs };
}

async function persistRoomPersonas(roomId: string, personaSlugs: string[]) {
  await Promise.all(personaSlugs.map((slug) => ensureSystemPersona(slug)));
  await query("DELETE FROM room_personas WHERE room_id=$1", [roomId]);
  const placeholders = personaSlugs.map((_, index) => `($${index + 2},${index})`).join(",");
  await query(`INSERT INTO room_personas(room_id,persona_slug,position) VALUES ${placeholders}`, [roomId, ...personaSlugs]);
}

export async function createRoom(userId: string, input: RoomWriteInput) {
  const room = validateWrite(input);
  const base = roomSlug(room.name) || "room";
  const suffix = crypto.randomUUID().slice(0, 8);
  const slug = `${base.slice(0, 90)}-${suffix}`.slice(0, 100).replace(/-$/, "");
  const result = await query<RoomRow>(`INSERT INTO rooms(creator_id,name,slug,description,topic,cover_image,visibility,is_official,starter_prompt)
    VALUES($1,$2,$3,$4,$5,$6,$7,false,$5) RETURNING id`, [userId, room.name, slug, room.description, room.topic, room.coverImage, room.visibility]);
  const id = text(result.rows[0]?.id, 100);
  if (!id) throw new Error("Your Room could not be created.");
  await persistRoomPersonas(id, room.personaSlugs);
  const created = await findVisibleRoom(slug, userId);
  if (!created) throw new Error("Your Room was created but could not be loaded.");
  return created;
}

export async function updateRoom(userId: string, slug: string, input: RoomWriteInput) {
  const room = validateWrite(input);
  const result = await query<RoomRow>(`UPDATE rooms SET name=$1,description=$2,topic=$3,cover_image=$4,visibility=$5,starter_prompt=$3,updated_at=now()
    WHERE slug=$6 AND creator_id=$7::uuid AND NOT is_official RETURNING id`, [room.name, room.description, room.topic, room.coverImage, room.visibility, slug, userId]);
  const id = text(result.rows[0]?.id, 100);
  if (!id) throw new Error("This Room cannot be edited.");
  await persistRoomPersonas(id, room.personaSlugs);
  const updated = await findVisibleRoom(slug, userId);
  if (!updated) throw new Error("Your Room was updated but could not be loaded.");
  return updated;
}

export async function removeRoom(userId: string, slug: string) {
  const result = await query<RoomRow>("DELETE FROM rooms WHERE slug=$1 AND creator_id=$2::uuid AND NOT is_official RETURNING id", [slug, userId]);
  if (!result.rows[0]) throw new Error("This Room cannot be deleted.");
}

export async function loadRoomMessages(userId: string, room: Room, before?: string) {
  if (!room.id) return { messages: [] as RoomMessage[], hasMore: false };
  const result = await query<RoomRow>(`SELECT m.id,m.role,m.content,m.speaker_persona_slug,m.created_at
    FROM messages m JOIN conversations c ON c.id=m.conversation_id
    WHERE c.room_id=$1::uuid AND c.user_id=$2::uuid
      AND ($3::timestamptz IS NULL OR m.created_at < $3::timestamptz)
    ORDER BY m.created_at DESC LIMIT 41`, [room.id, userId, before ?? null]);
  const hasMore = result.rows.length > 40;
  const messages = result.rows.slice(0, 40).reverse().map((row): RoomMessage => ({
    id: text(row.id, 100), role: row.role === "assistant" ? "assistant" : "user", content: text(row.content, 50000),
    personaSlug: text(row.speaker_persona_slug, 160) || null, createdAt: text(row.created_at, 100),
  }));
  return { messages, hasMore };
}

function mentionedPersonaSlugs(message: string, personas: RoomPersona[]) {
  const lower = message.toLowerCase();
  return personas.filter((persona) => lower.includes(`@${persona.name.toLowerCase()}`) || lower.includes(`@${persona.name.split(" ").at(-1)?.toLowerCase()}`)).map((persona) => persona.slug);
}

export function chooseRoomResponders(message: string, personas: RoomPersona[], messages: RoomMessage[]) {
  const mentions = mentionedPersonaSlugs(message, personas);
  const mentioned = new Set(mentions);
  const terms = message.toLowerCase().match(/[a-z0-9]{3,}/g) ?? [];
  const lastSpeaker = [...messages].reverse().find((item) => item.personaSlug)?.personaSlug;
  const scored = personas.map((persona, index) => {
    const identity = [persona.name, persona.profession, persona.category, ...(persona.expertise ?? [])].join(" ").toLowerCase();
    const relevance = terms.reduce((score, term) => score + (identity.includes(term) ? 2 : 0), 0);
    return { persona, score: (mentioned.has(persona.slug) ? 100 : 0) + relevance + (lastSpeaker === persona.slug ? 0.15 : 0) + (personas.length - index) / 1000 };
  }).sort((a, b) => b.score - a.score);
  return scored.map((item) => item.persona);
}

function roomHistory(messages: RoomMessage[], personas: RoomPersona[]) {
  const names = new Map(personas.map((persona) => [persona.slug, persona.name]));
  return messages.slice(-10).map((message) => ({
    role: message.role,
    content: message.role === "assistant" ? `${names.get(message.personaSlug ?? "") ?? "A participant"}: ${message.content}` : `User: ${message.content}`,
  })) as Array<{ role: "user" | "assistant"; content: string }>;
}

export async function sendRoomMessage(userId: string, room: Room, message: string) {
  const content = text(message, 12000);
  if (!content) throw new Error("Write a message before sending it.");
  if (!room.id || room.personas.length === 0) throw new Error("This Room is not ready for conversation.");

  const reservation = await query<{ allowed: boolean; reason: string; daily_limit: number; usage_date: string }>(
    "SELECT *,current_date::text AS usage_date FROM reserve_message($1,$2)", [userId, AI_RESERVATION_PROVIDER],
  );
  const allowance = reservation.rows[0];
  if (allowance && !allowance.allowed) throw new Error(allowance.reason === "daily_limit" ? `Daily limit reached (${allowance.daily_limit} messages).` : "Monthly message limit reached.");
  try {
    const conversation = await query<RoomRow>(`INSERT INTO conversations(user_id,persona_id,room_id,title,updated_at)
      VALUES($1,$2,$3,$4,now()) ON CONFLICT(room_id,user_id) WHERE room_id IS NOT NULL
      DO UPDATE SET title=EXCLUDED.title,updated_at=now() RETURNING id`, [userId, `room:${room.slug}`, room.id, content.slice(0, 240)]);
    const conversationId = text(conversation.rows[0]?.id, 100);
    if (!conversationId) throw new Error("Unable to open the Room conversation.");
    const previous = await loadRoomMessages(userId, room);
    const responders = chooseRoomResponders(content, room.personas, previous.messages);
    const names = room.personas.map((persona) => persona.name);
    const history = roomHistory(previous.messages, room.personas);
    const results = await Promise.all(responders.map(async (responder) => {
      const response = await generatePersonaResponse({
        personaSlug: responder.slug,
        userMessage: content,
        mode: "Debate",
        history: [
          ...history,
          { role: "assistant", content: `Room context: ${room.name}. Topic: ${room.topic}. Other participants who will also answer: ${names.filter((name) => name !== responder.name).join(", ")}. Speak only for ${responder.name}. Give ${responder.name}'s distinct view on the user's question without impersonating another participant.` },
        ],
      });
      if (!response.ok || !response.content?.trim() || !response.provider) return null;
      const assistantContent = response.content.trim();
      const generatedMessage: RoomMessage = { id: crypto.randomUUID(), role: "assistant", content: assistantContent, personaSlug: responder.slug, createdAt: new Date().toISOString() };
      return { message: generatedMessage, provider: response.provider, model: response.model ?? "", measuredTokens: response.usage?.totalTokens ?? 0 };
    }));

    if (results.some((result) => result === null)) throw new Error("Not every Room participant could respond. Please try again.");
    const stored = results.filter((result): result is NonNullable<typeof result> => result !== null);
    const generated = stored.map((item) => item.message);
    const totalCharacters = content.length + generated.reduce((sum, item) => sum + item.content.length, 0);
    const measuredTokens = stored.reduce((sum, item) => sum + item.measuredTokens, 0);
    const messageValues: unknown[] = [conversationId, userId, content];
    const messageRows = ["($1,$2,'user',$3,NULL,NULL,NULL)"];
    for (const item of stored) {
      const offset = messageValues.length + 1;
      messageRows.push(`($1,$2,'assistant',$${offset},$${offset + 1},$${offset + 2},$${offset + 3})`);
      messageValues.push(item.message.content, item.provider, item.model, item.message.personaSlug);
    }
    await query(`INSERT INTO messages(conversation_id,user_id,role,content,model_provider,model_name,speaker_persona_slug)
      VALUES ${messageRows.join(",")}`, messageValues);
    for (const item of stored) {
      await trackConversation(userId, item.message.personaSlug ?? "", conversationId).catch(() => undefined);
    }

    if (allowance?.usage_date) {
      const provider = stored.at(-1)!.provider;
      const usage = measuredTokens > 0 ? { inputTokens: 0, outputTokens: 0, totalTokens: measuredTokens } : undefined;
      await recordAIUsage(userId, allowance.usage_date, { provider, usage }, Math.ceil(totalCharacters / 4)).catch(() => undefined);
    }
    return generated;
  } catch (error) {
    if (allowance?.allowed && allowance.usage_date) await releaseAIReservation(userId, allowance.usage_date).catch(() => undefined);
    throw error;
  }
}

export function fallbackOfficialRoom(slug: string) {
  return OFFICIAL_ROOMS.find((room) => room.slug === slug) ?? null;
}
