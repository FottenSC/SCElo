-- Add admin role system
-- This migration creates an admin_users table and updates RLS policies to allow admins to write

-- Create admin_users table to track which users are admins
CREATE TABLE IF NOT EXISTS admin_users (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS on admin_users
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Allow anyone to check if a user is an admin (read-only)
CREATE POLICY "Anyone can view admin status"
  ON admin_users
  FOR SELECT
  USING (true);

-- Only existing admins can add new admins
CREATE POLICY "Admins can manage admins"
  ON admin_users
  FOR ALL
  USING (
    auth.uid() IN (SELECT user_id FROM admin_users)
  );

-- Helper function to check if current user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admin_users
    WHERE user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update RLS policies for players table
DROP POLICY IF EXISTS "Players are viewable by everyone" ON players;
DROP POLICY IF EXISTS "Admins can update players" ON players;

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
DROP POLICY IF EXISTS "Admins can update matches" ON matches;

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
DROP POLICY IF EXISTS "Admins can update events" ON events;

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

-- Update RLS policies for player_ratings table
DROP POLICY IF EXISTS "Rating history is viewable by everyone" ON player_ratings;
DROP POLICY IF EXISTS "Admins can manage ratings" ON player_ratings;

CREATE POLICY "Rating history is viewable by everyone"
  ON player_ratings
  FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert ratings"
  ON player_ratings
  FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update ratings"
  ON player_ratings
  FOR UPDATE
  USING (is_admin());

CREATE POLICY "Admins can delete ratings"
  ON player_ratings
  FOR DELETE
  USING (is_admin());

-- Update RLS policies for scheduled_matches table (if it exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'scheduled_matches') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Scheduled matches are viewable by everyone" ON scheduled_matches';
    EXECUTE 'DROP POLICY IF EXISTS "Admins can update scheduled matches" ON scheduled_matches';
    
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
COMMENT ON TABLE admin_users IS 'Tracks which authenticated users have admin privileges';
COMMENT ON FUNCTION is_admin() IS 'Returns true if the current authenticated user is an admin';
