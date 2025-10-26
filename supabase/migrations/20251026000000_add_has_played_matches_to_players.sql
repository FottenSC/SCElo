-- Add has_played_this_season field to track if player has matches in current season
ALTER TABLE players ADD COLUMN has_played_this_season BOOLEAN DEFAULT FALSE;

-- Create index for faster filtering
CREATE INDEX idx_players_has_played_this_season ON players(has_played_this_season);
