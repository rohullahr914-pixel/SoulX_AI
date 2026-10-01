-- Binance deposit verification requests are separate from the archived payment ledger.
-- Remove the former automatic activation RPC and preserve its ledger as an archive.
DROP FUNCTION IF EXISTS public.process_hesabpay_webhook(uuid,text,boolean,numeric,text);
DO $$
BEGIN
  IF to_regclass('public.payment_ledger_archive') IS NULL AND to_regclass('public.payments') IS NOT NULL THEN
    ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_status_check;
    ALTER TABLE public.payments RENAME TO payment_ledger_archive;
  END IF;
END;
$$;

INSERT INTO admin_settings(key,value) VALUES
  ('ultra_price','10'),('ultra_daily_message_limit','200'),('ultra_monthly_message_limit','6000')
ON CONFLICT(key) DO NOTHING;

CREATE TABLE IF NOT EXISTS payment_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email text,
  plan text NOT NULL CHECK (plan IN ('pro','ultra')),
  amount_usdt numeric(18,8) NOT NULL CHECK (amount_usdt > 0),
  coin text NOT NULL DEFAULT 'USDT' CHECK (coin = 'USDT'),
  network text NOT NULL,
  deposit_address text NOT NULL,
  tx_id text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','submitted','verifying','verified_pending_approval','approved','rejected','expired')),
  created_at timestamptz NOT NULL DEFAULT now(),
  submitted_at timestamptz,
  verified_at timestamptz,
  approved_at timestamptz,
  approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours'),
  binance_deposit_time timestamptz,
  binance_amount numeric(18,8),
  verification_error text,
  admin_note text,
  verification_attempts integer NOT NULL DEFAULT 0 CHECK (verification_attempts >= 0),
  last_verification_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS payment_requests_tx_id_unique
  ON payment_requests (lower(tx_id)) WHERE tx_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS payment_requests_user_created_idx
  ON payment_requests (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS payment_requests_status_created_idx
  ON payment_requests (status, created_at DESC);
CREATE INDEX IF NOT EXISTS payment_requests_user_verification_idx
  ON payment_requests (user_id, last_verification_at DESC);
CREATE INDEX IF NOT EXISTS payment_requests_pending_review_idx
  ON payment_requests (verified_at DESC) WHERE status = 'verified_pending_approval';

CREATE TABLE IF NOT EXISTS payment_verification_attempts (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  payment_request_id uuid NOT NULL REFERENCES payment_requests(id) ON DELETE CASCADE,
  attempted_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS payment_verification_attempts_user_time_idx
  ON payment_verification_attempts (user_id, attempted_at DESC);
ALTER TABLE payment_verification_attempts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON payment_verification_attempts FROM anon,authenticated;
GRANT ALL ON payment_verification_attempts TO service_role;

ALTER TABLE payment_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON payment_requests FROM anon;
REVOKE ALL ON payment_requests FROM authenticated;
GRANT SELECT ON payment_requests TO authenticated;
GRANT INSERT (user_id,plan,amount_usdt,coin,network,deposit_address) ON payment_requests TO authenticated;
GRANT ALL ON payment_requests TO service_role;

CREATE OR REPLACE FUNCTION public.is_active_payment_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT EXISTS (SELECT 1 FROM profiles WHERE id=auth.uid() AND role='admin' AND account_status='active')
$$;
REVOKE ALL ON FUNCTION public.is_active_payment_admin() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.is_active_payment_admin() TO authenticated,service_role;

DROP POLICY IF EXISTS payment_requests_owner_read ON payment_requests;
CREATE POLICY payment_requests_owner_read ON payment_requests FOR SELECT
  TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS payment_requests_admin_read ON payment_requests;
CREATE POLICY payment_requests_admin_read ON payment_requests FOR SELECT
  TO authenticated USING (public.is_active_payment_admin());
DROP POLICY IF EXISTS payment_requests_owner_insert ON payment_requests;
CREATE POLICY payment_requests_owner_insert ON payment_requests FOR INSERT
  TO authenticated WITH CHECK (
    user_id = auth.uid() AND status = 'pending' AND tx_id IS NULL
    AND verified_at IS NULL AND approved_at IS NULL AND approved_by IS NULL
    AND binance_deposit_time IS NULL AND binance_amount IS NULL
    AND verification_error IS NULL AND admin_note IS NULL
  );

CREATE OR REPLACE FUNCTION public.validate_payment_request_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE configured_price numeric;
BEGIN
  IF auth.uid() IS NOT NULL THEN
    IF NEW.user_id IS DISTINCT FROM auth.uid() OR NEW.status <> 'pending' OR NEW.tx_id IS NOT NULL
      OR NEW.verified_at IS NOT NULL OR NEW.approved_at IS NOT NULL OR NEW.approved_by IS NOT NULL
      OR NEW.binance_deposit_time IS NOT NULL OR NEW.binance_amount IS NOT NULL
      OR NEW.verification_error IS NOT NULL OR NEW.admin_note IS NOT NULL OR NEW.coin <> 'USDT' THEN
      RAISE EXCEPTION 'Invalid payment request fields';
    END IF;
    SELECT NULLIF(value #>> '{}','')::numeric INTO configured_price
      FROM admin_settings WHERE key = CASE NEW.plan WHEN 'pro' THEN 'pro_price' ELSE 'ultra_price' END;
    IF configured_price IS NULL OR configured_price <= 0 OR NEW.amount_usdt <> configured_price THEN
      RAISE EXCEPTION 'Payment amount does not match the current plan price';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS validate_payment_request_insert ON payment_requests;
CREATE TRIGGER validate_payment_request_insert BEFORE INSERT ON payment_requests
  FOR EACH ROW EXECUTE FUNCTION public.validate_payment_request_insert();

CREATE OR REPLACE FUNCTION public.claim_payment_verification(p_request_id uuid, p_user_id uuid, p_tx_id text)
RETURNS TABLE(claimed boolean, reason text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE request_row payment_requests%ROWTYPE; attempts_last_hour integer;
BEGIN
  SELECT * INTO request_row FROM payment_requests
    WHERE id=p_request_id AND user_id=p_user_id FOR UPDATE;
  IF NOT FOUND THEN RETURN QUERY SELECT false,'not_found'; RETURN; END IF;
  IF request_row.expires_at <= now() THEN
    UPDATE payment_requests SET status='expired',updated_at=now() WHERE id=p_request_id;
    RETURN QUERY SELECT false,'expired'; RETURN;
  END IF;
  IF request_row.status='verified_pending_approval' THEN RETURN QUERY SELECT false,'already_verified'; RETURN; END IF;
  IF request_row.status IN ('approved','rejected','expired') THEN RETURN QUERY SELECT false,request_row.status; RETURN; END IF;
  IF request_row.tx_id IS NOT NULL AND lower(request_row.tx_id) <> lower(p_tx_id) THEN
    RETURN QUERY SELECT false,'transaction_id_locked'; RETURN;
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(p_user_id::text,0));
  IF request_row.last_verification_at IS NOT NULL AND request_row.last_verification_at > now() - interval '15 seconds' THEN
    RETURN QUERY SELECT false,'rate_limited'; RETURN;
  END IF;
  IF request_row.status='verifying' AND request_row.last_verification_at > now() - interval '2 minutes' THEN
    RETURN QUERY SELECT false,'already_verifying'; RETURN;
  END IF;
  DELETE FROM payment_verification_attempts
    WHERE user_id=p_user_id AND attempted_at <= now() - interval '1 hour';
  SELECT count(*)::integer INTO attempts_last_hour FROM payment_verification_attempts
    WHERE user_id=p_user_id AND attempted_at > now() - interval '1 hour';
  IF attempts_last_hour >= 20 THEN RETURN QUERY SELECT false,'rate_limited'; RETURN; END IF;
  INSERT INTO payment_verification_attempts(user_id,payment_request_id) VALUES(p_user_id,p_request_id);
  BEGIN
    UPDATE payment_requests SET tx_id=COALESCE(tx_id,p_tx_id),status='verifying',submitted_at=COALESCE(submitted_at,now()),
      verification_attempts=verification_attempts+1,last_verification_at=now(),verification_error=NULL,updated_at=now()
      WHERE id=p_request_id;
  EXCEPTION WHEN unique_violation THEN
    RETURN QUERY SELECT false,'transaction_already_used'; RETURN;
  END;
  RETURN QUERY SELECT true,'claimed';
END;
$$;

CREATE OR REPLACE FUNCTION public.approve_payment_request(p_request_id uuid, p_admin_id uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE request_row payment_requests%ROWTYPE; profile_row profiles%ROWTYPE; new_expiration timestamptz;
  daily_limit integer; monthly_limit integer;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id=p_admin_id AND role='admin' AND account_status='active') THEN RETURN 'forbidden'; END IF;
  SELECT * INTO request_row FROM payment_requests WHERE id=p_request_id FOR UPDATE;
  IF NOT FOUND THEN RETURN 'not_found'; END IF;
  IF request_row.status='approved' THEN RETURN 'already_approved'; END IF;
  IF request_row.status <> 'verified_pending_approval' THEN RETURN 'invalid_state'; END IF;
  SELECT * INTO profile_row FROM profiles WHERE id=request_row.user_id FOR UPDATE;
  IF NOT FOUND THEN RETURN 'user_not_found'; END IF;
  new_expiration := (CASE WHEN profile_row.plan_status='active' AND profile_row.plan_expires_at > now()
    THEN profile_row.plan_expires_at ELSE now() END) + interval '30 days';
  IF request_row.plan='ultra' THEN
    SELECT COALESCE(NULLIF(value #>> '{}','')::integer,200) INTO daily_limit FROM admin_settings WHERE key='ultra_daily_message_limit';
    SELECT COALESCE(NULLIF(value #>> '{}','')::integer,6000) INTO monthly_limit FROM admin_settings WHERE key='ultra_monthly_message_limit';
  ELSE
    SELECT COALESCE(NULLIF(value #>> '{}','')::integer,50) INTO daily_limit FROM admin_settings WHERE key='pro_daily_message_limit';
    SELECT COALESCE(NULLIF(value #>> '{}','')::integer,1500) INTO monthly_limit FROM admin_settings WHERE key='pro_monthly_message_limit';
  END IF;
  UPDATE profiles SET plan=request_row.plan,plan_status='active',plan_started_at=CASE
    WHEN plan<>request_row.plan OR plan_status<>'active' THEN now() ELSE plan_started_at END,
    plan_expires_at=new_expiration,plan_updated_at=now(),daily_message_limit=COALESCE(daily_limit,CASE request_row.plan WHEN 'ultra' THEN 200 ELSE 50 END),
    monthly_message_limit=COALESCE(monthly_limit,CASE request_row.plan WHEN 'ultra' THEN 6000 ELSE 1500 END),updated_at=now()
    WHERE id=request_row.user_id;
  UPDATE payment_requests SET status='approved',approved_at=now(),approved_by=p_admin_id,admin_note=NULL,updated_at=now()
    WHERE id=request_row.id;
  INSERT INTO admin_logs(admin_id,target_user_id,action,old_value,new_value)
    VALUES(p_admin_id,request_row.user_id,'payment_approved',
      jsonb_build_object('payment_request_id',request_row.id,'status',request_row.status,'plan',profile_row.plan,'plan_expires_at',profile_row.plan_expires_at),
      jsonb_build_object('status','approved','plan',request_row.plan,'plan_expires_at',new_expiration,'amount_usdt',request_row.amount_usdt,'tx_id',request_row.tx_id));
  RETURN 'approved';
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_payment_request(p_request_id uuid, p_admin_id uuid, p_note text DEFAULT NULL)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE request_row payment_requests%ROWTYPE;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id=p_admin_id AND role='admin' AND account_status='active') THEN RETURN 'forbidden'; END IF;
  SELECT * INTO request_row FROM payment_requests WHERE id=p_request_id FOR UPDATE;
  IF NOT FOUND THEN RETURN 'not_found'; END IF;
  IF request_row.status='rejected' THEN RETURN 'already_rejected'; END IF;
  IF request_row.status='approved' THEN RETURN 'already_approved'; END IF;
  IF request_row.status='expired' THEN RETURN 'invalid_state'; END IF;
  UPDATE payment_requests SET status='rejected',admin_note=NULLIF(left(trim(COALESCE(p_note,'')),500),''),updated_at=now()
    WHERE id=request_row.id;
  INSERT INTO admin_logs(admin_id,target_user_id,action,old_value,new_value)
    VALUES(p_admin_id,request_row.user_id,'payment_rejected',
      jsonb_build_object('payment_request_id',request_row.id,'status',request_row.status,'tx_id',request_row.tx_id),
      jsonb_build_object('status','rejected','admin_note',NULLIF(left(trim(COALESCE(p_note,'')),500),'')));
  RETURN 'rejected';
END;
$$;

REVOKE ALL ON FUNCTION public.validate_payment_request_insert() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.claim_payment_verification(uuid,uuid,text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.approve_payment_request(uuid,uuid) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.reject_payment_request(uuid,uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_payment_verification(uuid,uuid,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.approve_payment_request(uuid,uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.reject_payment_request(uuid,uuid,text) TO service_role;

