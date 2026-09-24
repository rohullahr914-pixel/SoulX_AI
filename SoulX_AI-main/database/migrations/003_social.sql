-- Additive migration for Supabase PostgreSQL. Existing accounts and private saves are preserved.
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS username text;
UPDATE profiles SET username = 'creator-' || replace(user_id::text, '-', '') WHERE username IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_idx ON profiles (lower(username));
CREATE OR REPLACE FUNCTION assign_creator_username() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.username := COALESCE(NEW.username, 'creator-' || replace(NEW.user_id::text, '-', '')); RETURN NEW; END $$;
DROP TRIGGER IF EXISTS profile_username ON profiles;
CREATE TRIGGER profile_username BEFORE INSERT ON profiles FOR EACH ROW EXECUTE FUNCTION assign_creator_username();

CREATE TABLE IF NOT EXISTS personas (
 slug text PRIMARY KEY, creator_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
 name varchar(120) NOT NULL, description varchar(1000) NOT NULL DEFAULT '', avatar text,
 definition jsonb NOT NULL DEFAULT '{}', visibility text NOT NULL DEFAULT 'Private' CHECK (visibility IN ('Public','Private')),
 challenge_enabled boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS personas_creator_idx ON personas(creator_id, created_at DESC);
CREATE TABLE IF NOT EXISTS persona_likes (user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE, persona_slug text REFERENCES personas(slug) ON DELETE CASCADE, created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(user_id,persona_slug));
CREATE TABLE IF NOT EXISTS persona_follows (user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE, persona_slug text REFERENCES personas(slug) ON DELETE CASCADE, created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(user_id,persona_slug));
CREATE TABLE IF NOT EXISTS user_follows (user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE, creator_id uuid REFERENCES auth.users(id) ON DELETE CASCADE, created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(user_id,creator_id), CHECK(user_id <> creator_id));
CREATE INDEX IF NOT EXISTS persona_likes_target ON persona_likes(persona_slug);
CREATE INDEX IF NOT EXISTS persona_follows_target ON persona_follows(persona_slug);
CREATE INDEX IF NOT EXISTS user_follows_target ON user_follows(creator_id);
CREATE TABLE IF NOT EXISTS persona_ratings (user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE, persona_slug text REFERENCES personas(slug) ON DELETE CASCADE, rating integer CHECK(rating BETWEEN 1 AND 5), PRIMARY KEY(user_id,persona_slug));
-- No conversation contents are stored in engagement events. One conversation per session.
CREATE TABLE IF NOT EXISTS persona_activity (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, persona_slug text NOT NULL REFERENCES personas(slug) ON DELETE CASCADE, conversation_id uuid NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(user_id,persona_slug,conversation_id));
CREATE INDEX IF NOT EXISTS persona_activity_recent ON persona_activity(created_at,persona_slug,user_id);
CREATE TABLE IF NOT EXISTS persona_stats (persona_slug text PRIMARY KEY REFERENCES personas(slug) ON DELETE CASCADE, unique_users bigint NOT NULL DEFAULT 0, conversations bigint NOT NULL DEFAULT 0, likes bigint NOT NULL DEFAULT 0, followers bigint NOT NULL DEFAULT 0, returning_users bigint NOT NULL DEFAULT 0, rating numeric NOT NULL DEFAULT 0, trending_score numeric NOT NULL DEFAULT 0, updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS challenges (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), persona_slug text NOT NULL REFERENCES personas(slug) ON DELETE CASCADE, question text NOT NULL CHECK(length(question) BETWEEN 10 AND 4000), difficulty text NOT NULL CHECK(difficulty IN ('Easy','Medium','Hard')), category text NOT NULL DEFAULT 'General', xp_reward integer NOT NULL CHECK(xp_reward BETWEEN 10 AND 500), week_start date NOT NULL DEFAULT date_trunc('week',now() AT TIME ZONE 'UTC')::date, deadline timestamptz NOT NULL, is_public boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(persona_slug,week_start), CHECK(deadline > created_at));
-- Separate relation, no browser grants or read policies, including after submission.
CREATE TABLE IF NOT EXISTS challenge_keys (challenge_id uuid PRIMARY KEY REFERENCES challenges(id) ON DELETE CASCADE, expected_answer text NOT NULL);
CREATE TABLE IF NOT EXISTS challenge_submissions (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), challenge_id uuid NOT NULL REFERENCES challenges(id) ON DELETE CASCADE, user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, answer text NOT NULL CHECK(length(answer) BETWEEN 1 AND 12000), score integer CHECK(score BETWEEN 0 AND 100), feedback text, xp_earned integer NOT NULL DEFAULT 0, status text NOT NULL DEFAULT 'evaluating' CHECK(status IN ('evaluating','correct','partially correct','incorrect')), created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(challenge_id,user_id));
CREATE INDEX IF NOT EXISTS challenge_submissions_user ON challenge_submissions(user_id,created_at DESC);
CREATE TABLE IF NOT EXISTS xp_transactions (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, amount integer NOT NULL CHECK(amount > 0), reason text NOT NULL, source_key text NOT NULL UNIQUE, created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS xp_user ON xp_transactions(user_id,created_at DESC);
CREATE TABLE IF NOT EXISTS badges (id text PRIMARY KEY, name text NOT NULL, description text NOT NULL, icon text NOT NULL DEFAULT 'award');
INSERT INTO badges(id,name,description) VALUES
 ('first-persona','First Persona','Published your first Persona'),('rising-creator','Rising Creator','Reached 100 Persona users'),('top-100','Top 100','Finished a week in the top 100'),('top-10','Top 10','Finished a week in the top 10'),('weekly-champion','Weekly Champion','Finished a week at number one'),('puzzle-master','Puzzle Master','Scored 80+ in five logic challenges'),('science-master','Science Master','Scored 80+ in five science challenges'),('100-likes','100 Likes','Received 100 Persona likes'),('1k-users','1K Persona Users','Reached 1,000 Persona users')
 ON CONFLICT(id) DO NOTHING;
CREATE TABLE IF NOT EXISTS user_badges (user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE, badge_id text REFERENCES badges(id), earned_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(user_id,badge_id));
CREATE TABLE IF NOT EXISTS shared_answers (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, persona_slug text NOT NULL REFERENCES personas(slug), question text NOT NULL CHECK(length(question) BETWEEN 1 AND 12000), answer text NOT NULL CHECK(length(answer) BETWEEN 1 AND 20000), submission_id uuid REFERENCES challenge_submissions(id), source_key text NOT NULL, score integer CHECK(score BETWEEN 0 AND 100), is_public boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(user_id,source_key));
CREATE INDEX IF NOT EXISTS shared_answers_profile ON shared_answers(user_id,created_at DESC) WHERE is_public;
CREATE TABLE IF NOT EXISTS shared_answer_likes (user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE, answer_id uuid REFERENCES shared_answers(id) ON DELETE CASCADE, PRIMARY KEY(user_id,answer_id));
CREATE INDEX IF NOT EXISTS shared_answer_likes_target ON shared_answer_likes(answer_id);
CREATE TABLE IF NOT EXISTS leaderboard_stats (kind text NOT NULL CHECK(kind IN ('creator','persona')), entity_id text NOT NULL, period text NOT NULL, score numeric NOT NULL DEFAULT 0, likes bigint NOT NULL DEFAULT 0, users bigint NOT NULL DEFAULT 0, rank bigint NOT NULL DEFAULT 0, previous_rank bigint, updated_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(kind,entity_id,period));
CREATE INDEX IF NOT EXISTS leaderboard_page ON leaderboard_stats(kind,period,rank);

-- Server queries use SET LOCAL ROLE authenticated + request.jwt.claim.sub within transactions.
-- On Supabase these are also enforced for direct REST access with a Supabase JWT.
CREATE OR REPLACE FUNCTION social_uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
CREATE OR REPLACE FUNCTION public_persona(target text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$ SELECT EXISTS(SELECT 1 FROM personas WHERE slug=target AND visibility='Public') $$;
CREATE OR REPLACE FUNCTION public_creator(target uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$ SELECT EXISTS(SELECT 1 FROM profiles WHERE user_id=target AND profile_visibility='Public') $$;
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['profiles','personas','persona_likes','persona_follows','user_follows','persona_ratings','persona_activity','persona_stats','challenges','challenge_keys','challenge_submissions','xp_transactions','badges','user_badges','shared_answers','shared_answer_likes','leaderboard_stats','favorite_personas','liked_messages','analytics_events','schema_migrations'] LOOP
  EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY',t);
 END LOOP;
END $$;
DROP POLICY IF EXISTS profile_read ON profiles;
CREATE POLICY profile_read ON profiles FOR SELECT USING(profile_visibility='Public' OR user_id=social_uid());
DROP POLICY IF EXISTS profile_write ON profiles;
CREATE POLICY profile_write ON profiles FOR UPDATE USING(user_id=social_uid()) WITH CHECK(user_id=social_uid());
DROP POLICY IF EXISTS persona_read ON personas;
CREATE POLICY persona_read ON personas FOR SELECT USING(visibility='Public' OR creator_id=social_uid());
DROP POLICY IF EXISTS persona_insert ON personas;
CREATE POLICY persona_insert ON personas FOR INSERT WITH CHECK(creator_id=social_uid() AND NOT challenge_enabled);
DROP POLICY IF EXISTS persona_update ON personas;
CREATE POLICY persona_update ON personas FOR UPDATE USING(creator_id=social_uid()) WITH CHECK(creator_id=social_uid());
DROP POLICY IF EXISTS persona_delete ON personas;
CREATE POLICY persona_delete ON personas FOR DELETE USING(creator_id=social_uid());
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['persona_likes','persona_follows','persona_ratings'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS own_read ON %I',t);
  EXECUTE format('CREATE POLICY own_read ON %I FOR SELECT USING(user_id=social_uid())',t);
    EXECUTE format('DROP POLICY IF EXISTS own_insert ON %I',t);
  EXECUTE format('CREATE POLICY own_insert ON %I FOR INSERT WITH CHECK(user_id=social_uid() AND public_persona(persona_slug))',t);
    EXECUTE format('DROP POLICY IF EXISTS own_delete ON %I',t);
  EXECUTE format('CREATE POLICY own_delete ON %I FOR DELETE USING(user_id=social_uid())',t);
 END LOOP;
END $$;
DROP POLICY IF EXISTS rating_update ON persona_ratings;
CREATE POLICY rating_update ON persona_ratings FOR UPDATE USING(user_id=social_uid()) WITH CHECK(user_id=social_uid() AND public_persona(persona_slug));
DROP POLICY IF EXISTS follow_read ON user_follows;
CREATE POLICY follow_read ON user_follows FOR SELECT USING(user_id=social_uid());
DROP POLICY IF EXISTS follow_insert ON user_follows;
CREATE POLICY follow_insert ON user_follows FOR INSERT WITH CHECK(user_id=social_uid() AND public_creator(creator_id));
DROP POLICY IF EXISTS follow_delete ON user_follows;
CREATE POLICY follow_delete ON user_follows FOR DELETE USING(user_id=social_uid());
DROP POLICY IF EXISTS stats_read ON persona_stats;
CREATE POLICY stats_read ON persona_stats FOR SELECT USING(public_persona(persona_slug));
DROP POLICY IF EXISTS challenge_read ON challenges;
CREATE POLICY challenge_read ON challenges FOR SELECT USING(is_public AND public_persona(persona_slug));
DROP POLICY IF EXISTS submission_read ON challenge_submissions;
CREATE POLICY submission_read ON challenge_submissions FOR SELECT USING(user_id=social_uid());
DROP POLICY IF EXISTS xp_read ON xp_transactions;
CREATE POLICY xp_read ON xp_transactions FOR SELECT USING(user_id=social_uid());
DROP POLICY IF EXISTS badge_read ON badges;
CREATE POLICY badge_read ON badges FOR SELECT USING(true);
DROP POLICY IF EXISTS earned_read ON user_badges;
CREATE POLICY earned_read ON user_badges FOR SELECT USING(public_creator(user_id) OR user_id=social_uid());
DROP POLICY IF EXISTS answer_read ON shared_answers;
CREATE POLICY answer_read ON shared_answers FOR SELECT USING(user_id=social_uid() OR (is_public AND public_creator(user_id) AND public_persona(persona_slug)));
DROP POLICY IF EXISTS answer_delete ON shared_answers;
CREATE POLICY answer_delete ON shared_answers FOR DELETE USING(user_id=social_uid());
DROP POLICY IF EXISTS answer_like_read ON shared_answer_likes;
CREATE POLICY answer_like_read ON shared_answer_likes FOR SELECT USING(user_id=social_uid());
DROP POLICY IF EXISTS answer_like_insert ON shared_answer_likes;
CREATE POLICY answer_like_insert ON shared_answer_likes FOR INSERT WITH CHECK(user_id=social_uid() AND EXISTS(SELECT 1 FROM shared_answers a WHERE a.id=answer_id AND a.is_public AND public_creator(a.user_id) AND public_persona(a.persona_slug)));
DROP POLICY IF EXISTS answer_like_delete ON shared_answer_likes;
CREATE POLICY answer_like_delete ON shared_answer_likes FOR DELETE USING(user_id=social_uid());
DROP POLICY IF EXISTS leaderboard_read ON leaderboard_stats;
CREATE POLICY leaderboard_read ON leaderboard_stats FOR SELECT USING((kind='persona' AND public_persona(entity_id)) OR (kind='creator' AND public_creator(entity_id::uuid)));
-- Explicit grants prevent counter, XP, badge and score tampering. Legacy private tables have no client policies.
DO $$ BEGIN IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN
 REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon,authenticated;
 GRANT SELECT ON profiles,personas,persona_stats,challenges,badges,user_badges,shared_answers,leaderboard_stats TO anon,authenticated;
 GRANT SELECT ON persona_likes,persona_follows,user_follows,persona_ratings,challenge_submissions,xp_transactions,shared_answer_likes TO authenticated;
 GRANT INSERT,DELETE ON persona_likes,persona_follows,user_follows,persona_ratings,shared_answer_likes TO authenticated;
 GRANT UPDATE(rating) ON persona_ratings TO authenticated;
 GRANT UPDATE(display_name,bio,avatar_data_url,profile_visibility,username) ON profiles TO authenticated;
 GRANT INSERT,DELETE ON personas TO authenticated;
 GRANT UPDATE(name,description,avatar,definition,visibility,updated_at) ON personas TO authenticated;
 GRANT DELETE ON shared_answers TO authenticated;
 GRANT SELECT ON profiles,conversations,messages,usage,payments,admin_logs,favorite_personas,liked_messages TO authenticated;
 GRANT INSERT,UPDATE,DELETE ON conversations,messages,favorite_personas,liked_messages TO authenticated;
 END IF; END $$;

CREATE OR REPLACE FUNCTION refresh_social_stats() RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE wk text := to_char(date_trunc('week',now() AT TIME ZONE 'UTC'),'YYYY-MM-DD'); prior text := to_char(date_trunc('week',now() AT TIME ZONE 'UTC')-interval '7 days','YYYY-MM-DD');
BEGIN
 IF NOT pg_try_advisory_xact_lock(782913) THEN RETURN; END IF;
 INSERT INTO persona_stats(persona_slug,unique_users,conversations,likes,followers,returning_users,rating,trending_score)
 SELECT p.slug,COALESCE(a.users,0),COALESCE(a.chats,0),COALESCE(l.n,0),COALESCE(f.n,0),COALESCE(a.returning_users_count,0),COALESCE(r.rating,0),
 COALESCE(a.recent,0)*5+COALESCE(l.recent,0)*3+COALESCE(f.recent,0)*4+greatest(0,COALESCE(a.recent,0)-COALESCE(a.prior,0))*2
 FROM personas p
 LEFT JOIN LATERAL (SELECT count(DISTINCT user_id) users,count(*) chats,(SELECT count(*) FROM (SELECT user_id FROM persona_activity WHERE persona_slug=p.slug GROUP BY user_id HAVING count(DISTINCT created_at::date)>1) u) returning_users_count,count(*) FILTER(WHERE created_at>now()-interval '7 days') recent,count(*) FILTER(WHERE created_at BETWEEN now()-interval '14 days' AND now()-interval '7 days') prior FROM persona_activity WHERE persona_slug=p.slug) a ON true
 LEFT JOIN LATERAL (SELECT count(*) n,count(*) FILTER(WHERE created_at>now()-interval '7 days') recent FROM persona_likes WHERE persona_slug=p.slug) l ON true
 LEFT JOIN LATERAL (SELECT count(*) n,count(*) FILTER(WHERE created_at>now()-interval '7 days') recent FROM persona_follows WHERE persona_slug=p.slug) f ON true
 LEFT JOIN LATERAL (SELECT avg(rating) rating FROM persona_ratings WHERE persona_slug=p.slug) r ON true
 ON CONFLICT(persona_slug) DO UPDATE SET unique_users=excluded.unique_users,conversations=excluded.conversations,likes=excluded.likes,followers=excluded.followers,returning_users=excluded.returning_users,rating=excluded.rating,trending_score=excluded.trending_score,updated_at=now();
 -- Period buckets preserve all-time and completed weeks; UTC Monday is the weekly boundary.
 INSERT INTO leaderboard_stats(kind,entity_id,period,score,likes,users)
 SELECT 'persona',p.slug,b.period,
 u.n*5+l.n*3+u.ret*4+least(u.chats,u.n*20)*0.5+f.n*4+c.n*6,l.n,u.n
 FROM personas p CROSS JOIN (VALUES('all'),(wk)) b(period)
 CROSS JOIN LATERAL (SELECT CASE WHEN b.period='all' THEN '-infinity'::timestamptz ELSE (wk::date::timestamp AT TIME ZONE 'UTC') END start_at) d
 CROSS JOIN LATERAL (SELECT count(DISTINCT user_id) n,count(*) chats,(SELECT count(*) FROM (SELECT user_id FROM persona_activity WHERE persona_slug=p.slug AND created_at>=d.start_at GROUP BY user_id HAVING count(DISTINCT created_at::date)>1) x) ret FROM persona_activity WHERE persona_slug=p.slug AND created_at>=d.start_at) u
 CROSS JOIN LATERAL (SELECT count(*) n FROM persona_likes WHERE persona_slug=p.slug AND created_at>=d.start_at) l
 CROSS JOIN LATERAL (SELECT count(*) n FROM persona_follows WHERE persona_slug=p.slug AND created_at>=d.start_at) f
 CROSS JOIN LATERAL (SELECT count(DISTINCT s.user_id) n FROM challenge_submissions s JOIN challenges ch ON ch.id=s.challenge_id WHERE ch.persona_slug=p.slug AND s.score IS NOT NULL AND s.created_at>=d.start_at) c
 WHERE p.visibility='Public'
 ON CONFLICT(kind,entity_id,period) DO UPDATE SET score=excluded.score,likes=excluded.likes,users=excluded.users,updated_at=now();
 INSERT INTO leaderboard_stats(kind,entity_id,period,score,likes,users)
 SELECT 'creator',pr.user_id::text,b.period,COALESCE(sum(l.score),0)+COALESCE((SELECT count(*)*4 FROM user_follows f WHERE f.creator_id=pr.user_id AND (b.period='all' OR f.created_at>=(wk::date::timestamp AT TIME ZONE 'UTC'))),0)+COALESCE((SELECT count(*)*6 FROM challenge_submissions s WHERE s.user_id=pr.user_id AND s.score IS NOT NULL AND (b.period='all' OR s.created_at>=(wk::date::timestamp AT TIME ZONE 'UTC'))),0),COALESCE(sum(l.likes),0),COALESCE(sum(l.users),0)
 FROM profiles pr CROSS JOIN (VALUES('all'),(wk)) b(period) LEFT JOIN personas p ON p.creator_id=pr.user_id AND p.visibility='Public' LEFT JOIN leaderboard_stats l ON l.kind='persona' AND l.entity_id=p.slug AND l.period=b.period WHERE pr.profile_visibility='Public' GROUP BY pr.user_id,b.period
 ON CONFLICT(kind,entity_id,period) DO UPDATE SET score=excluded.score,likes=excluded.likes,users=excluded.users,updated_at=now();
 WITH ranked AS (SELECT kind,entity_id,period,rank() OVER(PARTITION BY kind,period ORDER BY score DESC,entity_id) n FROM leaderboard_stats WHERE period IN ('all',wk)) UPDATE leaderboard_stats l SET previous_rank=CASE WHEN l.rank>0 THEN l.rank ELSE NULL END,rank=r.n FROM ranked r WHERE l.kind=r.kind AND l.entity_id=r.entity_id AND l.period=r.period;
 INSERT INTO xp_transactions(user_id,amount,reason,source_key) SELECT p.creator_id,50,'Popular Persona', 'users100:'||p.slug FROM personas p JOIN persona_stats s ON s.persona_slug=p.slug WHERE p.creator_id IS NOT NULL AND s.unique_users>=100 ON CONFLICT DO NOTHING;
 INSERT INTO user_badges(user_id,badge_id) SELECT creator_id,'first-persona' FROM personas WHERE creator_id IS NOT NULL AND visibility='Public' ON CONFLICT DO NOTHING;
 INSERT INTO user_badges(user_id,badge_id) SELECT p.creator_id,b.id FROM personas p JOIN persona_stats s ON s.persona_slug=p.slug CROSS JOIN (VALUES('rising-creator',100,0),('1k-users',1000,0),('100-likes',0,100)) b(id,u,l) WHERE p.creator_id IS NOT NULL GROUP BY p.creator_id,b.id,b.u,b.l HAVING sum(s.unique_users)>=b.u AND sum(s.likes)>=b.l ON CONFLICT DO NOTHING;
 INSERT INTO user_badges(user_id,badge_id) SELECT l.entity_id::uuid,b.id FROM leaderboard_stats l CROSS JOIN (VALUES('top-100',100),('top-10',10),('weekly-champion',1)) b(id,n) WHERE l.kind='creator' AND l.period=prior AND l.rank BETWEEN 1 AND b.n AND l.score>0 ON CONFLICT DO NOTHING;
 INSERT INTO user_badges(user_id,badge_id) SELECT s.user_id,CASE WHEN c.category='Science' THEN 'science-master' ELSE 'puzzle-master' END FROM challenge_submissions s JOIN challenges c ON c.id=s.challenge_id WHERE s.score>=80 AND c.category IN ('Science','Logic') GROUP BY s.user_id,c.category HAVING count(*)>=5 ON CONFLICT DO NOTHING;
END $$;
REVOKE ALL ON FUNCTION refresh_social_stats() FROM PUBLIC;
-- Configure a five-minute Supabase Cron job after deploying (see SOCIAL_SETUP.md).
