-- Add RLS policies for season_player_snapshots table

-- Enable RLS on season_player_snapshots table
ALTER TABLE public.season_player_snapshots ENABLE ROW LEVEL SECURITY;

-- Allow public read access to all snapshots
CREATE POLICY "Allow public read access to season snapshots" ON public.season_player_snapshots
FOR SELECT USING (true);

-- Allow admins to insert/update/delete snapshots
CREATE POLICY "Allow admins to insert season snapshots" ON public.season_player_snapshots
FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "Allow admins to update season snapshots" ON public.season_player_snapshots
FOR UPDATE USING (is_admin());

CREATE POLICY "Allow admins to delete season snapshots" ON public.season_player_snapshots
FOR DELETE USING (is_admin());
