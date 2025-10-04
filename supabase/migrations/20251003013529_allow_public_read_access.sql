-- Allow public read access to all tables
-- Only admins can write (insert/update/delete)

-- First, ensure RLS is enabled on all tables
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Players table policies
DROP POLICY IF EXISTS "Players are viewable by everyone" ON players;
DROP POLICY IF EXISTS "Admins can insert players" ON players;
DROP POLICY IF EXISTS "Admins can update players" ON players;
DROP POLICY IF EXISTS "Admins can delete players" ON players;

-- Allow public read access (no authentication required)
CREATE POLICY "Public read access for players"
  ON players
  FOR SELECT
  USING (true);

-- Only admins can modify
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

-- Matches table policies
DROP POLICY IF EXISTS "Matches are viewable by everyone" ON matches;
DROP POLICY IF EXISTS "Admins can insert matches" ON matches;
DROP POLICY IF EXISTS "Admins can update matches" ON matches;
DROP POLICY IF EXISTS "Admins can delete matches" ON matches;

-- Allow public read access
CREATE POLICY "Public read access for matches"
  ON matches
  FOR SELECT
  USING (true);

-- Only admins can modify
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

-- Events table policies
DROP POLICY IF EXISTS "Events are viewable by everyone" ON events;
DROP POLICY IF EXISTS "Admins can insert events" ON events;
DROP POLICY IF EXISTS "Admins can update events" ON events;
DROP POLICY IF EXISTS "Admins can delete events" ON events;

-- Allow public read access
CREATE POLICY "Public read access for events"
  ON events
  FOR SELECT
  USING (true);

-- Only admins can modify
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

-- Scheduled matches table (if it exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'scheduled_matches') THEN
    EXECUTE 'ALTER TABLE scheduled_matches ENABLE ROW LEVEL SECURITY';
    
    EXECUTE 'DROP POLICY IF EXISTS "Scheduled matches are viewable by everyone" ON scheduled_matches';
    EXECUTE 'DROP POLICY IF EXISTS "Admins can insert scheduled matches" ON scheduled_matches';
    EXECUTE 'DROP POLICY IF EXISTS "Admins can update scheduled matches" ON scheduled_matches';
    EXECUTE 'DROP POLICY IF EXISTS "Admins can delete scheduled matches" ON scheduled_matches';
    
    EXECUTE 'CREATE POLICY "Public read access for scheduled matches"
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

-- Grant usage on schema to public (allows unauthenticated reads)
GRANT USAGE ON SCHEMA public TO anon;
GRANT SELECT ON players TO anon;
GRANT SELECT ON matches TO anon;
GRANT SELECT ON events TO anon;

-- Grant to authenticated users too
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON players TO authenticated;
GRANT SELECT ON matches TO authenticated;
GRANT SELECT ON events TO authenticated;

COMMENT ON POLICY "Public read access for players" ON players IS 'Allows anyone (including unauthenticated users) to view player data';
COMMENT ON POLICY "Public read access for matches" ON matches IS 'Allows anyone (including unauthenticated users) to view match data';
COMMENT ON POLICY "Public read access for events" ON events IS 'Allows anyone (including unauthenticated users) to view event data';
