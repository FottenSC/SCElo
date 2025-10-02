-- Add rating columns to players table
ALTER TABLE public.players 
  ADD COLUMN IF NOT EXISTS rating double precision NOT NULL DEFAULT 1500,
  ADD COLUMN IF NOT EXISTS rd double precision NOT NULL DEFAULT 350,
  ADD COLUMN IF NOT EXISTS volatility double precision NOT NULL DEFAULT 0.06;

-- Add index on rating for faster sorting
CREATE INDEX IF NOT EXISTS players_rating_idx ON public.players USING btree (rating DESC);

-- Add comment explaining the rating system
COMMENT ON COLUMN public.players.rating IS 'Glicko-2 rating (mu) - average skill level, default 1500';
COMMENT ON COLUMN public.players.rd IS 'Glicko-2 rating deviation (phi) - uncertainty in rating, default 350';
COMMENT ON COLUMN public.players.volatility IS 'Glicko-2 volatility (sigma) - consistency of performance, default 0.06';
