-- Voice is intentionally separate from text usage. The agent configuration is loaded
-- only by trusted server routes; clients never receive ElevenLabs credentials.
ALTER TABLE personas ADD COLUMN IF NOT EXISTS voice_id text;
ALTER TABLE personas ADD COLUMN IF NOT EXISTS voice_enabled boolean NOT NULL DEFAULT true;
ALTER TABLE personas ADD COLUMN IF NOT EXISTS voice_settings jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS voice_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  persona_id text NOT NULL,
  text_conversation_id uuid REFERENCES conversations(id) ON DELETE SET NULL,
  elevenlabs_conversation_id text UNIQUE,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  duration_seconds integer,
  reserved_minutes integer NOT NULL CHECK (reserved_minutes > 0),
  status text NOT NULL DEFAULT 'created' CHECK (status IN ('created','connected','ended','failed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS voice_sessions_user_started_idx ON voice_sessions(user_id, started_at DESC);
CREATE INDEX IF NOT EXISTS voice_sessions_user_status_idx ON voice_sessions(user_id, status, started_at DESC);
ALTER TABLE voice_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS voice_sessions_owner ON voice_sessions;
CREATE POLICY voice_sessions_owner ON voice_sessions FOR SELECT USING (user_id=auth.uid());

INSERT INTO admin_settings(key,value) VALUES
 ('pro_voice_monthly_minutes','120'),
 ('pro_voice_session_max_minutes','15'),
 ('pro_voice_session_max_per_hour','8')
ON CONFLICT(key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.reserve_voice_session(target uuid, target_persona text, target_conversation uuid DEFAULT NULL)
RETURNS TABLE(allowed boolean, reason text, session_id uuid, reserved_minutes integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE p profiles%ROWTYPE; monthly_limit integer; session_limit integer; hourly_limit integer; used_minutes integer; recent_starts integer; existing uuid;
BEGIN
  SELECT * INTO p FROM profiles WHERE id=target FOR UPDATE;
  IF NOT FOUND THEN RETURN QUERY SELECT false,'profile_missing',NULL::uuid,0; RETURN; END IF;
  IF p.plan NOT IN ('pro','ultra') OR p.plan_status<>'active' OR (p.plan_expires_at IS NOT NULL AND p.plan_expires_at<=now()) THEN
    RETURN QUERY SELECT false,'pro_required',NULL::uuid,0; RETURN;
  END IF;
  monthly_limit := GREATEST(0,personax_setting_int('pro_voice_monthly_minutes',120));
  session_limit := LEAST(60,GREATEST(1,personax_setting_int('pro_voice_session_max_minutes',15)));
  -- Expire abandoned reservations; an active connected session remains unique per account.
  UPDATE voice_sessions SET status='failed',ended_at=now(),updated_at=now()
    WHERE user_id=target AND status='created' AND started_at<now()-interval '2 minutes';
  -- Recover sessions when a browser closes without delivering its end callback.
  UPDATE voice_sessions SET status='ended',ended_at=started_at+make_interval(mins=>reserved_minutes),
    duration_seconds=reserved_minutes*60,updated_at=now()
    WHERE user_id=target AND status='connected' AND started_at+make_interval(mins=>reserved_minutes)<=now();
  SELECT id INTO existing FROM voice_sessions WHERE user_id=target AND status IN ('created','connected') ORDER BY started_at DESC LIMIT 1;
  IF existing IS NOT NULL THEN RETURN QUERY SELECT false,'session_in_progress',existing,0; RETURN; END IF;
  SELECT COALESCE(sum(CASE WHEN status='ended' THEN CEIL(COALESCE(duration_seconds,0)::numeric/60)::integer ELSE reserved_minutes END),0)::int INTO used_minutes
    FROM voice_sessions WHERE user_id=target AND started_at>=date_trunc('month',now()) AND status IN ('created','connected','ended');
  IF used_minutes + session_limit > monthly_limit THEN RETURN QUERY SELECT false,'monthly_limit',NULL::uuid,0; RETURN; END IF;
  hourly_limit := LEAST(30,GREATEST(1,personax_setting_int('pro_voice_session_max_per_hour',8)));
  SELECT count(*)::int INTO recent_starts FROM voice_sessions WHERE user_id=target AND started_at>now()-interval '1 hour';
  IF recent_starts>=hourly_limit THEN RETURN QUERY SELECT false,'rate_limited',NULL::uuid,0; RETURN; END IF;
  INSERT INTO voice_sessions(user_id,persona_id,text_conversation_id,reserved_minutes,status) VALUES(target,target_persona,target_conversation,session_limit,'created') RETURNING id INTO existing;
  RETURN QUERY SELECT true,'ok',existing,session_limit;
END $$;
REVOKE ALL ON FUNCTION public.reserve_voice_session(uuid,text,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_voice_session(uuid,text,uuid) TO service_role;
