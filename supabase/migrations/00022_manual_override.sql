-- Migration: Add manual_override to invoices and bills
-- Allows JP to override QB-synced values without them being overwritten on next sync

ALTER TABLE invoices ADD COLUMN IF NOT EXISTS manual_override BOOLEAN DEFAULT false;
ALTER TABLE bills ADD COLUMN IF NOT EXISTS manual_override BOOLEAN DEFAULT false;

-- Index for quick lookup during sync (skip overridden records)
CREATE INDEX IF NOT EXISTS idx_invoices_manual_override ON invoices(manual_override) WHERE manual_override = true;
CREATE INDEX IF NOT EXISTS idx_bills_manual_override ON bills(manual_override) WHERE manual_override = true;
