-- Season System Implementation
-- 
-- Overview:
-- - Active season has id = -1 (fixed ID, never changes)
-- - Archived seasons get permanent IDs (1, 2, 3, etc.)
-- - Players show as inactive when rating IS NULL
-- - All matches/events reference a season_id

-- 1. Create seasons table
CREATE TABLE public.seasons (
  id BIGINT PRIMARY KEY,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  start_date TIMESTAMP NOT NULL DEFAULT NOW(),
  end_date TIMESTAMP,
  description TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create the active season (id = -1) FIRST before adding foreign keys
INSERT INTO public.seasons (id, name, status, start_date, description)
VALUES (-1, 'Active Season', 'active', NOW(), 'Current active season - use id=-1 to reference this');

-- Indexes for quick lookups
CREATE INDEX idx_seasons_status ON public.seasons(status);
CREATE INDEX idx_seasons_start_date ON public.seasons(start_date);

-- 2. Add season_id to matches table (default -1 for active season)
ALTER TABLE public.matches
ADD COLUMN season_id BIGINT NOT NULL DEFAULT -1;

-- Add foreign key constraint (now safe since -1 season exists)
ALTER TABLE public.matches
ADD CONSTRAINT fk_matches_season FOREIGN KEY (season_id) REFERENCES public.seasons(id);

-- Index for season filtering
CREATE INDEX idx_matches_season_id ON public.matches(season_id);

-- 3. Add season_id to rating_events table (default -1 for active season)
ALTER TABLE public.rating_events
ADD COLUMN season_id BIGINT NOT NULL DEFAULT -1;

-- Add foreign key constraint (now safe since -1 season exists)
ALTER TABLE public.rating_events
ADD CONSTRAINT fk_rating_events_season FOREIGN KEY (season_id) REFERENCES public.seasons(id);

-- Indexes for season and player lookups
CREATE INDEX idx_rating_events_season_id ON public.rating_events(season_id);
CREATE INDEX idx_rating_events_season_player ON public.rating_events(season_id, player_id);

-- 4. Create season_player_snapshots table for archived season leaderboards
CREATE TABLE public.season_player_snapshots (
  id BIGSERIAL PRIMARY KEY,
  season_id BIGINT NOT NULL REFERENCES public.seasons(id) ON DELETE CASCADE,
  player_id INTEGER NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  
  -- Player's final state for this season
  final_rating NUMERIC NOT NULL,
  final_rd NUMERIC NOT NULL,
  final_volatility NUMERIC NOT NULL,
  matches_played_count INTEGER NOT NULL,
  peak_rating NUMERIC,
  peak_rating_date TIMESTAMP,
  final_rank INTEGER,
  
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  -- Ensure one snapshot per player per season
  UNIQUE(season_id, player_id)
);

-- Indexes for lookups
CREATE INDEX idx_season_snapshots_season ON public.season_player_snapshots(season_id);
CREATE INDEX idx_season_snapshots_player ON public.season_player_snapshots(player_id);

-- 5. Make player ratings nullable (to indicate inactive players in active season)
ALTER TABLE public.players
ALTER COLUMN rating DROP NOT NULL,
ALTER COLUMN rd DROP NOT NULL,
ALTER COLUMN volatility DROP NOT NULL;

-- 6. Reset all player ratings to NULL (indicate they haven't played in active season)
UPDATE public.players 
SET rating = NULL, 
    rd = NULL, 
    volatility = NULL;
