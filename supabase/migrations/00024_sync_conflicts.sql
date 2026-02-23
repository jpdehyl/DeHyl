-- Track sync conflicts/discrepancies between external sources and app data
-- These are surfaced to the user for manual resolution instead of silently overwriting
CREATE TABLE IF NOT EXISTS sync_conflicts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL,                    -- 'quickbooks' | 'google_drive'
  entity_type TEXT NOT NULL,               -- 'invoice' | 'bill' | 'project'
  entity_id UUID NOT NULL,                 -- ID of the record in our DB
  external_id TEXT NOT NULL,               -- qb_id or drive_id
  field_name TEXT NOT NULL,                -- Which field has a discrepancy
  app_value TEXT,                          -- Current value in our app
  external_value TEXT,                     -- Value from the external source
  status TEXT NOT NULL DEFAULT 'pending',  -- 'pending' | 'resolved_keep_app' | 'resolved_keep_external' | 'dismissed'
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sync_conflicts_status ON sync_conflicts(status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_sync_conflicts_entity ON sync_conflicts(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_sync_conflicts_source ON sync_conflicts(source);
