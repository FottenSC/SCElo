-- Simplify rating storage to match-based only
-- Remove player_ratings table and associated triggers/views
-- Keep rating metadata on players table for caching

-- Drop the view first
DROP VIEW IF EXISTS player_rating_history;

-- Drop the trigger on player_ratings before dropping the function
DROP TRIGGER IF EXISTS player_ratings_update_stats ON player_ratings;

-- Drop the trigger function
DROP FUNCTION IF EXISTS update_player_stats();

-- Drop the player_ratings table
DROP TABLE IF EXISTS player_ratings;

-- Keep the metadata columns on players table (they're useful for caching)
-- These are: last_match_date, matches_played, peak_rating, peak_rating_date
-- They were added in migration 20251003001152

-- Create a function to get rating history for a player from matches
CREATE OR REPLACE FUNCTION get_player_rating_history(p_player_id BIGINT)
RETURNS TABLE (
  match_id BIGINT,
  match_date TIMESTAMPTZ,
  opponent_id BIGINT,
  opponent_name TEXT,
  result TEXT,
  rating_change NUMERIC,
  rating_after NUMERIC,
  rd_after NUMERIC,
  volatility_after NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH player_matches AS (
    SELECT 
      m.id as match_id,
      m.match_date,
      CASE 
        WHEN m.player1_id = p_player_id THEN m.player2_id
        ELSE m.player1_id
      END as opponent_id,
      CASE 
        WHEN m.player1_id = p_player_id THEN p2.name
        ELSE p1.name
      END as opponent_name,
      CASE 
        WHEN m.winner_id = p_player_id THEN 'W'
        ELSE 'L'
      END as result,
      CASE 
        WHEN m.player1_id = p_player_id THEN m.rating_change_p1
        ELSE m.rating_change_p2
      END as rating_change
    FROM matches m
    LEFT JOIN players p1 ON m.player1_id = p1.id
    LEFT JOIN players p2 ON m.player2_id = p2.id
    WHERE (m.player1_id = p_player_id OR m.player2_id = p_player_id)
      AND m.winner_id IS NOT NULL
    ORDER BY m.id ASC
  )
  SELECT 
    pm.match_id,
    pm.match_date,
    pm.opponent_id,
    pm.opponent_name,
    pm.result,
    pm.rating_change,
    -- Calculate cumulative rating
    1500 + SUM(pm.rating_change) OVER (ORDER BY pm.match_id) as rating_after,
    NULL::NUMERIC as rd_after,  -- Could add if storing rd changes per match
    NULL::NUMERIC as volatility_after
  FROM player_matches pm;
END;
$$ LANGUAGE plpgsql STABLE;

-- Create a trigger to update player metadata when matches are inserted/updated
CREATE OR REPLACE FUNCTION update_player_metadata_from_matches()
RETURNS TRIGGER AS $$
DECLARE
  p1_stats RECORD;
  p2_stats RECORD;
BEGIN
  -- Only process completed matches
  IF NEW.winner_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Update player 1 metadata
  WITH player_matches AS (
    SELECT 
      COUNT(*) as matches_played,
      MAX(m.match_date) as last_match_date,
      1500 + SUM(
        CASE 
          WHEN m.player1_id = NEW.player1_id THEN m.rating_change_p1
          WHEN m.player2_id = NEW.player1_id THEN m.rating_change_p2
          ELSE 0
        END
      ) as current_rating
    FROM matches m
    WHERE (m.player1_id = NEW.player1_id OR m.player2_id = NEW.player1_id)
      AND m.winner_id IS NOT NULL
  )
  SELECT * INTO p1_stats FROM player_matches;

  UPDATE players
  SET 
    matches_played = p1_stats.matches_played,
    last_match_date = p1_stats.last_match_date,
    peak_rating = GREATEST(COALESCE(peak_rating, rating), p1_stats.current_rating),
    peak_rating_date = CASE 
      WHEN p1_stats.current_rating > COALESCE(peak_rating, rating) THEN NEW.match_date
      ELSE peak_rating_date
    END
  WHERE id = NEW.player1_id;

  -- Update player 2 metadata
  WITH player_matches AS (
    SELECT 
      COUNT(*) as matches_played,
      MAX(m.match_date) as last_match_date,
      1500 + SUM(
        CASE 
          WHEN m.player1_id = NEW.player2_id THEN m.rating_change_p1
          WHEN m.player2_id = NEW.player2_id THEN m.rating_change_p2
          ELSE 0
        END
      ) as current_rating
    FROM matches m
    WHERE (m.player1_id = NEW.player2_id OR m.player2_id = NEW.player2_id)
      AND m.winner_id IS NOT NULL
  )
  SELECT * INTO p2_stats FROM player_matches;

  UPDATE players
  SET 
    matches_played = p2_stats.matches_played,
    last_match_date = p2_stats.last_match_date,
    peak_rating = GREATEST(COALESCE(peak_rating, rating), p2_stats.current_rating),
    peak_rating_date = CASE 
      WHEN p2_stats.current_rating > COALESCE(peak_rating, rating) THEN NEW.match_date
      ELSE peak_rating_date
    END
  WHERE id = NEW.player2_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS update_player_metadata_trigger ON matches;
CREATE TRIGGER update_player_metadata_trigger
  AFTER INSERT OR UPDATE ON matches
  FOR EACH ROW
  WHEN (NEW.winner_id IS NOT NULL)
  EXECUTE FUNCTION update_player_metadata_from_matches();

-- Add indexes for efficient rating history queries
CREATE INDEX IF NOT EXISTS idx_matches_player1_id_winner ON matches(player1_id) WHERE winner_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_matches_player2_id_winner ON matches(player2_id) WHERE winner_id IS NOT NULL;

-- Comments for documentation
COMMENT ON FUNCTION get_player_rating_history(BIGINT) IS 'Returns rating history for a player calculated from their matches in chronological order';
COMMENT ON FUNCTION update_player_metadata_from_matches() IS 'Trigger function to update player metadata (matches_played, peak_rating, etc.) when matches are added or modified';
