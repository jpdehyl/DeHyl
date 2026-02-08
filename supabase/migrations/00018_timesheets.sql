-- Timesheets: track crew hours per project
CREATE TABLE IF NOT EXISTS timesheets (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  worker_name text NOT NULL,
  work_date date NOT NULL,
  hours_worked numeric(5,2) NOT NULL DEFAULT 0,
  project_id uuid REFERENCES projects(id),
  description text,
  status text NOT NULL DEFAULT 'unassigned' CHECK (status IN ('unassigned', 'assigned', 'approved', 'invoiced')),
  source text DEFAULT 'manual' CHECK (source IN ('manual', 'whatsapp', 'daily_log')),
  submitted_by text,
  approved_by text,
  approved_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Index for fast queries on unassigned hours
CREATE INDEX idx_timesheets_status ON timesheets(status);
CREATE INDEX idx_timesheets_worker ON timesheets(worker_name, work_date);
CREATE INDEX idx_timesheets_project ON timesheets(project_id);

-- Prevent duplicate entries
CREATE UNIQUE INDEX idx_timesheets_unique ON timesheets(worker_name, work_date, project_id) WHERE project_id IS NOT NULL;