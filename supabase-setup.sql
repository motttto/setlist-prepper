-- Supabase Setup Script für Setlist Prepper
-- Führe dieses Script im Supabase SQL Editor aus

-- Enable UUID extension (falls nicht schon aktiviert)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table für OAuth-Provider (optional, Supabase Auth erstellt eigene)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  image TEXT,
  provider VARCHAR(50) DEFAULT 'email',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Setlists table
CREATE TABLE IF NOT EXISTS public.setlists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  title VARCHAR(255) NOT NULL,
  event_date DATE,
  venue VARCHAR(255),
  encrypted_data TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Custom Fields table
CREATE TABLE IF NOT EXISTS public.custom_fields (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  field_name VARCHAR(100) NOT NULL,
  field_type VARCHAR(50) DEFAULT 'text',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes für bessere Performance
CREATE INDEX IF NOT EXISTS idx_setlists_user_id ON public.setlists(user_id);
CREATE INDEX IF NOT EXISTS idx_setlists_updated_at ON public.setlists(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_custom_fields_user_id ON public.custom_fields(user_id);

-- Row Level Security (RLS) aktivieren
ALTER TABLE public.setlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- RLS Policies für Setlists
-- Benutzer können nur ihre eigenen Setlists sehen
CREATE POLICY "Users can view own setlists" ON public.setlists
  FOR SELECT USING (auth.uid()::text = user_id::text);

-- Benutzer können nur ihre eigenen Setlists erstellen
CREATE POLICY "Users can insert own setlists" ON public.setlists
  FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

-- Benutzer können nur ihre eigenen Setlists aktualisieren
CREATE POLICY "Users can update own setlists" ON public.setlists
  FOR UPDATE USING (auth.uid()::text = user_id::text);

-- Benutzer können nur ihre eigenen Setlists löschen
CREATE POLICY "Users can delete own setlists" ON public.setlists
  FOR DELETE USING (auth.uid()::text = user_id::text);

-- RLS Policies für Custom Fields
CREATE POLICY "Users can view own custom fields" ON public.custom_fields
  FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert own custom fields" ON public.custom_fields
  FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update own custom fields" ON public.custom_fields
  FOR UPDATE USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can delete own custom fields" ON public.custom_fields
  FOR DELETE USING (auth.uid()::text = user_id::text);

-- RLS Policies für Users (für OAuth)
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth.uid()::text = id::text);

CREATE POLICY "Users can insert own profile" ON public.users
  FOR INSERT WITH CHECK (auth.uid()::text = id::text);

-- Service Role kann alles (für API-Aufrufe mit Service Key)
-- Diese Policies erlauben dem Service Role Key vollen Zugriff

-- Funktion zum automatischen Aktualisieren von updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger für Setlists
DROP TRIGGER IF EXISTS update_setlists_updated_at ON public.setlists;
CREATE TRIGGER update_setlists_updated_at
  BEFORE UPDATE ON public.setlists
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Hinweis: Nach dem Ausführen dieses Scripts, gehe zu:
-- Authentication > Providers und aktiviere Email/Google/GitHub nach Bedarf
