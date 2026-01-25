-- DeHyl Project Financial System
-- Project Activities / Timeline Table
-- Created: 2026-01-24

-- ===========================================
-- Project Activities Table
-- Chronological activity log for each project
-- ===========================================
CREATE TABLE project_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,

  -- Activity type
  activity_type TEXT NOT NULL CHECK (activity_type IN ('email', 'invoice', 'bill', 'bid', 'note', 'status_change', 'file')),

  -- Core fields
  title TEXT NOT NULL,
  description TEXT,
  activity_date TIMESTAMPTZ NOT NULL,

  -- Metadata (flexible JSON for type-specific data)
  metadata JSONB DEFAULT '{}',

  -- Source reference (email_id, invoice_id, etc.)
  source_id TEXT,
  source_type TEXT,

  -- For emails specifically
  email_from TEXT,
  email_to TEXT,
  email_subject TEXT,
  email_snippet TEXT,
  email_thread_id TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===========================================
-- Indexes for Performance
-- ===========================================
CREATE INDEX idx_project_activities_project ON project_activities(project_id);
CREATE INDEX idx_project_activities_date ON project_activities(activity_date DESC);
CREATE INDEX idx_project_activities_type ON project_activities(activity_type);
CREATE INDEX idx_project_activities_source ON project_activities(source_id, source_type);

-- ===========================================
-- Trigger for updated_at
-- ===========================================
CREATE TRIGGER update_project_activities_updated_at
  BEFORE UPDATE ON project_activities
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ===========================================
-- Row Level Security (RLS)
-- ===========================================
ALTER TABLE project_activities ENABLE ROW LEVEL SECURITY;

-- Allow all operations for now (single user)
CREATE POLICY "Allow all for project_activities" ON project_activities FOR ALL USING (true);
