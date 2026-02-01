-- Füge Edit-Tracking Felder hinzu
-- Führe dieses SQL in der Supabase SQL-Editor aus

-- Spalte für letzten Bearbeiter (Name/Email oder "Geteilt")
ALTER TABLE setlists ADD COLUMN IF NOT EXISTS last_edited_by TEXT;

-- Die updated_at Spalte existiert bereits und wird für Optimistic Locking verwendet
