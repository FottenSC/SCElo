-- Create rating_events table to track all rating changes
-- This allows for rating resets, history tracking, and future decay implementations

CREATE TABLE rating_events (
  id BIGSERIAL PRIMARY KEY,
  player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  match_id BIGINT REFERENCES matches(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('match', 'reset', 'decay', 'manual_adjustment')),
  
  -- Rating state AFTER this event
  rating DECIMAL NOT NULL,
  rd DECIMAL NOT NULL,
  volatility DECIMAL NOT NULL,
  
  -- Change from previous state
  rating_change DECIMAL,
  
  -- For match events
  opponent_id INTEGER REFERENCES players(id) ON DELETE SET NULL,
  result DECIMAL CHECK (result IN (0, 0.5, 1)), -- 0=loss, 0.5=draw, 1=win
  
  -- Metadata
  reason TEXT, -- e.g., "Season 2 Reset", "Monthly decay", "Admin adjustment"
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Index for efficient queries
  CONSTRAINT valid_match_event CHECK (
    (event_type = 'match' AND match_id IS NOT NULL AND opponent_id IS NOT NULL AND result IS NOT NULL)
    OR (event_type != 'match')
  )
);

-- Indexes for common queries
CREATE INDEX idx_rating_events_player_id ON rating_events(player_id, created_at DESC);
CREATE INDEX idx_rating_events_match_id ON rating_events(match_id);
CREATE INDEX idx_rating_events_type ON rating_events(event_type);
CREATE INDEX idx_rating_events_created_at ON rating_events(created_at DESC);

-- RLS policies (same as other tables)
ALTER TABLE rating_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access for rating_events"
  ON rating_events FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert rating_events"
  ON rating_events FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update rating_events"
  ON rating_events FOR UPDATE
  USING (is_admin());

CREATE POLICY "Admins can delete rating_events"
  ON rating_events FOR DELETE
  USING (is_admin());

-- Grant permissions
GRANT SELECT ON rating_events TO anon, authenticated;
GRANT ALL ON rating_events TO authenticated;

-- Function to get player rating history from events
CREATE OR REPLACE FUNCTION get_player_rating_history_from_events(p_player_id INTEGER, p_limit INTEGER DEFAULT 20)
RETURNS TABLE (
  event_id BIGINT,
  event_type TEXT,
  rating DECIMAL,
  rd DECIMAL,
  volatility DECIMAL,
  rating_change DECIMAL,
  match_id BIGINT,
  opponent_id INTEGER,
  opponent_name TEXT,
  result DECIMAL,
  reason TEXT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    re.id as event_id,
    re.event_type,
    re.rating,
    re.rd,
    re.volatility,
    re.rating_change,
    re.match_id,
    re.opponent_id,
    p.name as opponent_name,
    re.result,
    re.reason,
    re.created_at
  FROM rating_events re
  LEFT JOIN players p ON re.opponent_id = p.id
  WHERE re.player_id = p_player_id
  ORDER BY re.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to get latest rating for a player from events
CREATE OR REPLACE FUNCTION get_player_latest_rating(p_player_id INTEGER)
RETURNS TABLE (
  rating DECIMAL,
  rd DECIMAL,
  volatility DECIMAL,
  last_updated TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    re.rating,
    re.rd,
    re.volatility,
    re.created_at as last_updated
  FROM rating_events re
  WHERE re.player_id = p_player_id
  ORDER BY re.created_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to sync player table with latest rating from events
CREATE OR REPLACE FUNCTION sync_player_ratings_from_events()
RETURNS void AS $$
BEGIN
  UPDATE players p
  SET 
    rating = latest.rating,
    rd = latest.rd,
    volatility = latest.volatility,
    matches_played = (
      SELECT COUNT(*)
      FROM rating_events
      WHERE player_id = p.id AND event_type = 'match'
    ),
    last_match_date = (
      SELECT MAX(created_at)
      FROM rating_events
      WHERE player_id = p.id AND event_type = 'match'
    ),
    peak_rating = (
      SELECT MAX(rating)
      FROM rating_events
      WHERE player_id = p.id
    ),
    peak_rating_date = (
      SELECT created_at
      FROM rating_events re
      WHERE re.player_id = p.id
      ORDER BY re.rating DESC, re.created_at ASC
      LIMIT 1
    )
  FROM (
    SELECT DISTINCT ON (player_id)
      player_id,
      rating,
      rd,
      volatility
    FROM rating_events
    ORDER BY player_id, created_at DESC
  ) latest
  WHERE p.id = latest.player_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE rating_events IS 'Event-sourced rating history. Each row represents a rating change event (match, reset, decay, etc).';
COMMENT ON COLUMN rating_events.event_type IS 'Type of event: match (normal game), reset (rating reset), decay (time decay), manual_adjustment (admin change)';
COMMENT ON COLUMN rating_events.rating IS 'Rating value AFTER this event was applied';
COMMENT ON COLUMN rating_events.rating_change IS 'Change in rating from previous event (can be NULL for first event)';
COMMENT ON FUNCTION sync_player_ratings_from_events() IS 'Updates the players table with latest ratings from rating_events. Run after bulk rating calculations.';
