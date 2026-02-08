-- DeHyl Project Financial System
-- Supabase Storage Photos Migration
-- Created: 2026-02-01

-- ===========================================
-- Add Supabase Storage fields to project_photos
-- ===========================================

-- Add storage_path and storage_url for Supabase Storage
ALTER TABLE project_photos 
ADD COLUMN IF NOT EXISTS storage_path TEXT,
ADD COLUMN IF NOT EXISTS storage_url TEXT;

-- Add category field for photo classification
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'photo_category') THEN
        CREATE TYPE photo_category AS ENUM (
            'before',
            'during', 
            'after',
            'safety',
            'damage',
            'equipment',
            'documentation',
            'other'
        );
    END IF;
END $$;

ALTER TABLE project_photos 
ADD COLUMN IF NOT EXISTS category photo_category DEFAULT 'other';

-- Add GPS coordinates (optional metadata)
ALTER TABLE project_photos 
ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

-- Add notes/description field
ALTER TABLE project_photos 
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add daily_log_id for linking photos to daily logs
ALTER TABLE project_photos 
ADD COLUMN IF NOT EXISTS daily_log_id UUID REFERENCES daily_logs(id) ON DELETE SET NULL;

-- Add room/area field
ALTER TABLE project_photos 
ADD COLUMN IF NOT EXISTS area TEXT;

-- Add uploader info
ALTER TABLE project_photos 
ADD COLUMN IF NOT EXISTS uploaded_by UUID REFERENCES auth.users(id);

-- ===========================================
-- Indexes for new fields
-- ===========================================
CREATE INDEX IF NOT EXISTS idx_photos_category ON project_photos(category);
CREATE INDEX IF NOT EXISTS idx_photos_daily_log ON project_photos(daily_log_id);
CREATE INDEX IF NOT EXISTS idx_photos_area ON project_photos(area);
CREATE INDEX IF NOT EXISTS idx_photos_storage_path ON project_photos(storage_path);

-- ===========================================
-- Create Supabase Storage bucket for photos
-- Note: This should be run via Supabase Dashboard or CLI
-- ===========================================
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('project-photos', 'project-photos', true)
-- ON CONFLICT (id) DO NOTHING;

-- ===========================================
-- Storage RLS policies (run in Supabase Dashboard)
-- ===========================================
-- Allow public read access
-- CREATE POLICY "Public Access" ON storage.objects
--   FOR SELECT USING (bucket_id = 'project-photos');
--
-- Allow authenticated uploads
-- CREATE POLICY "Authenticated Upload" ON storage.objects
--   FOR INSERT WITH CHECK (bucket_id = 'project-photos');
--
-- Allow authenticated delete
-- CREATE POLICY "Authenticated Delete" ON storage.objects
--   FOR DELETE USING (bucket_id = 'project-photos');
