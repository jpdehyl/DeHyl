-- Expenses Table for DeHyl Project Cost Tracking
-- Created: 2026-02-08
-- Every expense must be assigned to a project and eventually linked to an invoice

CREATE TABLE IF NOT EXISTS expenses (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  description text NOT NULL,
  amount numeric(10,2) NOT NULL,
  expense_date date NOT NULL,
  category text NOT NULL DEFAULT 'materials' CHECK (category IN ('materials', 'equipment', 'disposal', 'fuel', 'rental', 'subcontractor', 'permits', 'other')),
  project_id uuid NOT NULL REFERENCES projects(id),
  invoice_id uuid REFERENCES invoices(id),
  vendor text,
  receipt_url text,
  status text NOT NULL DEFAULT 'unlinked' CHECK (status IN ('unlinked', 'invoiced', 'collected')),
  notes text,
  submitted_by text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_expenses_project ON expenses(project_id);
CREATE INDEX IF NOT EXISTS idx_expenses_status ON expenses(status);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date);

-- Create the Shop project for internal overhead expenses
INSERT INTO projects (id, drive_id, code, client_code, client_name, description, status)
VALUES (
  '8649bd23-6948-4ec6-8dc8-4c58c8a25016',
  'shop-internal',
  'SHOP',
  'SHOP',
  'DeHyl Internal',
  'Internal overhead and shop expenses',
  'active'
) ON CONFLICT (drive_id) DO NOTHING;