-- Migration: Profitability tracking view
-- Purpose: Show actual profit/loss per project by comparing revenue (invoices) vs costs (bills)

-- Add profitability tracking view
CREATE OR REPLACE VIEW project_profitability AS
SELECT
  p.id,
  p.code,
  p.description,
  p.client_code,
  p.client_name,
  p.status,
  p.estimate_amount,
  COALESCE(SUM(i.amount), 0) as total_invoiced,
  COALESCE(SUM(i.amount - i.balance), 0) as total_collected,
  COALESCE(SUM(i.balance), 0) as outstanding_receivables,
  COALESCE(bills.total_bills, 0) as total_costs,
  COALESCE(SUM(i.amount), 0) - COALESCE(bills.total_bills, 0) as gross_profit,
  CASE
    WHEN COALESCE(SUM(i.amount), 0) > 0
    THEN ROUND(((COALESCE(SUM(i.amount), 0) - COALESCE(bills.total_bills, 0)) / COALESCE(SUM(i.amount), 0) * 100)::numeric, 1)
    ELSE 0
  END as profit_margin_pct
FROM projects p
LEFT JOIN invoices i ON i.project_id = p.id
LEFT JOIN (
  SELECT project_id, SUM(amount) as total_bills
  FROM bills
  GROUP BY project_id
) bills ON bills.project_id = p.id
GROUP BY p.id, p.code, p.description, p.client_code, p.client_name, p.status, p.estimate_amount, bills.total_bills;

-- Index for faster profitability queries
CREATE INDEX IF NOT EXISTS idx_invoices_project_id ON invoices(project_id);
CREATE INDEX IF NOT EXISTS idx_bills_project_id ON bills(project_id);
