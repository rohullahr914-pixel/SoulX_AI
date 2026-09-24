-- Supabase is the only identity and application data source.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  user_id uuid GENERATED ALWAYS AS (id) STORED UNIQUE,
  email text NOT NULL,
  full_name varchar(120) NOT NULL DEFAULT '',
  display_name varchar(120),
  bio varchar(500),
  avatar_url text,
  avatar_data_url text,
  role text NOT NULL DEFAULT 'user' CHECK (role IN ('user','admin')),
  plan text NOT NULL DEFAULT 'free' CHECK (plan IN ('free','pro','ultra')),
  plan_status text NOT NULL DEFAULT 'active' CHECK (plan_status IN ('active','expired','canceled')),
  plan_expires_at timestamptz,
  daily_message_limit integer NOT NULL DEFAULT 5 CHECK (daily_message_limit >= 0),
  monthly_message_limit integer NOT NULL DEFAULT 150 CHECK (monthly_message_limit >= 0),
  profile_visibility varchar(10) NOT NULL DEFAULT 'Public' CHECK (profile_visibility IN ('Public','Private')),
  quote varchar(500), quote_visibility varchar(10) NOT NULL DEFAULT 'Public' CHECK (quote_visibility IN ('Public','Private')),
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS profiles_email_idx ON profiles(lower(email));

CREATE TABLE IF NOT EXISTS conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  persona_id text NOT NULL, title varchar(240) NOT NULL DEFAULT 'New conversation', created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS conversations_user_updated_idx ON conversations(user_id,updated_at DESC);
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, role text NOT NULL CHECK(role IN ('user','assistant')),
  content text NOT NULL CHECK(length(content) <= 50000), model_provider text, model_name text, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS messages_conversation_idx ON messages(conversation_id,created_at);
CREATE TABLE IF NOT EXISTS usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date date NOT NULL, messages_used integer NOT NULL DEFAULT 0, tokens_used bigint NOT NULL DEFAULT 0,
  provider text, estimated_cost numeric(12,6) NOT NULL DEFAULT 0, updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(user_id,date,provider)
);
CREATE INDEX IF NOT EXISTS usage_user_date_idx ON usage(user_id,date DESC);
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider text NOT NULL, transaction_id text NOT NULL, plan text NOT NULL CHECK(plan IN ('free','pro','ultra')),
  amount numeric(12,2) NOT NULL DEFAULT 0, currency varchar(8) NOT NULL DEFAULT 'USD', status text NOT NULL DEFAULT 'pending', created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(provider,transaction_id)
);
CREATE TABLE IF NOT EXISTS admin_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), admin_id uuid NOT NULL REFERENCES auth.users(id), target_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL, old_value jsonb, new_value jsonb, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS favorite_personas (user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, persona_slug varchar(160) NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(user_id,persona_slug));
CREATE TABLE IF NOT EXISTS liked_messages (id varchar(255) NOT NULL, user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, persona_name varchar(160) NOT NULL, persona_slug varchar(160), content text NOT NULL, saved_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(user_id,id));
CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now());

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN INSERT INTO public.profiles(id,email,full_name) VALUES(NEW.id,NEW.email,COALESCE(NEW.raw_user_meta_data->>'full_name','')) ON CONFLICT(id) DO NOTHING; RETURN NEW; END $$;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.expire_plans() RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$
  UPDATE profiles SET plan='free',plan_status='expired',daily_message_limit=5,monthly_message_limit=150,updated_at=now() WHERE plan <> 'free' AND plan_expires_at IS NOT NULL AND plan_expires_at <= now();
$$;

