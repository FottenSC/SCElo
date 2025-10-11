-- Make player1_score nullable to allow upcoming matches with blank scores
-- This aligns player1_score with player2_score which is already nullable

ALTER TABLE public.matches
  ALTER COLUMN player1_score DROP NOT NULL;

COMMENT ON COLUMN public.matches.player1_score IS 'Score for player 1; nullable for upcoming matches';
