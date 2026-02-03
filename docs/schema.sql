-- Setlist Prepper - Supabase Schema
-- Ausführen in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Setlists table
CREATE TABLE setlists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  event_date DATE,
  start_time TIME,
  venue TEXT,
  encrypted_data JSONB DEFAULT '{"songs": []}'::jsonb,
  share_token TEXT UNIQUE,
  share_password_hash TEXT,
  is_shared BOOLEAN DEFAULT false,
  shared_act_id TEXT DEFAULT NULL,  -- NULL = full event, Act-ID = only that act
  share_role TEXT DEFAULT 'band',  -- 'band' = can edit songs only, 'orga' = can edit everything
  last_edited_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Custom fields table
CREATE TABLE custom_fields (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  setlist_id UUID REFERENCES setlists(id) ON DELETE CASCADE,
  field_name TEXT NOT NULL,
  field_type TEXT NOT NULL CHECK (field_type IN ('text', 'textarea', 'dropdown')),
  dropdown_options TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT custom_fields_owner CHECK (user_id IS NOT NULL OR setlist_id IS NOT NULL)
);

-- Indexes
CREATE INDEX idx_setlists_user_id ON setlists(user_id);
CREATE INDEX idx_setlists_share_token ON setlists(share_token);
CREATE INDEX idx_custom_fields_user_id ON custom_fields(user_id);
CREATE INDEX idx_custom_fields_setlist_id ON custom_fields(setlist_id);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for setlists
CREATE TRIGGER update_setlists_updated_at
  BEFORE UPDATE ON setlists
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE setlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_fields ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users (nur der Service Role Key kann zugreifen)
-- Keine direkten Policies - Zugriff nur über API

-- RLS Policies for setlists
CREATE POLICY "Users can view own setlists"
  ON setlists FOR SELECT
  USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert own setlists"
  ON setlists FOR INSERT
  WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update own setlists"
  ON setlists FOR UPDATE
  USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can delete own setlists"
  ON setlists FOR DELETE
  USING (auth.uid()::text = user_id::text);

-- Shared setlists policy (für API mit Service Role)
CREATE POLICY "Shared setlists are readable"
  ON setlists FOR SELECT
  USING (is_shared = true AND share_token IS NOT NULL);

-- RLS Policies for custom_fields
CREATE POLICY "Users can view own custom fields"
  ON custom_fields FOR SELECT
  USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can manage own custom fields"
  ON custom_fields FOR ALL
  USING (auth.uid()::text = user_id::text);

-- Enable Realtime for setlists (für Kollaboration)
-- In Supabase Dashboard: Database > Replication > Enable for setlists table

-- Hinweis: Die App nutzt den Service Role Key für API-Zugriffe,
-- daher sind die RLS-Policies hauptsächlich als zusätzliche Sicherheitsschicht gedacht.

-- Migration: Add shared_act_id column (run this in Supabase SQL Editor)
-- ALTER TABLE setlists ADD COLUMN IF NOT EXISTS shared_act_id TEXT DEFAULT NULL;

-- Migration: Add share_role column (run this in Supabase SQL Editor)
-- ALTER TABLE setlists ADD COLUMN IF NOT EXISTS share_role TEXT DEFAULT 'band';
