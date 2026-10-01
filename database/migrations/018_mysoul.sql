-- MySoul: isolated personal identity, privacy-filtered facts, and opt-in chat history.
CREATE TABLE IF NOT EXISTS mysouls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL DEFAULT '',
  nickname text NOT NULL DEFAULT '',
  pronouns text NOT NULL DEFAULT '',
  languages jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(languages) = 'array'),
  occupation text NOT NULL DEFAULT '',
  education text NOT NULL DEFAULT '',
  country text NOT NULL DEFAULT '',
  city text NOT NULL DEFAULT '',
  headline text NOT NULL DEFAULT '',
  about text NOT NULL DEFAULT '',
  avatar_url text,
  preferred_language text NOT NULL DEFAULT '',
  secondary_language text NOT NULL DEFAULT '',
  display_name_visibility text NOT NULL DEFAULT 'private' CHECK(display_name_visibility IN ('private','friends','public')),
  avatar_url_visibility text NOT NULL DEFAULT 'private' CHECK(avatar_url_visibility IN ('private','friends','public')),
  nickname_visibility text NOT NULL DEFAULT 'private' CHECK(nickname_visibility IN ('private','friends','public')),
  pronouns_visibility text NOT NULL DEFAULT 'private' CHECK(pronouns_visibility IN ('private','friends','public')),
  languages_visibility text NOT NULL DEFAULT 'private' CHECK(languages_visibility IN ('private','friends','public')),
  occupation_visibility text NOT NULL DEFAULT 'private' CHECK(occupation_visibility IN ('private','friends','public')),
  education_visibility text NOT NULL DEFAULT 'private' CHECK(education_visibility IN ('private','friends','public')),
  country_visibility text NOT NULL DEFAULT 'private' CHECK(country_visibility IN ('private','friends','public')),
  city_visibility text NOT NULL DEFAULT 'private' CHECK(city_visibility IN ('private','friends','public')),
  headline_visibility text NOT NULL DEFAULT 'private' CHECK(headline_visibility IN ('private','friends','public')),
  about_visibility text NOT NULL DEFAULT 'private' CHECK(about_visibility IN ('private','friends','public')),
  enabled boolean NOT NULL DEFAULT false,
  public_enabled boolean NOT NULL DEFAULT false,
  allow_public_conversations boolean NOT NULL DEFAULT true,
  allow_followers boolean NOT NULL DEFAULT false,
  allow_friends boolean NOT NULL DEFAULT false,
  show_on_profile boolean NOT NULL DEFAULT false,
  allow_conversation_history boolean NOT NULL DEFAULT false,
  save_visitor_chats boolean NOT NULL DEFAULT false,
  allow_ai_interactions boolean NOT NULL DEFAULT false,
  onboarding_completed boolean NOT NULL DEFAULT false,
  default_visibility text NOT NULL DEFAULT 'private' CHECK (default_visibility IN ('private','friends','public')),
  completion_score integer NOT NULL DEFAULT 0 CHECK (completion_score BETWEEN 0 AND 100),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS mysouls_user_idx ON mysouls(user_id);
CREATE INDEX IF NOT EXISTS mysouls_public_idx ON mysouls(user_id) WHERE enabled AND public_enabled AND show_on_profile;

