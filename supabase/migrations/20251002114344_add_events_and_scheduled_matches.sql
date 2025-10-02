-- Create events table for upcoming stream events
CREATE TABLE IF NOT EXISTS events (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  event_date TIMESTAMPTZ NOT NULL,
  stream_url TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Modify matches table to support both completed and upcoming matches
-- Make winner_id nullable (null = upcoming match, not null = completed match)
ALTER TABLE matches ALTER COLUMN winner_id DROP NOT NULL;

-- Add event relationship and ordering for upcoming matches
ALTER TABLE matches ADD COLUMN IF NOT EXISTS event_id INTEGER REFERENCES events(id) ON DELETE SET NULL;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS match_order INTEGER DEFAULT 0;

-- Add rating change columns to matches table for historical tracking
ALTER TABLE matches ADD COLUMN IF NOT EXISTS rating_change_p1 DECIMAL(10, 2);
ALTER TABLE matches ADD COLUMN IF NOT EXISTS rating_change_p2 DECIMAL(10, 2);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS events_event_date_idx ON events(event_date DESC);
CREATE INDEX IF NOT EXISTS matches_event_id_idx ON matches(event_id);
CREATE INDEX IF NOT EXISTS matches_winner_id_idx ON matches(winner_id);
