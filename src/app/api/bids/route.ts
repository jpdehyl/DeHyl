import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Bid, ProjectType } from "@/types";

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
    // Quote generator fields
    projectType: bid.project_type as ProjectType | null,
    squareFootage: bid.square_footage || null,
    location: bid.location || null,
    quoteMetadata: bid.quote_metadata || null,
    createdAt: new Date(bid.created_at),
    updatedAt: new Date(bid.updated_at),
  }));

  const response: BidsResponse = {
    bids,
    lastSyncedAt: syncLog?.completed_at ? new Date(syncLog.completed_at) : null,
  };

  return NextResponse.json(response);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.name) {
      return NextResponse.json(
        { error: "Bid name is required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Insert new bid
    const { data: newBid, error: insertError } = await supabase
      .from("bids")
      .insert({
        name: body.name,
        client_code: body.clientCode || null,
        client_name: body.clientName || null,
        description: body.description || null,
        due_date: body.dueDate || null,
        status: body.status || "draft",
        estimated_value: body.estimatedValue || null,
        notes: body.notes || null,
        // Quote generator fields
        project_type: body.projectType || null,
        square_footage: body.squareFootage || null,
        location: body.location || null,
        quote_metadata: body.quoteMetadata || null,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Failed to create bid:", insertError);
      return NextResponse.json(
        { error: "Failed to create bid" },
        { status: 500 }
      );
    }

    // Transform to Bid type
    const bid: Bid = {
      id: newBid.id,
      name: newBid.name,
      clientCode: newBid.client_code,
      clientName: newBid.client_name,
      description: newBid.description,
      submittedDate: newBid.submitted_date ? new Date(newBid.submitted_date) : null,
      dueDate: newBid.due_date ? new Date(newBid.due_date) : null,
      status: newBid.status as Bid["status"],
      estimatedValue: newBid.estimated_value ? Number(newBid.estimated_value) : null,
      actualValue: newBid.actual_value ? Number(newBid.actual_value) : null,
      driveFolderId: newBid.drive_folder_id,
      convertedProjectId: newBid.converted_project_id,
      notes: newBid.notes,
      projectType: newBid.project_type as ProjectType | null,
      squareFootage: newBid.square_footage || null,
      location: newBid.location || null,
      quoteMetadata: newBid.quote_metadata || null,
      createdAt: new Date(newBid.created_at),
      updatedAt: new Date(newBid.updated_at),
    };

    return NextResponse.json({ bid });
  } catch (error) {
    console.error("Error creating bid:", error);
    return NextResponse.json(
      { error: "Failed to create bid" },
      { status: 500 }
    );
  }
}
