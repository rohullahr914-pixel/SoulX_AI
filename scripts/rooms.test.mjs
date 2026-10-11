import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { load } from "./ai-module-loader.mjs";

const { OFFICIAL_ROOMS, roomPath, roomSlug } = load("src/lib/rooms.ts");
const { getPersonas } = load("src/lib/personas.ts");
const roomServer = load("src/lib/server/rooms.ts");
const { chooseRoomResponders } = roomServer;
const db = load("src/lib/server/db.ts");
const personaEngine = load("src/lib/ai/persona-engine.ts");
const migration = await readFile(new URL("../database/migrations/015_rooms.sql", import.meta.url), "utf8");

const geniusSlugs = new Set(OFFICIAL_ROOMS[0].personas.map((persona) => persona.slug));
const personas = getPersonas().filter((persona) => geniusSlugs.has(persona.slug));

test("official Rooms have valid unique slugs, covers, and participants", () => {
  assert.equal(OFFICIAL_ROOMS.length, 6);
  assert.equal(new Set(OFFICIAL_ROOMS.map((room) => room.slug)).size, OFFICIAL_ROOMS.length);
  for (const room of OFFICIAL_ROOMS) {
    assert.match(room.slug, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    assert.match(room.coverImage, /^\/rooms\/[a-z0-9-]+\.webp$/);
    assert.ok(room.personas.length >= 1 && room.personas.length <= 8);
  }
});

test("Room URLs safely encode slugs and generated slugs stay canonical", () => {
  assert.equal(roomSlug("  Future of AI & Humans!  "), "future-of-ai-humans");
  assert.equal(roomPath("private room/test"), "/room/private%20room%2Ftest");
});

test("explicit persona mentions direct the Room response", () => {
  const selected = chooseRoomResponders("@Einstein explain relativity", personas, []);
  assert.equal(selected[0].slug, "albert-einstein");
  assert.equal(selected.length, personas.length);
});

test("topic relevance orders the matching expert while every persona responds", () => {
  const selected = chooseRoomResponders("How does gravity affect motion?", personas, []);
  assert.equal(selected[0].slug, "isaac-newton");
  assert.equal(selected.length, personas.length);
});

test("Room migration protects private Rooms and private message streams", () => {
  assert.match(migration, /visibility = 'Public' OR creator_id = social_uid\(\)/);
  assert.match(migration, /conversations_room_member_idx ON conversations \(room_id, user_id\)/);
  assert.match(migration, /speaker_persona_slug text REFERENCES personas\(slug\)/);
  assert.match(migration, /ALTER TABLE rooms ENABLE ROW LEVEL SECURITY/);
  assert.match(migration, /ALTER TABLE room_personas ENABLE ROW LEVEL SECURITY/);
});

test("failed Room generation neither stores an unanswered message nor consumes a reservation", async () => {
  const originalQuery = db.query;
  const originalGenerate = personaEngine.generatePersonaResponse;
  const statements = [];
  db.query = async (statement) => {
    statements.push(statement);
    if (statement.includes("reserve_message")) return { rows: [{ allowed: true, reason: "ok", daily_limit: 5, usage_date: "2026-10-08" }], rowCount: 1 };
    if (statement.includes("INSERT INTO conversations")) return { rows: [{ id: "00000000-0000-4000-8000-000000000099" }], rowCount: 1 };
    return { rows: [], rowCount: 0 };
  };
  personaEngine.generatePersonaResponse = async () => ({ ok: false, error: "provider unavailable" });
  try {
    const room = { ...OFFICIAL_ROOMS[0], id: "00000000-0000-4000-8000-000000000098", personas };
    await assert.rejects(roomServer.sendRoomMessage("00000000-0000-4000-8000-000000000001", room, "Explain gravity"), /not every Room participant/i);
    assert.equal(statements.some((statement) => statement.includes("INSERT INTO messages")), false);
    assert.equal(statements.some((statement) => statement.includes("UPDATE usage SET messages_used=messages_used-1")), true);
  } finally {
    db.query = originalQuery;
    personaEngine.generatePersonaResponse = originalGenerate;
  }
});

test("a successful Room round generates and stores one answer from every persona", async () => {
  const originalQuery = db.query;
  const originalGenerate = personaEngine.generatePersonaResponse;
  const statements = [];
  let generationCount = 0;
  db.query = async (statement) => {
    statements.push(statement);
    if (statement.includes("reserve_message")) return { rows: [{ allowed: true, reason: "ok", daily_limit: 5, usage_date: "2026-10-08" }], rowCount: 1 };
    if (statement.includes("INSERT INTO conversations")) return { rows: [{ id: "00000000-0000-4000-8000-000000000099" }], rowCount: 1 };
    return { rows: [], rowCount: 0 };
  };
  personaEngine.generatePersonaResponse = async ({ personaSlug }) => {
    generationCount += 1;
    return { ok: true, content: `${personaSlug} perspective`, provider: "groq", model: "test", usage: { inputTokens: 2, outputTokens: 3, totalTokens: 5 } };
  };
  try {
    const room = { ...OFFICIAL_ROOMS[0], id: "00000000-0000-4000-8000-000000000098", personas };
    const messages = await roomServer.sendRoomMessage("00000000-0000-4000-8000-000000000001", room, "Science or love?");
    assert.equal(generationCount, personas.length);
    assert.equal(messages.length, personas.length);
    assert.deepEqual(new Set(messages.map((message) => message.personaSlug)), new Set(personas.map((persona) => persona.slug)));
    assert.equal(statements.filter((statement) => statement.includes("INSERT INTO messages")).length, 1);
  } finally {
    db.query = originalQuery;
    personaEngine.generatePersonaResponse = originalGenerate;
  }
});
