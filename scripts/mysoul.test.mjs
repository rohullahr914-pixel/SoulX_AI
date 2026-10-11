import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const migration = await readFile(new URL("../database/migrations/018_mysoul.sql", import.meta.url), "utf8");
const onboardingMigration = await readFile(new URL("../database/migrations/019_mysoul_onboarding_completed.sql", import.meta.url), "utf8");
const coreSource = await readFile(new URL("../src/lib/mysoul.ts", import.meta.url), "utf8");
const coreJs = ts.transpileModule(coreSource, { compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 } }).outputText;
const core = await import(`data:text/javascript;base64,${Buffer.from(coreJs).toString("base64")}`);
const { categorizeMySoulTopic, repairFalseUnknownAnswer, retrieveMysoulFacts, shouldReturnUnknown } = core;

test("unknown favorite questions do not retrieve unrelated personal facts", () => {
  const facts = [
    { source: "interest", priority: 3, category: "Technology", text: "love programming" },
    { source: "profile", priority: 1, category: "occupation", text: "software developer" },
  ];
  const question = "What is my favorite football team?";
  const retrieved = retrieveMysoulFacts(question, facts);
  assert.deepEqual(retrieved, []);
  assert.equal(shouldReturnUnknown(question, retrieved.length), true);
});

test("profile retrieval matches location questions to location fields only", () => {
  const unrelated = [{ source: "profile", priority: 1, category: "occupation", text: "software developer" }];
  assert.deepEqual(retrieveMysoulFacts("Where do I live?", unrelated), []);

  const location = [{ source: "profile", priority: 1, category: "city", text: "Kabul" }];
  assert.deepEqual(retrieveMysoulFacts("Where do I live?", location).map((fact) => fact.text), ["Kabul"]);
});

test("a model cannot claim ignorance when an approved fact answers the question", () => {
  const facts = [{ source: "knowledge", priority: 6, category: "Favorites", text: "My favorite color is blue." }];
  assert.equal(repairFalseUnknownAnswer("I haven't shared much about that yet.", facts), "My favorite color is blue.");
  assert.equal(repairFalseUnknownAnswer("I haven't shared much about that yet.", []), "I haven't shared much about that yet.");
});

test("coarse topic analytics do not retain visitor message text", () => {
  assert.equal(categorizeMySoulTopic("What goals are you working toward?"), "goals");
  assert.equal(categorizeMySoulTopic("Tell me something personal I have not asked before."), "general");
});

test("database privacy policies restrict facts, samples, and saved messages", () => {
  assert.match(migration, /CREATE POLICY mysouls_select ON mysouls FOR SELECT USING\(user_id=auth\.uid\(\)\)/);
  assert.match(migration, /CREATE POLICY mysoul_training_samples_owner ON mysoul_training_samples FOR ALL USING\(public\.mysoul_owner\(mysoul_id\)\)/);
  assert.match(migration, /visitor_consented_to_history AND\s+\(c\.owner_user_id=auth\.uid\(\) OR c\.visitor_user_id=auth\.uid\(\)\)/);
  assert.match(migration, /record_visibility='public'/);
  assert.match(migration, /record_visibility='friends'[\s\S]*mysoul_is_friend\(m\.user_id\)/);
  assert.match(migration, /REVOKE ALL ON FUNCTION public\.mysoul_record_topic\(uuid,text\) FROM PUBLIC,anon,authenticated/);
});

test("every MySoul table enables row level security", () => {
  const tables = [...migration.matchAll(/CREATE TABLE IF NOT EXISTS (mysoul\w+)/g)].map((match) => match[1]);
  const dynamicPolicyTables = migration.match(/FOREACH t IN ARRAY ARRAY\[(.*?)\] LOOP/s)?.[1] ?? "";
  assert.ok(tables.length > 0);
  for (const table of tables) {
    assert.ok(migration.includes(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY`) || dynamicPolicyTables.includes(`'${table}'`), `${table} does not enable RLS`);
  }
});

test("existing MySoul tables gain the onboarding completion column", () => {
  assert.match(onboardingMigration, /ALTER TABLE public\.mysouls\s+ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT false/i);
});
