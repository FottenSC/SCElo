-- Use Supabase Auth roles for admin privileges instead of a separate table
-- This is simpler and uses the built-in auth system

-- Helper function to check if current user is admin
-- Checks if user has 'admin' in their app_metadata.role
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN COALESCE(
    (auth.jwt()->>'role')::text = 'admin',
    (auth.jwt()->'app_metadata'->>'role')::text = 'admin',
    false
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update RLS policies for players table
DROP POLICY IF EXISTS "Players are viewable by everyone" ON players;
DROP POLICY IF EXISTS "Admins can insert players" ON players;
DROP POLICY IF EXISTS "Admins can update players" ON players;
DROP POLICY IF EXISTS "Admins can delete players" ON players;

CREATE POLICY "Players are viewable by everyone"
  ON players
  FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert players"
  ON players
  FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update players"
  ON players
  FOR UPDATE
  USING (is_admin());

CREATE POLICY "Admins can delete players"
  ON players
  FOR DELETE
  USING (is_admin());

-- Update RLS policies for matches table
DROP POLICY IF EXISTS "Matches are viewable by everyone" ON matches;
DROP POLICY IF EXISTS "Admins can insert matches" ON matches;
DROP POLICY IF EXISTS "Admins can update matches" ON matches;
DROP POLICY IF EXISTS "Admins can delete matches" ON matches;

CREATE POLICY "Matches are viewable by everyone"
  ON matches
  FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert matches"
  ON matches
  FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update matches"
  ON matches
  FOR UPDATE
  USING (is_admin());

CREATE POLICY "Admins can delete matches"
  ON matches
  FOR DELETE
  USING (is_admin());

-- Update RLS policies for events table
DROP POLICY IF EXISTS "Events are viewable by everyone" ON events;
DROP POLICY IF EXISTS "Admins can insert events" ON events;
DROP POLICY IF EXISTS "Admins can update events" ON events;
DROP POLICY IF EXISTS "Admins can delete events" ON events;

CREATE POLICY "Events are viewable by everyone"
  ON events
  FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert events"
  ON events
  FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update events"
  ON events
  FOR UPDATE
  USING (is_admin());

CREATE POLICY "Admins can delete events"
  ON events
  FOR DELETE
  USING (is_admin());

-- Update RLS policies for scheduled_matches table (if it exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'scheduled_matches') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Scheduled matches are viewable by everyone" ON scheduled_matches';
    EXECUTE 'DROP POLICY IF EXISTS "Admins can insert scheduled matches" ON scheduled_matches';
    EXECUTE 'DROP POLICY IF EXISTS "Admins can update scheduled matches" ON scheduled_matches';
    EXECUTE 'DROP POLICY IF EXISTS "Admins can delete scheduled matches" ON scheduled_matches';
    
    EXECUTE 'CREATE POLICY "Scheduled matches are viewable by everyone"
      ON scheduled_matches
      FOR SELECT
      USING (true)';
    
    EXECUTE 'CREATE POLICY "Admins can insert scheduled matches"
      ON scheduled_matches
      FOR INSERT
      WITH CHECK (is_admin())';
    
    EXECUTE 'CREATE POLICY "Admins can update scheduled matches"
      ON scheduled_matches
      FOR UPDATE
      USING (is_admin())';
    
    EXECUTE 'CREATE POLICY "Admins can delete scheduled matches"
      ON scheduled_matches
      FOR DELETE
      USING (is_admin())';
  END IF;
END $$;

-- Comment for documentation
COMMENT ON FUNCTION is_admin() IS 'Returns true if the current authenticated user has admin role in their JWT app_metadata';
