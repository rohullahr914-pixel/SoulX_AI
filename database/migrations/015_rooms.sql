-- Rooms extend the existing conversation and message store. There is deliberately no
-- second message table: each member keeps one private Room conversation stream.
CREATE TABLE IF NOT EXISTS rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name varchar(120) NOT NULL CHECK (length(btrim(name)) BETWEEN 2 AND 120),
  slug varchar(100) NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  description varchar(1000) NOT NULL DEFAULT '',
  topic varchar(1000) NOT NULL DEFAULT '',
  cover_image text NOT NULL,
  visibility varchar(10) NOT NULL DEFAULT 'Private' CHECK (visibility IN ('Public','Private')),
  is_official boolean NOT NULL DEFAULT false,
  starter_prompt text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((is_official AND creator_id IS NULL) OR (NOT is_official AND creator_id IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS rooms_discovery_idx ON rooms (is_official DESC, visibility, updated_at DESC);
CREATE INDEX IF NOT EXISTS rooms_creator_idx ON rooms (creator_id, updated_at DESC) WHERE creator_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS room_personas (
  room_id uuid NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  persona_slug text NOT NULL REFERENCES personas(slug) ON DELETE RESTRICT,
  position smallint NOT NULL CHECK (position >= 0 AND position < 12),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (room_id, persona_slug),
  UNIQUE (room_id, position)
);
CREATE INDEX IF NOT EXISTS room_personas_persona_idx ON room_personas (persona_slug, room_id);

-- Reuse the original chat architecture. persona_id continues to support legacy chats;
-- room_id identifies the Room and speaker_persona_slug identifies assistant turns.
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS room_id uuid REFERENCES rooms(id) ON DELETE CASCADE;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS speaker_persona_slug text REFERENCES personas(slug) ON DELETE SET NULL;
CREATE UNIQUE INDEX IF NOT EXISTS conversations_room_member_idx ON conversations (room_id, user_id) WHERE room_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS conversations_room_updated_idx ON conversations (room_id, user_id, updated_at DESC) WHERE room_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS messages_room_speaker_idx ON messages (speaker_persona_slug, created_at DESC) WHERE speaker_persona_slug IS NOT NULL;

CREATE OR REPLACE FUNCTION public.room_visible(target_room uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM rooms r
    WHERE r.id = target_room
      AND (r.is_official OR r.visibility = 'Public' OR r.creator_id = social_uid())
  )
$$;

ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_personas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rooms_read ON rooms;
CREATE POLICY rooms_read ON rooms FOR SELECT
  USING (is_official OR visibility = 'Public' OR creator_id = social_uid());
DROP POLICY IF EXISTS rooms_create ON rooms;
CREATE POLICY rooms_create ON rooms FOR INSERT
  WITH CHECK (creator_id = social_uid() AND NOT is_official);
DROP POLICY IF EXISTS rooms_update ON rooms;
CREATE POLICY rooms_update ON rooms FOR UPDATE
  USING (creator_id = social_uid() AND NOT is_official)
  WITH CHECK (creator_id = social_uid() AND NOT is_official);
DROP POLICY IF EXISTS rooms_delete ON rooms;
CREATE POLICY rooms_delete ON rooms FOR DELETE
  USING (creator_id = social_uid() AND NOT is_official);
DROP POLICY IF EXISTS room_personas_read ON room_personas;
CREATE POLICY room_personas_read ON room_personas FOR SELECT USING (room_visible(room_id));
DROP POLICY IF EXISTS room_personas_write ON room_personas;
CREATE POLICY room_personas_write ON room_personas FOR ALL
  USING (EXISTS (SELECT 1 FROM rooms r WHERE r.id = room_id AND r.creator_id = social_uid() AND NOT r.is_official))
  WITH CHECK (EXISTS (SELECT 1 FROM rooms r WHERE r.id = room_id AND r.creator_id = social_uid() AND NOT r.is_official));

GRANT SELECT ON rooms, room_personas TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON rooms, room_personas TO authenticated;

-- Ensure every official Room participant has a real persona row for foreign keys and
-- direct Supabase reads. Existing personas are never overwritten.
INSERT INTO personas(slug,name,description,visibility,challenge_enabled) VALUES
  ('albert-einstein','Albert Einstein','Physics, thought experiments, and humane curiosity.','Public',true),
  ('nikola-tesla','Nikola Tesla','Energy, invention, and the architecture of tomorrow.','Public',true),
  ('leonardo-da-vinci','Leonardo da Vinci','Art, engineering, and the discipline of seeing differently.','Public',true),
  ('isaac-newton','Isaac Newton','Physics, mathematics, and the laws that govern motion.','Public',true),
  ('sherlock-holmes','Sherlock Holmes','Observation, logic, and the clues everyone else misses.','Public',true),
  ('hercule-poirot','Hercule Poirot','Method, psychology, and the order hidden in a case.','Public',true),
  ('edgar-allan-poe','Edgar Allan Poe','Mystery, deduction, and the shadows of human nature.','Public',true),
  ('alexander-the-great','Alexander the Great','Leadership, strategy, and the courage to move first.','Public',true),
  ('julius-caesar','Julius Caesar','Strategy, political power, and decisive action.','Public',true),
  ('napoleon-bonaparte','Napoleon Bonaparte','Strategy, organization, and the costs of ambition.','Public',true),
  ('abraham-lincoln','Abraham Lincoln','Truth, ethics, and leadership under pressure.','Public',true),
  ('socrates','Socrates','Questions that examine belief, virtue, and knowledge.','Public',true),
  ('plato','Plato','Justice, knowledge, education, and the ideal society.','Public',true),
  ('marcus-aurelius','Marcus Aurelius','Stoicism, duty, and leadership under pressure.','Public',true),
  ('fyodor-dostoevsky','Fyodor Dostoevsky','Morality, freedom, suffering, and human contradiction.','Public',true),
  ('vincent-van-gogh','Vincent van Gogh','Color, emotional honesty, and the courage to create.','Public',true),
  ('william-shakespeare','William Shakespeare','Language, drama, character, and the human condition.','Public',true),
  ('wolfgang-amadeus-mozart','Wolfgang Amadeus Mozart','Music, form, imagination, and joyful craft.','Public',true),
  ('orion-vale','Orion Vale','A future strategist for civilization beyond Earth.','Public',true),
  ('nova-chen','Dr. Nova Chen','A future scientist exploring intelligence and planetary systems.','Public',true),
  ('aion','AION','An artificial intelligence perspective on reasoning and coexistence.','Public',true),
  ('lyra-voss','Lyra Voss','A future explorer of culture, space, and human possibility.','Public',true),
  ('mira-sol','Mira Sol','A future designer of humane systems and new societies.','Public',true),
  ('eva-9','EVA-9','A synthetic diplomat for AI and human futures.','Public',true)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO rooms(name,slug,description,topic,cover_image,visibility,is_official,starter_prompt) VALUES
  ('Genius Room','genius-room','Minds That Changed the World','Science · Invention · Physics · Future','/rooms/genius-room.webp','Public',true,'What invention could change humanity forever?'),
  ('Mystery Room','mystery-room','The Great Investigation','Mystery · Logic · Investigation','/rooms/mystery-room.webp','Public',true,'A mysterious case has arrived. Can you solve it together?'),
  ('Leaders Room','leaders-room','The Strategy Table','History · Leadership · Strategy','/rooms/leaders-room.webp','Public',true,'What makes a leader powerful enough to change history?'),
  ('Philosophy Room','philosophy-room','The Meaning of Life','Philosophy · Life · Ethics · Human Nature','/rooms/philosophy-room.webp','Public',true,'What makes a human life meaningful?'),
  ('Creators Room','creators-room','Imagine the Impossible','Art · Creativity · Literature · Music','/rooms/creators-room.webp','Public',true,'Where does true creativity come from?'),
  ('Future Room','future-room','Humanity 2200','AI · Space · Humanity · Future','/rooms/future-room.webp','Public',true,'What will human civilization look like in the year 2200?')
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name, description = EXCLUDED.description, topic = EXCLUDED.topic,
  cover_image = EXCLUDED.cover_image, visibility = 'Public', starter_prompt = EXCLUDED.starter_prompt,
  updated_at = now()
WHERE rooms.is_official;

WITH seeds(room_slug,persona_slug,position) AS (VALUES
  ('genius-room','albert-einstein',0),('genius-room','nikola-tesla',1),('genius-room','leonardo-da-vinci',2),('genius-room','isaac-newton',3),
  ('mystery-room','sherlock-holmes',0),('mystery-room','hercule-poirot',1),('mystery-room','edgar-allan-poe',2),
  ('leaders-room','alexander-the-great',0),('leaders-room','julius-caesar',1),('leaders-room','napoleon-bonaparte',2),('leaders-room','abraham-lincoln',3),
  ('philosophy-room','socrates',0),('philosophy-room','plato',1),('philosophy-room','marcus-aurelius',2),('philosophy-room','fyodor-dostoevsky',3),
  ('creators-room','leonardo-da-vinci',0),('creators-room','vincent-van-gogh',1),('creators-room','william-shakespeare',2),('creators-room','wolfgang-amadeus-mozart',3),
  ('future-room','orion-vale',0),('future-room','nova-chen',1),('future-room','aion',2),('future-room','lyra-voss',3),('future-room','mira-sol',4),('future-room','eva-9',5)
)
INSERT INTO room_personas(room_id,persona_slug,position)
SELECT r.id,s.persona_slug,s.position FROM seeds s JOIN rooms r ON r.slug=s.room_slug
ON CONFLICT (room_id,persona_slug) DO UPDATE SET position=EXCLUDED.position;
