import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import nextEnv from "@next/env";
import { createClient } from "@supabase/supabase-js";

const { loadEnvConfig } = nextEnv;

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
loadEnvConfig(root);

const baseUrl = process.env.TEST_BASE_URL ?? "http://localhost:3011";
const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
assert.ok(supabaseUrl && serviceKey, "Supabase admin configuration is required.");

const admin = createClient(supabaseUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
const suffix = `${Date.now()}${randomBytes(4).toString("hex")}`;
const email = `mysoul-e2e-${suffix}@example.invalid`;
const username = `mysoul-e2e-${suffix}`.slice(0, 40);
const password = `SoulX-${randomBytes(18).toString("base64url")}!`;
let userId;

function cookiesFrom(response) {
  const values = typeof response.headers.getSetCookie === "function" ? response.headers.getSetCookie() : [];
  return values.map((value) => value.split(";", 1)[0]).join("; ");
}

async function request(pathname, init = {}, cookie = "") {
  const response = await fetch(`${baseUrl}${pathname}`, {
    ...init,
    headers: {
      Origin: baseUrl,
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(cookie ? { Cookie: cookie } : {}),
      ...init.headers,
    },
  });
  const data = await response.json().catch(() => ({}));
  return { response, data };
}

try {
  const created = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: "MySoul E2E User" } });
  if (created.error || !created.data.user) throw created.error ?? new Error("Could not create the temporary test account.");
  userId = created.data.user.id;
  const profile = await admin.from("profiles").upsert({
    id: userId,
    email,
    full_name: "MySoul E2E User",
    display_name: "MySoul E2E User",
    username,
  }, { onConflict: "id" });
  if (profile.error) throw profile.error;

  const login = await request("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
  assert.equal(login.response.status, 200, `Login failed: ${JSON.stringify(login.data)}`);
  const cookie = cookiesFrom(login.response);
  assert.ok(cookie.includes("personax_sb_access="), "Login did not issue the access cookie.");

  const creation = await request("/api/mysoul", { method: "POST", body: "{}" }, cookie);
  assert.equal(creation.response.status, 201, `MySoul creation failed: ${JSON.stringify(creation.data)}`);
  assert.equal(creation.data.soul.user_id, userId);

  const update = await request("/api/mysoul", {
    method: "PATCH",
    body: JSON.stringify({
      display_name: "MySoul E2E",
      display_name_visibility: "public",
      enabled: true,
      public_enabled: true,
      allow_public_conversations: true,
      onboarding_completed: true,
    }),
  }, cookie);
  assert.equal(update.response.status, 200, `MySoul update failed: ${JSON.stringify(update.data)}`);

  const fact = await request("/api/mysoul/records", {
    method: "POST",
    body: JSON.stringify({ collection: "knowledge", record: { category: "Favorites", content: "My favorite color is blue.", visibility: "public", importance: 5 } }),
  }, cookie);
  assert.equal(fact.response.status, 200, `MySoul fact creation failed: ${JSON.stringify(fact.data)}`);

  const publicProfile = await request(`/api/mysoul/public/${encodeURIComponent(username)}`, {}, cookie);
  assert.equal(publicProfile.response.status, 200, `Public MySoul failed: ${JSON.stringify(publicProfile.data)}`);
  assert.equal(publicProfile.data.profile.canChat, true);

  const dashboard = await request("/api/mysoul", {}, cookie);
  assert.equal(dashboard.response.status, 200, `MySoul dashboard failed: ${JSON.stringify(dashboard.data)}`);
  assert.equal(dashboard.data.dashboard.soul.user_id, userId);
  assert.ok(dashboard.data.dashboard.records.knowledge.some((item) => item.content === "My favorite color is blue."));

  const chat = await request("/api/mysoul/chat", {
    method: "POST",
    body: JSON.stringify({ username, message: "What is my favorite color?", history: [], started: true }),
  }, cookie);
  assert.equal(chat.response.status, 200, `MySoul chat failed: ${JSON.stringify(chat.data)}`);
  assert.equal(typeof chat.data.answer, "string");
  assert.match(chat.data.answer, /blue/i, `MySoul answer did not use the approved fact: ${chat.data.answer}`);

  console.log(JSON.stringify({ ok: true, creation: true, publicProfile: true, chat: true, approvedFactUsed: true }));
} finally {
  if (userId) {
    const removed = await admin.auth.admin.deleteUser(userId);
    if (removed.error) console.error("Temporary MySoul test account cleanup failed.");
  }
}
