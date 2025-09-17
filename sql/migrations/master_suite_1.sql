-- Ajouter les colonnes manquantes
ALTER TABLE agency_settings ADD COLUMN IF NOT EXISTS theme_preset text DEFAULT 'ocean';
ALTER TABLE agency_settings ADD COLUMN IF NOT EXISTS theme_tokens jsonb DEFAULT '{}';
ALTER TABLE agency_settings ADD COLUMN IF NOT EXISTS plan_key text DEFAULT 'starter';
ALTER TABLE agency_settings ADD COLUMN IF NOT EXISTS instagram_addon boolean DEFAULT false;
ALTER TABLE agency_settings ADD COLUMN IF NOT EXISTS deadline_sunday_utc text DEFAULT '16:00';
ALTER TABLE agency_settings ADD COLUMN IF NOT EXISTS payroll jsonb DEFAULT '{}';
ALTER TABLE agency_settings ADD COLUMN IF NOT EXISTS strike jsonb DEFAULT '{}';
ALTER TABLE agency_settings ADD COLUMN IF NOT EXISTS telegram jsonb DEFAULT '{}';
ALTER TABLE agency_settings ADD COLUMN IF NOT EXISTS instagram_enabled boolean DEFAULT false;
ALTER TABLE agency_settings ADD COLUMN IF NOT EXISTS competition jsonb DEFAULT '{}';
ALTER TABLE agency_settings ADD COLUMN IF NOT EXISTS invites jsonb DEFAULT '[]';