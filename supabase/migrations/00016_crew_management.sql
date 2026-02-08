-- Migration: Crew Management + Time Tracking
-- Employee directory, certifications, and time entries

-- ===========================================
-- CREW_MEMBERS Table
-- Master employee/subcontractor directory
-- ===========================================
CREATE TABLE IF NOT EXISTS crew_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Basic info
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  
  -- Work info
  role TEXT CHECK (role IN ('superintendent', 'foreman', 'laborer', 'driver', 'operator', 'admin')),
  employment_type TEXT DEFAULT 'employee' CHECK (employment_type IN ('employee', 'subcontractor')),
  company TEXT, -- For subcontractors
  
  -- Compensation (PRIVATE - only admin sees this)
  hourly_rate DECIMAL(8,2),
  
  -- Dates
  hire_date DATE,
  termination_date DATE,
  
  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'on_leave')),
  
  -- Emergency contact
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  
  -- Notes
  notes TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===========================================
-- CERTIFICATIONS Table
-- Training and certificates with expiry tracking
-- ===========================================
CREATE TABLE IF NOT EXISTS certifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crew_member_id UUID REFERENCES crew_members(id) ON DELETE CASCADE,
  
  -- Cert info
  name TEXT NOT NULL, -- e.g., "First Aid Level 3", "Fall Protection", "WHMIS"
  cert_number TEXT,
  issuing_body TEXT, -- e.g., "Red Cross", "BC Safety Council"
  
  -- Dates
  issue_date DATE,
  expiry_date DATE,
  
  -- Document
  document_url TEXT,
  
  -- Status
  status TEXT DEFAULT 'valid' CHECK (status IN ('valid', 'expired', 'pending')),
  
  -- Notes
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===========================================
-- TIME_ENTRIES Table
-- Individual time records linked to crew, project, daily log
-- ===========================================
CREATE TABLE IF NOT EXISTS time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- References
  crew_member_id UUID REFERENCES crew_members(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  daily_log_id UUID REFERENCES daily_logs(id) ON DELETE SET NULL,
  
  -- Time data
  date DATE NOT NULL,
  hours DECIMAL(4,2) NOT NULL CHECK (hours > 0 AND hours <= 24),
  start_time TIME,
  end_time TIME,
  
  -- Work details
  task_description TEXT,
  area TEXT, -- Where on site they worked
  
  -- Billing
  billable BOOLEAN DEFAULT true,
  billed BOOLEAN DEFAULT false,
  
  -- Notes
  notes TEXT,
  
  -- Source tracking
  source TEXT DEFAULT 'manual', -- manual, daily_log, import
  source_id TEXT, -- Reference to original record if imported
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===========================================
-- PROJECT_ASSIGNMENTS Table
-- Who is assigned to which project and when
-- ===========================================
CREATE TABLE IF NOT EXISTS project_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- References
  crew_member_id UUID REFERENCES crew_members(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  
  -- Assignment details
  role TEXT, -- Role on this specific project
  start_date DATE,
  end_date DATE,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  -- Notes
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- One assignment per crew per project (can re-assign with new dates)
  CONSTRAINT unique_crew_project UNIQUE (crew_member_id, project_id)
);

-- ===========================================
-- Add crew_member_id to daily_log_crew
-- Links existing crew entries to master record
-- ===========================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'daily_log_crew' AND column_name = 'crew_member_id'
  ) THEN
    ALTER TABLE daily_log_crew 
    ADD COLUMN crew_member_id UUID REFERENCES crew_members(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ===========================================
-- Indexes
-- ===========================================
CREATE INDEX IF NOT EXISTS idx_crew_members_status ON crew_members(status);
CREATE INDEX IF NOT EXISTS idx_crew_members_role ON crew_members(role);
CREATE INDEX IF NOT EXISTS idx_certifications_crew ON certifications(crew_member_id);
CREATE INDEX IF NOT EXISTS idx_certifications_expiry ON certifications(expiry_date);
CREATE INDEX IF NOT EXISTS idx_time_entries_crew ON time_entries(crew_member_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_project ON time_entries(project_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_date ON time_entries(date DESC);
CREATE INDEX IF NOT EXISTS idx_time_entries_daily_log ON time_entries(daily_log_id);
CREATE INDEX IF NOT EXISTS idx_project_assignments_crew ON project_assignments(crew_member_id);
CREATE INDEX IF NOT EXISTS idx_project_assignments_project ON project_assignments(project_id);
CREATE INDEX IF NOT EXISTS idx_daily_log_crew_member ON daily_log_crew(crew_member_id);

-- ===========================================
-- Update triggers
-- ===========================================
CREATE OR REPLACE FUNCTION update_crew_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_crew_members_updated_at ON crew_members;
CREATE TRIGGER trigger_crew_members_updated_at
  BEFORE UPDATE ON crew_members
  FOR EACH ROW
  EXECUTE FUNCTION update_crew_updated_at();

DROP TRIGGER IF EXISTS trigger_certifications_updated_at ON certifications;
CREATE TRIGGER trigger_certifications_updated_at
  BEFORE UPDATE ON certifications
  FOR EACH ROW
  EXECUTE FUNCTION update_crew_updated_at();

DROP TRIGGER IF EXISTS trigger_time_entries_updated_at ON time_entries;
CREATE TRIGGER trigger_time_entries_updated_at
  BEFORE UPDATE ON time_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_crew_updated_at();

DROP TRIGGER IF EXISTS trigger_project_assignments_updated_at ON project_assignments;
CREATE TRIGGER trigger_project_assignments_updated_at
  BEFORE UPDATE ON project_assignments
  FOR EACH ROW
  EXECUTE FUNCTION update_crew_updated_at();

-- ===========================================
-- Auto-update certification status based on expiry
-- ===========================================
CREATE OR REPLACE FUNCTION update_certification_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.expiry_date IS NOT NULL AND NEW.expiry_date < CURRENT_DATE THEN
    NEW.status = 'expired';
  ELSIF NEW.expiry_date IS NOT NULL AND NEW.expiry_date >= CURRENT_DATE THEN
    NEW.status = 'valid';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_certification_status ON certifications;
CREATE TRIGGER trigger_certification_status
  BEFORE INSERT OR UPDATE ON certifications
  FOR EACH ROW
  EXECUTE FUNCTION update_certification_status();

-- ===========================================
-- RLS Policies
-- ===========================================
ALTER TABLE crew_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_assignments ENABLE ROW LEVEL SECURITY;

-- For now, allow all (will refine when auth is properly set up)
CREATE POLICY "Allow all crew_members" ON crew_members FOR ALL USING (true);
CREATE POLICY "Allow all certifications" ON certifications FOR ALL USING (true);
CREATE POLICY "Allow all time_entries" ON time_entries FOR ALL USING (true);
CREATE POLICY "Allow all project_assignments" ON project_assignments FOR ALL USING (true);

-- ===========================================
-- Views for reporting
-- ===========================================

-- Crew with upcoming expiring certs (next 30 days)
CREATE OR REPLACE VIEW crew_expiring_certs AS
SELECT 
  cm.id as crew_member_id,
  cm.name as crew_member_name,
  c.id as cert_id,
  c.name as cert_name,
  c.expiry_date,
  c.expiry_date - CURRENT_DATE as days_until_expiry
FROM crew_members cm
JOIN certifications c ON c.crew_member_id = cm.id
WHERE c.expiry_date IS NOT NULL
  AND c.expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
  AND cm.status = 'active'
ORDER BY c.expiry_date;

-- Weekly hours summary per crew member
CREATE OR REPLACE VIEW crew_weekly_hours AS
SELECT 
  cm.id as crew_member_id,
  cm.name as crew_member_name,
  DATE_TRUNC('week', te.date) as week_start,
  SUM(te.hours) as total_hours,
  COUNT(DISTINCT te.project_id) as projects_worked
FROM crew_members cm
LEFT JOIN time_entries te ON te.crew_member_id = cm.id
WHERE te.date >= CURRENT_DATE - INTERVAL '12 weeks'
GROUP BY cm.id, cm.name, DATE_TRUNC('week', te.date)
ORDER BY week_start DESC, cm.name;

-- ===========================================
-- Comments
-- ===========================================
COMMENT ON TABLE crew_members IS 'Master directory of employees and subcontractors';
COMMENT ON TABLE certifications IS 'Training certifications with expiry tracking';
COMMENT ON TABLE time_entries IS 'Individual time records for crew';
COMMENT ON TABLE project_assignments IS 'Crew assignments to projects';
COMMENT ON COLUMN crew_members.hourly_rate IS 'PRIVATE: Only visible to admins';
COMMENT ON VIEW crew_expiring_certs IS 'Certifications expiring in next 30 days';
COMMENT ON VIEW crew_weekly_hours IS 'Weekly hours summary per crew member';
