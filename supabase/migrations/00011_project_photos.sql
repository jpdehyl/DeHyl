-- DeHyl Project Financial System
-- Project Photos Table
-- Created: 2026-01-27

-- ===========================================
-- Project Photos Table
-- Stores metadata for photos uploaded to Google Drive
-- ===========================================
CREATE TABLE project_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  drive_file_id TEXT NOT NULL UNIQUE,
  drive_folder_id TEXT,
  filename TEXT NOT NULL,
  original_filename TEXT,
  file_size INTEGER,
  mime_type TEXT,
  thumbnail_url TEXT,
  photo_date DATE,  -- Date folder the photo is in (YYYY-MM-DD)
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===========================================
-- Indexes for Performance
-- ===========================================
CREATE INDEX idx_photos_project ON project_photos(project_id);
CREATE INDEX idx_photos_date ON project_photos(photo_date DESC);
CREATE INDEX idx_photos_uploaded ON project_photos(uploaded_at DESC);
CREATE INDEX idx_photos_drive_folder ON project_photos(drive_folder_id);

-- ===========================================
-- Row Level Security (RLS)
-- ===========================================
ALTER TABLE project_photos ENABLE ROW LEVEL SECURITY;

-- Allow all operations for now (single user)
CREATE POLICY "Allow all for project_photos" ON project_photos FOR ALL USING (true);
