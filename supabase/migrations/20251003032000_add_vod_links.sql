-- Add vod_link columns to events and matches tables
ALTER TABLE events ADD COLUMN IF NOT EXISTS vod_link text;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS vod_link text;

-- Remove is_fake_data column from matches table (if it exists)
-- Note: This will fail if the column doesn't exist, which is fine
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'matches' AND column_name = 'is_fake_data'
    ) THEN
        ALTER TABLE matches DROP COLUMN is_fake_data;
    END IF;
END $$;
