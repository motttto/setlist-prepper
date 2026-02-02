-- Enable Realtime for collaborative editing
-- Run this in the Supabase SQL Editor

-- Check if table is already in publication
DO $$
BEGIN
  -- Add setlists table to realtime publication if not already added
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
    AND tablename = 'setlists'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE setlists;
    RAISE NOTICE 'Added setlists table to supabase_realtime publication';
  ELSE
    RAISE NOTICE 'setlists table is already in supabase_realtime publication';
  END IF;
END $$;

-- Verify the publication includes setlists
SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
