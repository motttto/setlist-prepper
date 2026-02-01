-- Add start_time column to setlists table
ALTER TABLE setlists ADD COLUMN IF NOT EXISTS start_time VARCHAR(5);

-- Comment explaining the column
COMMENT ON COLUMN setlists.start_time IS 'Concert start time in HH:MM format';
