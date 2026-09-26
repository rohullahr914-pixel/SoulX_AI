ALTER TABLE payments ALTER COLUMN transaction_id DROP NOT NULL;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS billing_period_months integer NOT NULL DEFAULT 1 CHECK (billing_period_months > 0 AND billing_period_months <= 120);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS paid_at timestamptz;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS subscription_expires_at timestamptz;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS failure_reason varchar(240);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

UPDATE payments SET status = CASE lower(status)
  WHEN 'succeeded' THEN 'paid'
  WHEN 'completed' THEN 'paid'
  WHEN 'canceled' THEN 'cancelled'
  WHEN 'cancelled' THEN 'cancelled'
  WHEN 'expired' THEN 'expired'
  WHEN 'failed' THEN 'failed'
  WHEN 'paid' THEN 'paid'
  ELSE 'pending'
END;

ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_status_check;
ALTER TABLE payments ADD CONSTRAINT payments_status_check CHECK (status IN ('pending','paid','failed','cancelled','expired'));
CREATE INDEX IF NOT EXISTS payments_user_status_created_idx ON payments(user_id,status,created_at DESC);

CREATE OR REPLACE FUNCTION public.process_hesabpay_webhook(
  payment_id uuid,
  provider_transaction_id text,
  event_success boolean,
  event_amount numeric,
  event_message text DEFAULT NULL
) RETURNS TABLE(result text, payment_status text, subscription_expires_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=public
AS $$
DECLARE
  payment payments%ROWTYPE;
  profile profiles%ROWTYPE;
  new_expiration timestamptz;
  daily_limit integer;
  monthly_limit integer;
BEGIN
  SELECT * INTO payment FROM payments WHERE id=payment_id FOR UPDATE;
  IF NOT FOUND THEN RETURN QUERY SELECT 'not_found',NULL::text,NULL::timestamptz; RETURN; END IF;
  IF payment.provider<>'hesabpay' THEN RETURN QUERY SELECT 'provider_mismatch',payment.status,payment.subscription_expires_at; RETURN; END IF;

  IF event_success THEN
    IF COALESCE(trim(provider_transaction_id),'')='' THEN RETURN QUERY SELECT 'invalid_transaction',payment.status,payment.subscription_expires_at; RETURN; END IF;
    IF event_amount IS NULL OR round(event_amount,2)<>round(payment.amount,2) THEN RETURN QUERY SELECT 'amount_mismatch',payment.status,payment.subscription_expires_at; RETURN; END IF;
    IF EXISTS(SELECT 1 FROM payments other WHERE other.provider='hesabpay' AND other.transaction_id=provider_transaction_id AND other.id<>payment.id) THEN
      RETURN QUERY SELECT 'transaction_conflict',payment.status,payment.subscription_expires_at; RETURN;
    END IF;
    IF payment.status='paid' THEN
      IF payment.transaction_id IS DISTINCT FROM provider_transaction_id THEN RETURN QUERY SELECT 'transaction_conflict',payment.status,payment.subscription_expires_at; RETURN; END IF;
      RETURN QUERY SELECT 'already_processed',payment.status,payment.subscription_expires_at; RETURN;
    END IF;

    SELECT * INTO profile FROM profiles WHERE id=payment.user_id FOR UPDATE;
    IF NOT FOUND THEN RETURN QUERY SELECT 'not_found',payment.status,payment.subscription_expires_at; RETURN; END IF;
    new_expiration := (CASE WHEN profile.plan=payment.plan AND profile.plan_status='active' AND profile.plan_expires_at>now() THEN profile.plan_expires_at ELSE now() END)
      + make_interval(months=>payment.billing_period_months);
    daily_limit := CASE WHEN payment.plan='pro' THEN personax_setting_int('pro_daily_message_limit',50) ELSE profile.daily_message_limit END;
    monthly_limit := CASE WHEN payment.plan='pro' THEN personax_setting_int('pro_monthly_message_limit',1500) ELSE profile.monthly_message_limit END;

    UPDATE payments SET transaction_id=provider_transaction_id,status='paid',paid_at=COALESCE(paid_at,now()),subscription_expires_at=new_expiration,failure_reason=NULL,updated_at=now() WHERE id=payment.id;
    UPDATE profiles SET plan=payment.plan,plan_status='active',plan_started_at=CASE WHEN profile.plan<>payment.plan OR profile.plan_status<>'active' THEN now() ELSE profile.plan_started_at END,
      plan_expires_at=new_expiration,plan_updated_at=now(),daily_message_limit=daily_limit,monthly_message_limit=monthly_limit,updated_at=now() WHERE id=payment.user_id;
    RETURN QUERY SELECT 'processed','paid',new_expiration; RETURN;
  END IF;

  IF payment.status='paid' THEN RETURN QUERY SELECT 'already_processed',payment.status,payment.subscription_expires_at; RETURN; END IF;
  UPDATE payments SET transaction_id=COALESCE(transaction_id,NULLIF(trim(provider_transaction_id),'')),status='failed',failure_reason=left(COALESCE(event_message,'payment_failure'),240),updated_at=now() WHERE id=payment.id;
  RETURN QUERY SELECT CASE WHEN payment.status='failed' THEN 'already_processed' ELSE 'processed' END,'failed',payment.subscription_expires_at;
END;
$$;

REVOKE ALL ON FUNCTION public.process_hesabpay_webhook(uuid,text,boolean,numeric,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.process_hesabpay_webhook(uuid,text,boolean,numeric,text) TO service_role;
