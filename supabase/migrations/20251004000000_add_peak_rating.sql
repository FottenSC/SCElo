-- Add peak rating tracking columns
ALTER TABLE public.players 
  ADD COLUMN IF NOT EXISTS peak_rating double precision,
  ADD COLUMN IF NOT EXISTS peak_rating_date timestamp with time zone;

-- Initialize peak_rating with current rating for existing players
UPDATE public.players 
SET peak_rating = rating, peak_rating_date = CURRENT_TIMESTAMP
WHERE peak_rating IS NULL;

-- Create function to update peak rating
CREATE OR REPLACE FUNCTION update_peak_rating()
RETURNS TRIGGER AS $$
BEGIN
  -- If rating increased and is now higher than peak (or peak is null), update it
  IF NEW.rating > COALESCE(OLD.peak_rating, 0) THEN
    NEW.peak_rating := NEW.rating;
    NEW.peak_rating_date := CURRENT_TIMESTAMP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update peak rating
DROP TRIGGER IF EXISTS trigger_update_peak_rating ON public.players;
CREATE TRIGGER trigger_update_peak_rating
  BEFORE UPDATE OF rating ON public.players
  FOR EACH ROW
  EXECUTE FUNCTION update_peak_rating();

-- Add comments
COMMENT ON COLUMN public.players.peak_rating IS 'Highest rating ever achieved by this player';
COMMENT ON COLUMN public.players.peak_rating_date IS 'Date when peak rating was achieved';