CREATE TABLE IF NOT EXISTS mysoul_traits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), mysoul_id uuid NOT NULL REFERENCES mysouls(id) ON DELETE CASCADE,
  trait text NOT NULL CHECK(length(trait) BETWEEN 1 AND 100), strength integer NOT NULL DEFAULT 3 CHECK(strength BETWEEN 1 AND 5),
  visibility text NOT NULL DEFAULT 'private' CHECK(visibility IN ('private','friends','public')), created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(mysoul_id,trait)
);
CREATE TABLE IF NOT EXISTS mysoul_personality_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), mysoul_id uuid NOT NULL REFERENCES mysouls(id) ON DELETE CASCADE,
  question_key text NOT NULL CHECK(length(question_key) BETWEEN 1 AND 80), answer text NOT NULL CHECK(length(answer) <= 4000),
  visibility text NOT NULL DEFAULT 'private' CHECK(visibility IN ('private','friends','public')), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(mysoul_id,question_key)
);
CREATE TABLE IF NOT EXISTS mysoul_interests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), mysoul_id uuid NOT NULL REFERENCES mysouls(id) ON DELETE CASCADE,
  category text NOT NULL CHECK(length(category) BETWEEN 1 AND 80), interest text NOT NULL CHECK(length(interest) BETWEEN 1 AND 160),
  sentiment text NOT NULL DEFAULT 'like' CHECK(sentiment IN ('like','love','neutral','dislike')), intensity integer NOT NULL DEFAULT 3 CHECK(intensity BETWEEN 1 AND 5),
  visibility text NOT NULL DEFAULT 'private' CHECK(visibility IN ('private','friends','public')), created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(mysoul_id,interest)
);
CREATE TABLE IF NOT EXISTS mysoul_values (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), mysoul_id uuid NOT NULL REFERENCES mysouls(id) ON DELETE CASCADE,
  value text NOT NULL CHECK(length(value) BETWEEN 1 AND 120), importance integer NOT NULL DEFAULT 3 CHECK(importance BETWEEN 1 AND 5),
  description text NOT NULL DEFAULT '' CHECK(length(description) <= 2000), visibility text NOT NULL DEFAULT 'private' CHECK(visibility IN ('private','friends','public')),
  created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(mysoul_id,value)
);
CREATE TABLE IF NOT EXISTS mysoul_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), mysoul_id uuid NOT NULL REFERENCES mysouls(id) ON DELETE CASCADE,
  category text NOT NULL CHECK(length(category) BETWEEN 1 AND 80), goal text NOT NULL CHECK(length(goal) BETWEEN 1 AND 240),
  description text NOT NULL DEFAULT '' CHECK(length(description) <= 3000), priority integer NOT NULL DEFAULT 3 CHECK(priority BETWEEN 1 AND 5),
  status text NOT NULL DEFAULT 'Dream' CHECK(status IN ('Dream','Planning','Working On It','Achieved')), target_date date,
  visibility text NOT NULL DEFAULT 'private' CHECK(visibility IN ('private','friends','public')), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS mysoul_memories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), mysoul_id uuid NOT NULL REFERENCES mysouls(id) ON DELETE CASCADE,
  title text NOT NULL CHECK(length(title) BETWEEN 1 AND 200), memory text NOT NULL CHECK(length(memory) BETWEEN 1 AND 10000),
  memory_date date, emotion text NOT NULL DEFAULT '' CHECK(length(emotion) <= 100), location text NOT NULL DEFAULT '' CHECK(length(location) <= 200),
  people_involved jsonb NOT NULL DEFAULT '[]'::jsonb CHECK(jsonb_typeof(people_involved) = 'array'),
  visibility text NOT NULL DEFAULT 'private' CHECK(visibility IN ('private','friends','public')), embedding jsonb,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS mysoul_people (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), mysoul_id uuid NOT NULL REFERENCES mysouls(id) ON DELETE CASCADE,
  name text NOT NULL CHECK(length(name) BETWEEN 1 AND 160), relationship text NOT NULL DEFAULT '' CHECK(length(relationship) <= 120),
  description text NOT NULL DEFAULT '' CHECK(length(description) <= 3000), why_important text NOT NULL DEFAULT '' CHECK(length(why_important) <= 2000),
  importance integer NOT NULL DEFAULT 3 CHECK(importance BETWEEN 1 AND 5), visibility text NOT NULL DEFAULT 'private' CHECK(visibility IN ('private','friends','public')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS mysoul_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), mysoul_id uuid NOT NULL REFERENCES mysouls(id) ON DELETE CASCADE,
  category text NOT NULL CHECK(length(category) BETWEEN 1 AND 80), key text NOT NULL CHECK(length(key) BETWEEN 1 AND 120),
  value text NOT NULL CHECK(length(value) BETWEEN 1 AND 2000), sentiment text NOT NULL DEFAULT 'like' CHECK(sentiment IN ('like','love','neutral','dislike')),
  visibility text NOT NULL DEFAULT 'private' CHECK(visibility IN ('private','friends','public')), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(mysoul_id,category,key)
);
CREATE TABLE IF NOT EXISTS mysoul_communication_profile (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), mysoul_id uuid NOT NULL UNIQUE REFERENCES mysouls(id) ON DELETE CASCADE,
  formality integer CHECK(formality BETWEEN 1 AND 10), humor integer CHECK(humor BETWEEN 1 AND 10), emoji_usage integer CHECK(emoji_usage BETWEEN 1 AND 10),
  directness integer CHECK(directness BETWEEN 1 AND 10), response_length text NOT NULL DEFAULT 'medium' CHECK(response_length IN ('short','medium','long')),
  tone jsonb NOT NULL DEFAULT '[]'::jsonb CHECK(jsonb_typeof(tone) = 'array'), favorite_expressions jsonb NOT NULL DEFAULT '[]'::jsonb CHECK(jsonb_typeof(favorite_expressions) = 'array'),
  language_patterns jsonb NOT NULL DEFAULT '{}'::jsonb CHECK(jsonb_typeof(language_patterns) = 'object'), style_summary text NOT NULL DEFAULT '' CHECK(length(style_summary) <= 3000),
  visibility text NOT NULL DEFAULT 'private' CHECK(visibility IN ('private','friends','public')), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS mysoul_training_samples (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), mysoul_id uuid NOT NULL REFERENCES mysouls(id) ON DELETE CASCADE,
  content text NOT NULL CHECK(length(content) BETWEEN 1 AND 12000), sample_type text NOT NULL DEFAULT 'message' CHECK(length(sample_type) <= 80), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS mysoul_knowledge (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), mysoul_id uuid NOT NULL REFERENCES mysouls(id) ON DELETE CASCADE,
  category text NOT NULL CHECK(length(category) BETWEEN 1 AND 80), content text NOT NULL CHECK(length(content) BETWEEN 1 AND 6000),
  structured_data jsonb NOT NULL DEFAULT '{}'::jsonb CHECK(jsonb_typeof(structured_data) = 'object'), visibility text NOT NULL DEFAULT 'private' CHECK(visibility IN ('private','friends','public')),
  importance integer NOT NULL DEFAULT 3 CHECK(importance BETWEEN 1 AND 5), embedding jsonb, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS mysoul_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), mysoul_id uuid NOT NULL REFERENCES mysouls(id) ON DELETE CASCADE,
  visitor_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL, owner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  visitor_consented_to_history boolean NOT NULL DEFAULT false, visitor_key_hash text,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS mysoul_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), conversation_id uuid NOT NULL REFERENCES mysoul_conversations(id) ON DELETE CASCADE,
  role text NOT NULL CHECK(role IN ('user','assistant')), content text NOT NULL CHECK(length(content) BETWEEN 1 AND 12000), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS mysoul_teaching_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), mysoul_id uuid NOT NULL REFERENCES mysouls(id) ON DELETE CASCADE,
  user_input text NOT NULL CHECK(length(user_input) BETWEEN 1 AND 6000), extracted_data jsonb NOT NULL DEFAULT '{}'::jsonb CHECK(jsonb_typeof(extracted_data) = 'object'),
  accepted boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS mysoul_analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), mysoul_id uuid NOT NULL REFERENCES mysouls(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK(event_type IN ('mysoul_created','mysoul_updated','mysoul_chat_started','mysoul_message_sent','mysoul_teaching_added','mysoul_public_enabled')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS mysoul_topic_analytics (
  mysoul_id uuid NOT NULL REFERENCES mysouls(id) ON DELETE CASCADE,
  topic_category text NOT NULL CHECK(topic_category IN ('interests','preferences','goals','memories','work_education','personality','general')),
  question_count bigint NOT NULL DEFAULT 0 CHECK(question_count >= 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(mysoul_id,topic_category)
);
CREATE TABLE IF NOT EXISTS mysoul_daily_usage (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, usage_date date NOT NULL DEFAULT current_date,
  messages_used integer NOT NULL DEFAULT 0 CHECK(messages_used >= 0), PRIMARY KEY(user_id,usage_date)
);
CREATE TABLE IF NOT EXISTS mysoul_rate_limits (
  bucket_key text PRIMARY KEY CHECK(length(bucket_key) BETWEEN 1 AND 128), window_started_at timestamptz NOT NULL,
  request_count integer NOT NULL CHECK(request_count >= 0)
);
CREATE INDEX IF NOT EXISTS mysoul_rate_limits_expiry_idx ON mysoul_rate_limits(window_started_at);
CREATE INDEX IF NOT EXISTS mysoul_daily_usage_expiry_idx ON mysoul_daily_usage(usage_date);

CREATE INDEX IF NOT EXISTS mysoul_traits_parent_idx ON mysoul_traits(mysoul_id,visibility);
CREATE INDEX IF NOT EXISTS mysoul_personality_answers_parent_idx ON mysoul_personality_answers(mysoul_id,visibility);
CREATE INDEX IF NOT EXISTS mysoul_interests_parent_idx ON mysoul_interests(mysoul_id,visibility);
CREATE INDEX IF NOT EXISTS mysoul_values_parent_idx ON mysoul_values(mysoul_id,visibility);
CREATE INDEX IF NOT EXISTS mysoul_goals_parent_idx ON mysoul_goals(mysoul_id,visibility,created_at DESC);
CREATE INDEX IF NOT EXISTS mysoul_memories_parent_idx ON mysoul_memories(mysoul_id,visibility,created_at DESC);
CREATE INDEX IF NOT EXISTS mysoul_people_parent_idx ON mysoul_people(mysoul_id,visibility);
CREATE INDEX IF NOT EXISTS mysoul_preferences_parent_idx ON mysoul_preferences(mysoul_id,visibility);
CREATE INDEX IF NOT EXISTS mysoul_knowledge_parent_idx ON mysoul_knowledge(mysoul_id,visibility,importance DESC);
CREATE INDEX IF NOT EXISTS mysoul_samples_parent_idx ON mysoul_training_samples(mysoul_id,created_at DESC);
CREATE INDEX IF NOT EXISTS mysoul_conversations_owner_idx ON mysoul_conversations(mysoul_id,created_at DESC);
CREATE INDEX IF NOT EXISTS mysoul_messages_conversation_idx ON mysoul_messages(conversation_id,created_at);
CREATE INDEX IF NOT EXISTS mysoul_analytics_parent_idx ON mysoul_analytics_events(mysoul_id,created_at DESC);
CREATE INDEX IF NOT EXISTS mysoul_topic_analytics_parent_idx ON mysoul_topic_analytics(mysoul_id,question_count DESC);

CREATE OR REPLACE FUNCTION public.mysoul_is_friend(target_user uuid, viewer uuid DEFAULT auth.uid()) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT viewer IS NOT NULL AND viewer=auth.uid() AND EXISTS(
    SELECT 1 FROM user_follows a JOIN user_follows b ON b.user_id=a.creator_id AND b.creator_id=a.user_id
    WHERE a.user_id=viewer AND a.creator_id=target_user
  )
$$;
CREATE OR REPLACE FUNCTION public.mysoul_can_read(target_mysoul uuid, record_visibility text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT EXISTS(
    SELECT 1 FROM mysouls m WHERE m.id=target_mysoul AND (
      m.user_id=auth.uid() OR (m.enabled AND m.public_enabled AND record_visibility='public') OR
      (m.enabled AND record_visibility='friends' AND (
        (m.allow_friends AND mysoul_is_friend(m.user_id)) OR
        (m.allow_followers AND EXISTS(SELECT 1 FROM user_follows f WHERE f.user_id=auth.uid() AND f.creator_id=m.user_id))
      ))
    )
  )
$$;
CREATE OR REPLACE FUNCTION public.mysoul_owner(target_mysoul uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT EXISTS(SELECT 1 FROM mysouls WHERE id=target_mysoul AND user_id=auth.uid()) $$;

ALTER TABLE mysouls ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS mysouls_select ON mysouls;
CREATE POLICY mysouls_select ON mysouls FOR SELECT USING(user_id=auth.uid());
DROP POLICY IF EXISTS mysouls_insert ON mysouls;
CREATE POLICY mysouls_insert ON mysouls FOR INSERT WITH CHECK(user_id=auth.uid());
DROP POLICY IF EXISTS mysouls_update ON mysouls;
CREATE POLICY mysouls_update ON mysouls FOR UPDATE USING(user_id=auth.uid()) WITH CHECK(user_id=auth.uid());
DROP POLICY IF EXISTS mysouls_delete ON mysouls;
CREATE POLICY mysouls_delete ON mysouls FOR DELETE USING(user_id=auth.uid());

DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['mysoul_traits','mysoul_personality_answers','mysoul_interests','mysoul_values','mysoul_goals','mysoul_memories','mysoul_people','mysoul_preferences','mysoul_knowledge'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY',t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I',t||'_select',t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I',t||'_insert',t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I',t||'_update',t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I',t||'_delete',t);
    EXECUTE format('CREATE POLICY %I ON %I FOR SELECT USING(public.mysoul_can_read(mysoul_id,visibility))',t||'_select',t);
    EXECUTE format('CREATE POLICY %I ON %I FOR INSERT WITH CHECK(public.mysoul_owner(mysoul_id))',t||'_insert',t);
    EXECUTE format('CREATE POLICY %I ON %I FOR UPDATE USING(public.mysoul_owner(mysoul_id)) WITH CHECK(public.mysoul_owner(mysoul_id))',t||'_update',t);
    EXECUTE format('CREATE POLICY %I ON %I FOR DELETE USING(public.mysoul_owner(mysoul_id))',t||'_delete',t);
  END LOOP;
END $$;

ALTER TABLE mysoul_communication_profile ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS mysoul_communication_profile_select ON mysoul_communication_profile;
CREATE POLICY mysoul_communication_profile_select ON mysoul_communication_profile FOR SELECT USING(public.mysoul_can_read(mysoul_id,visibility));
DROP POLICY IF EXISTS mysoul_communication_profile_owner ON mysoul_communication_profile;
CREATE POLICY mysoul_communication_profile_owner ON mysoul_communication_profile FOR ALL USING(public.mysoul_owner(mysoul_id)) WITH CHECK(public.mysoul_owner(mysoul_id));
ALTER TABLE mysoul_training_samples ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS mysoul_training_samples_owner ON mysoul_training_samples;
CREATE POLICY mysoul_training_samples_owner ON mysoul_training_samples FOR ALL USING(public.mysoul_owner(mysoul_id)) WITH CHECK(public.mysoul_owner(mysoul_id));
ALTER TABLE mysoul_teaching_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS mysoul_teaching_history_owner ON mysoul_teaching_history;
CREATE POLICY mysoul_teaching_history_owner ON mysoul_teaching_history FOR ALL USING(public.mysoul_owner(mysoul_id)) WITH CHECK(public.mysoul_owner(mysoul_id));
ALTER TABLE mysoul_analytics_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS mysoul_analytics_owner_read ON mysoul_analytics_events;
CREATE POLICY mysoul_analytics_owner_read ON mysoul_analytics_events FOR SELECT USING(public.mysoul_owner(mysoul_id));
ALTER TABLE mysoul_topic_analytics ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS mysoul_topic_analytics_owner_read ON mysoul_topic_analytics;
CREATE POLICY mysoul_topic_analytics_owner_read ON mysoul_topic_analytics FOR SELECT USING(public.mysoul_owner(mysoul_id));

ALTER TABLE mysoul_conversations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS mysoul_conversation_read ON mysoul_conversations;
CREATE POLICY mysoul_conversation_read ON mysoul_conversations FOR SELECT USING(
  (owner_user_id=auth.uid() AND visitor_consented_to_history) OR visitor_user_id=auth.uid()
);
ALTER TABLE mysoul_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS mysoul_messages_read ON mysoul_messages;
CREATE POLICY mysoul_messages_read ON mysoul_messages FOR SELECT USING(EXISTS(
  SELECT 1 FROM mysoul_conversations c WHERE c.id=conversation_id AND c.visitor_consented_to_history AND
  (c.owner_user_id=auth.uid() OR c.visitor_user_id=auth.uid())
));
ALTER TABLE mysoul_daily_usage ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS mysoul_daily_usage_owner_read ON mysoul_daily_usage;
CREATE POLICY mysoul_daily_usage_owner_read ON mysoul_daily_usage FOR SELECT USING(user_id=auth.uid());
ALTER TABLE mysoul_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.mysoul_consume_rate_limit(p_bucket text,p_max integer,p_window_seconds integer)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE current_count integer;
BEGIN
  IF length(p_bucket) NOT BETWEEN 1 AND 128 OR p_max < 1 OR p_window_seconds < 1 THEN RETURN false; END IF;
  IF random() < 0.02 THEN DELETE FROM mysoul_rate_limits WHERE window_started_at < now()-interval '2 days'; END IF;
  INSERT INTO mysoul_rate_limits(bucket_key,window_started_at,request_count) VALUES(p_bucket,now(),1)
  ON CONFLICT(bucket_key) DO UPDATE SET
    window_started_at=CASE WHEN mysoul_rate_limits.window_started_at <= now()-make_interval(secs=>p_window_seconds) THEN now() ELSE mysoul_rate_limits.window_started_at END,
    request_count=CASE WHEN mysoul_rate_limits.window_started_at <= now()-make_interval(secs=>p_window_seconds) THEN 1 ELSE mysoul_rate_limits.request_count+1 END
  RETURNING request_count INTO current_count;
  RETURN current_count <= p_max;
END $$;
CREATE OR REPLACE FUNCTION public.mysoul_consume_daily_message(p_user uuid,p_limit integer)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE current_count integer;
BEGIN
  IF p_limit < 1 THEN RETURN false; END IF;
  IF random() < 0.01 THEN DELETE FROM mysoul_daily_usage WHERE usage_date < current_date-90; END IF;
  INSERT INTO mysoul_daily_usage(user_id,usage_date,messages_used) VALUES(p_user,current_date,1)
  ON CONFLICT(user_id,usage_date) DO UPDATE SET messages_used=mysoul_daily_usage.messages_used+1
  RETURNING messages_used INTO current_count;
  RETURN current_count <= p_limit;
END $$;
CREATE OR REPLACE FUNCTION public.mysoul_add_teaching(p_mysoul uuid,p_user uuid,p_input text,p_category text,p_content text,p_visibility text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE new_knowledge_id uuid;
BEGIN
  IF NOT EXISTS(SELECT 1 FROM mysouls WHERE id=p_mysoul AND user_id=p_user) THEN RAISE EXCEPTION 'owner_required'; END IF;
  IF p_visibility NOT IN ('private','friends','public') THEN RAISE EXCEPTION 'invalid_visibility'; END IF;
  INSERT INTO mysoul_knowledge(mysoul_id,category,content,structured_data,visibility,importance)
    VALUES(p_mysoul,p_category,p_content,jsonb_build_object('source','teach_mysoul'),p_visibility,3) RETURNING id INTO new_knowledge_id;
  INSERT INTO mysoul_teaching_history(mysoul_id,user_input,extracted_data,accepted)
    VALUES(p_mysoul,p_input,jsonb_build_object('category',p_category,'content',p_content),true);
  RETURN new_knowledge_id;
END $$;
CREATE OR REPLACE FUNCTION public.mysoul_record_topic(p_mysoul uuid,p_topic text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF p_topic NOT IN ('interests','preferences','goals','memories','work_education','personality','general') THEN RETURN; END IF;
  IF NOT EXISTS(SELECT 1 FROM mysouls WHERE id=p_mysoul) THEN RETURN; END IF;
  INSERT INTO mysoul_topic_analytics(mysoul_id,topic_category,question_count,updated_at)
    VALUES(p_mysoul,p_topic,1,now())
    ON CONFLICT(mysoul_id,topic_category) DO UPDATE SET question_count=mysoul_topic_analytics.question_count+1,updated_at=now();
END $$;

DO $$ BEGIN
  IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='anon') THEN
    GRANT SELECT ON mysouls,mysoul_traits,mysoul_personality_answers,mysoul_interests,mysoul_values,mysoul_goals,mysoul_memories,mysoul_people,mysoul_preferences,mysoul_communication_profile,mysoul_knowledge TO anon;
  END IF;
  IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN
    GRANT SELECT,INSERT,UPDATE,DELETE ON mysouls,mysoul_traits,mysoul_personality_answers,mysoul_interests,mysoul_values,mysoul_goals,mysoul_memories,mysoul_people,mysoul_preferences,mysoul_communication_profile,mysoul_knowledge,mysoul_training_samples,mysoul_teaching_history TO authenticated;
    GRANT SELECT ON mysoul_conversations,mysoul_messages,mysoul_analytics_events,mysoul_daily_usage TO authenticated;
    GRANT SELECT ON mysoul_topic_analytics TO authenticated;
    REVOKE ALL ON mysoul_rate_limits FROM anon,authenticated;
  END IF;
END $$;
REVOKE ALL ON mysoul_rate_limits,mysoul_daily_usage FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.mysoul_consume_rate_limit(text,integer,integer) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.mysoul_consume_daily_message(uuid,integer) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.mysoul_add_teaching(uuid,uuid,text,text,text,text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.mysoul_record_topic(uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.mysoul_consume_rate_limit(text,integer,integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.mysoul_consume_daily_message(uuid,integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.mysoul_add_teaching(uuid,uuid,text,text,text,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.mysoul_record_topic(uuid,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.mysoul_can_read(uuid,text), public.mysoul_owner(uuid), public.mysoul_is_friend(uuid,uuid) TO anon,authenticated,service_role;

COMMENT ON TABLE mysoul_training_samples IS 'Private owner supplied communication examples. Never returned by public APIs.';
COMMENT ON TABLE mysoul_messages IS 'Visitor conversation content is saved only after explicit visitor consent and owner opt-in.';
COMMENT ON COLUMN mysouls.completion_score IS 'Profile completeness indicator; not a measure of personality accuracy.';
