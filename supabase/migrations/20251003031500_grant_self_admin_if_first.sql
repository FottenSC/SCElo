-- Allow the first authenticated user to grant themselves admin role (local dev convenience)
-- Exposed as an RPC callable by any authenticated user, but it only works if there are no admins yet.

CREATE OR REPLACE FUNCTION grant_self_admin_if_first()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_count integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  SELECT count(*) INTO admin_count
  FROM auth.users
  WHERE raw_app_meta_data->>'role' = 'admin';

  IF admin_count = 0 THEN
    UPDATE auth.users
    SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('role', 'admin')
    WHERE id = auth.uid();
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

GRANT EXECUTE ON FUNCTION grant_self_admin_if_first() TO authenticated;

COMMENT ON FUNCTION grant_self_admin_if_first() IS 'Grants admin role to the caller if there are no admins yet. For local dev only.';
