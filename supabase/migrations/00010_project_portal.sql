-- DeHyl Project Financial System
-- Portal Access for Projects
-- Created: 2026-01-24

-- ===========================================
-- Portal Access Fields for Projects
-- Allows clients to view project progress via public URL
-- ===========================================

-- Portal enabled flag
ALTER TABLE projects ADD COLUMN IF NOT EXISTS portal_enabled BOOLEAN DEFAULT false;

-- Unique access code for portal URL (random 12-char string)
ALTER TABLE projects ADD COLUMN IF NOT EXISTS portal_access_code TEXT UNIQUE;

-- Portal settings (what to show/hide)
ALTER TABLE projects ADD COLUMN IF NOT EXISTS portal_settings JSONB DEFAULT '{
  "showTimeline": true,
  "showPhotos": true,
  "showDocuments": false,
  "showFinancials": false,
  "showContacts": false,
  "clientMessage": ""
}';

-- ===========================================
-- Indexes for Performance
-- ===========================================

-- Fast lookup by portal access code (for public portal page)
CREATE INDEX IF NOT EXISTS idx_projects_portal_code
  ON projects(portal_access_code)
  WHERE portal_access_code IS NOT NULL;

-- ===========================================
-- Function to Generate Access Code
-- ===========================================

-- Generates a random 12-character lowercase alphanumeric code
CREATE OR REPLACE FUNCTION generate_portal_code()
RETURNS TEXT AS $$
BEGIN
  RETURN lower(substr(md5(random()::text || clock_timestamp()::text), 1, 12));
END;
$$ LANGUAGE plpgsql;

-- ===========================================
-- Comments for Documentation
-- ===========================================

COMMENT ON COLUMN projects.portal_enabled IS 'Whether the public portal is enabled for this project';
COMMENT ON COLUMN projects.portal_access_code IS 'Random unique code for portal URL (e.g., abc123xyz)';
COMMENT ON COLUMN projects.portal_settings IS 'JSON settings controlling what information is visible on the portal';
COMMENT ON FUNCTION generate_portal_code() IS 'Generates a random 12-character access code for portal URLs';
