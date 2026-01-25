-- DeHyl Project Financial System
-- Quote Generator Migration
-- Created: 2026-01-25
-- Purpose: Add fields for project comparison and quote generation

-- ===========================================
-- Add fields to projects for better comparison
-- ===========================================

-- Project type classification
ALTER TABLE projects ADD COLUMN IF NOT EXISTS project_type TEXT;
COMMENT ON COLUMN projects.project_type IS 'interior_demo, full_demo, abatement, retail_fitout, hazmat, restoration';

-- Square footage for size-based estimates
ALTER TABLE projects ADD COLUMN IF NOT EXISTS square_footage INTEGER;

-- Final cost and revenue for completed projects
ALTER TABLE projects ADD COLUMN IF NOT EXISTS final_cost DECIMAL(12,2);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS final_revenue DECIMAL(12,2);

-- Calculated profit margin (stored for quick queries)
ALTER TABLE projects ADD COLUMN IF NOT EXISTS profit_margin DECIMAL(5,2);

-- Location for regional pricing adjustments
ALTER TABLE projects ADD COLUMN IF NOT EXISTS location TEXT;

-- ===========================================
-- Add fields to bids for quote generation
-- ===========================================

-- Project type classification for bids
ALTER TABLE bids ADD COLUMN IF NOT EXISTS project_type TEXT;
COMMENT ON COLUMN bids.project_type IS 'interior_demo, full_demo, abatement, retail_fitout, hazmat, restoration';

-- Square footage for the bid
ALTER TABLE bids ADD COLUMN IF NOT EXISTS square_footage INTEGER;

-- Location for the bid
ALTER TABLE bids ADD COLUMN IF NOT EXISTS location TEXT;

-- Quote generation metadata (stores similar projects used, confidence, etc.)
ALTER TABLE bids ADD COLUMN IF NOT EXISTS quote_metadata JSONB DEFAULT '{}';

-- ===========================================
-- Create indexes for efficient similarity queries
-- ===========================================

CREATE INDEX IF NOT EXISTS idx_projects_project_type ON projects(project_type);
CREATE INDEX IF NOT EXISTS idx_projects_square_footage ON projects(square_footage);
CREATE INDEX IF NOT EXISTS idx_projects_final_revenue ON projects(final_revenue);
CREATE INDEX IF NOT EXISTS idx_projects_closed_with_revenue ON projects(status, final_revenue)
  WHERE status = 'closed' AND final_revenue IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_bids_project_type ON bids(project_type);
CREATE INDEX IF NOT EXISTS idx_bids_square_footage ON bids(square_footage);

-- ===========================================
-- Project types reference table (optional, for UI dropdowns)
-- ===========================================

CREATE TABLE IF NOT EXISTS project_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  typical_price_per_sqft DECIMAL(8,2),
  sort_order INTEGER DEFAULT 0
);

-- Insert default project types
INSERT INTO project_types (code, name, description, typical_price_per_sqft, sort_order) VALUES
  ('interior_demo', 'Interior Demolition', 'Removal of non-structural interior elements', 8.50, 1),
  ('full_demo', 'Full Demolition', 'Complete building demolition', 12.00, 2),
  ('abatement', 'Hazardous Material Abatement', 'Asbestos, lead, mold removal', 15.00, 3),
  ('retail_fitout', 'Retail Fit-out', 'Commercial space renovation', 10.00, 4),
  ('hazmat', 'Hazmat Cleanup', 'Hazardous material handling and disposal', 18.00, 5),
  ('restoration', 'Restoration', 'Building restoration and repair work', 14.00, 6)
ON CONFLICT (code) DO NOTHING;

-- Enable RLS on project_types
ALTER TABLE project_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for project_types" ON project_types FOR ALL USING (true);
