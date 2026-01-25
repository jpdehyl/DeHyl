import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Bid } from "@/types";

export interface BidsResponse {
  bids: Bid[];
  lastSyncedAt: Date | null;
}

export async function GET() {
  const supabase = await createClient();

  // Fetch bids from Supabase
  const { data: bidsData, error: bidsError } = await supabase
    .from("bids")
    .select("*")
    .order("created_at", { ascending: false });

  if (bidsError) {
    console.error("Failed to fetch bids:", bidsError);
    return NextResponse.json(
      { error: "Failed to fetch bids" },
      { status: 500 }
    );
  }

  // Get last sync time
  const { data: syncLog } = await supabase
    .from("sync_log")
    .select("completed_at")
    .eq("source", "google_drive_bids")
    .eq("status", "completed")
    .order("completed_at", { ascending: false })
    .limit(1)
    .single();

  // Transform to Bid type
  const bids: Bid[] = (bidsData || []).map((bid) => ({
    id: bid.id,
    name: bid.name,
    clientCode: bid.client_code,
    clientName: bid.client_name,
    description: bid.description,
    submittedDate: bid.submitted_date ? new Date(bid.submitted_date) : null,
    dueDate: bid.due_date ? new Date(bid.due_date) : null,
    status: bid.status as Bid["status"],
    estimatedValue: bid.estimated_value ? Number(bid.estimated_value) : null,
    actualValue: bid.actual_value ? Number(bid.actual_value) : null,
    driveFolderId: bid.drive_folder_id,
    convertedProjectId: bid.converted_project_id,
    notes: bid.notes,
    createdAt: new Date(bid.created_at),
    updatedAt: new Date(bid.updated_at),
  }));

  const response: BidsResponse = {
    bids,
    lastSyncedAt: syncLog?.completed_at ? new Date(syncLog.completed_at) : null,
  };

  return NextResponse.json(response);
}
