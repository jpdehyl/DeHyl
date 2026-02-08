-- Migration: Authentication & Role-Based Access Control
-- DeHyl Financials Auth System

-- ===========================================
-- PROFILES Table
-- Extends Supabase auth.users with app-specific data
-- ===========================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'client' 
    CHECK (role IN ('admin', 'ops', 'field', 'client')),
  phone TEXT,
  avatar_url TEXT,
  
  -- Preferences
  preferred_language TEXT DEFAULT 'en',
  timezone TEXT DEFAULT 'America/Vancouver',
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  last_login_at TIMESTAMPTZ,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===========================================
-- PROJECT_ASSIGNMENTS Table
-- Links field workers to their assigned projects
-- ===========================================
CREATE TABLE IF NOT EXISTS project_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  
  -- Assignment details
  assignment_role TEXT DEFAULT 'worker' 
    CHECK (assignment_role IN ('worker', 'supervisor', 'foreman')),
  can_edit_logs BOOLEAN DEFAULT true,
  can_upload_photos BOOLEAN DEFAULT true,
  can_view_financials BOOLEAN DEFAULT false,
  
  -- Tracking
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  assigned_by UUID REFERENCES profiles(id),
  notes TEXT,
  
  UNIQUE(user_id, project_id)
);

-- ===========================================
-- AUDIT_LOG Table
-- Track important actions for compliance
-- ===========================================
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  action TEXT NOT NULL, -- 'create', 'update', 'delete', 'login', 'export'
  entity_type TEXT, -- 'project', 'daily_log', 'invoice', etc.
  entity_id UUID,
  details JSONB, -- Additional context
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===========================================
-- Indexes
-- ===========================================
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_project_assignments_user ON project_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_project_assignments_project ON project_assignments(project_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_user ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON audit_log(created_at DESC);

-- ===========================================
-- Auto-create profile on signup
-- ===========================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- ===========================================
-- Update timestamp trigger
-- ===========================================
CREATE OR REPLACE FUNCTION update_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_profiles_updated_at ON profiles;
CREATE TRIGGER trigger_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_profiles_updated_at();

-- ===========================================
-- RLS Policies
-- ===========================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Profiles policies
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
CREATE POLICY "Admins can view all profiles" ON profiles
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "Ops can view all profiles" ON profiles;
CREATE POLICY "Ops can view all profiles" ON profiles
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ops')
  );

DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
CREATE POLICY "Admins can update all profiles" ON profiles
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id 
    AND role = (SELECT role FROM profiles WHERE id = auth.uid()) -- Can't change own role
  );

-- Project assignments policies
DROP POLICY IF EXISTS "Admins can manage assignments" ON project_assignments;
CREATE POLICY "Admins can manage assignments" ON project_assignments
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "Ops can view assignments" ON project_assignments;
CREATE POLICY "Ops can view assignments" ON project_assignments
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ops')
  );

DROP POLICY IF EXISTS "Users can view own assignments" ON project_assignments;
CREATE POLICY "Users can view own assignments" ON project_assignments
  FOR SELECT USING (user_id = auth.uid());

-- Audit log policies (admin read-only)
DROP POLICY IF EXISTS "Admins can view audit log" ON audit_log;
CREATE POLICY "Admins can view audit log" ON audit_log
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Allow insert to audit log for authenticated users
DROP POLICY IF EXISTS "Authenticated can insert audit" ON audit_log;
CREATE POLICY "Authenticated can insert audit" ON audit_log
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- ===========================================
-- Helper functions
-- ===========================================

-- Get user role
CREATE OR REPLACE FUNCTION get_user_role(p_user_id UUID DEFAULT auth.uid())
RETURNS TEXT AS $$
  SELECT role FROM profiles WHERE id = p_user_id;
$$ LANGUAGE sql SECURITY DEFINER;

-- Check if user has role
CREATE OR REPLACE FUNCTION has_role(required_role TEXT, p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = p_user_id 
    AND role = required_role
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Check if user has any of the roles
CREATE OR REPLACE FUNCTION has_any_role(required_roles TEXT[], p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = p_user_id 
    AND role = ANY(required_roles)
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Check if user can access project
CREATE OR REPLACE FUNCTION can_access_project(proj_id UUID, p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    -- Admin/Ops can access all
    SELECT 1 FROM profiles WHERE id = p_user_id AND role IN ('admin', 'ops')
  ) OR EXISTS (
    -- Field workers can access assigned projects
    SELECT 1 FROM project_assignments WHERE user_id = p_user_id AND project_id = proj_id
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- ===========================================
-- Comments
-- ===========================================
COMMENT ON TABLE profiles IS 'User profiles extending Supabase auth';
COMMENT ON TABLE project_assignments IS 'Field worker project assignments';
COMMENT ON TABLE audit_log IS 'Audit trail for compliance';
COMMENT ON FUNCTION get_user_role IS 'Get the role of current or specified user';
COMMENT ON FUNCTION has_role IS 'Check if user has a specific role';
COMMENT ON FUNCTION has_any_role IS 'Check if user has any of the specified roles';
COMMENT ON FUNCTION can_access_project IS 'Check if user can access a project';
