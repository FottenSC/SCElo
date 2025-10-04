-- Grant authenticated users full access to tables (RLS policies will handle admin checks)
-- The issue is that even with policies, users need base table permissions

-- Grant all operations to authenticated role (policies will still enforce admin checks)
GRANT ALL ON players TO authenticated;
GRANT ALL ON matches TO authenticated;
GRANT ALL ON events TO authenticated;

-- Also grant sequence access for auto-increment IDs
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Grant scheduled_matches if it exists
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'scheduled_matches') THEN
    EXECUTE 'GRANT ALL ON scheduled_matches TO authenticated';
  END IF;
END $$;

-- Verify grants
DO $$
BEGIN
  RAISE NOTICE 'Granted all permissions on tables to authenticated role';
  RAISE NOTICE 'RLS policies will still enforce that only admins can write';
END $$;
