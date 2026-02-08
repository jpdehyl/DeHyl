-- Consolidate expenses table into project_costs
-- project_costs becomes the single canonical cost tracking table
-- Created: 2026-02-08

-- Add columns from expenses that project_costs was missing
ALTER TABLE project_costs
  ADD COLUMN IF NOT EXISTS invoice_id uuid REFERENCES invoices(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS receipt_url text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'unlinked',
  ADD COLUMN IF NOT EXISTS submitted_by text;

-- Add check constraint for status
ALTER TABLE project_costs
  ADD CONSTRAINT project_costs_status_check
  CHECK (status IN ('unlinked', 'invoiced', 'collected'));

-- Migrate data from expenses into project_costs
INSERT INTO project_costs (
  project_id, description, amount, cost_date, category, vendor, notes,
  invoice_id, receipt_url, status, submitted_by, created_at, updated_at
)
SELECT
  project_id, description, amount, expense_date, category, vendor, notes,
  invoice_id, receipt_url, status, submitted_by, created_at, updated_at
FROM expenses
ON CONFLICT DO NOTHING;

-- Add indexes for the new columns
CREATE INDEX IF NOT EXISTS idx_project_costs_invoice ON project_costs(invoice_id);
CREATE INDEX IF NOT EXISTS idx_project_costs_status ON project_costs(status);

-- Also add new activity types to project_activities for timeline
ALTER TABLE project_activities
  DROP CONSTRAINT IF EXISTS project_activities_activity_type_check;

ALTER TABLE project_activities
  ADD CONSTRAINT project_activities_activity_type_check
  CHECK (activity_type IN ('email', 'invoice', 'bill', 'bid', 'note', 'status_change', 'file', 'daily_log', 'cost', 'safety_checklist'));
