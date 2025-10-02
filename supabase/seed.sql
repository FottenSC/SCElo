-- Seed data for SCElo
-- This populates players and matches using the correct schema (UUID-based)

-- Insert sample players
INSERT INTO public.players (name) VALUES
  ('Fotten'),
  ('Mental'),
  ('Ssylus'),
  ('Ganondeurf'),
  ('Freemard'),
  ('WorldBranstar'),
  ('Aby'),
  ('Scarlet'),
  ('DarthSeppius'),
  ('TadlosSC'),
  ('X-Ray'),
  ('Jumpie'),
  ('Kellerak'),
  ('Rosa'),
  ('Lyonide'),
  ('Momotehk'),
  ('Volty'),
  ('Patrick'),
  ('Afflatus Misery'),
  ('SomethingRefined')
ON CONFLICT (name) DO NOTHING;

-- Insert sample matches using player names
-- We'll use a CTE to get player IDs by name
WITH player_lookup AS (
  SELECT id, name FROM public.players
)
INSERT INTO public.matches ("aId", "bId", "winnerId", at)
SELECT 
  a.id as "aId",
  b.id as "bId",
  w.id as "winnerId",
  (extract(epoch from now()) * 1000)::bigint - (row_number() OVER () * 3600000) as at
FROM (VALUES
  ('Fotten', 'Mental', 'Fotten'),
  ('Ssylus', 'Ganondeurf', 'Ssylus'),
  ('Freemard', 'WorldBranstar', 'WorldBranstar'),
  ('Aby', 'Scarlet', 'Scarlet'),
  ('DarthSeppius', 'TadlosSC', 'TadlosSC'),
  ('X-Ray', 'Jumpie', 'X-Ray'),
  ('Kellerak', 'Rosa', 'Rosa'),
  ('Lyonide', 'Momotehk', 'Momotehk'),
  ('Volty', 'Patrick', 'Patrick'),
  ('Afflatus Misery', 'SomethingRefined', 'Afflatus Misery'),
  ('Mental', 'Ssylus', 'Ssylus'),
  ('Fotten', 'Freemard', 'Fotten'),
  ('WorldBranstar', 'Ganondeurf', 'Ganondeurf'),
  ('Scarlet', 'DarthSeppius', 'Scarlet'),
  ('TadlosSC', 'X-Ray', 'X-Ray'),
  ('Jumpie', 'Kellerak', 'Kellerak'),
  ('Rosa', 'Lyonide', 'Rosa'),
  ('Momotehk', 'Volty', 'Momotehk'),
  ('Patrick', 'Afflatus Misery', 'Patrick'),
  ('SomethingRefined', 'Aby', 'SomethingRefined'),
  ('Ssylus', 'Fotten', 'Ssylus'),
  ('Mental', 'Freemard', 'Mental'),
  ('Ganondeurf', 'Scarlet', 'Scarlet'),
  ('WorldBranstar', 'TadlosSC', 'WorldBranstar'),
  ('DarthSeppius', 'Jumpie', 'DarthSeppius'),
  ('X-Ray', 'Rosa', 'X-Ray'),
  ('Kellerak', 'Momotehk', 'Kellerak'),
  ('Lyonide', 'Patrick', 'Lyonide'),
  ('Volty', 'SomethingRefined', 'SomethingRefined'),
  ('Afflatus Misery', 'Aby', 'Afflatus Misery')
) AS match_data(player_a, player_b, winner)
CROSS JOIN player_lookup a
CROSS JOIN player_lookup b
CROSS JOIN player_lookup w
WHERE a.name = match_data.player_a
  AND b.name = match_data.player_b
  AND w.name = match_data.winner;
