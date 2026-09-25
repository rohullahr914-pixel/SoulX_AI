-- Restore the private SQL adapter used by the existing Next.js server routes.
-- The Community tables may be deployed independently, but all server-side query helpers depend on this RPC.
CREATE OR REPLACE FUNCTION public.personax_query(statement text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE result jsonb;
BEGIN
  IF statement ~* '^\s*(select|with)' THEN
    EXECUTE 'SELECT COALESCE(jsonb_agg(to_jsonb(row_data)), ''[]''::jsonb) FROM (' || statement || ') row_data' INTO result;
  ELSIF statement ~* 'returning\s' THEN
    EXECUTE 'WITH changed AS (' || statement || ') SELECT COALESCE(jsonb_agg(to_jsonb(row_data)), ''[]''::jsonb) FROM changed row_data' INTO result;
  ELSE
    EXECUTE statement;
    result := '[]'::jsonb;
  END IF;
  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.personax_query(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.personax_query(text) TO service_role;
