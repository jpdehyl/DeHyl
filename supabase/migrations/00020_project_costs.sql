-- Project Costs Table for direct cost tracking per project
-- Feeds into profitability calculations alongside QB bills
-- Created: 2026-02-08

CREATE TABLE IF NOT EXISTS project_costs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  description text NOT NULL,
  amount numeric(12,2) NOT NULL,
  cost_date date NOT NULL DEFAULT CURRENT_DATE,
  category text NOT NULL DEFAULT 'materials'
    CHECK (category IN ('labor', 'materials', 'equipment', 'subcontractor', 'disposal', 'permits', 'fuel', 'rental', 'other')),
  vendor text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_project_costs_project ON project_costs(project_id);
CREATE INDEX IF NOT EXISTS idx_project_costs_date ON project_costs(cost_date);
CREATE INDEX IF NOT EXISTS idx_project_costs_category ON project_costs(category);

-- RLS
ALTER TABLE project_costs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for project_costs" ON project_costs FOR ALL USING (true);

-- Updated at trigger
CREATE TRIGGER update_project_costs_updated_at
  BEFORE UPDATE ON project_costs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Update the profitability view to include project_costs
CREATE OR REPLACE VIEW project_profitability AS
SELECT
  p.id,
  p.code,
  p.description,
  p.client_code,
  p.client_name,
  p.status,
  p.estimate_amount,
  COALESCE(inv.total_invoiced, 0) as total_invoiced,
  COALESCE(inv.total_collected, 0) as total_collected,
  COALESCE(inv.outstanding_receivables, 0) as outstanding_receivables,
  COALESCE(b.total_bills, 0) + COALESCE(pc.total_costs, 0) as total_costs,
  COALESCE(inv.total_invoiced, 0) - COALESCE(b.total_bills, 0) - COALESCE(pc.total_costs, 0) as gross_profit,
  CASE
    WHEN COALESCE(inv.total_invoiced, 0) > 0
    THEN ROUND(((COALESCE(inv.total_invoiced, 0) - COALESCE(b.total_bills, 0) - COALESCE(pc.total_costs, 0)) / COALESCE(inv.total_invoiced, 0) * 100)::numeric, 1)
    ELSE 0
  END as profit_margin_pct
FROM projects p
LEFT JOIN (
  SELECT
    project_id,
    SUM(amount) as total_invoiced,
    SUM(amount - balance) as total_collected,
    SUM(balance) as outstanding_receivables
  FROM invoices
  GROUP BY project_id
) inv ON inv.project_id = p.id
LEFT JOIN (
  SELECT project_id, SUM(amount) as total_bills
  FROM bills
  GROUP BY project_id
) b ON b.project_id = p.id
LEFT JOIN (
  SELECT project_id, SUM(amount) as total_costs
  FROM project_costs
  GROUP BY project_id
) pc ON pc.project_id = p.id;
