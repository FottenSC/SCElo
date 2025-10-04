-- Fix admin detection function to properly read from auth.users table
-- The previous implementation tried to read from JWT which doesn't work in local development

-- Replace the function (can't drop because policies depend on it)
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
BEGIN
  -- Return false if not authenticated
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;

  -- Get the role from auth.users.raw_app_meta_data
  SELECT raw_app_meta_data->>'role'
  INTO user_role
  FROM auth.users
  WHERE id = auth.uid();

  -- Return true if role is 'admin'
  RETURN COALESCE(user_role = 'admin', false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION is_admin() TO authenticated;

COMMENT ON FUNCTION is_admin() IS 'Returns true if the current authenticated user has admin role in their auth.users.raw_app_meta_data';
