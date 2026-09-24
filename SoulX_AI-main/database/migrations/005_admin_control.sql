ALTER TABLE profiles ADD COLUMN IF NOT EXISTS plan_started_at timestamptz;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS plan_updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS account_status text NOT NULL DEFAULT 'active' CHECK (account_status IN ('active','suspended','deleted'));
ALTER TABLE personas ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false;
ALTER TABLE personas ADD COLUMN IF NOT EXISTS is_trending boolean NOT NULL DEFAULT false;
ALTER TABLE personas ADD COLUMN IF NOT EXISTS is_suspended boolean NOT NULL DEFAULT false;
ALTER TABLE challenges ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;
ALTER TABLE xp_transactions DROP CONSTRAINT IF EXISTS xp_transactions_amount_check;
ALTER TABLE xp_transactions ADD CONSTRAINT xp_transactions_amount_check CHECK(amount <> 0);
CREATE TABLE IF NOT EXISTS admin_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO admin_settings(key,value) VALUES
 ('free_daily_message_limit','5'),('pro_daily_message_limit','50'),('free_monthly_message_limit','150'),('pro_monthly_message_limit','1500'),('free_persona_creation_limit','3'),('pro_persona_creation_limit','25'),
 ('challenge_default_reward','100'),('xp_like_reward','5'),('xp_follow_reward','10'),('pro_price','5'),('maintenance_mode','false'),('registration_enabled','true')
 ON CONFLICT(key) DO NOTHING;
ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS admin_settings_admin ON admin_settings;
CREATE POLICY admin_settings_admin ON admin_settings FOR ALL USING(EXISTS(SELECT 1 FROM profiles WHERE id=auth.uid() AND role='admin')) WITH CHECK(EXISTS(SELECT 1 FROM profiles WHERE id=auth.uid() AND role='admin'));
CREATE INDEX IF NOT EXISTS profiles_plan_idx ON profiles(plan,plan_status);
CREATE INDEX IF NOT EXISTS personas_moderation_idx ON personas(is_featured,is_trending,is_suspended);

CREATE OR REPLACE FUNCTION public.hide_suspended_persona() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NEW.is_suspended=true THEN
    DELETE FROM leaderboard_stats WHERE kind='persona' AND entity_id=NEW.slug;
    UPDATE persona_stats SET trending_score=0 WHERE persona_slug=NEW.slug;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS hide_suspended_persona ON personas;
CREATE TRIGGER hide_suspended_persona AFTER UPDATE OF is_suspended ON personas FOR EACH ROW EXECUTE FUNCTION public.hide_suspended_persona();

-- Public clients can only read profile fields intentionally used by public profiles.
REVOKE SELECT ON profiles FROM anon,authenticated;
GRANT SELECT(id,user_id,display_name,bio,avatar_url,avatar_data_url,username,profile_visibility,quote,quote_visibility,created_at) ON profiles TO anon,authenticated;

CREATE OR REPLACE FUNCTION public_persona(target text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT EXISTS(SELECT 1 FROM personas WHERE slug=target AND visibility='Public' AND is_suspended=false)
$$;

CREATE OR REPLACE FUNCTION public.protect_profile_admin_fields() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND auth.uid()=OLD.id THEN
    NEW.role := OLD.role;
    NEW.plan := OLD.plan;
    NEW.plan_status := OLD.plan_status;
    NEW.plan_started_at := OLD.plan_started_at;
    NEW.plan_expires_at := OLD.plan_expires_at;
    NEW.plan_updated_at := OLD.plan_updated_at;
    NEW.daily_message_limit := OLD.daily_message_limit;
    NEW.monthly_message_limit := OLD.monthly_message_limit;
    NEW.account_status := OLD.account_status;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS protect_profile_admin_fields ON profiles;
CREATE TRIGGER protect_profile_admin_fields BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION public.protect_profile_admin_fields();

CREATE OR REPLACE FUNCTION public.personax_setting_int(setting_key text, fallback integer) RETURNS integer
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT COALESCE(NULLIF((SELECT value #>> '{}' FROM admin_settings WHERE key=setting_key), '')::integer, fallback);
$$;
REVOKE ALL ON FUNCTION public.personax_setting_int(text,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.personax_setting_int(text,integer) TO service_role;

CREATE OR REPLACE FUNCTION public.expire_plans() RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$
 UPDATE profiles SET plan='free',plan_status='expired',daily_message_limit=personax_setting_int('free_daily_message_limit',5),monthly_message_limit=personax_setting_int('free_monthly_message_limit',150),plan_updated_at=now(),updated_at=now()
 WHERE plan IN ('pro','ultra') AND plan_expires_at IS NOT NULL AND plan_expires_at<=now();
$$;
REVOKE ALL ON FUNCTION public.expire_plans() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.expire_plans() TO service_role;

CREATE OR REPLACE FUNCTION public.reserve_message(target uuid, provider_name text DEFAULT 'groq') RETURNS TABLE(allowed boolean, reason text, plan_name text, daily_used integer, daily_limit integer, monthly_used integer, monthly_limit integer) LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE p profiles%ROWTYPE; d integer; m integer; d_limit integer; m_limit integer;
BEGIN
 SELECT * INTO p FROM profiles WHERE id=target FOR UPDATE;
 IF NOT FOUND THEN RETURN QUERY SELECT false,'profile_missing','free',0,0,0,0; RETURN; END IF;
 IF p.plan_expires_at IS NOT NULL AND p.plan_expires_at<=now() AND p.plan<>'free' THEN
   UPDATE profiles SET plan='free',plan_status='expired',daily_message_limit=personax_setting_int('free_daily_message_limit',5),monthly_message_limit=personax_setting_int('free_monthly_message_limit',150),plan_updated_at=now(),updated_at=now() WHERE id=target RETURNING * INTO p;
 END IF;
 d_limit := CASE p.plan WHEN 'pro' THEN personax_setting_int('pro_daily_message_limit',50) WHEN 'ultra' THEN p.daily_message_limit ELSE personax_setting_int('free_daily_message_limit',5) END;
 m_limit := CASE p.plan WHEN 'pro' THEN personax_setting_int('pro_monthly_message_limit',1500) WHEN 'ultra' THEN p.monthly_message_limit ELSE personax_setting_int('free_monthly_message_limit',150) END;
 SELECT COALESCE(sum(messages_used),0)::int INTO d FROM usage WHERE user_id=target AND date=current_date;
 SELECT COALESCE(sum(messages_used),0)::int INTO m FROM usage WHERE user_id=target AND date>=date_trunc('month',current_date)::date;
 IF d>=d_limit THEN RETURN QUERY SELECT false,'daily_limit',p.plan,d,d_limit,m,m_limit; RETURN; END IF;
 IF m>=m_limit THEN RETURN QUERY SELECT false,'monthly_limit',p.plan,d,d_limit,m,m_limit; RETURN; END IF;
 INSERT INTO usage(user_id,date,messages_used,tokens_used,provider,updated_at) VALUES(target,current_date,1,0,provider_name,now()) ON CONFLICT(user_id,date,provider) DO UPDATE SET messages_used=usage.messages_used+1,updated_at=now();
 RETURN QUERY SELECT true,'ok',p.plan,d+1,d_limit,m+1,m_limit;
END $$;
REVOKE ALL ON FUNCTION public.reserve_message(uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_message(uuid,text) TO service_role;