CREATE OR REPLACE FUNCTION public.reserve_message(target uuid, provider_name text DEFAULT 'groq') RETURNS TABLE(allowed boolean, reason text, plan_name text, daily_used integer, daily_limit integer, monthly_used integer, monthly_limit integer) LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE p profiles%ROWTYPE; d integer; m integer;
BEGIN
 SELECT * INTO p FROM profiles WHERE id=target FOR UPDATE;
 IF NOT FOUND THEN RETURN QUERY SELECT false,'profile_missing','free',0,0,0,0; RETURN; END IF;
 IF p.plan_expires_at IS NOT NULL AND p.plan_expires_at<=now() AND p.plan<>'free' THEN UPDATE profiles SET plan='free',plan_status='expired',daily_message_limit=5,monthly_message_limit=150,updated_at=now() WHERE id=target RETURNING * INTO p; END IF;
 SELECT COALESCE(sum(messages_used),0)::int INTO d FROM usage WHERE user_id=target AND date=current_date;
 SELECT COALESCE(sum(messages_used),0)::int INTO m FROM usage WHERE user_id=target AND date>=date_trunc('month',current_date)::date;
 IF d>=p.daily_message_limit THEN RETURN QUERY SELECT false,'daily_limit',p.plan,d,p.daily_message_limit,m,p.monthly_message_limit; RETURN; END IF;
 IF m>=p.monthly_message_limit THEN RETURN QUERY SELECT false,'monthly_limit',p.plan,d,p.daily_message_limit,m,p.monthly_message_limit; RETURN; END IF;
 INSERT INTO usage(user_id,date,messages_used,tokens_used,provider,updated_at) VALUES(target,current_date,1,0,provider_name,now()) ON CONFLICT(user_id,date,provider) DO UPDATE SET messages_used=usage.messages_used+1,updated_at=now();
 RETURN QUERY SELECT true,'ok',p.plan,d+1,p.daily_message_limit,m+1,p.monthly_message_limit;
END $$;

DO $$ DECLARE table_name text; BEGIN
 FOREACH table_name IN ARRAY ARRAY['profiles','conversations','messages','usage','payments','admin_logs','favorite_personas','liked_messages'] LOOP EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY',table_name); END LOOP;
END $$;
GRANT SELECT ON profiles TO anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON conversations,messages,favorite_personas,liked_messages TO authenticated;
GRANT SELECT ON usage,payments,admin_logs TO authenticated;
DROP POLICY IF EXISTS profiles_owner_read ON profiles;
CREATE POLICY profiles_owner_read ON profiles FOR SELECT USING(id=auth.uid() OR profile_visibility='Public');
DROP POLICY IF EXISTS profiles_owner_write ON profiles;
CREATE POLICY profiles_owner_write ON profiles FOR UPDATE USING(id=auth.uid()) WITH CHECK(id=auth.uid());
DROP POLICY IF EXISTS conversations_owner ON conversations;
CREATE POLICY conversations_owner ON conversations FOR ALL USING(user_id=auth.uid()) WITH CHECK(user_id=auth.uid());
DROP POLICY IF EXISTS messages_owner ON messages;
CREATE POLICY messages_owner ON messages FOR ALL USING(user_id=auth.uid()) WITH CHECK(user_id=auth.uid());
DROP POLICY IF EXISTS usage_owner ON usage;
CREATE POLICY usage_owner ON usage FOR SELECT USING(user_id=auth.uid());
DROP POLICY IF EXISTS payments_owner ON payments;
CREATE POLICY payments_owner ON payments FOR SELECT USING(user_id=auth.uid());
DROP POLICY IF EXISTS admin_logs_admin ON admin_logs;
CREATE POLICY admin_logs_admin ON admin_logs FOR SELECT USING(EXISTS(SELECT 1 FROM profiles WHERE id=auth.uid() AND role='admin'));
DROP POLICY IF EXISTS favorites_owner ON favorite_personas;
CREATE POLICY favorites_owner ON favorite_personas FOR ALL USING(user_id=auth.uid()) WITH CHECK(user_id=auth.uid());
DROP POLICY IF EXISTS liked_messages_owner ON liked_messages;
CREATE POLICY liked_messages_owner ON liked_messages FOR ALL USING(user_id=auth.uid()) WITH CHECK(user_id=auth.uid());

-- Private RPC used only by server routes with the service-role key. It is not exposed to anon/authenticated roles.
CREATE OR REPLACE FUNCTION public.personax_query(statement text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE result jsonb;
BEGIN
 IF statement ~* '^\s*(select|with)' THEN
   EXECUTE 'SELECT COALESCE(jsonb_agg(to_jsonb(row_data)), ''[]''::jsonb) FROM ('||statement||') row_data' INTO result;
 ELSIF statement ~* 'returning\s' THEN
   EXECUTE 'WITH changed AS ('||statement||') SELECT COALESCE(jsonb_agg(to_jsonb(row_data)), ''[]''::jsonb) FROM changed row_data' INTO result;
 ELSE
   EXECUTE statement; result := '[]'::jsonb;
 END IF;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.personax_query(text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.personax_query(text) TO service_role;
