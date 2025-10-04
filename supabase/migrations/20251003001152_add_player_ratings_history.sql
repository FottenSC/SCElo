-- Create player_ratings table for rating history tracking
CREATE TABLE IF NOT EXISTS player_ratings (
  id BIGSERIAL PRIMARY KEY,
  player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  match_id BIGINT NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  
  -- Rating values after this match
  rating DOUBLE PRECISION NOT NULL,
  rd DOUBLE PRECISION NOT NULL,
  volatility DOUBLE PRECISION NOT NULL,
  
  -- Change from previous rating (for quick display)
  rating_change DECIMAL(10, 2),
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure one rating entry per player per match
  CONSTRAINT player_ratings_player_match_unique UNIQUE(player_id, match_id)
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS player_ratings_player_id_idx ON player_ratings(player_id, match_id DESC);
CREATE INDEX IF NOT EXISTS player_ratings_match_id_idx ON player_ratings(match_id);
CREATE INDEX IF NOT EXISTS player_ratings_created_at_idx ON player_ratings(created_at DESC);

-- Add metadata columns to players table for tracking activity
ALTER TABLE players ADD COLUMN IF NOT EXISTS last_match_date TIMESTAMPTZ;
ALTER TABLE players ADD COLUMN IF NOT EXISTS matches_played INTEGER DEFAULT 0;
ALTER TABLE players ADD COLUMN IF NOT EXISTS peak_rating DOUBLE PRECISION;
ALTER TABLE players ADD COLUMN IF NOT EXISTS peak_rating_date TIMESTAMPTZ;

-- Add comments for documentation
COMMENT ON TABLE player_ratings IS 'Historical record of player ratings after each match';
COMMENT ON COLUMN player_ratings.rating IS 'Player rating (Glicko-2 mu) after this match';
COMMENT ON COLUMN player_ratings.rd IS 'Rating deviation (Glicko-2 phi) after this match';
COMMENT ON COLUMN player_ratings.volatility IS 'Volatility (Glicko-2 sigma) after this match';
COMMENT ON COLUMN player_ratings.rating_change IS 'Change in rating from previous match';
COMMENT ON COLUMN players.last_match_date IS 'Date of most recent completed match';
COMMENT ON COLUMN players.matches_played IS 'Total number of completed matches';
COMMENT ON COLUMN players.peak_rating IS 'Highest rating ever achieved';
COMMENT ON COLUMN players.peak_rating_date IS 'Date when peak rating was achieved';

-- Function to update player stats after rating calculation
CREATE OR REPLACE FUNCTION update_player_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Update current rating on players table
  UPDATE players
  SET 
    rating = NEW.rating,
    rd = NEW.rd,
    volatility = NEW.volatility,
    last_match_date = NEW.created_at,
    matches_played = matches_played + 1,
    -- Update peak rating if this is a new peak
    peak_rating = CASE 
      WHEN NEW.rating > COALESCE(peak_rating, 0) THEN NEW.rating
      ELSE peak_rating
    END,
    peak_rating_date = CASE 
      WHEN NEW.rating > COALESCE(peak_rating, 0) THEN NEW.created_at
      ELSE peak_rating_date
    END
  WHERE id = NEW.player_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update player stats when rating is inserted
CREATE TRIGGER player_ratings_update_stats
  AFTER INSERT ON player_ratings
  FOR EACH ROW
  EXECUTE FUNCTION update_player_stats();

-- View for easy rating history queries with player names
CREATE OR REPLACE VIEW player_rating_history AS
SELECT 
  pr.id,
  pr.player_id,
  p.name AS player_name,
  pr.match_id,
  pr.rating,
  pr.rd,
  pr.volatility,
  pr.rating_change,
  pr.created_at,
  m.event_id
FROM player_ratings pr
JOIN players p ON pr.player_id = p.id
JOIN matches m ON pr.match_id = m.id
ORDER BY pr.player_id, pr.match_id DESC;

COMMENT ON VIEW player_rating_history IS 'Player rating history with names and match details for easy querying';
