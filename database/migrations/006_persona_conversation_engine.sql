CREATE TABLE IF NOT EXISTS conversation_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id uuid REFERENCES conversations(id) ON DELETE SET NULL,
  persona_id text NOT NULL,
  title varchar(240) NOT NULL DEFAULT 'New conversation',
  relationship_level varchar(20) NOT NULL DEFAULT 'New' CHECK (relationship_level IN ('New','Familiar','Trusted','Close')),
  conversation_count integer NOT NULL DEFAULT 0,
  last_interaction timestamptz,
  favorite_topics text[] NOT NULL DEFAULT '{}',
  interaction_score integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS conversation_sessions_user_idx ON conversation_sessions(user_id,updated_at DESC);

CREATE TABLE IF NOT EXISTS user_memories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  persona_id text NOT NULL,
  memory_type varchar(20) NOT NULL DEFAULT 'long_term' CHECK (memory_type IN ('short_term','long_term','summary')),
  content text NOT NULL,
  source text NOT NULL DEFAULT 'conversation',
  relevance_score numeric(5,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS user_memories_user_persona_idx ON user_memories(user_id,persona_id,updated_at DESC);

CREATE TABLE IF NOT EXISTS persona_relationships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  persona_id text NOT NULL,
  relationship_level varchar(20) NOT NULL DEFAULT 'New' CHECK (relationship_level IN ('New','Familiar','Trusted','Close')),
  conversation_count integer NOT NULL DEFAULT 0,
  last_interaction timestamptz,
  favorite_topics text[] NOT NULL DEFAULT '{}',
  interaction_score integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id,persona_id)
);
CREATE INDEX IF NOT EXISTS persona_relationships_user_idx ON persona_relationships(user_id,persona_id);

CREATE TABLE IF NOT EXISTS conversation_summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  persona_id text NOT NULL,
  conversation_id uuid REFERENCES conversations(id) ON DELETE CASCADE,
  summary text NOT NULL,
  token_budget integer NOT NULL DEFAULT 300,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS conversation_summaries_user_idx ON conversation_summaries(user_id,persona_id,updated_at DESC);

CREATE TABLE IF NOT EXISTS persona_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  persona_id text NOT NULL,
  preferred_language text NOT NULL DEFAULT 'en',
  response_length varchar(20) NOT NULL DEFAULT 'balanced' CHECK (response_length IN ('short','balanced','detailed')),
  preferred_topics text[] NOT NULL DEFAULT '{}',
  memory_enabled boolean NOT NULL DEFAULT true,
  pro_only_behavior boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id,persona_id)
);
CREATE INDEX IF NOT EXISTS persona_preferences_user_idx ON persona_preferences(user_id,persona_id);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'conversation_sessions') THEN
    RAISE EXCEPTION 'conversation_sessions table was not created';
  END IF;
END $$;

ALTER TABLE conversation_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE persona_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE persona_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS conversation_sessions_owner ON conversation_sessions;
CREATE POLICY conversation_sessions_owner ON conversation_sessions FOR ALL USING(user_id = auth.uid()) WITH CHECK(user_id = auth.uid());
DROP POLICY IF EXISTS user_memories_owner ON user_memories;
CREATE POLICY user_memories_owner ON user_memories FOR ALL USING(user_id = auth.uid()) WITH CHECK(user_id = auth.uid());
DROP POLICY IF EXISTS persona_relationships_owner ON persona_relationships;
CREATE POLICY persona_relationships_owner ON persona_relationships FOR ALL USING(user_id = auth.uid()) WITH CHECK(user_id = auth.uid());
DROP POLICY IF EXISTS conversation_summaries_owner ON conversation_summaries;
CREATE POLICY conversation_summaries_owner ON conversation_summaries FOR ALL USING(user_id = auth.uid()) WITH CHECK(user_id = auth.uid());
DROP POLICY IF EXISTS persona_preferences_owner ON persona_preferences;
CREATE POLICY persona_preferences_owner ON persona_preferences FOR ALL USING(user_id = auth.uid()) WITH CHECK(user_id = auth.uid());

GRANT SELECT,INSERT,UPDATE,DELETE ON conversation_sessions,user_memories,persona_relationships,conversation_summaries,persona_preferences TO authenticated;
