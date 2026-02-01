-- Supabase Update für Sharing-Funktionalität
-- Führe dieses Script im Supabase SQL Editor aus

-- Share-Felder zur setlists Tabelle hinzufügen
ALTER TABLE public.setlists
ADD COLUMN IF NOT EXISTS share_token VARCHAR(64) UNIQUE,
ADD COLUMN IF NOT EXISTS share_password_hash VARCHAR(255),
ADD COLUMN IF NOT EXISTS is_shared BOOLEAN DEFAULT false;

-- Index für schnelle Token-Lookups
CREATE INDEX IF NOT EXISTS idx_setlists_share_token ON public.setlists(share_token) WHERE share_token IS NOT NULL;
