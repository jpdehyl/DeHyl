-- Invoice line items synced from QuickBooks
CREATE TABLE IF NOT EXISTS invoice_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  line_num INTEGER,
  description TEXT,
  quantity DECIMAL(12,4),
  unit_price DECIMAL(12,2),
  amount DECIMAL(12,2) NOT NULL,
  item_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_invoice_line_items_invoice_id ON invoice_line_items(invoice_id);
