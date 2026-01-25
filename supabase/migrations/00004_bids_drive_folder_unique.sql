-- DeHyl Project Financial System
-- Add unique constraint on bids.drive_folder_id for upsert support
-- Created: 2026-01-24

-- Add unique index on drive_folder_id to support upsert when syncing from Google Drive
CREATE UNIQUE INDEX idx_bids_drive_folder_id ON bids(drive_folder_id) WHERE drive_folder_id IS NOT NULL;
