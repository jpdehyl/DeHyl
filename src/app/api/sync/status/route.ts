import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/sync/status - Returns the last successful sync time for each source
export async function GET() {
  try {
    const supabase = await createClient();

    // Get latest successful sync for each source
    const { data: qbSync } = await supabase
      .from("sync_log")
      .select("completed_at, records_synced")
      .eq("source", "quickbooks")
      .eq("status", "completed")
      .order("completed_at", { ascending: false })
      .limit(1)
      .single();

    const { data: driveSync } = await supabase
      .from("sync_log")
      .select("completed_at, records_synced")
      .eq("source", "google_drive")
      .eq("status", "completed")
      .order("completed_at", { ascending: false })
      .limit(1)
      .single();

    // Get the most recent sync overall
    const lastSynced = [qbSync?.completed_at, driveSync?.completed_at]
      .filter(Boolean)
      .sort()
      .pop() || null;

    return NextResponse.json({
      lastSynced,
      sources: {
        quickbooks: qbSync
          ? { lastSynced: qbSync.completed_at, recordsSynced: qbSync.records_synced }
          : null,
        googleDrive: driveSync
          ? { lastSynced: driveSync.completed_at, recordsSynced: driveSync.records_synced }
          : null,
      },
    });
  } catch (error) {
    console.error("Sync status error:", error);
    return NextResponse.json({ lastSynced: null, sources: {} });
  }
}
