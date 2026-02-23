-- Field updates table for WhatsApp/email/SMS field data collection
-- Stores mixed-media messages from field crews with project codes

CREATE TABLE field_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id),
  source TEXT NOT NULL CHECK (source IN ('whatsapp', 'email', 'sms', 'imessage')),
  sender_name TEXT NOT NULL,
  sender_phone TEXT,
  sender_email TEXT,
  message_timestamp TIMESTAMPTZ NOT NULL,
  entries JSONB NOT NULL DEFAULT '[]',
  -- Each entry: {type, content, mediaUrl, mimeType, fileName, classification}
  status TEXT DEFAULT 'received' CHECK (status IN ('received', 'processed', 'archived')),
  source_message_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_field_updates_project ON field_updates(project_id);
CREATE INDEX idx_field_updates_timestamp ON field_updates(message_timestamp DESC);
CREATE INDEX idx_field_updates_source ON field_updates(source);

-- Storage bucket for field update media (photos, voice notes, documents)
-- Run via Supabase Dashboard if not auto-created:
--
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('field-updates', 'field-updates', true);
--
-- Public read policy:
-- CREATE POLICY "Public read for field-updates" ON storage.objects
--   FOR SELECT USING (bucket_id = 'field-updates');
--
-- Service role write policy:
-- CREATE POLICY "Service role upload for field-updates" ON storage.objects
--   FOR INSERT WITH CHECK (bucket_id = 'field-updates');
