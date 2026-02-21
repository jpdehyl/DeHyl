-- Add manual_override column to bills table
-- Allows marking bills that should not be overwritten during QB sync
ALTER TABLE bills ADD COLUMN IF NOT EXISTS manual_override BOOLEAN DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_bills_manual_override ON bills(manual_override) WHERE manual_override = true;
