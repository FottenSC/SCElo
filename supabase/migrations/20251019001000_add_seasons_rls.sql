-- Add RLS policies for seasons table

-- Enable RLS on seasons table
ALTER TABLE public.seasons ENABLE ROW LEVEL SECURITY;

-- Allow public read access to all seasons
CREATE POLICY "Allow public read access to seasons" ON public.seasons
FOR SELECT USING (true);

-- Allow admins to insert/update/delete seasons
CREATE POLICY "Allow admins to insert seasons" ON public.seasons
FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "Allow admins to update seasons" ON public.seasons
FOR UPDATE USING (is_admin());

CREATE POLICY "Allow admins to delete seasons" ON public.seasons
FOR DELETE USING (is_admin());
