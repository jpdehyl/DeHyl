-- Add manual_override to invoices (matching the existing bills pattern)
-- When true, sync will not overwrite user-modified fields (project_id, match_confidence)
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS manual_override BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_invoices_manual_override ON invoices(manual_override) WHERE manual_override = true;
